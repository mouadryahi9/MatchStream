import { Router } from "express";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { query } from "../config/database.js";
import { asyncHandler } from "../utils/helpers.js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HLS_DIR = path.resolve(__dirname, "../../hls_cache");
fs.mkdirSync(HLS_DIR, { recursive: true });
const activeHlsProcesses = new Map();

function followRedirect(url, reqHeaders, res, maxRedirects = 5) {
  if (maxRedirects <= 0) {
    res.status(502).end();
    return;
  }
  const parsed = new URL(url);
  const mod = parsed.protocol === "https:" ? https : http;
  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: "GET",
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

router.get(
  "/channels",
  asyncHandler(async (req, res) => {
    const { search, category, page = 1, limit = 50 } = req.query;
    const conditions = ["is_active = true"];
    const params = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (search) {
      conditions.push(`name ILIKE $${paramIndex++}`);
      params.push(`%${search}%`);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = conditions.join(" AND ");
    const result = await query(
      `SELECT * FROM iptv_channels WHERE ${where} ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );
    const count = await query(`SELECT COUNT(*) FROM iptv_channels WHERE ${where}`, params);

    res.json({ channels: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  })
);

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT DISTINCT category FROM iptv_channels WHERE is_active = true AND category IS NOT NULL ORDER BY category");
    res.json({ categories: result.rows.map((r) => r.category) });
  })
);

router.options("/stream", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Origin");
  res.status(204).end();
});

router.get(
  "/stream",
  asyncHandler(async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "url is required" });

    const decodedUrl = decodeURIComponent(url);
    const headers = {
      "User-Agent": "VLC/3.0.21 LibVLC/3.0.21",
      Accept: "video/mp2t,*/*",
      "Icy-MetaData": "1",
      Connection: "keep-alive",
    };
    if (req.headers.range) headers.Range = req.headers.range;
    followRedirect(decodedUrl, headers, res);
  })
);

router.head(
  "/stream",
  asyncHandler(async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "url is required" });

    const decodedUrl = decodeURIComponent(url);
    const parsed = new URL(decodedUrl);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + parsed.search,
      method: "HEAD",
      headers: {
        "User-Agent": "VLC/3.0.21 LibVLC/3.0.21",
        Accept: "video/mp2t,*/*",
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (proxyRes.headers["content-type"]) {
        res.setHeader("Content-Type", proxyRes.headers["content-type"]);
      }
      if (proxyRes.headers["content-length"]) {
        res.setHeader("Content-Length", proxyRes.headers["content-length"]);
      }
      res.status(proxyRes.statusCode).end();
    });

    proxyReq.setTimeout(10000, () => {
      proxyReq.destroy();
      if (!res.headersSent) res.status(504).end();
    });

    proxyReq.on("error", () => {
      if (!res.headersSent) res.status(502).end();
    });

    proxyReq.end();
  })
);

router.get(
  "/hls",
  asyncHandler(async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "url is required" });

    const decodedUrl = decodeURIComponent(url);
    const streamId = "iptv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const outDir = path.join(HLS_DIR, streamId);
    fs.mkdirSync(outDir, { recursive: true });
    const outputPath = path.join(outDir, "index.m3u8");
    const hlsUrl = `/hls_cache/${streamId}/index.m3u8`;

    let ffmpegPath;
    try {
      ffmpegPath = (await import("ffmpeg-static")).default;
    } catch {
      ffmpegPath = "ffmpeg";
    }

    const args = [
      "-hide_banner", "-loglevel", "warning",
      "-fflags", "nobuffer+discardcorrupt+genpts",
      "-flags", "low_delay",
      "-strict", "experimental",
      "-analyzeduration", "5000000",
      "-probesize", "5000000",
      "-i", decodedUrl,
      "-max_muxing_queue_size", "1024",
      "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
      "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
      "-vf", "scale=-2:720,setpts=PTS-STARTPTS",
      "-b:v", "2000k", "-maxrate", "2500k", "-bufsize", "4000k",
      "-g", "50", "-keyint_min", "50", "-sc_threshold", "0",
      "-f", "hls",
      "-hls_time", "4", "-hls_list_size", "10",
      "-hls_flags", "append_list+omit_endlist",
      "-hls_segment_filename", path.join(outDir, "seg_%03d.ts"),
      "-progress", "-", "-y",
      outputPath,
    ];

    const ffmpeg = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    const procInfo = { process: ffmpeg, startTime: Date.now(), outDir };
    activeHlsProcesses.set(streamId, procInfo);

    ffmpeg.stderr.on("data", (d) => process.stderr.write(`[ffmpeg-${streamId}] ${d}`));
    ffmpeg.stdout.on("data", () => {});

    let restartCount = 0;
    const restartFfmpeg = () => {
      if (restartCount++ > 10) return;
      if (!activeHlsProcesses.has(streamId)) return;
      const newProc = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      activeHlsProcesses.set(streamId, { process: newProc, startTime: Date.now(), outDir });
      newProc.stderr.on("data", (d) => process.stderr.write(`[ffmpeg-${streamId}] ${d}`));
      newProc.stdout.on("data", () => {});
      newProc.on("close", () => {
        setTimeout(restartFfmpeg, 2000);
      });
    };

    ffmpeg.on("close", () => {
      setTimeout(restartFfmpeg, 2000);
    });

    await new Promise((resolve) => setTimeout(resolve, 8000));

    if (!fs.existsSync(outputPath)) {
      ffmpeg.kill("SIGKILL");
      activeHlsProcesses.delete(streamId);
      try { fs.rmSync(outDir, { recursive: true, force: true }); } catch {}
      return res.status(500).json({ error: "Transcoding failed to produce output" });
    }

    res.json({ hlsUrl, streamId });

    const hlsTimeout = setTimeout(() => {
      const info = activeHlsProcesses.get(streamId);
      if (info) {
        info.process.kill();
        activeHlsProcesses.delete(streamId);
        try { fs.rmSync(info.outDir, { recursive: true, force: true }); } catch {}
        clearTimeout(hlsTimeout);
      }
    }, 3600000);
  })
);

export default router;
