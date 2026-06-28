import { spawn } from "child_process";
import { EventEmitter } from "events";
import path from "path";
import { logger } from "../utils/logger.js";

export class FFmpegWorker extends EventEmitter {
  constructor({ channelId, streamUrl, hlsDir, maxRestarts = 20 }) {
    super();
    this.channelId = channelId;
    this.streamUrl = streamUrl;
    this.hlsDir = hlsDir;
    this.maxRestarts = maxRestarts;
    this.process = null;
    this.restartCount = 0;
    this.startedAt = null;
    this.stopping = false;
    this.ffmpegPath = null;
  }

  async start() {
    if (this.process && this.isAlive()) {
      logger.warn("FFmpegWorker", "Already running", { channelId: this.channelId });
      return;
    }

    this.stopping = false;
    this.startedAt = Date.now();

    if (!this.ffmpegPath) {
      try {
        this.ffmpegPath = (await import("ffmpeg-static")).default;
      } catch {
        this.ffmpegPath = "ffmpeg";
      }
    }

    const args = this._buildArgs();
    const outputPath = path.join(this.hlsDir, "index.m3u8");

    logger.info("FFmpegWorker", "Starting", { channelId: this.channelId, streamUrl: this.streamUrl });

    this.process = spawn(this.ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.process.stderr.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg) {
        if (msg.includes("Error") || msg.includes("error")) {
          logger.error("FFmpegWorker", "FFmpeg error output", { channelId: this.channelId, error: msg });
        } else {
          logger.debug("FFmpegWorker", msg, { channelId: this.channelId });
        }
      }
    });

    this.process.stdout.on("data", () => {});

    this.process.on("exit", (code, signal) => {
      const duration = Date.now() - this.startedAt;
      logger.info("FFmpegWorker", "Exited", { channelId: this.channelId, code, signal, durationMs: duration });

      if (!this.stopping && this.restartCount < this.maxRestarts) {
        this.restartCount++;
        this.emit("crash", code, signal);
        const delay = Math.min(2000 * Math.pow(1.5, Math.floor(this.restartCount / 3)), 30000);
        logger.info("FFmpegWorker", "Scheduled restart", { channelId: this.channelId, attempt: this.restartCount, delayMs: delay });
        setTimeout(() => this.start(), delay);
        this.emit("restart", this.restartCount);
      } else if (this.restartCount >= this.maxRestarts) {
        logger.error("FFmpegWorker", "Max restarts reached, giving up", { channelId: this.channelId });
        this.emit("maxRestarts", this.channelId);
      }
    });

    this.process.on("error", (err) => {
      logger.error("FFmpegWorker", "Process error", { channelId: this.channelId, error: err.message });
      this.emit("processError", err);
    });

    this.emit("started", this.channelId);
  }

  stop() {
    if (!this.process) return;
    this.stopping = true;
    logger.info("FFmpegWorker", "Stopping", { channelId: this.channelId });
    try {
      this.process.kill("SIGKILL");
    } catch (err) {
      logger.error("FFmpegWorker", "Kill failed", { channelId: this.channelId, error: err.message });
    }
    this.process = null;
    this.emit("stopped", this.channelId);
  }

  restart() {
    this.restartCount = 0;
    this.stopping = false;
    if (this.process && this.isAlive()) {
      this.process.kill("SIGKILL");
      this.process = null;
    }
    setTimeout(() => this.start(), 1000);
    this.emit("restart", 0);
  }

  updateStreamUrl(newUrl) {
    this.streamUrl = newUrl;
    logger.info("FFmpegWorker", "Stream URL updated", { channelId: this.channelId, newUrl });
    this.restart();
  }

  isAlive() {
    return this.process !== null && this.process.exitCode === null && this.process.killed === false;
  }

  uptime() {
    if (!this.startedAt) return 0;
    return Date.now() - this.startedAt;
  }

  getStats() {
    return {
      channelId: this.channelId,
      alive: this.isAlive(),
      uptime: this.uptime(),
      restartCount: this.restartCount,
      pid: this.process ? this.process.pid : null,
      startedAt: this.startedAt,
      streamUrl: this.streamUrl,
    };
  }

  _buildArgs() {
    const outputPath = path.join(this.hlsDir, "index.m3u8");
    return [
      "-hide_banner", "-loglevel", "warning",
      "-fflags", "nobuffer+discardcorrupt+genpts",
      "-flags", "low_delay",
      "-strict", "experimental",
      "-analyzeduration", "5000000",
      "-probesize", "5000000",
      "-reconnect", "1",
      "-reconnect_at_eof", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "5",
      "-i", this.streamUrl,
      "-max_muxing_queue_size", "1024",
      "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
      "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
      "-vf", "scale=-2:720,setpts=PTS-STARTPTS",
      "-b:v", "2000k", "-maxrate", "2500k", "-bufsize", "4000k",
      "-g", "50", "-keyint_min", "50", "-sc_threshold", "0",
      "-f", "hls",
      "-hls_time", "4", "-hls_list_size", "10",
      "-hls_flags", "append_list+omit_endlist",
      "-hls_segment_filename", path.join(this.hlsDir, "seg_%03d.ts"),
      "-progress", "-", "-y",
      outputPath,
    ];
  }
}
