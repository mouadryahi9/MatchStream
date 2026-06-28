import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api/client";
import { useState } from "react";
import { FiArrowLeft, FiPlay, FiCalendar, FiClock, FiMapPin } from "react-icons/fi";

function TeamLogo({ url, name, size = "lg" }) {
  const [error, setError] = useState(false);
  const dim = size === "lg" ? "w-24 h-24 sm:w-32 sm:h-32" : "w-12 h-12 sm:w-14 sm:h-14";
  if (!url || error) {
    return (
      <div className={`${dim} rounded-full bg-white/5 flex items-center justify-center ring-1 ring-white/10 backdrop-blur-sm`}>
        <span className="text-3xl font-bold text-white/30">{name?.charAt(0) || "?"}</span>
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-full bg-white/5 flex items-center justify-center overflow-hidden ring-1 ring-white/10 backdrop-blur-sm transition-transform duration-300 hover:scale-105`}>
      <img src={url} alt="" className="w-full h-full object-contain p-1.5" loading="lazy" onError={() => setError(true)} />
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
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/10 border-t-brand-red" />
          <div className="absolute inset-0 animate-pulse rounded-full h-12 w-12 border-2 border-brand-red/20" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-16 backdrop-blur-sm">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <FiClock className="text-white/20" size={28} />
          </div>
          <p className="text-white/40 text-lg mb-6 font-light">Match not found</p>
          <Link to="/matches" className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white/70 rounded-xl text-sm transition-all">Back to Matches</Link>
        </div>
      </div>
    );
  }

  const meta = match.metadata || {};
  const isLive = match.status === "live" || match.status === "inprogress";
  const isFinished = match.status === "finished";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <Link to="/matches" className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm mb-6 group">
        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
          <FiArrowLeft size={14} />
        </div>
        <span className="font-medium">Back</span>
      </Link>

      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#0c0c1a] via-[#12122a] to-[#0c0c1a] border border-white/[0.04]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial from-blue-500/[0.04] to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-radial from-purple-500/[0.03] to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.015)_0%,transparent_60%)]" />
        </div>

        <div className="relative px-6 sm:px-10 lg:px-14 pt-8 sm:pt-10 pb-8 sm:pb-10 text-center">
          {match.league && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/40 text-[11px] font-medium uppercase tracking-[0.15em] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              {match.league}
            </div>
          )}

          <div className="flex items-center justify-center gap-6 sm:gap-12 md:gap-20">
            <div className="flex-1 flex flex-col items-center gap-3 sm:gap-4">
              <TeamLogo url={meta.teamALogo} name={match.home_team} size="lg" />
              <span className="font-semibold text-sm sm:text-base text-white/60 leading-tight max-w-[140px]">{match.home_team}</span>
            </div>

            <div className="shrink-0">
              {isLive || isFinished ? (
                <div className="flex flex-col items-center">
                  <div className="text-5xl sm:text-7xl md:text-8xl font-bold tabular-nums tracking-tight text-white">
                    <span className={isLive ? "text-white" : "text-white/60"}>{match.home_score ?? 0}</span>
                    <span className="text-white/[0.07] mx-2 sm:mx-3 font-thin text-4xl sm:text-5xl md:text-6xl align-middle">:</span>
                    <span className={isLive ? "text-white" : "text-white/60"}>{match.away_score ?? 0}</span>
                  </div>
                  {isLive && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/15">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/30" />
                      <span className="text-red-400 text-[11px] font-bold uppercase tracking-widest">Live</span>
                    </div>
                  )}
                  {isFinished && (
                    <div className="mt-4 text-white/20 text-xs font-medium uppercase tracking-widest">Final</div>
                  )}
                  {meta.period?.minute && isLive && (
                    <div className="mt-2 text-white/20 text-xs">{meta.period.minute}'</div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="text-xs font-medium text-white/20 uppercase tracking-[0.2em] mb-3">VS</div>
                  {match.start_time && (
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white/90 tracking-tight">{formatTime(match.start_time)}</span>
                      <span className="text-white/25 text-xs sm:text-sm font-light">{formatDate(match.start_time)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center gap-3 sm:gap-4">
              <TeamLogo url={meta.teamBLogo} name={match.away_team} size="lg" />
              <span className="font-semibold text-sm sm:text-base text-white/60 leading-tight max-w-[140px] text-center">{match.away_team}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 sm:mt-10">
            {match.start_time && (
              <span className="inline-flex items-center gap-2 text-white/20 text-xs">
                <FiCalendar size={12} /> {formatDate(match.start_time)}
              </span>
            )}
            {meta.tournamentName && (
              <span className="inline-flex items-center gap-2 text-white/20 text-xs">
                <FiMapPin size={12} /> {meta.tournamentName}
              </span>
            )}
          </div>

          {(isLive || match.status === "scheduled" || match.status === "notstarted") && (
            <div className="flex justify-center mt-8 sm:mt-10">
              <Link
                to={`/watch/${match.id}`}
                className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-brand-red to-red-600 hover:from-red-500 hover:to-red-700 transition-all duration-300 shadow-xl shadow-red-600/20 hover:shadow-red-600/40 active:scale-[0.98]"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
                    <FiPlay size={15} className="ml-0.5" />
                  </div>
                  <span>{isLive ? "Watch Live" : "Watch Match"}</span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {meta.tournamentName && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-white/30 text-[11px] uppercase tracking-[0.15em] font-medium">Competition</span>
            </div>
            <p className="text-white/60 text-sm sm:text-base">{meta.tournamentName}</p>
            {meta.categoryName && (
              <p className="text-white/20 text-xs mt-1">{meta.categoryName}</p>
            )}
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-white/30 text-[11px] uppercase tracking-[0.15em] font-medium">Kick-off</span>
            </div>
            {match.start_time ? (
              <>
                <p className="text-white/60 text-sm sm:text-base">{formatDate(match.start_time)}</p>
                <p className="text-white/30 text-xs mt-1">{formatTime(match.start_time)}</p>
              </>
            ) : (
              <p className="text-white/20 text-sm">TBD</p>
            )}
          </div>
          {meta.round && (
            <div className="rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 sm:p-5 sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-white/30 text-[11px] uppercase tracking-[0.15em] font-medium">Round</span>
              </div>
              <p className="text-white/60 text-sm sm:text-base">Round {meta.round}</p>
            </div>
          )}
        </div>
      )}

      {(meta.homeScorePeriod1 !== null || meta.awayScorePeriod1 !== null) && (
        <div className="mt-6">
          <div className="rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-white/30 text-[11px] uppercase tracking-[0.15em] font-medium">Period Scores</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "1st Half", home: meta.homeScorePeriod1, away: meta.awayScorePeriod1 },
                { label: "2nd Half", home: meta.homeScorePeriod2, away: meta.awayScorePeriod2 },
              ].map((period) => (
                <div key={period.label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-white/30 text-xs">{period.label}</span>
                  <span className="font-mono font-semibold text-white/50 text-sm">
                    {period.home ?? "-"} : {period.away ?? "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
