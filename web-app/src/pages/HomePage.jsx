import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../services/api/client";
import MatchCard from "../components/MatchCard";
import StandingsTable from "../components/StandingsTable";
import TopScorers from "../components/TopScorers";
import { useStandings, useTopScorers } from "../hooks/useKooora";

const LEAGUES = [
  { key: "world-cup", label: "World Cup", queries: ["%World Cup%", "%كأس العالم%"], competitionId: "70excpe1synn9kadnbppahdn7" },
  { key: "ucl", label: "Champions League", queries: ["%Champions%", "%الأبطال%"], competitionId: null },
  { key: "laliga", label: "La Liga", queries: ["%La Liga%", "%الليغا%"], competitionId: null },
  { key: "botola", label: "Botola", queries: ["%Botola%", "%البطولة%"], competitionId: null },
];

function getDateStr(offset = 0) {
  const d = new Date();
  if (offset) d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

export default function HomePage() {
  const [leagueTab, setLeagueTab] = useState("world-cup");
  const [dateTab, setDateTab] = useState("today");

  const activeLeague = LEAGUES.find((l) => l.key === leagueTab);

  const { data: liveData } = useQuery({
    queryKey: ["football-live", activeLeague?.key],
    queryFn: () => api.get("/matches/football/live", { params: { league: activeLeague?.queries?.join(",") } }).then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: matchesData } = useQuery({
    queryKey: ["football-matches", activeLeague?.key],
    queryFn: () => api.get("/matches/football", { params: { league: activeLeague?.queries?.join(","), limit: 100 } }).then((r) => r.data),
  });

  const { data: allLiveData } = useQuery({
    queryKey: ["football-live-all"],
    queryFn: () => api.get("/matches/football/live").then((r) => r.data),
    refetchInterval: 15000,
  });

  const standings = useStandings(activeLeague?.competitionId);
  const topScorers = useTopScorers(activeLeague?.competitionId);

  const liveMatches = liveData?.matches || [];
  const allLive = allLiveData?.matches || [];
  const allMatches = matchesData?.matches || [];

  const dayMatches = useMemo(() => {
    const target = dateTab === "today" ? getDateStr() : dateTab === "tomorrow" ? getDateStr(1) : getDateStr(-1);
    return allMatches.filter((m) => {
      if (!m.start_time) return false;
      return new Date(m.start_time).toISOString().split("T")[0] === target;
    });
  }, [allMatches, dateTab]);

  const dateTabs = [
    { key: "yesterday", label: "Yesterday" },
    { key: "today", label: "Today" },
    { key: "tomorrow", label: "Tomorrow" },
  ];

  const heroMatch = allLive[0] || liveMatches[0];

  return (
    <div className="min-h-screen bg-[#0f1119] text-gray-200">

      {/* Hero section */}
      {heroMatch && dateTab === "today" && (
        <div className="relative overflow-hidden bg-gradient-to-b from-[#1a1d2e] to-[#0f1119] border-b border-gray-800/50">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjI4M0EiIGZpbGwtb3BhY2l0eT0iMC4xNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 relative">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-bold uppercase px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {allLive.length} LIVE
              </span>
              <span className="text-xs text-gray-500">{heroMatch.league || "Featured Match"}</span>
            </div>
            <Link
              to={`/matches/${heroMatch.id}`}
              className="block bg-[#1a1d2e]/80 hover:bg-[#202436]/80 border border-gray-700/50 hover:border-red-900/50 rounded-2xl p-6 sm:p-8 transition-all group"
            >
              <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-12">
                <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-800 ring-2 ring-gray-700 flex items-center justify-center">
                    {heroMatch.metadata?.teamALogo ? (
                      <img src={heroMatch.metadata.teamALogo} alt="" className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <span className="text-xl sm:text-2xl font-bold text-gray-500">{heroMatch.home_team?.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-sm sm:text-base font-bold text-white text-center truncate max-w-[120px] sm:max-w-[160px]">
                    {heroMatch.home_team}
                  </span>
                </div>

                <div className="flex flex-col items-center shrink-0">
                  <div className="text-3xl sm:text-5xl font-extrabold text-white flex items-center gap-2 sm:gap-3 tabular-nums">
                    <span className="text-white">{heroMatch.home_score ?? "—"}</span>
                    <span className="text-gray-600 text-2xl sm:text-4xl font-bold">:</span>
                    <span className="text-white">{heroMatch.away_score ?? "—"}</span>
                  </div>
                  <span className="mt-2 text-[11px] font-bold bg-red-600/20 text-red-400 px-3 py-0.5 rounded-full uppercase tracking-wider">
                    {heroMatch.status === "live" || heroMatch.status === "inprogress" ? "Live" : "Upcoming"}
                  </span>
                  {heroMatch.metadata?.period && (
                    <span className="mt-1 text-[10px] text-gray-500">
                      {heroMatch.metadata.period.minute}&#39;{heroMatch.metadata.period.extra ? `+${heroMatch.metadata.period.extra}` : ""}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-800 ring-2 ring-gray-700 flex items-center justify-center">
                    {heroMatch.metadata?.teamBLogo ? (
                      <img src={heroMatch.metadata.teamBLogo} alt="" className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <span className="text-xl sm:text-2xl font-bold text-gray-500">{heroMatch.away_team?.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-sm sm:text-base font-bold text-white text-center truncate max-w-[120px] sm:max-w-[160px]">
                    {heroMatch.away_team}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* League tabs */}
        <div className="flex items-center justify-center gap-2 mb-5 bg-[#1a1d2e] rounded-xl p-1.5 border border-gray-800 shadow-lg shadow-black/20">
          {LEAGUES.map((l) => (
            <button
              key={l.key}
              onClick={() => { setLeagueTab(l.key); setDateTab("today"); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                leagueTab === l.key
                  ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-600/25"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Date tabs */}
        <div className="flex items-center justify-center gap-2 mb-6 bg-[#1a1d2e]/60 rounded-lg p-1 border border-gray-800/50">
          {dateTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDateTab(tab.key)}
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                dateTab === tab.key
                  ? "bg-red-600/80 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live matches section */}
        {liveMatches.length > 0 && dateTab === "today" && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-bold uppercase px-3 py-1 rounded-full shadow-lg shadow-red-600/20">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {liveMatches.length} LIVE
              </span>
              <span className="text-xs text-gray-500 font-medium">{activeLeague?.label}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {liveMatches.slice(0, 6).map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {/* All matches */}
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            {dateTab === "today" ? "Today's Matches" : dateTab === "tomorrow" ? "Tomorrow's Matches" : "Yesterday's Matches"}
            <span className="text-gray-600 ml-2 font-normal">({dayMatches.length})</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dayMatches.length > 0 ? (
            dayMatches.map((m) => <MatchCard key={m.id} match={m} />)
          ) : (
            <div className="col-span-full text-center py-16 text-gray-600">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1d2e] flex items-center justify-center border border-gray-800">
                <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-500">No matches for {activeLeague?.label}</p>
              <p className="text-sm text-gray-600 mt-1">Check another day or league</p>
            </div>
          )}
        </div>
      </div>

      {/* Standings & Top Scorers */}
      {activeLeague?.competitionId && (
        <div className="max-w-6xl mx-auto px-4 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">Standings — {activeLeague.label}</h2>
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
              <h2 className="text-lg font-bold text-white">Top Scorers — {activeLeague.label}</h2>
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
