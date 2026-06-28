import { Router } from "express";
import http from "http";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import { asyncHandler } from "../utils/helpers.js";
import { validateStreamUrl } from "../utils/urlValidator.js";
import { logger } from "../utils/logger.js";
import { streamManager } from "../services/StreamManager.js";
import { query } from "../config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HLS_DIR = path.resolve(__dirname, "../../hls_cache");

const urlCache = new Map();
const CACHE_TTL = 120000;

function probeUrl(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const mod = parsed.protocol === "https:" ? https : http;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      const req = mod.get(url, { signal: ac.signal, headers: { "User-Agent": "VLC/3.0.21 LibVLC/3.0.21" } }, (res) => {
        clearTimeout(timer);
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 400 ? url : null);
      });
      req.on("error", () => { clearTimeout(timer); resolve(null); });
    } catch { resolve(null); }
  });
}

function parseUrlParts(url) {
  try {
    const parsed = new URL(url);
    const m = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/(\d+)$/);
    if (!m) return null;
    return { host: parsed.host, protocol: parsed.protocol, user: m[1], pass: m[2], port: parseInt(m[3]) };
  } catch { return null; }
}

function cacheKey(parts) {
  return `${parts.host}:${parts.user}:${parts.pass}`;
}

async function findWorkingUrl(baseUrl) {
  const parts = parseUrlParts(baseUrl);
  if (!parts) return baseUrl;

  const key = cacheKey(parts);
  const cached = urlCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.url;

  const alive = await probeUrl(baseUrl, 2000);
  if (alive) { urlCache.set(key, { url: alive, time: Date.now() }); return alive; }

  const ports = [4540, 4528, 4525, 4500, 4520, 4530, 4545, 4550, 4560, 4570, 4580, 4590, 4600, 4610, 4620];
  const urls = [...new Set([parts.port, ...ports])].map(p => `${parts.protocol}//${parts.host}/${parts.user}/${parts.pass}/${p}`);
  const results = await Promise.all(urls.map(u => probeUrl(u, 1500)));
  const found = results.find(Boolean);
  if (found) urlCache.set(key, { url: found, time: Date.now() });
  return found || baseUrl;
}

// Background cache refresh
setInterval(async () => {
  for (const [key, entry] of urlCache) {
    const alive = await probeUrl(entry.url, 2000);
    if (alive) {
      urlCache.set(key, { url: alive, time: Date.now() });
    } else {
      urlCache.delete(key);
      const parts = parseUrlParts(entry.url);
      if (parts) {
        const ports = [4540, 4528, 4525, 4500, 4520, 4530, 4545, 4550, 4560, 4570, 4580, 4590, 4600, 4610, 4620];
        const urls = [...new Set([parts.port, ...ports])].map(p => `${parts.protocol}//${parts.host}/${parts.user}/${parts.pass}/${p}`);
        const results = await Promise.all(urls.map(u => probeUrl(u, 1500)));
        const found = results.find(Boolean);
        if (found) urlCache.set(key, { url: found, time: Date.now() });
      }
    }
  }
}, 60000);

function followRedirect(url, reqHeaders, res, maxRedirects = 5) {
  if (maxRedirects <= 0) { res.status(502).end(); return; }
  const parsed = new URL(url);
  const mod = parsed.protocol === "https:" ? https : http;
  const options = {
    hostname: parsed.hostname, port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
    path: parsed.pathname + parsed.search, method: "GET",
    headers: { ...reqHeaders, "User-Agent": "VLC/3.0.21 LibVLC/3.0.21" },
  };
  const proxyReq = mod.request(options, (proxyRes) => {
    if (proxyRes.statusCode >= 301 && proxyRes.statusCode <= 303 && proxyRes.headers.location) {
      const redirectUrl = new URL(proxyRes.headers.location, url).href;
      proxyRes.resume();
      followRedirect(redirectUrl, reqHeaders, res, maxRedirects - 1);
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    if (proxyRes.headers["content-type"]) res.setHeader("Content-Type", proxyRes.headers["content-type"]);
    else res.setHeader("Content-Type", "video/mp2t");
    if (proxyRes.headers["content-length"]) res.setHeader("Content-Length", proxyRes.headers["content-length"]);
    if (proxyRes.headers["content-range"]) res.setHeader("Content-Range", proxyRes.headers["content-range"]);
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  });
  proxyReq.setTimeout(30000, () => { proxyReq.destroy(); if (!res.headersSent) res.status(504).end(); });
  proxyReq.on("error", () => { if (!res.headersSent) res.status(502).end(); });
  proxyReq.end();
}

const router = Router();

router.get("/test", asyncHandler(async (req, res) => {
  logger.info("iptvRoutes", "Test stream requested");

  const result = streamManager.joinChannel("test_pattern");

  res.json({
    hlsUrl: result.hlsUrl,
    streamId: result.channelId,
    type: "test",
  });
}));

router.get("/find", asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url required" });
  const found = await findWorkingUrl(decodeURIComponent(url));
  res.json({ url: found });
}));

router.get("/channels", asyncHandler(async (req, res) => {
  const { search, category, page = 1, limit = 50 } = req.query;
  const conditions = ["is_active = true"];
  const params = [];
  let paramIndex = 1;
  if (category) { conditions.push(`category = $${paramIndex++}`); params.push(category); }
  if (search) { conditions.push(`name ILIKE $${paramIndex++}`); params.push(`%${search}%`); }
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = conditions.join(" AND ");
  const result = await query(
    `SELECT * FROM iptv_channels WHERE ${where} ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), offset]
  );
  const count = await query(`SELECT COUNT(*) FROM iptv_channels WHERE ${where}`, params);
  res.json({ channels: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
}));

router.get("/categories", asyncHandler(async (req, res) => {
  const result = await query("SELECT DISTINCT category FROM iptv_channels WHERE is_active = true AND category IS NOT NULL ORDER BY category");
  res.json({ categories: result.rows.map((r) => r.category) });
}));

router.options("/stream", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Origin");
  res.status(204).end();
});

router.get("/stream", asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url is required" });
  const decodedUrl = decodeURIComponent(url);
  const validUrl = validateStreamUrl(decodedUrl);
  const headers = {
    "User-Agent": "VLC/3.0.21 LibVLC/3.0.21", Accept: "video/mp2t,*/*",
    "Icy-MetaData": "1", Connection: "keep-alive",
  };
  if (req.headers.range) headers.Range = req.headers.range;
  followRedirect(validUrl, headers, res);
}));

router.head("/stream", asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url is required" });
  const decodedUrl = decodeURIComponent(url);
  const parsed = new URL(decodedUrl);
  const options = {
    hostname: parsed.hostname, port: parsed.port || 80,
    path: parsed.pathname + parsed.search, method: "HEAD",
    headers: { "User-Agent": "VLC/3.0.21 LibVLC/3.0.21", Accept: "video/mp2t,*/*" },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (proxyRes.headers["content-type"]) res.setHeader("Content-Type", proxyRes.headers["content-type"]);
    if (proxyRes.headers["content-length"]) res.setHeader("Content-Length", proxyRes.headers["content-length"]);
    res.status(proxyRes.statusCode).end();
  });
  proxyReq.setTimeout(10000, () => { proxyReq.destroy(); if (!res.headersSent) res.status(504).end(); });
  proxyReq.on("error", () => { if (!res.headersSent) res.status(502).end(); });
  proxyReq.end();
}));

router.get("/hls", asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url is required" });

  const decodedUrl = decodeURIComponent(url);

  let streamUrl;
  try {
    streamUrl = validateStreamUrl(decodedUrl);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const workingUrl = await findWorkingUrl(streamUrl);

  try {
    const result = streamManager.joinChannel(workingUrl);
    logger.info("iptvRoutes", "HLS stream joined", {
      channelId: result.channelId,
      viewers: result.viewers,
    });
    res.json({
      hlsUrl: result.hlsUrl,
      streamId: result.channelId,
      viewers: result.viewers,
    });
  } catch (err) {
    logger.error("iptvRoutes", "Failed to start HLS stream", { error: err.message, url: workingUrl });
    res.status(500).json({ error: err.message });
  }
}));

router.post("/leave", asyncHandler(async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: "channelId is required" });

  streamManager.leaveChannel(channelId);
  res.json({ success: true });
}));

router.get("/channel/:id", asyncHandler(async (req, res) => {
  const channel = streamManager.getChannel(req.params.id);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  res.json(channel);
}));

router.post("/channel/:id/leave", asyncHandler(async (req, res) => {
  streamManager.leaveChannel(req.params.id);
  res.json({ success: true });
}));

router.get("/stats", asyncHandler(async (req, res) => {
  res.json(streamManager.getStats());
}));

router.get("/health", asyncHandler(async (req, res) => {
  const stats = streamManager.getStats();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    totalChannels: stats.totalChannels,
    totalViewers: stats.totalViewers,
    uptime: process.uptime(),
  });
}));

export default router;
