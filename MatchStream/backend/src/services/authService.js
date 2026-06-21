import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/database.js";
import { getRedis, CACHE_KEYS, CACHE_TTL } from "../config/redis.js";
import { config } from "../config/index.js";
import { generateToken, generateRefreshToken, generateId } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

const SALT_ROUNDS = 12;

export const authService = {
  async register({ email, username, password }) {
    const existing = await query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username]);
    if (existing.rows.length > 0) {
      throw new Error("Email or username already taken");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = generateId();

    await query(
      `INSERT INTO users (id, email, username, password_hash, role) VALUES ($1, $2, $3, $4, 'viewer')`,
      [id, email, username, passwordHash]
    );

    logger.info("auth", "User registered", { userId: id, email });

    const user = { id, email, username, role: "viewer" };
    return {
      user,
      accessToken: generateToken(user),
      refreshToken: generateRefreshToken(user),
    };
  },

  async login({ email, password }) {
    const result = await query("SELECT * FROM users WHERE email = $1 AND is_active = true", [email]);
    if (result.rows.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    logger.info("auth", "User logged in", { userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      accessToken: generateToken(user),
      refreshToken: generateRefreshToken(user),
    };
  },

  async refresh(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const result = await query("SELECT * FROM users WHERE id = $1 AND is_active = true", [decoded.sub]);
      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      const user = result.rows[0];
      return {
        accessToken: generateToken(user),
        refreshToken: generateRefreshToken(user),
      };
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new Error("Refresh token expired");
      }
      throw new Error("Invalid refresh token");
    }
  },

  async getUserById(id) {
    const redis = getRedis();
    const cacheKey = CACHE_KEYS.USER(id);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await query(
      "SELECT id, email, username, role, created_at FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    await redis.setex(cacheKey, CACHE_TTL.USER, JSON.stringify(user));
    return user;
  },

  async listUsers(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await query(
      "SELECT id, email, username, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    const count = await query("SELECT COUNT(*) FROM users");
    return {
      users: result.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit,
    };
  },

  async updateUserRole(userId, role) {
    await query("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2", [role, userId]);
    const redis = getRedis();
    await redis.del(CACHE_KEYS.USER(userId));
    logger.info("auth", "User role updated", { userId, role });
  },
};
