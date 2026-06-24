import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { execSync } from "child_process";
import { config } from "./config/index.js";
import { getRedis } from "./config/redis.js";
import { getPool } from "./config/database.js";
import { streamQueue, scrapeQueue } from "./config/queue.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { logger } from "./utils/logger.js";

import authRoutes from "./api/authRoutes.js";
import matchRoutes from "./api/matchRoutes.js";
import streamRoutes from "./api/streamRoutes.js";
import adminRoutes from "./api/adminRoutes.js";
import koooraRoutes from "./api/koooraRoutes.js";
import iptvRoutes from "./api/iptvRoutes.js";

import("./workers/ffmpegWorker.js").catch(err => logger.error("server", "Worker import failed", { error: err.message }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api", koooraRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/iptv", iptvRoutes);

app.get("/api/team-logo/:id", async (req, res) => {
  const { id } = req.params;
  const tmp = `${process.env.TEMP || "/tmp"}\\logo_${id}_${Date.now()}.png`;
  try {
    execSync(`curl.exe -s --max-time 10 "https://cdn.sportfeeds.io/sdl/images/team/crest/medium/${id}.png" -o "${tmp}"`, { timeout: 15000, shell: true, stdio: "pipe" });
    if (fs.existsSync(tmp) && fs.statSync(tmp).size > 100) {
      const img = fs.readFileSync(tmp);
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(img);
    } else {
      res.status(404).end();
    }
  } catch {
    res.status(404).end();
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
});

app.use("/streams", express.static(config.streams.dir, {
  dotfiles: "deny",
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith(".m3u8")) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    } else if (path.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");
    }
  },
}));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeStreams: 0,
  });
});

app.use((err, req, res, next) => {
  logger.error("server", "Unhandled error", { error: err.message, path: req.path });
  res.status(500).json({ error: "Internal server error" });
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === "subscribe" && message.streamId) {
        ws.streamId = message.streamId;
        ws.send(JSON.stringify({ type: "subscribed", streamId: message.streamId }));
      }
    } catch {}
  });

  ws.send(JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }));
});

async function broadcast(event, data) {
  const message = JSON.stringify({ type: event, ...data });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

async function start() {
  try {
    getPool();
    getRedis();
    logger.info("server", "Database and Redis connected");

    const { scraperService } = await import("./services/scraperService.js");
    await scraperService.startCron();
    const { koooraService } = await import("./services/koooraScraper.js");
    await koooraService.startCron();

    server.listen(config.port, () => {
      logger.info("server", `MatchStream API running on port ${config.port}`, {
        env: config.env,
        maxStreams: config.streams.maxConcurrent,
      });
    });
  } catch (err) {
    logger.error("server", "Failed to start server", { error: err.message });
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  logger.info("server", "SIGTERM received, shutting down");
  const { ffmpegManager } = await import("./streams-engine/ffmpegManager.js");
  await ffmpegManager.cleanup();
  server.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("server", "SIGINT received, shutting down");
  const { ffmpegManager } = await import("./streams-engine/ffmpegManager.js");
  await ffmpegManager.cleanup();
  server.close();
  process.exit(0);
});

start();

export { app, server, broadcast };
