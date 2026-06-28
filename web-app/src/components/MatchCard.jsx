import { useState } from "react";
import { Link } from "react-router-dom";

function TeamLogo({ url, name, size = 32 }) {
  const [error, setError] = useState(false);
  if (error || !url) {
    return (
      <div className="rounded-full bg-gray-800 flex items-center justify-center shrink-0 ring-1 ring-gray-700" style={{ width: size, height: size }}>
        <span className="font-bold text-gray-600" style={{ fontSize: Math.max(10, size * 0.4) }}>{name?.charAt(0) || "?"}</span>
      </div>
    );
  }
  return (
    <div className="rounded-full overflow-hidden bg-gray-800 ring-1 ring-gray-700 shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <img src={url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" onError={() => setError(true)} />
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function MatchCard({ match }) {
  const meta = match?.metadata || {};
  const isLive = match?.status === "live" || match?.status === "inprogress";
  const isFinished = match?.status === "finished";
  const showScore = isLive || isFinished;

  return (
    <Link
      to={`/matches/${match?.id}`}
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-xl hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-800 group"
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className="text-sm sm:text-[15px] font-semibold text-gray-200 truncate text-right max-w-[110px] sm:max-w-[160px] group-hover:text-white transition-colors">
          {match?.home_team}
        </span>
        <TeamLogo url={meta?.teamALogo} name={match?.home_team} size={22} />
      </div>

      <div className="flex flex-col items-center shrink-0 min-w-[60px] sm:min-w-[72px]">
        {showScore ? (
          <span className={`text-base sm:text-lg font-extrabold tabular-nums ${isLive ? "text-white" : "text-gray-400"}`}>
            {match?.home_score ?? 0} - {match?.away_score ?? 0}
          </span>
        ) : match?.start_time ? (
          <span className="text-sm font-bold text-gray-400 tabular-nums">{formatTime(match.start_time)}</span>
        ) : (
          <span className="text-sm font-bold text-gray-600">VS</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <TeamLogo url={meta?.teamBLogo} name={match?.away_team} size={22} />
        <span className="text-sm sm:text-[15px] font-semibold text-gray-200 truncate max-w-[110px] sm:max-w-[160px] group-hover:text-white transition-colors">
          {match?.away_team}
        </span>
      </div>

      {isLive && (
        <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-600/10 px-2 py-0.5 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          LIVE
        </span>
      )}
      {isFinished && (
        <span className="text-[11px] font-bold text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full shrink-0">FT</span>
      )}
    </Link>
  );
}
