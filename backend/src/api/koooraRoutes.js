import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { query } from "../config/database.js";
import { getRedis } from "../config/redis.js";
import { koooraService } from "../services/koooraScraper.js";

const router = Router();

router.get(
  "/matches/football",
  asyncHandler(async (req, res) => {
    const { status, league, page = 1, limit = 50 } = req.query;
    const conditions = ["sport = 'football'"];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (league) {
      const leagues = league.split(",").filter(Boolean);
      if (leagues.length > 1) {
        const orClauses = leagues.map((l) => `league ILIKE $${paramIndex++}`).join(" OR ");
        conditions.push(`(${orClauses})`);
        params.push(...leagues);
      } else {
        conditions.push(`league ILIKE $${paramIndex++}`);
        params.push(leagues[0]);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = conditions.join(" AND ");

    const result = await query(
      `SELECT * FROM (
        SELECT DISTINCT ON (home_team, away_team, start_time::date) *
        FROM matches WHERE ${where}
        ORDER BY home_team, away_team, start_time::date, updated_at DESC
      ) sub ORDER BY
        CASE status
          WHEN 'live' THEN 0
          WHEN 'inprogress' THEN 0
          WHEN 'scheduled' THEN 1
          WHEN 'interrupted' THEN 2
          ELSE 3
        END,
        start_time ASC NULLS LAST,
        updated_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM (
        SELECT DISTINCT ON (home_team, away_team, start_time::date) 1
        FROM matches WHERE ${where}
        ORDER BY home_team, away_team, start_time::date, updated_at DESC
      ) sub`, params
    );

    res.json({
      matches: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  })
);

router.get(
  "/matches/football/leagues",
  asyncHandler(async (req, res) => {
    const result = await query(
      "SELECT DISTINCT league FROM matches WHERE sport = 'football' AND league IS NOT NULL ORDER BY league"
    );
    res.json({ leagues: result.rows.map((r) => r.league) });
  })
);

router.get(
  "/matches/football/live",
  asyncHandler(async (req, res) => {
    const { league } = req.query;
    let whereExtra = "";
    const params = [];
    if (league) {
      const leagues = league.split(",").filter(Boolean);
      if (leagues.length > 1) {
        const orClauses = leagues.map((_, i) => `league ILIKE $${i + 1}`).join(" OR ");
        whereExtra = ` AND (${orClauses})`;
        params.push(...leagues);
      } else {
        whereExtra = " AND league ILIKE $1";
        params.push(leagues[0]);
      }
    }
    const result = await query(
      `SELECT * FROM (
        SELECT DISTINCT ON (home_team, away_team, start_time::date) *
        FROM matches
        WHERE sport = 'football' AND (status = 'live' OR status = 'inprogress' OR status = 'interrupted')
        ${whereExtra}
        ORDER BY home_team, away_team, start_time::date, updated_at DESC
      ) sub ORDER BY updated_at DESC LIMIT 50`,
      params.length ? params : undefined
    );
    res.json({ matches: result.rows, count: result.rows.length });
  })
);

router.get(
  "/kooora/standings",
  asyncHandler(async (req, res) => {
    const { competitionId } = req.query;
    const redis = await getRedis();
    const cacheKey = `standings_${competitionId || "top"}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    let results = [];

    if (competitionId) {
      try {
        const table = await koooraService.fetchStandingsJson(competitionId);
        if (table) {
          results.push({
            competitionId,
            competitionName: table.name,
            standings: [{ table: table.rows }],
          });
        }
      } catch {}
    }

    if (results.length === 0) {
      const dbTournaments = await query(
        `SELECT DISTINCT metadata->>'competitionId' AS id,
                metadata->>'competitionName' AS name
         FROM matches
         WHERE sport = 'football'
           AND metadata->>'competitionId' IS NOT NULL
           AND metadata->>'competitionId' != ''
           AND metadata->>'competitionId' != 'null'
         LIMIT 5`
      );
      for (const t of dbTournaments.rows) {
        if (!t.id) continue;
        try {
          const table = await koooraService.fetchStandingsJson(t.id);
          if (table) {
            results.push({
              competitionId: t.id,
              competitionName: table.name || t.name,
              standings: [{ table: table.rows }],
            });
          }
        } catch {}
      }
    }

    const payload = { standings: results };
    await redis.setex(cacheKey, 300, JSON.stringify(payload));
    res.json(payload);
  })
);

router.get(
  "/kooora/top-scorers",
  asyncHandler(async (req, res) => {
    const { competitionId } = req.query;
    const redis = await getRedis();
    const cacheKey = `topscorers_${competitionId || "top"}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const results = [];

    const payload = { topScorers: results };
    await redis.setex(cacheKey, 300, JSON.stringify(payload));
    res.json(payload);
  })
);

export default router;
