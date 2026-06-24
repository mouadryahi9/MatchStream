import rateLimit from "express-rate-limit";
import { getRedis } from "../config/redis.js";

const store = {
  redisClient: null,

  async init() {
    this.redisClient = getRedis();
  },

  async increment(key) {
    const redisKey = `ratelimit:${key}`;
    const current = await this.redisClient.incr(redisKey);
    if (current === 1) {
      await this.redisClient.pexpire(redisKey, 60000);
    }
    return current;
  },

  async decrement(key) {
    const redisKey = `ratelimit:${key}`;
    await this.redisClient.decr(redisKey);
  },

  async resetKey(key) {
    const redisKey = `ratelimit:${key}`;
    await this.redisClient.del(redisKey);
  },
};

export function createRateLimiter({ windowMs = 60000, max = 60, message = "Too many requests" } = {}) {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
  });
}

export const apiLimiter = createRateLimiter({
  windowMs: 60000,
  max: 500,
  message: "Too many API requests",
});

export const authLimiter = createRateLimiter({
  windowMs: 60000,
  max: 10,
  message: "Too many auth attempts",
});

export const streamLimiter = createRateLimiter({
  windowMs: 60000,
  max: 30,
  message: "Too many stream requests",
});
