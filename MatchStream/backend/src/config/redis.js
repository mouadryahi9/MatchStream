import Redis from "ioredis";
import { config } from "./index.js";

let redisClient = null;

export function getRedis() {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisClient.on("error", (err) => {
      console.error("Redis connection error:", err);
    });
  }
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export const CACHE_KEYS = {
  MATCHES_ALL: "matches:all",
  MATCH: (id) => `match:${id}`,
  STREAMS_BY_MATCH: (matchId) => `streams:match:${matchId}`,
  STREAM: (id) => `stream:${id}`,
  STREAM_SOURCE: (id) => `stream_source:${id}`,
  USER: (id) => `user:${id}`,
  RATE_LIMIT: (ip) => `ratelimit:${ip}`,
  STREAM_STATUS: (id) => `stream_status:${id}`,
};

export const CACHE_TTL = {
  MATCHES: 30,
  MATCH: 60,
  STREAMS: 30,
  USER: 300,
  RATE_LIMIT: 60,
};
