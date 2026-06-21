import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const activeProcesses = new Map();

export const ffmpegManager = {
  async startStream(streamId, sourceUrl, headers = {}) {
    const streamDir = path.resolve(config.streams.dir, streamId);
    fs.mkdirSync(streamDir, { recursive: true });

    const outputPath = path.join(streamDir, "index.m3u8");

    const args = [
      "-hide_banner",
      "-loglevel", "warning",
      "-analyzeduration", "20000000",
      "-probesize", "10000000",
    ];

    if (headers["user-agent"]) {
      args.push("-user_agent", headers["user-agent"]);
    }
    if (headers["referer"]) {
      args.push("-referer", headers["referer"]);
    }

    if (sourceUrl.includes(".m3u8")) {
      args.push("-fflags", "nobuffer+discardcorrupt");
      args.push("-flags", "low_delay");
      args.push("-strict", "experimental");
      args.push("-allowed_extensions", "ALL");
      args.push("-i", sourceUrl);
    } else {
      args.push("-i", sourceUrl);
    }

    args.push(
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-tune", "zerolatency",
      "-c:a", "aac",
      "-ar", "44100",
      "-ac", "2",
      "-b:a", "128k",
      "-vf", "scale=-2:720",
      "-b:v", "2500k",
      "-maxrate", "3000k",
      "-bufsize", "5000k",
      "-crf", "23",
      "-g", "50",
      "-keyint_min", "50",
      "-sc_threshold", "0",
      "-f", "hls",
      "-hls_time", "4",
      "-hls_list_size", "10",
      "-hls_flags", "delete_segments+append_list+omit_endlist",
      "-hls_segment_filename", path.join(streamDir, "segment_%03d.ts"),
      "-progress", "-",
      "-y",
      outputPath
    );

    logger.info("ffmpeg", "Starting FFmpeg process", { streamId, args: args.join(" ") });

    const ffmpeg = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const processInfo = {
      process: ffmpeg,
      streamId,
      startTime: Date.now(),
      pid: ffmpeg.pid,
      segmentCount: 0,
    };

    activeProcesses.set(streamId, processInfo);

    let stderrBuffer = "";

    ffmpeg.stdout.on("data", (data) => {
      const output = data.toString();
      const frameMatch = output.match(/frame=\s*(\d+)/);
      if (frameMatch) {
        processInfo.segmentCount = parseInt(frameMatch[1]) || 0;
      }
    });

    ffmpeg.stderr.on("data", (data) => {
      stderrBuffer += data.toString();
      if (stderrBuffer.length > 10000) {
        stderrBuffer = stderrBuffer.slice(-5000);
      }
    });

    ffmpeg.on("close", (code) => {
      logger.warn("ffmpeg", `FFmpeg process exited`, { streamId, code, stderr: stderrBuffer.slice(-500) });
      activeProcesses.delete(streamId);

      if (code !== 0 && code !== null) {
        this._handleStreamFailure(streamId, stderrBuffer);
      }
    });

    ffmpeg.on("error", (err) => {
      logger.error("ffmpeg", "FFmpeg process error", { streamId, error: err.message });
      activeProcesses.delete(streamId);
      this._handleStreamFailure(streamId, err.message);
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const hlsExists = fs.existsSync(outputPath);
    if (!hlsExists && ffmpeg.exitCode !== null) {
      throw new Error("FFmpeg failed to start producing HLS output");
    }

    const hlsUrl = `/streams/${streamId}/index.m3u8`;

    logger.info("ffmpeg", "Stream started successfully", { streamId, hlsUrl, pid: ffmpeg.pid });

    return {
      pid: ffmpeg.pid,
      hlsUrl,
      process: ffmpeg,
    };
  },

  async stopStream(streamId) {
    const processInfo = activeProcesses.get(streamId);
    if (!processInfo) {
      logger.warn("ffmpeg", "No active process for stream", { streamId });
      return false;
    }

    try {
      processInfo.process.kill("SIGTERM");
      setTimeout(() => {
        if (activeProcesses.has(streamId)) {
          try {
            processInfo.process.kill("SIGKILL");
          } catch {}
        }
      }, 5000);
    } catch (err) {
      logger.error("ffmpeg", "Failed to kill FFmpeg process", { streamId, error: err.message });
    }

    activeProcesses.delete(streamId);
    logger.info("ffmpeg", "Stream stopped", { streamId });
    return true;
  },

  getActiveStreams() {
    const streams = [];
    for (const [id, info] of activeProcesses) {
      streams.push({
        id,
        pid: info.pid,
        uptime: Date.now() - info.startTime,
        segmentCount: info.segmentCount,
      });
    }
    return streams;
  },

  getStreamInfo(streamId) {
    const info = activeProcesses.get(streamId);
    if (!info) return null;
    return {
      id: info.streamId,
      pid: info.pid,
      uptime: Date.now() - info.startTime,
      segmentCount: info.segmentCount,
    };
  },

  async checkHealth(streamId) {
    const info = activeProcesses.get(streamId);
    if (!info) return { alive: false };

    try {
      const killed = info.process.killed;
      const exited = info.process.exitCode !== null;
      return {
        alive: !killed && !exited,
        pid: info.pid,
        uptime: Date.now() - info.startTime,
        segmentCount: info.segmentCount,
      };
    } catch {
      return { alive: false };
    }
  },

  async _handleStreamFailure(streamId, errorMessage) {
    const { default: streamService } = await import("../services/streamService.js");
    const stream = await streamService.getById(streamId);
    if (!stream) return;

    const restartCount = (stream.restart_count || 0) + 1;
    if (restartCount <= (stream.max_restarts || 5)) {
      const backoff = Math.min(10000 * Math.pow(2, restartCount - 1), 120000);
      logger.info("ffmpeg", `Scheduling stream restart in ${backoff}ms`, { streamId, attempt: restartCount });

      const { streamQueue } = await import("../config/queue.js");
      await streamQueue.add(
        "process-stream",
        { streamId, sourceUrl: stream.source_url, sourceType: stream.source_type, headers: {} },
        { delay: backoff }
      );

      await streamService.updateStatus(streamId, "idle", { restart_count: restartCount });
    } else {
      logger.error("ffmpeg", "Max restarts reached for stream", { streamId });
      await streamService.updateStatus(streamId, "error", {
        error_message: `Max restarts (${stream.max_restarts}) reached. Last error: ${errorMessage?.slice(0, 500)}`,
      });
    }
  },

  async cleanup() {
    for (const [id] of activeProcesses) {
      await this.stopStream(id);
    }
  },
};
