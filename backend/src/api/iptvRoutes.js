import { Router } from "express";
import http from "http";
import { query } from "../config/database.js";
import { asyncHandler } from "../utils/helpers.js";

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
    const parsed = new URL(decodedUrl);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + parsed.search,
      method: req.method,
      headers: {
        "User-Agent": "VLC/3.0.21 LibVLC/3.0.21",
        Accept: "video/mp2t,*/*",
        "Icy-MetaData": "1",
        Connection: "keep-alive",
      },
    };

    if (req.headers.range) {
      options.headers.Range = req.headers.range;
    }

    const proxyReq = http.request(options, (proxyRes) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

      if (proxyRes.headers["content-type"]) {
        res.setHeader("Content-Type", proxyRes.headers["content-type"]);
      } else {
        res.setHeader("Content-Type", "video/mp2t");
      }

      if (proxyRes.headers["content-length"]) {
        res.setHeader("Content-Length", proxyRes.headers["content-length"]);
      }
      if (proxyRes.headers["content-range"]) {
        res.setHeader("Content-Range", proxyRes.headers["content-range"]);
      }

      res.status(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.setTimeout(15000, () => {
      proxyReq.destroy();
      if (!res.headersSent) res.status(504).end();
    });

    proxyReq.on("error", () => {
      if (!res.headersSent) res.status(502).end();
    });

    proxyReq.end();
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

export default router;
