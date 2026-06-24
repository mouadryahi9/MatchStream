import { query } from "../config/database.js";
import { getRedis } from "../config/redis.js";
import { generateId } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

export const scraperService = {
  _isRunning: false,
  _lastRun: null,

  async startCron() {
    const cron = await import("node-cron");
    cron.schedule("*/60 * * * * *", async () => {
      await this.scrapeAll();
    });
    logger.info("scraper", "Scraper cron started (every 60s)");
  },

  async scrapeAll() {
    if (this._isRunning) {
      logger.info("scraper", "Scrape already in progress, skipping");
      return;
    }

    this._isRunning = true;
    this._lastRun = new Date();

    try {
      const sources = await query(
        "SELECT url, source_type, headers FROM stream_sources WHERE is_active = true"
      );

      logger.info("scraper", `Scraping ${sources.rows.length} sources`);

      for (const source of sources.rows) {
        try {
          await this.scrapeSource(source);
        } catch (err) {
          logger.error("scraper", `Failed to scrape source: ${source.url}`, { error: err.message });
        }
      }
    } catch (err) {
      logger.error("scraper", "Scrape cycle failed", { error: err.message });
    } finally {
      this._isRunning = false;
    }
  },

  async scrapeSource(source) {
    const redis = getRedis();
    const urlHash = generateId();

    const dedupKey = `scrape:dedup:${urlHash}`;
    const exists = await redis.get(dedupKey);
    if (exists) {
      logger.debug("scraper", "Skipping duplicate scrape", { url: source.url });
      return;
    }

    await redis.setex(dedupKey, 3600, "1");

    const headers = source.headers ? JSON.parse(source.headers) : {};
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "MatchStream/2.0",
        ...headers,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      logger.warn("scraper", `Non-OK response: ${response.status}`, { url: source.url });
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (contentType.includes("json")) {
      await this._processJsonData(JSON.parse(text));
    } else if (contentType.includes("xml") || contentType.includes("html")) {
      await this._processHtmlData(text);
    } else {
      logger.debug("scraper", "Unhandled content type", { contentType, url: source.url });
    }
  },

  async _processJsonData(data) {
    const matches = Array.isArray(data) ? data : data.matches || data.data || [];
    for (const item of matches) {
      try {
        const externalId = item.id || item.external_id || item.match_id;
        if (!externalId) continue;

        const existing = await query("SELECT id FROM matches WHERE external_id = $1", [externalId]);
        if (existing.rows.length > 0) {
          await query(
            `UPDATE matches SET title = $1, sport = $2, status = $3, home_team = $4, away_team = $5,
             start_time = $6, updated_at = NOW() WHERE external_id = $7`,
            [item.title || item.name, item.sport || "unknown", item.status || "scheduled",
             item.home_team, item.away_team, item.start_time, externalId]
          );
        } else {
          await query(
            `INSERT INTO matches (id, title, sport, league, home_team, away_team, status, start_time, external_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [generateId(), item.title || item.name, item.sport || "unknown", item.league || "",
             item.home_team || "", item.away_team || "",
             item.status || "scheduled", item.start_time, externalId]
          );
        }
      } catch (err) {
        logger.error("scraper", "Failed to process JSON match item", { error: err.message });
      }
    }
  },

  async _processHtmlData(html) {
    const matchRegex = /([A-Za-z\s]+)\s+vs\s+([A-Za-z\s]+)/gi;
    let match;
    while ((match = matchRegex.exec(html)) !== null) {
      const homeTeam = match[1].trim();
      const awayTeam = match[2].trim();
      if (homeTeam.length < 2 || awayTeam.length < 2) continue;

      const existing = await query(
        "SELECT id FROM matches WHERE home_team ILIKE $1 AND away_team ILIKE $2 AND (status = 'scheduled' OR status = 'live')",
        [homeTeam, awayTeam]
      );

      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO matches (id, title, sport, home_team, away_team, status)
           VALUES ($1, $2, 'unknown', $3, $4, 'scheduled')`,
          [generateId(), `${homeTeam} vs ${awayTeam}`, homeTeam, awayTeam]
        );
        logger.info("scraper", "Match found via HTML scrape", { homeTeam, awayTeam });
      }
    }
  },

  async manualScrape() {
    logger.info("scraper", "Manual scrape triggered");
    await this.scrapeAll();
    return { message: "Scrape completed", lastRun: this._lastRun };
  },

  getStatus() {
    return {
      isRunning: this._isRunning,
      lastRun: this._lastRun,
    };
  },
};
