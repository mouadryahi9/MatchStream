import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../services/api/client";
import StandingsTable from "../components/StandingsTable";
import TopScorers from "../components/TopScorers";
import { useStandings, useTopScorers } from "../hooks/useKooora";

function getDateStr(offset = 0) {
  const d = new Date();
  if (offset) d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

const ALLOWED_PATTERNS = [
  "Premier League", "La Liga", "Champions League",
  "Europa League", "Botola", "World Cup",
  "الدوري الإنجليزي", "الدوري الإسباني", "دوري أبطال أوروبا",
  "الدوري الأوروبي", "الدوري المغربي", "كأس العالم",
];

function isAllowed(league) {
  if (!league) return false;
  const lower = league.toLowerCase();
  return ALLOWED_PATTERNS.some((a) => lower.includes(a.toLowerCase()));
}

const LEAGUE_COLORS = {
  "La Liga": "bg-red-600", "الدوري الإسباني": "bg-red-600",
  "Premier League": "bg-purple-600", "الدوري الإنجليزي": "bg-purple-600",
  "Botola": "bg-emerald-600", "الدوري المغربي": "bg-emerald-600",
  "Champions League": "bg-yellow-600", "دوري أبطال أوروبا": "bg-yellow-600",
  "Europa League": "bg-orange-600", "الدوري الأوروبي": "bg-orange-600",
  "World Cup": "bg-amber-600", "كأس العالم": "bg-amber-600",
};

function getLeagueColor(league) {
  for (const [key, color] of Object.entries(LEAGUE_COLORS)) {
    if (league?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "bg-gray-600";
}

function StatusBadge({ status, metadata }) {
  if (status === "live" || status === "inprogress") {
    const minute = metadata?.period?.minute;
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-600/10 px-2 py-0.5 rounded-full shrink-0">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        LIVE{minute ? ` ${minute}'` : ""}
      </span>
    );
  }
  if (status === "finished") return <span className="text-[11px] font-bold text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full shrink-0">FT</span>;
  if (status === "cancelled") return <span className="text-[11px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full shrink-0">CANC</span>;
  return null;
}

function TeamLogo({ url, name, size = 24 }) {
  const [error, setError] = useState(false);
  if (error || !url) {
    return (
      <div
        className="rounded-full bg-gray-800 flex items-center justify-center shrink-0 ring-1 ring-gray-700"
        style={{ width: size, height: size }}
      >
        <span className="font-bold text-gray-600" style={{ fontSize: Math.max(10, size * 0.4) }}>
          {name?.charAt(0) || "?"}
        </span>
      </div>
    );
  }
  return (
    <div
      className="rounded-full overflow-hidden bg-gray-800 ring-1 ring-gray-700 shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <img src={url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" onError={() => setError(true)} />
    </div>
  );
}

function CompactMatchRow({ match }) {
  const meta = match?.metadata || {};
  const isLive = match?.status === "live" || match?.status === "inprogress";
  const isFinished = match?.status === "finished";
  const showScore = isLive || isFinished;

  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-xl hover:bg-[#1a1d2e] transition-colors border border-transparent hover:border-gray-800/50 group"
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className="text-sm sm:text-[15px] font-semibold text-gray-200 truncate text-right max-w-[110px] sm:max-w-[160px] group-hover:text-white transition-colors">
          {match.home_team}
        </span>
        <TeamLogo url={meta.teamALogo} name={match.home_team} size={22} />
      </div>

      <div className="flex flex-col items-center shrink-0 min-w-[60px] sm:min-w-[72px]">
        {showScore ? (
          <span className={`text-base sm:text-lg font-extrabold tabular-nums ${isLive ? "text-white" : "text-gray-400"}`}>
            {match.home_score ?? 0} - {match.away_score ?? 0}
          </span>
        ) : match.start_time ? (
          <span className="text-sm font-bold text-gray-400 tabular-nums">{formatTime(match.start_time)}</span>
        ) : (
          <span className="text-sm font-bold text-gray-600">VS</span>
        )}
        {isLive && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
            <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse delay-100" />
            <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse delay-200" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <TeamLogo url={meta.teamBLogo} name={match.away_team} size={22} />
        <span className="text-sm sm:text-[15px] font-semibold text-gray-200 truncate max-w-[110px] sm:max-w-[160px] group-hover:text-white transition-colors">
          {match.away_team}
        </span>
      </div>

      <StatusBadge status={match.status} metadata={meta} />
    </Link>
  );
}

function LeagueSection({ league, matches, total }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`w-2 h-2 rounded-full ${getLeagueColor(league)}`} />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{league}</span>
        <span className="text-[11px] text-gray-600">({total})</span>
      </div>
      <div className="bg-[#161827]/80 rounded-xl border border-gray-800/60 divide-y divide-gray-800/30">
        {matches.map((m) => (
          <CompactMatchRow key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

const KNOWN_COMPETITION_IDS = {
  "world-cup": "70excpe1synn9kadnbppahdn7",
  "champions-league": null,
};

export default function HomePage() {
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [dateTab, setDateTab] = useState("today");
  const leagueScrollRef = useRef(null);

  const leagues = [
    "World Cup", "Champions League", "Europa League",
    "La Liga", "Premier League", "Botola"
  ];

  function matchesLeague(match, pattern) {
    if (!pattern) return true;
    return ALLOWED_PATTERNS.some((a) =>
      a.toLowerCase().includes(pattern.toLowerCase()) &&
      match.league?.toLowerCase().includes(a.toLowerCase())
    );
  }

  const { data: matchesData } = useQuery({
    queryKey: ["football-matches", dateTab],
    queryFn: () => {
      const target = dateTab === "today" ? getDateStr() : dateTab === "tomorrow" ? getDateStr(1) : getDateStr(-1);
      return api.get("/matches/football", { params: { limit: 200 } }).then((r) => r.data);
    },
  });

  const { data: allLiveData } = useQuery({
    queryKey: ["football-live-all"],
    queryFn: () => api.get("/matches/football/live").then((r) => r.data),
    refetchInterval: 15000,
  });

  const allLive = allLiveData?.matches || [];
  const allMatches = matchesData?.matches || [];

  const targetDate = useMemo(() => {
    if (dateTab === "today") return getDateStr();
    if (dateTab === "tomorrow") return getDateStr(1);
    return getDateStr(-1);
  }, [dateTab]);

  const dayMatches = useMemo(() => {
    return allMatches.filter((m) => {
      if (!m.start_time || !isAllowed(m.league)) return false;
      if (!matchesLeague(m, selectedLeague)) return false;
      const md = new Date(m.start_time);
      if (isNaN(md.getTime())) return false;
      return md.toISOString().split("T")[0] === targetDate;
    });
  }, [allMatches, targetDate, selectedLeague]);

  const matchesByLeague = useMemo(() => {
    const order = [
      "World Cup", "كأس العالم",
      "Champions League", "دوري أبطال أوروبا",
      "Europa League", "الدوري الأوروبي",
      "La Liga", "الدوري الإسباني", "الليغا",
      "Premier League", "الدوري الإنجليزي",
      "Botola", "البطولة الاحترافية", "الدوري المغربي",
    ];
    const map = {};
    for (const m of dayMatches) {
      const l = m.league || "Other";
      if (!map[l]) map[l] = [];
      map[l].push(m);
    }
    const sorted = Object.entries(map).sort((a, b) => {
      const aLive = a[1].some((m) => m.status === "live" || m.status === "inprogress") ? 0 : 1;
      const bLive = b[1].some((m) => m.status === "live" || m.status === "inprogress") ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      const ai = order.findIndex((o) => a[0].toLowerCase().includes(o.toLowerCase()));
      const bi = order.findIndex((o) => b[0].toLowerCase().includes(o.toLowerCase()));
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
    return sorted;
  }, [dayMatches]);

  const standings = useStandings(KNOWN_COMPETITION_IDS[selectedLeague?.toLowerCase().replace(/\s+/g, "-")] || null);
  const topScorers = useTopScorers(KNOWN_COMPETITION_IDS[selectedLeague?.toLowerCase().replace(/\s+/g, "-")] || null);

  const liveOnScreen = dateTab === "today" ? allLive.filter((m) => isAllowed(m.league) && matchesLeague(m, selectedLeague)) : [];
  const hasLive = liveOnScreen.length > 0;

  const dateTabs = [
    { key: "yesterday", label: "Yesterday" },
    { key: "today", label: "Today" },
    { key: "tomorrow", label: "Tomorrow" },
  ];

  const showStandings = selectedLeague && KNOWN_COMPETITION_IDS[selectedLeague?.toLowerCase().replace(/\s+/g, "-")];

  return (
    <div className="min-h-screen bg-[#0f1119] text-gray-200">

      {/* Top bar: date nav + live count */}
      <div className="sticky top-16 z-30 bg-[#0f1119]/95 backdrop-blur-sm border-b border-gray-800/50">
        {/* Live bar */}
        {hasLive && dateTab === "today" && (
          <div className="max-w-6xl mx-auto px-4 py-2">
            <Link
              to="#live-matches"
              className="flex items-center gap-2 text-xs group"
            >
              <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {liveOnScreen.length} LIVE
              </span>
              <span className="text-gray-500 group-hover:text-gray-300 transition-colors truncate">
                {liveOnScreen[0]?.home_team} vs {liveOnScreen[0]?.away_team}
              </span>
              {liveOnScreen.length > 1 && (
                <span className="text-gray-600">+{liveOnScreen.length - 1} more</span>
              )}
            </Link>
          </div>
        )}

        {/* Date tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div className="flex items-center gap-1 bg-[#1a1d2e] rounded-lg p-0.5 border border-gray-800/50 w-fit">
            {dateTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDateTab(tab.key)}
                className={`px-4 py-1 rounded-md text-xs font-semibold transition-all ${
                  dateTab === tab.key
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* League tabs */}
        {leagues.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 pb-2 overflow-x-auto" ref={leagueScrollRef}>
            <div className="flex items-center gap-1.5 min-w-max pb-1">
              <button
                onClick={() => setSelectedLeague(null)}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                  selectedLeague === null
                    ? "bg-red-600/20 text-red-400 border border-red-600/30"
                    : "text-gray-500 hover:text-gray-300 border border-transparent hover:border-gray-700"
                }`}
              >
                All Leagues
              </button>
              {leagues.map((league) => (
                <button
                  key={league}
                  onClick={() => setSelectedLeague(league)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedLeague === league
                      ? "bg-red-600/20 text-red-400 border border-red-600/30"
                      : "text-gray-500 hover:text-gray-300 border border-transparent hover:border-gray-700"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getLeagueColor(league)}`} />
                  {league}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">

        {/* Live matches section */}
        {liveOnScreen.length > 0 && (
          <div id="live-matches" className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {liveOnScreen.length} LIVE
              </span>
              <span className="text-xs text-gray-500">Now playing</span>
            </div>
            <div className="space-y-px">
              {liveOnScreen.map((m) => (
                <CompactMatchRow key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {/* All matches grouped by league */}
        {matchesByLeague.length > 0 ? (
          matchesByLeague.map(([league, matches]) => (
            <LeagueSection key={league} league={league} matches={matches} total={matches.length} />
          ))
        ) : (
          <div className="text-center py-16 text-gray-600">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#1a1d2e] flex items-center justify-center border border-gray-800">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-500">No matches found</p>
            <p className="text-sm text-gray-600 mt-1">Try a different date or league</p>
          </div>
        )}
      </div>

      {/* Standings & Top Scorers */}
      {showStandings && (
        <div className="max-w-6xl mx-auto px-4 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">Standings — {selectedLeague}</h2>
            </div>
            <div className="bg-[#1a1d2e] rounded-xl border border-gray-800 overflow-hidden shadow-lg shadow-black/10">
              <StandingsTable data={standings.data} loading={standings.isLoading} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">Top Scorers — {selectedLeague}</h2>
            </div>
            <div className="bg-[#1a1d2e] rounded-xl border border-gray-800 overflow-hidden shadow-lg shadow-black/10">
              <TopScorers data={topScorers.data} loading={topScorers.isLoading} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
