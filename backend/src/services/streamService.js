import { query } from "../config/database.js";
import { getRedis, CACHE_KEYS, CACHE_TTL } from "../config/redis.js";
import { streamQueue } from "../config/queue.js";
import { generateId, paginate } from "../utils/helpers.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export const streamService = {
  async create({ match_id, title, source_url, source_type = "url", source_headers = {} }) {
    const match = await query("SELECT id FROM matches WHERE id = $1", [match_id]);
    if (match.rows.length === 0) {
      throw new Error("Match not found");
    }

    const activeStreams = await query(
      "SELECT COUNT(*) FROM streams WHERE status IN ('running', 'starting')"
    );
    if (parseInt(activeStreams.rows[0].count) >= config.streams.maxConcurrent) {
      throw new Error("Maximum concurrent streams reached");
    }

    const streamId = generateId();
    const sourceId = generateId();

    await query(
      `INSERT INTO streams (id, match_id, title, status) VALUES ($1, $2, $3, 'idle')`,
      [streamId, match_id, title]
    );

    await query(
      `INSERT INTO stream_sources (id, stream_id, url, source_type, headers)
       VALUES ($1, $2, $3, $4, $5)`,
      [sourceId, streamId, source_url, source_type, JSON.stringify(source_headers)]
    );

    await streamQueue.add("process-stream", {
      streamId,
      sourceUrl: source_url,
      sourceType: source_type,
      headers: source_headers,
    });

    logger.info("stream", "Stream created and queued", { streamId, matchId: match_id });

    return this.getById(streamId);
  },

  async getById(id) {
    const redis = getRedis();
    const cacheKey = CACHE_KEYS.STREAM(id);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await query(
      `SELECT s.*, ss.url as source_url, ss.source_type, ss.headers
       FROM streams s
       LEFT JOIN stream_sources ss ON ss.stream_id = s.id AND ss.is_active = true
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;
    const stream = result.rows[0];
    await redis.setex(cacheKey, CACHE_TTL.STREAMS, JSON.stringify(stream));
    return stream;
  },

  async list({ match_id, status, page = 1, limit = 20 } = {}) {
    const { limit: l, offset, page: p } = paginate(page, limit);
    const conditions = ["1=1"];
    const params = [];
    let paramIndex = 1;

    if (match_id) {
      conditions.push(`s.match_id = $${paramIndex++}`);
      params.push(match_id);
    }
    if (status) {
      conditions.push(`s.status = $${paramIndex++}`);
      params.push(status);
    }

    const where = conditions.join(" AND ");
    const result = await query(
      `SELECT s.*, ss.url as source_url, ss.source_type
       FROM streams s
       LEFT JOIN stream_sources ss ON ss.stream_id = s.id AND ss.is_active = true
       WHERE ${where}
       ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, l, offset]
    );
    const count = await query(`SELECT COUNT(*) FROM streams s WHERE ${where}`, params);

    return { streams: result.rows, total: parseInt(count.rows[0].count), page: p, limit: l };
  },

  async updateStatus(id, status, extra = {}) {
    const fields = ["status = $1", "updated_at = NOW()"];
    const params = [status];
    let paramIndex = 2;

    if (extra.hls_url !== undefined) {
      fields.push(`hls_url = $${paramIndex++}`);
      params.push(extra.hls_url);
    }
    if (extra.error_message !== undefined) {
      fields.push(`error_message = $${paramIndex++}`);
      params.push(extra.error_message);
    }
    if (extra.worker_id !== undefined) {
      fields.push(`worker_id = $${paramIndex++}`);
      params.push(extra.worker_id);
    }
    if (extra.pid !== undefined) {
      fields.push(`pid = $${paramIndex++}`);
      params.push(extra.pid);
    }
    if (status === "running") {
      fields.push(`started_at = NOW()`);
    }
    if (status === "stopped" || status === "error") {
      fields.push(`stopped_at = NOW()`);
    }

    params.push(id);
    await query(`UPDATE streams SET ${fields.join(", ")} WHERE id = $${paramIndex}`, params);

    const redis = getRedis();
    await redis.del(CACHE_KEYS.STREAM(id));
    await redis.del(CACHE_KEYS.STREAMS_BY_MATCH(id));

    logger.info("stream", "Stream status updated", { streamId: id, status });
  },

  async stop(id) {
    const stream = await this.getById(id);
    if (!stream) throw new Error("Stream not found");

    await streamQueue.add("stop-stream", { streamId: id });
    await this.updateStatus(id, "stopped");
    logger.info("stream", "Stream stop requested", { streamId: id });
  },

  async restart(id) {
    const stream = await this.getById(id);
    if (!stream) throw new Error("Stream not found");

    await this.updateStatus(id, "idle");
    await streamQueue.add("process-stream", {
      streamId: id,
      sourceUrl: stream.source_url,
      sourceType: stream.source_type,
      headers: stream.headers ? JSON.parse(stream.headers) : {},
    });

    logger.info("stream", "Stream restart requested", { streamId: id });
  },

  async getStreamStatus(id) {
    const redis = getRedis();
    const cacheKey = CACHE_KEYS.STREAM_STATUS(id);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const stream = await this.getById(id);
    if (!stream) return null;

    const status = {
      id: stream.id,
      matchId: stream.match_id,
      status: stream.status,
      hlsUrl: stream.hls_url,
      workerId: stream.worker_id,
      startedAt: stream.started_at,
      restartCount: stream.restart_count,
      errorMessage: stream.error_message,
    };

    await redis.setex(cacheKey, 10, JSON.stringify(status));
    return status;
  },
};
