import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api/client";
import { useState } from "react";
import { FiArrowLeft, FiPlay, FiClock, FiCalendar, FiMapPin } from "react-icons/fi";

function TeamLogo({ teamId, name, size = "lg" }) {
  const [error, setError] = useState(false);
  const dim = size === "lg" ? "w-20 h-20 sm:w-28 sm:h-28" : "w-10 h-10 sm:w-12 sm:h-12";
  if (!teamId || error) {
    return (
      <div className={`${dim} rounded-full bg-gray-200 dark:bg-dark-800 flex items-center justify-center ring-2 ring-gray-300 dark:ring-dark-700`}>
        <span className="text-2xl font-bold text-gray-400 dark:text-dark-500">{name?.charAt(0)}</span>
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-full bg-gray-200 dark:bg-dark-800 flex items-center justify-center overflow-hidden ring-2 ring-gray-300 dark:ring-dark-700`}>
      <img src={`/api/team-logo/${teamId}`} alt="" className="w-full h-full object-contain p-1" loading="lazy" onError={() => setError(true)} />
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MatchDetailPage() {
  const { id } = useParams();

  const { data: match, isLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: () => api.get(`/matches/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-red" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 dark:text-dark-300 mb-4">Match not found</p>
        <Link to="/matches" className="btn-primary">Back to Matches</Link>
      </div>
    );
  }

  const meta = match.metadata || {};
  const isLive = match.status === "live" || match.status === "inprogress";
  const isFinished = match.status === "finished";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Link to="/matches" className="inline-flex items-center gap-1.5 text-gray-400 dark:text-dark-400 hover:text-brand-purple dark:hover:text-white transition-colors text-sm font-medium">
        <FiArrowLeft size={14} /> Back to Matches
      </Link>

      <div className="block-card relative">
        <div className="bg-gradient-to-r from-brand-purple to-purple-800 px-6 sm:px-8 py-6 text-white text-center">
          {match.league && (
            <p className="text-[11px] text-purple-300 uppercase tracking-wider mb-4">{match.league}</p>
          )}
          <div className="flex items-center justify-center gap-4 sm:gap-10 md:gap-16">
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamLogo teamId={meta.homeTeamId} name={match.home_team} size="lg" />
              <span className="font-bold text-base sm:text-xl text-white/90">{match.home_team}</span>
            </div>

            <div className="shrink-0 text-center">
              {isLive || isFinished ? (
                <div>
                  <div className="text-4xl sm:text-6xl font-extrabold tabular-nums tracking-tighter">
                    <span className={isLive ? "text-white" : "text-white/80"}>{match.home_score ?? 0}</span>
                    <span className="text-purple-300 mx-1 sm:mx-2">-</span>
                    <span className={isLive ? "text-white" : "text-white/80"}>{match.away_score ?? 0}</span>
                  </div>
                  {isLive && (
                    <div className="mt-3 flex items-center justify-center gap-1.5 bg-red-600/30 text-red-300 text-xs font-bold px-3 py-1.5 rounded-full border border-red-500/30">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                      LIVE
                    </div>
                  )}
                  {isFinished && (
                    <div className="mt-2 text-xs font-semibold text-purple-300">Full Time</div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-sm font-semibold text-purple-300 mb-2">VS</div>
                  {match.start_time && (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl font-bold text-white">{formatTime(match.start_time)}</span>
                      <span className="text-[11px] text-purple-300">{formatDate(match.start_time)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamLogo teamId={meta.awayTeamId} name={match.away_team} size="lg" />
              <span className="font-bold text-base sm:text-xl text-white/90">{match.away_team}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-6">
            {match.start_time && (
              <span className="flex items-center gap-1.5 text-xs text-purple-300">
                <FiCalendar size={12} /> {formatDate(match.start_time)}
              </span>
            )}
            {meta.tournamentName && (
              <span className="flex items-center gap-1.5 text-xs text-purple-300">
                <FiMapPin size={12} /> {meta.tournamentName}
              </span>
            )}
          </div>

          {(isLive || match.status === "scheduled" || match.status === "notstarted") && (
            <div className="flex justify-center mt-6">
              <Link to={`/watch/${match.id}`} className="bg-brand-red hover:bg-red-700 text-white font-bold text-base px-8 py-3 rounded-xl inline-flex items-center gap-2 transition-all shadow-lg">
                <FiPlay size={18} />
                {isLive ? "Watch Live" : "Watch Match"}
              </Link>
            </div>
          )}
        </div>

        {(meta.homeScorePeriod1 !== null || meta.awayScorePeriod1 !== null) && (
          <div className="p-5">
            <h2 className="font-semibold text-sm text-gray-700 dark:text-dark-200 mb-4">Period Scores</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "1st Half", home: meta.homeScorePeriod1, away: meta.awayScorePeriod1 },
                { label: "2nd Half", home: meta.homeScorePeriod2, away: meta.awayScorePeriod2 },
              ].map((period) => (
                <div key={period.label} className="stat-card flex items-center justify-between text-sm">
                  <span className="text-gray-400 dark:text-dark-400">{period.label}</span>
                  <span className="font-mono font-semibold text-gray-700 dark:text-dark-200">
                    {period.home ?? "-"} - {period.away ?? "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {meta.tournamentName && (
          <div className="px-5 pb-5">
            <h2 className="font-semibold text-sm text-gray-700 dark:text-dark-200 mb-4">Tournament Info</h2>
            <div className="stat-card divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-gray-400 dark:text-dark-400">Tournament</span>
                <span className="font-medium text-gray-700 dark:text-dark-200">{meta.tournamentName}</span>
              </div>
              {meta.categoryName && (
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-400 dark:text-dark-400">Category</span>
                  <span className="font-medium text-gray-700 dark:text-dark-200">{meta.categoryName}</span>
                </div>
              )}
              {meta.round && (
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-400 dark:text-dark-400">Round</span>
                  <span className="font-medium text-gray-700 dark:text-dark-200">Round {meta.round}</span>
                </div>
              )}
              {match.start_time && (
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-400 dark:text-dark-400">Kick-off</span>
                  <span className="font-medium text-gray-700 dark:text-dark-200">{formatDate(match.start_time)}, {formatTime(match.start_time)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
