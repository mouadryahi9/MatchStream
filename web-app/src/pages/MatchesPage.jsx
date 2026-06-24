import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api/client";
import MatchCard from "../components/MatchCard";
import { FiSearch, FiChevronLeft, FiChevronRight, FiCalendar } from "react-icons/fi";

function getDateRange(tab) {
  const d = new Date();
  if (tab === "yesterday") d.setDate(d.getDate() - 1);
  if (tab === "tomorrow") d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function MatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateTab = searchParams.get("tab") || "today";
  const leagueFilter = searchParams.get("league") || "";
  const statusFilter = searchParams.get("status") || "";
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["football-matches-list", page],
    queryFn: () => api.get("/matches/football", { params: { page, limit: 100 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: liveData } = useQuery({
    queryKey: ["football-live-list"],
    queryFn: () => api.get("/matches/football/live").then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: leaguesData } = useQuery({
    queryKey: ["football-leagues-list"],
    queryFn: () => api.get("/matches/football/leagues").then((r) => r.data),
  });

  const allMatches = data?.matches || [];
  const liveMatches = liveData?.matches || [];
  const leagues = leaguesData?.leagues || [];

  const [search, setSearch] = useState("");

  const filteredByDate = statusFilter === "live"
    ? liveMatches
    : allMatches.filter((m) => {
        if (!m.start_time) return false;
        return new Date(m.start_time).toISOString().split("T")[0] === getDateRange(dateTab);
      });

  const filtered = useMemo(() => {
    let list = leagueFilter ? filteredByDate.filter((m) => m.league === leagueFilter) : filteredByDate;
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (m) =>
        m.home_team?.toLowerCase().includes(q) ||
        m.away_team?.toLowerCase().includes(q) ||
        m.league?.toLowerCase().includes(q) ||
        m.title?.toLowerCase().includes(q)
    );
  }, [filteredByDate, search, leagueFilter]);

  const setParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
    setPage(1);
  };

  const dateLabel = dateTab === "yesterday" ? "Yesterday" : dateTab === "today" ? "Today" : "Tomorrow";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Football Matches</h1>
        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search teams, leagues..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
        {["yesterday", "today", "tomorrow"].map((tab) => (
          <button
            key={tab}
            onClick={() => setParam("tab", tab)}
            className={`tab-btn whitespace-nowrap ${(dateTab === tab && !statusFilter) ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            {tab === "yesterday" ? "Yesterday" : tab === "today" ? "Today" : "Tomorrow"}
          </button>
        ))}
        {liveMatches.length > 0 && (
          <button
            onClick={() => setParam("status", statusFilter === "live" ? "" : "live")}
            className={`tab-btn flex items-center gap-1.5 ${statusFilter === "live" ? "bg-red-600 text-white" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === "live" ? "bg-white animate-pulse" : "bg-red-500"}`} />
            {liveMatches.length} LIVE
          </button>
        )}
        {leagueFilter && (
          <button onClick={() => setParam("league", "")} className="tab-btn bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">
            Clear: {leagueFilter} ✕
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-red" />
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="block-card divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
          {!statusFilter && data && data.total > 100 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">{data.total} matches</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-30"
                >
                  <FiChevronLeft /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil((data.total || 0) / 100)}
                  className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-30"
                >
                  Next <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 block-card">
          <FiCalendar className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={36} />
          <p className="text-gray-500 dark:text-gray-400 mb-1">No matches for {dateLabel.toLowerCase()}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Try a different date or search term</p>
        </div>
      )}

      {leagues.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Browse by League</h2>
          <div className="flex flex-wrap gap-2">
            {leagues.slice(0, 20).map((league) => (
              <button
                key={league}
                onClick={() => setParam("league", league)}
                className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                {league}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
