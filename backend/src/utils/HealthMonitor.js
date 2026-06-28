import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

export class HealthMonitor {
  constructor(streamManager, hlsBaseDir, options = {}) {
    this.streamManager = streamManager;
    this.hlsBaseDir = hlsBaseDir;
    this.interval = options.interval || 10000;
    this.staleThreshold = options.staleThreshold || 30000;
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => this._check(), this.interval);
    logger.info("HealthMonitor", "Started", { intervalMs: this.interval });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("HealthMonitor", "Stopped");
    }
  }

  _check() {
    const stats = this.streamManager.getStats();

    for (const channel of stats.channels) {
      if (!channel.alive) {
        logger.warn("HealthMonitor", "Channel ffmpeg not alive, restarting", { channelId: channel.channelId });
        this.streamManager.restartChannel(channel.channelId);
        continue;
      }

      const indexPath = path.join(this.hlsBaseDir, channel.channelId, "index.m3u8");
      try {
        if (fs.existsSync(indexPath)) {
          const stat = fs.statSync(indexPath);
          const age = Date.now() - stat.mtimeMs;
          if (age > this.staleThreshold) {
            logger.warn("HealthMonitor", "Channel playlist stale, restarting", {
              channelId: channel.channelId,
              ageMs: age,
              thresholdMs: this.staleThreshold,
            });
            this.streamManager.restartChannel(channel.channelId);
          }
        } else {
          logger.warn("HealthMonitor", "Channel has no playlist yet", { channelId: channel.channelId });
        }
      } catch (err) {
        logger.error("HealthMonitor", "Check error", { channelId: channel.channelId, error: err.message });
      }
    }
  }
}
