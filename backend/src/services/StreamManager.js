import crypto from "crypto";
import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import { FFmpegWorker } from "../workers/FFmpegWorker.js";
import { validateStreamUrl } from "../utils/urlValidator.js";
import { logger } from "../utils/logger.js";

export class StreamManager {
  constructor(options = {}) {
    this.channels = new Map();
    this.hlsBaseDir = options.hlsBaseDir || path.resolve("hls_cache");
    this.viewerTimeout = options.viewerTimeout || 60000;
    this.maxRestarts = options.maxRestarts || 20;
    this.ffmpegArgs = options.ffmpegArgs || null;

    fs.mkdirSync(this.hlsBaseDir, { recursive: true });

    logger.info("StreamManager", "Initialized", {
      hlsBaseDir: this.hlsBaseDir,
      viewerTimeout: this.viewerTimeout,
      maxRestarts: this.maxRestarts,
    });
  }

  getChannelId(streamUrl) {
    return crypto.createHash("md5").update(streamUrl).digest("hex").slice(0, 12);
  }

  joinChannel(streamUrl) {
    const validUrl = validateStreamUrl(streamUrl);
    const channelId = this.getChannelId(validUrl);
    const hlsDir = path.join(this.hlsBaseDir, channelId);

    let channel = this.channels.get(channelId);

    if (!channel) {
      fs.mkdirSync(hlsDir, { recursive: true });

      const worker = new FFmpegWorker({
        channelId,
        streamUrl: validUrl,
        hlsDir,
        maxRestarts: this.maxRestarts,
      });

      channel = {
        viewers: 0,
        worker,
        hlsDir,
        stopTimer: null,
        streamUrl: validUrl,
        createdAt: Date.now(),
        lastAccess: Date.now(),
      };

      this.channels.set(channelId, channel);

      worker.on("crash", () => {
        logger.warn("StreamManager", "Worker crashed, will restart automatically", { channelId });
      });

      worker.on("restart", (attempt) => {
        logger.info("StreamManager", "Worker restarting", { channelId, attempt });
      });

      worker.on("maxRestarts", (id) => {
        logger.error("StreamManager", "Max restarts reached", { channelId: id });
        this._forceStop(id);
      });

      worker.start();
      logger.info("StreamManager", "Channel created", { channelId, streamUrl: validUrl });
    } else {
      channel.lastAccess = Date.now();
      // Update URL if it changed
      if (channel.streamUrl !== validUrl) {
        channel.streamUrl = validUrl;
        channel.worker.updateStreamUrl(validUrl);
        logger.info("StreamManager", "Channel URL updated", { channelId });
      }
    }

    channel.viewers++;

    if (channel.stopTimer) {
      clearTimeout(channel.stopTimer);
      channel.stopTimer = null;
      logger.info("StreamManager", "Cancelled idle shutdown, viewers active", { channelId, viewers: channel.viewers });
    }

    logger.info("StreamManager", "Viewer joined", { channelId, viewers: channel.viewers });

    return {
      channelId,
      hlsUrl: `/hls_cache/${channelId}/index.m3u8`,
      viewers: channel.viewers,
      createdAt: channel.createdAt,
    };
  }

  leaveChannel(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      logger.warn("StreamManager", "Leave for unknown channel", { channelId });
      return;
    }

    channel.viewers = Math.max(0, channel.viewers - 1);
    logger.info("StreamManager", "Viewer left", { channelId, viewers: channel.viewers });

    if (channel.viewers === 0) {
      channel.stopTimer = setTimeout(() => {
        this._stopChannel(channelId);
      }, this.viewerTimeout);

      logger.info("StreamManager", "Last viewer left, scheduling idle shutdown", {
        channelId,
        timeoutMs: this.viewerTimeout,
      });
    }
  }

  getChannel(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) return null;
    return {
      channelId,
      viewers: channel.viewers,
      alive: channel.worker ? channel.worker.isAlive() : false,
      uptime: channel.worker ? channel.worker.uptime() : 0,
      restarts: channel.worker ? channel.worker.restartCount : 0,
      streamUrl: channel.streamUrl,
      createdAt: channel.createdAt,
      lastAccess: channel.lastAccess,
    };
  }

  getStats() {
    const details = [];
    for (const [channelId, channel] of this.channels) {
      details.push({
        channelId,
        viewers: channel.viewers,
        streamUrl: channel.streamUrl,
        alive: channel.worker ? channel.worker.isAlive() : false,
        uptime: channel.worker ? channel.worker.uptime() : 0,
        restarts: channel.worker ? channel.worker.restartCount : 0,
        pid: channel.worker ? (channel.worker.process ? channel.worker.process.pid : null) : null,
        createdAt: channel.createdAt,
        lastAccess: channel.lastAccess,
      });
    }

    return {
      totalChannels: this.channels.size,
      totalViewers: Array.from(this.channels.values()).reduce((sum, c) => sum + c.viewers, 0),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      channels: details,
    };
  }

  isHealthy(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) return false;
    if (!channel.worker || !channel.worker.isAlive()) return false;

    const indexPath = path.join(channel.hlsDir, "index.m3u8");
    try {
      if (!fs.existsSync(indexPath)) return false;
      const stat = fs.statSync(indexPath);
      const age = Date.now() - stat.mtimeMs;
      return age < 60000;
    } catch {
      return false;
    }
  }

  restartChannel(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      logger.warn("StreamManager", "Restart for unknown channel", { channelId });
      return;
    }
    logger.info("StreamManager", "Manual restart requested", { channelId });
    channel.worker.restart();
  }

  updateChannelUrl(channelId, newUrl) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      logger.warn("StreamManager", "Update URL for unknown channel", { channelId });
      return;
    }
    const validUrl = validateStreamUrl(newUrl);
    channel.streamUrl = validUrl;
    channel.worker.updateStreamUrl(validUrl);
  }

  cleanStaleChannels() {
    let cleaned = 0;
    for (const [channelId, channel] of this.channels) {
      if (channel.viewers === 0 && (!channel.worker || !channel.worker.isAlive())) {
        this._stopChannel(channelId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.info("StreamManager", "Cleaned stale channels", { count: cleaned });
    }
  }

  async shutdown() {
    logger.info("StreamManager", "Shutting down all channels");
    const ids = Array.from(this.channels.keys());
    for (const channelId of ids) {
      this._stopChannel(channelId);
    }
    logger.info("StreamManager", "All channels stopped", { count: ids.length });
  }

  _stopChannel(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    if (channel.stopTimer) {
      clearTimeout(channel.stopTimer);
      channel.stopTimer = null;
    }

    if (channel.worker) {
      channel.worker.stop();
    }

    this.channels.delete(channelId);
    logger.info("StreamManager", "Channel stopped", { channelId });

    // Don't delete cache immediately — let Nginx serve stale segments
    // CleanupService will handle deletion later
  }

  _forceStop(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) return;
    if (channel.stopTimer) clearTimeout(channel.stopTimer);
    if (channel.worker) channel.worker.stop();
    this.channels.delete(channelId);
    try {
      fs.rmSync(channel.hlsDir, { recursive: true, force: true });
    } catch {}
    logger.error("StreamManager", "Channel force stopped and cache deleted", { channelId });
  }
}

export const streamManager = new StreamManager();
