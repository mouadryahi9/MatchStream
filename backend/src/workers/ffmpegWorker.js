import BullMQ from "bullmq";
import { config } from "../config/index.js";

const { Worker } = BullMQ;
import { ffmpegManager } from "../streams-engine/ffmpegManager.js";
import { streamService } from "../services/streamService.js";
import { logger } from "../utils/logger.js";

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

let worker = null;

try {
  worker = new Worker(
    "stream-processing",
    async (job) => {
      const { streamId, sourceUrl, sourceType, headers } = job.data;

      logger.info("worker", "Processing stream job", { jobId: job.id, streamId, type: job.name });

      switch (job.name) {
        case "process-stream": {
          await streamService.updateStatus(streamId, "starting");

          try {
            const activeCount = ffmpegManager.getActiveStreams().length;
            if (activeCount >= config.streams.maxConcurrent) {
              throw new Error(`Max concurrent streams (${config.streams.maxConcurrent}) reached`);
            }

            const result = await ffmpegManager.startStream(streamId, sourceUrl, headers);

            await streamService.updateStatus(streamId, "running", {
              hls_url: result.hlsUrl,
              worker_id: `worker-${process.pid}`,
              pid: result.pid,
            });

            logger.info("worker", "Stream started successfully", {
              streamId,
              hlsUrl: result.hlsUrl,
            });

            await job.updateProgress(100);
          } catch (err) {
            logger.error("worker", "Failed to process stream", {
              streamId,
              error: err.message,
            });

            await streamService.updateStatus(streamId, "error", {
              error_message: err.message,
            });

            throw err;
          }
          break;
        }

        case "stop-stream": {
          await ffmpegManager.stopStream(streamId);
          await streamService.updateStatus(streamId, "stopped");
          break;
        }

        default:
          logger.warn("worker", "Unknown job type", { type: job.name });
      }
    },
    {
      connection,
      concurrency: config.streams.maxConcurrent,
      lockDuration: 300000,
      maxStalledCount: 3,
      stalledInterval: 60000,
    }
  );

  worker.on("completed", (job) => {
    logger.info("worker", "Job completed", { jobId: job.id, streamId: job.data.streamId });
  });

  worker.on("failed", (job, err) => {
    logger.error("worker", "Job failed", {
      jobId: job?.id,
      streamId: job?.data?.streamId,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on("error", (err) => {
    logger.error("worker", "Worker error", { error: err.message });
  });

  logger.info("worker", "FFmpeg worker started", { pid: process.pid, maxConcurrent: config.streams.maxConcurrent });
} catch (err) {
  logger.error("worker", "Worker initialization failed (Redis may be too old)", { error: err.message });
}
