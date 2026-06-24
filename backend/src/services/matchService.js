import { query } from "../config/database.js";
import { getRedis, CACHE_KEYS, CACHE_TTL } from "../config/redis.js";
import { generateId, paginate } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

export const matchService = {
  async create(data) {
    const id = generateId();
    await query(
      `INSERT INTO matches (id, title, sport, league, home_team, away_team, status, start_time, external_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, data.title, data.sport, data.league, data.home_team, data.away_team,
       data.status || "scheduled", data.start_time, data.external_id, JSON.stringify(data.metadata || {})]
    );

    const redis = getRedis();
    await redis.del(CACHE_KEYS.MATCHES_ALL);
    logger.info("match", "Match created", { matchId: id, title: data.title });
    return this.getById(id);
  },

  async getById(id) {
    const redis = getRedis();
    const cacheKey = CACHE_KEYS.MATCH(id);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await query("SELECT * FROM matches WHERE id = $1", [id]);
    if (result.rows.length === 0) return null;

    const match = result.rows[0];
    await redis.setex(cacheKey, CACHE_TTL.MATCH, JSON.stringify(match));
    return match;
  },

  async list({ status, sport, page = 1, limit = 20, search } = {}) {
    const { limit: l, offset, page: p } = paginate(page, limit);
    const conditions = ["1=1"];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (sport) {
      conditions.push(`sport = $${paramIndex++}`);
      params.push(sport);
    }
    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR home_team ILIKE $${paramIndex} OR away_team ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.join(" AND ");
    const result = await query(
      `SELECT * FROM matches WHERE ${where} ORDER BY start_time DESC NULLS LAST, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, l, offset]
    );
    const count = await query(`SELECT COUNT(*) FROM matches WHERE ${where}`, params);

    return {
      matches: result.rows,
      total: parseInt(count.rows[0].count),
      page: p,
      limit: l,
    };
  },

  async update(id, data) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && ["title", "sport", "league", "home_team", "away_team", "status", "start_time", "metadata", "external_id", "stream_url", "stream_url_fhd", "stream_url_hd", "stream_url_sd", "stream_iptv_fhd", "stream_iptv_hd", "stream_iptv_sd", "home_score", "away_score"].includes(key)) {
        fields.push(`${key} = $${paramIndex++}`);
        params.push(key === "metadata" ? JSON.stringify(value) : value);
      }
    }

    if (fields.length === 0) return this.getById(id);

    fields.push(`updated_at = NOW()`);
    params.push(id);

    await query(`UPDATE matches SET ${fields.join(", ")} WHERE id = $${paramIndex}`, params);

    const redis = getRedis();
    await redis.del(CACHE_KEYS.MATCH(id));
    await redis.del(CACHE_KEYS.MATCHES_ALL);

    logger.info("match", "Match updated", { matchId: id });
    return this.getById(id);
  },

  async delete(id) {
    await query("DELETE FROM matches WHERE id = $1", [id]);
    const redis = getRedis();
    await redis.del(CACHE_KEYS.MATCH(id));
    await redis.del(CACHE_KEYS.MATCHES_ALL);
    logger.info("match", "Match deleted", { matchId: id });
  },

  async getLiveMatches() {
    const redis = getRedis();
    const cacheKey = "matches:live";
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await query(
      "SELECT * FROM matches WHERE status = 'live' ORDER BY start_time DESC"
    );
    await redis.setex(cacheKey, 15, JSON.stringify(result.rows));
    return result.rows;
  },

  async getUpcomingMatches(limit = 10) {
    const result = await query(
      "SELECT * FROM matches WHERE status = 'scheduled' AND start_time > NOW() ORDER BY start_time ASC LIMIT $1",
      [limit]
    );
    return result.rows;
  },
};
