import { query } from "../config/database.js";
import { getRedis } from "../config/redis.js";
import { generateId } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";
import { execSync } from "child_process";
import fs from "fs";

const KOOORA_BASE = "https://www.kooora.com";
const FOOTBALL_MATCHES = "/%D9%83%D8%B1%D8%A9-%D8%A7%D9%84%D9%82%D8%AF%D9%85/%D9%85%D8%A8%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA-%D8%A7%D9%84%D9%8A%D9%88%D9%85";

function fetchPage(url) {
  const tmpFile = `${process.env.TEMP || "/tmp"}\\kooora_${Date.now()}.html`;
  try {
    execSync(`curl.exe -s --max-time 15 "${url}" -o "${tmpFile}" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -H "Accept: text/html"`, { timeout: 20000, shell: true, stdio: "pipe" });
    const html = fs.readFileSync(tmpFile, "utf-8");
    try { fs.unlinkSync(tmpFile); } catch {}
    return html;
  } catch (err) {
    try { fs.unlinkSync(tmpFile); } catch {}
    throw err;
  }
}

function extractNextData(html) {
  const match = html.match(/__NEXT_DATA__.*?>(.*?)<\/script>/);
  if (!match) throw new Error("No __NEXT_DATA__ found");
  return JSON.parse(match[1]);
}

function mapStatus(status) {
  if (!status) return "scheduled";
  const s = String(status).toLowerCase();
  if (s === "live" || s === "inprogress") return "live";
  if (s === "result" || s === "finished" || s === "ended") return "finished";
  if (s === "upcoming" || s === "scheduled" || s === "notstarted") return "scheduled";
  if (s === "postponed") return "postponed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "interrupted") return "interrupted";
  return "scheduled";
}

function extractMatchesFromFootballPage(jsonData) {
  const data = jsonData.props?.pageProps?.data;
  if (!data) return [];
  const matches = [];
  const seen = new Set();
  for (const key of Object.keys(data)) {
    const section = data[key];
    if (!section?.matches) continue;
    for (const m of section.matches) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      matches.push(m);
    }
  }
  return matches;
}

function extractMatchesFromHomepage(jsonData) {
  const elements = jsonData.props?.pageProps?.data?.elements;
  if (!elements) return [];
  const matches = [];
  const seen = new Set();
  for (const el of elements) {
    if (!el.matches) continue;
    for (const m of el.matches) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      matches.push(m);
    }
  }
  return matches;
}

export const koooraService = {
  _isRunning: false,
  _lastRun: null,

  async startCron() {
    const cron = await import("node-cron");
    cron.schedule("*/30 * * * * *", async () => {
      await this.scrapeAll();
    });
    cron.schedule("*/2 * * * *", async () => {
      await this.cleanupOldMatches();
    });
    logger.info("kooora", "Kooora scraper started (every 30s)");
  },

  async cleanupOldMatches() {
    try {
      const { query } = await import("../config/database.js");
      const result = await query(
        `DELETE FROM matches
         WHERE status = 'finished'
           AND updated_at < NOW() - INTERVAL '5 minutes'`
      );
      if (result.rowCount > 0) {
        logger.info("kooora", `Cleaned up ${result.rowCount} finished matches`);
      }
    } catch (err) {
      logger.error("kooora", "Cleanup failed", { error: err.message });
    }
  },

  async scrapeAll() {
    if (this._isRunning) return;
    this._isRunning = true;
    this._lastRun = new Date();
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fmt = (d) => d.toISOString().split("T")[0];
      const dateUrls = [
        `${KOOORA_BASE}${FOOTBALL_MATCHES}`,
        `${KOOORA_BASE}/ar/${fmt(today)}`,
        `${KOOORA_BASE}/ar/football/matches?date=${fmt(tomorrow)}`,
      ];

      const pages = await Promise.all(
        dateUrls.map((url) =>
          new Promise((resolve) => {
            try { resolve(fetchPage(url)); }
            catch { resolve(null); }
          })
        )
      );
      const [footballHtml, todayHtml, tomorrowHtml] = pages;
      const homeHtml = await new Promise((resolve) => {
        try { resolve(fetchPage(KOOORA_BASE)); }
        catch { resolve(null); }
      });

      let allMatches = [];

      for (const html of [footballHtml, todayHtml, tomorrowHtml, homeHtml]) {
        if (!html) continue;
        try {
          const jsonData = extractNextData(html);
          const matches = extractMatchesFromFootballPage(jsonData);
          if (matches.length > 0) {
            allMatches = allMatches.concat(matches);
          } else {
            const homeMatches = extractMatchesFromHomepage(jsonData);
            if (homeMatches.length > 0) {
              allMatches = allMatches.concat(homeMatches);
            }
          }
        } catch {}
      }

      const seen = new Set();
      let processed = 0;
      for (const m of allMatches) {
        const dedupKey = `${m.teamA?.name || ""}-${m.teamB?.name || ""}-${m.startDate || ""}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);
        try {
          await this._upsertMatch(m);
          processed++;
        } catch (err) {
          logger.error("kooora", "Failed to upsert match", { id: m.id, error: err.message });
        }
      }

      logger.info("kooora", `Processed ${processed} matches from ${allMatches.length} raw`);
    } catch (err) {
      logger.error("kooora", "Scrape cycle failed", { error: err.message });
    } finally {
      this._isRunning = false;
    }
  },

  async _upsertMatch(m) {
    const externalId = m.id;
    const homeScore = m.score?.teamA ?? (m.teamA?.score ?? null);
    const awayScore = m.score?.teamB ?? (m.teamB?.score ?? null);
    const status = mapStatus(m.status);
    const competition = m.competition?.name || null;
    const competitionId = m.competition?.id || null;

    const metadata = {
      competitionId,
      competitionName: competition,
      teamAId: m.teamA?.id,
      teamBId: m.teamB?.id,
      teamACode: m.teamA?.code || m.teamA?.codeName || null,
      teamBCode: m.teamB?.code || m.teamB?.codeName || null,
      teamALogo: m.teamA?.image?.url || null,
      teamBLogo: m.teamB?.image?.url || null,
      gameset: m.gameset ? { id: m.gameset.id, name: m.gameset.name, isKnockout: m.gameset.isKnockout } : null,
      period: m.period ? { type: m.period.type, minute: m.period.minute, extra: m.period.extra } : null,
      aggScore: m.aggScore || null,
      penScore: m.penScore || null,
    };

    const startTime = m.startDate ? new Date(m.startDate).toISOString() : null;

    const existing = await query("SELECT id FROM matches WHERE external_id = $1", [externalId]);

    const title = `${m.teamA?.name || "Unknown"} vs ${m.teamB?.name || "Unknown"}`;

    if (existing.rows.length > 0) {
      await query(
        `UPDATE matches SET
          title = $1, sport = 'football', league = $2, status = $3,
          home_team = $4, away_team = $5, home_score = $6, away_score = $7,
          start_time = $8::timestamptz,
          metadata = $9::jsonb, updated_at = NOW()
        WHERE external_id = $10`,
        [
          title, competition, status,
          m.teamA?.name || "Unknown", m.teamB?.name || "Unknown",
          homeScore, awayScore,
          startTime,
          JSON.stringify(metadata),
          externalId,
        ]
      );
    } else {
      await query(
        `INSERT INTO matches (id, title, sport, league, home_team, away_team, home_score, away_score, status, start_time, external_id, metadata)
         VALUES ($1, $2, 'football', $3, $4, $5, $6, $7, $8, $9::timestamptz, $10, $11::jsonb)`,
        [
          generateId(), title, competition,
          m.teamA?.name || "Unknown", m.teamB?.name || "Unknown",
          homeScore, awayScore, status, startTime, externalId,
          JSON.stringify(metadata),
        ]
      );
    }
  },

  async manualScrape() {
    logger.info("kooora", "Manual scrape triggered");
    await this.scrapeAll();
    return { message: "Kooora scrape completed", lastRun: this._lastRun };
  },

  getStatus() {
    return { isRunning: this._isRunning, lastRun: this._lastRun };
  },

  async fetchStandingsJson(competitionId) {
    let url = KOOORA_BASE;
    if (competitionId) {
      const competitionName = "";
      url = `${KOOORA_BASE}/%D9%83%D8%B1%D8%A9-%D8%A7%D9%84%D9%82%D8%AF%D9%85/%D9%85%D8%B3%D8%A7%D8%A8%D9%82%D8%A9/%D8%AC%D8%AF%D9%88%D9%84/${competitionId}`;
    }
    const html = fetchPage(url);
    const jsonData = extractNextData(html);

    const gameday = jsonData.props?.pageProps?.data?.gameday;
    if (gameday?.summaryStandings?.table?.rankings) {
      const table = gameday.summaryStandings.table;
      return {
        name: table.name || "Standings",
        rows: table.rankings.map((r) => ({
          position: r.position,
          team: { id: r.team?.id, name: r.team?.name, logo: r.team?.image?.url },
          played: r.played || 0,
          wins: r.wins || 0,
          draws: r.draws || 0,
          losses: r.losses || 0,
          goalsFor: r.goalsFor || 0,
          goalsAgainst: r.goalsAgainst || 0,
          goalsDifference: r.goalsDifference || 0,
          points: r.points || 0,
        })),
      };
    }

    const elements = jsonData.props?.pageProps?.data?.elements;
    if (elements) {
      for (const el of elements) {
        if (el.standings?.table?.rankings) {
          const table = el.standings.table;
          return {
            name: table.name || el.gamedayHeadline?.primary?.label || "Standings",
            rows: table.rankings.map((r) => ({
              position: r.position,
              team: { id: r.team?.id, name: r.team?.name, logo: r.team?.image?.url },
              played: r.played || 0,
              wins: r.wins || 0,
              draws: r.draws || 0,
              losses: r.losses || 0,
              goalsFor: r.goalsFor || 0,
              goalsAgainst: r.goalsAgainst || 0,
              goalsDifference: r.goalsDifference || 0,
              points: r.points || 0,
            })),
          };
        }
      }
    }

    return null;
  },
};
