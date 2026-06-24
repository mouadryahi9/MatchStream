import { Router } from "express";
import multer from "multer";
import { authenticate, authorize, apiLimiter } from "../middleware/index.js";
import { asyncHandler } from "../utils/helpers.js";
import { query } from "../config/database.js";
import { getRedis } from "../config/redis.js";
import { streamService } from "../services/streamService.js";
import { scraperService } from "../services/scraperService.js";
import { ffmpegManager } from "../streams-engine/ffmpegManager.js";
import { logger } from "../utils/logger.js";

const router = Router();
router.use(authenticate, authorize("admin"));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const matchCount = await query("SELECT COUNT(*) FROM matches");
    const streamCount = await query("SELECT COUNT(*) FROM streams");
    const activeStreams = await query("SELECT COUNT(*) FROM streams WHERE status = 'running'");
    const userCount = await query("SELECT COUNT(*) FROM users");
    const logCount = await query("SELECT COUNT(*) FROM logs WHERE created_at > NOW() - INTERVAL '24 hours'");
    const liveMatches = await query("SELECT COUNT(*) FROM matches WHERE status = 'live'");
    const upcomingMatches = await query("SELECT COUNT(*) FROM matches WHERE status = 'scheduled'");
    const finishedMatches = await query("SELECT COUNT(*) FROM matches WHERE status = 'finished'");

    res.json({
      totalMatches: parseInt(matchCount.rows[0].count),
      totalStreams: parseInt(streamCount.rows[0].count),
      activeStreams: parseInt(activeStreams.rows[0].count),
      totalUsers: parseInt(userCount.rows[0].count),
      logs24h: parseInt(logCount.rows[0].count),
      live: parseInt(liveMatches.rows[0].count),
      upcoming: parseInt(upcomingMatches.rows[0].count),
      finished: parseInt(finishedMatches.rows[0].count),
    });
  })
);

router.get(
  "/streams",
  asyncHandler(async (req, res) => {
    const streams = await streamService.list({ limit: 100 });
    const activeFfmpeg = ffmpegManager.getActiveStreams();
    res.json({ ...streams, ffmpegProcesses: activeFfmpeg });
  })
);

router.post(
  "/streams/:id/stop",
  asyncHandler(async (req, res) => {
    await streamService.stop(req.params.id);
    res.json({ message: "Stream stopped" });
  })
);

router.post(
  "/streams/:id/restart",
  asyncHandler(async (req, res) => {
    await streamService.restart(req.params.id);
    res.json({ message: "Stream restart initiated" });
  })
);

router.post(
  "/scrape",
  asyncHandler(async (req, res) => {
    const result = await scraperService.manualScrape();
    res.json(result);
  })
);

router.get(
  "/scrape/status",
  asyncHandler(async (req, res) => {
    res.json(scraperService.getStatus());
  })
);

router.post(
  "/matches/bulk-url",
  asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    await query("UPDATE matches SET stream_url = $1 WHERE stream_url IS NULL OR stream_url = ''", [url]);
    res.json({ message: "Bulk URL applied" });
  })
);

router.get(
  "/iptv/channels",
  asyncHandler(async (req, res) => {
    const { search, category, page = 1, limit = 100 } = req.query;
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
  "/iptv/categories",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT DISTINCT category FROM iptv_channels WHERE is_active = true AND category IS NOT NULL ORDER BY category");
    res.json({ categories: result.rows.map((r) => r.category) });
  })
);

router.get(
  "/iptv/channel-list",
  asyncHandler(async (req, res) => {
    const channels = ["None", "Islaimi", "Saudi Quran", "Saudi Sunna", "AL Nas", "Almajd TV", "Almajd Quran", "Almajd Hadeth", "Al Majd Kids", "Al Majd Science", "Masr Quraan", "Al Istiqama Quran", "Al-Quran Al-Kareem"];
    res.json({ channels });
  })
);

router.post(
  "/iptv/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    let content = req.file.buffer.toString("utf-8");
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const lines = content.split("\n");
    let currentName = "";
    let currentCategory = "";
    let currentLogo = "";
    let currentTvgId = "";
    let currentGroup = "";
    let channels = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("#EXTINF:")) {
        const nameMatch = trimmed.match(/,([^,]+)$/);
        if (nameMatch) currentName = nameMatch[1].trim();

        const groupMatch = trimmed.match(/group-title="([^"]+)"/i);
        if (groupMatch) {
          currentCategory = groupMatch[1];
          currentGroup = groupMatch[1];
        }

        const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/i);
        if (logoMatch) currentLogo = logoMatch[1];

        const tvgMatch = trimmed.match(/tvg-id="([^"]+)"/i);
        if (tvgMatch) currentTvgId = tvgMatch[1];
      } else if (trimmed.startsWith("#EXTVLCOPT:")) {
        continue;
      } else if (!trimmed.startsWith("#")) {
        if (currentName && trimmed.match(/^https?:\/\//)) {
          channels.push({ name: currentName, url: trimmed, category: currentCategory, logo: currentLogo, tvg_id: currentTvgId, group_title: currentGroup });
        }
        currentName = "";
        currentGroup = "";
      }
    }

    let imported = 0;
    for (const ch of channels) {
      try {
        await query(
          `INSERT INTO iptv_channels (name, url, category, logo, tvg_id, group_title)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (url) DO NOTHING`,
          [ch.name, ch.url, ch.category || null, ch.logo || null, ch.tvg_id || null, ch.group_title || null]
        );
        imported++;
      } catch (err) {
        logger.error("iptv", "Failed to insert channel", { name: ch.name, url: ch.url, error: err.message });
      }
    }

    res.json({ message: `Imported ${imported} channels`, total: channels.length });
  })
);

router.get(
  "/ads",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT id, COALESCE(name, title) AS name, position, COALESCE(code, content) AS code, enabled, is_active, created_at, updated_at FROM ads ORDER BY created_at DESC");
    res.json({ ads: result.rows });
  })
);

router.post(
  "/ads",
  asyncHandler(async (req, res) => {
    const { name, position = "banner", code = "", enabled = true } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const result = await query(
      "INSERT INTO ads (name, title, position, code, content, enabled, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id, name, position, code, enabled",
      [name, name, position, code, code, enabled]
    );
    res.status(201).json({ ad: result.rows[0] });
  })
);

router.patch(
  "/ads/:id",
  asyncHandler(async (req, res) => {
    const { name, position, code, enabled } = req.body;
    const fields = [];
    const params = [];
    let paramIndex = 1;
    if (name !== undefined) { fields.push(`name = $${paramIndex}`, `title = $${paramIndex}`); paramIndex++; params.push(name); }
    if (position !== undefined) { fields.push(`position = $${paramIndex++}`); params.push(position); }
    if (code !== undefined) { fields.push(`code = $${paramIndex}`, `content = $${paramIndex}`); paramIndex++; params.push(code); }
    if (enabled !== undefined) { fields.push(`enabled = $${paramIndex++}`); params.push(enabled); }
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    fields.push(`updated_at = NOW()`);
    params.push(req.params.id);
    await query(`UPDATE ads SET ${fields.join(", ")} WHERE id = $${paramIndex}`, params);
    res.json({ message: "Ad updated" });
  })
);

router.delete(
  "/ads/:id",
  asyncHandler(async (req, res) => {
    await query("DELETE FROM ads WHERE id = $1", [req.params.id]);
    res.json({ message: "Ad deleted" });
  })
);

router.get(
  "/pages",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT id, slug, title, COALESCE(published, is_published) AS published, meta_description, updated_at, created_at FROM pages ORDER BY updated_at DESC");
    res.json({ pages: result.rows.map((r) => ({ ...r, published: !!r.published })) });
  })
);

router.get(
  "/pages/:id",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM pages WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Page not found" });
    res.json({ page: { ...result.rows[0], published: !!result.rows[0].published } });
  })
);

router.patch(
  "/pages/:id",
  asyncHandler(async (req, res) => {
    const { title, content, published, meta_description } = req.body;
    const fields = [];
    const params = [];
    let paramIndex = 1;
    if (title !== undefined) { fields.push(`title = $${paramIndex++}`); params.push(title); }
    if (content !== undefined) { fields.push(`content = $${paramIndex++}`); params.push(content); }
    if (published !== undefined) { fields.push(`published = $${paramIndex}`, `is_published = $${paramIndex}`); paramIndex++; params.push(published); }
    if (meta_description !== undefined) { fields.push(`meta_description = $${paramIndex++}`); params.push(meta_description); }
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    fields.push(`updated_at = NOW()`);
    params.push(req.params.id);
    await query(`UPDATE pages SET ${fields.join(", ")} WHERE id = $${paramIndex}`, params);
    res.json({ message: "Page updated" });
  })
);

router.get(
  "/cache",
  asyncHandler(async (req, res) => {
    const redis = getRedis();
    const info = await redis.info();
    const keys = await redis.dbsize();
    res.json({ info: info.split("\n").filter((l) => l.startsWith("used_memory") || l.startsWith("total")), keys });
  })
);

router.post(
  "/cache/flush",
  asyncHandler(async (req, res) => {
    const redis = getRedis();
    await redis.flushdb();
    res.json({ message: "Cache flushed" });
  })
);

router.get(
  "/logs",
  asyncHandler(async (req, res) => {
    const { level, source, page = 1, limit = 50 } = req.query;
    const conditions = ["1=1"];
    const params = [];
    let paramIndex = 1;

    if (level) {
      conditions.push(`level = $${paramIndex++}`);
      params.push(level);
    }
    if (source) {
      conditions.push(`source = $${paramIndex++}`);
      params.push(source);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = conditions.join(" AND ");

    const result = await query(
      `SELECT * FROM logs WHERE ${where} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );
    const count = await query(`SELECT COUNT(*) FROM logs WHERE ${where}`, params);

    res.json({
      logs: result.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  })
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const result = await query(
      "SELECT id, email, username, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 100"
    );
    res.json(result.rows);
  })
);

router.patch(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!["admin", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    await query("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2", [role, req.params.id]);
    res.json({ message: "Role updated" });
  })
);

export default router;