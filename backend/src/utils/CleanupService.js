import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

export class CleanupService {
  constructor(streamManager, hlsBaseDir, options = {}) {
    this.streamManager = streamManager;
    this.hlsBaseDir = hlsBaseDir;
    this.segmentMaxAge = options.segmentMaxAge || 120000;
    this.checkInterval = options.checkInterval || 60000;
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => this.clean(), this.checkInterval);
    logger.info("CleanupService", "Started", { checkIntervalMs: this.checkInterval, segmentMaxAgeMs: this.segmentMaxAge });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("CleanupService", "Stopped");
    }
  }

  clean() {
    if (!fs.existsSync(this.hlsBaseDir)) return;

    let dirsChecked = 0;
    let dirsCleaned = 0;
    let filesRemoved = 0;

    try {
      const entries = fs.readdirSync(this.hlsBaseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const dirPath = path.join(this.hlsBaseDir, entry.name);
        const channelId = entry.name;

        // Skip active channels
        const channel = this.streamManager.getChannel(channelId);
        if (channel && channel.viewers > 0 && channel.alive) {
          dirsChecked++;
          continue;
        }

        try {
          const stat = fs.statSync(dirPath);
          const age = Date.now() - stat.mtimeMs;

          // Clean old segments even inside active channels
          if (channel && channel.alive) {
            const removed = this._cleanOldSegments(dirPath, this.segmentMaxAge);
            filesRemoved += removed;
            dirsChecked++;
            continue;
          }

          // Remove entire directory if inactive and old
          if (age > this.segmentMaxAge) {
            const files = fs.readdirSync(dirPath);
            filesRemoved += files.length;
            fs.rmSync(dirPath, { recursive: true, force: true });
            dirsCleaned++;
            logger.info("CleanupService", "Removed stale HLS directory", {
              channelId,
              ageMs: age,
              fileCount: files.length,
            });
          }
        } catch (err) {
          logger.error("CleanupService", "Error processing directory", {
            channelId,
            error: err.message,
          });
        }
        dirsChecked++;
      }
    } catch (err) {
      logger.error("CleanupService", "Cleanup error", { error: err.message });
    }

    if (dirsCleaned > 0 || filesRemoved > 0) {
      logger.info("CleanupService", "Cleanup complete", {
        dirsChecked,
        dirsRemoved: dirsCleaned,
        filesRemoved,
      });
    }
  }

  _cleanOldSegments(dirPath, maxAge) {
    let removed = 0;
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith(".ts")) continue;
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (Date.now() - stat.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          removed++;
        }
      }
    } catch {}
    return removed;
  }
}
