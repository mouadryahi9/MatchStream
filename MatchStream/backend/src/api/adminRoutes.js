import { Router } from "express";
import { authenticate, authorize, apiLimiter } from "../middleware/index.js";
import { asyncHandler } from "../utils/helpers.js";
import { query } from "../config/database.js";
import { getRedis } from "../config/redis.js";
import { streamService } from "../services/streamService.js";
import { scraperService } from "../services/scraperService.js";
import { ffmpegManager } from "../streams-engine/ffmpegManager.js";

const router = Router();
router.use(authenticate, authorize("admin"));

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const matchCount = await query("SELECT COUNT(*) FROM matches");
    const streamCount = await query("SELECT COUNT(*) FROM streams");
    const activeStreams = await query("SELECT COUNT(*) FROM streams WHERE status = 'running'");
    const userCount = await query("SELECT COUNT(*) FROM users");
    const logCount = await query("SELECT COUNT(*) FROM logs WHERE created_at > NOW() - INTERVAL '24 hours'");

    res.json({
      totalMatches: parseInt(matchCount.rows[0].count),
      totalStreams: parseInt(streamCount.rows[0].count),
      activeStreams: parseInt(activeStreams.rows[0].count),
      totalUsers: parseInt(userCount.rows[0].count),
      logs24h: parseInt(logCount.rows[0].count),
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
