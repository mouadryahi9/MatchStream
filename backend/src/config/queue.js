import BullMQ from "bullmq";
import { config } from "./index.js";

const { Queue } = BullMQ;

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

export const streamQueue = new Queue("stream-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const scrapeQueue = new Queue("scrape-matches", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 10000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function closeQueues() {
  await streamQueue.close();
  await scrapeQueue.close();
}
