import { useState } from "react";
import { Link } from "react-router-dom";
import { FiClock } from "react-icons/fi";

function TeamLogo({ teamId, name, imageUrl, size = 48 }) {
  const [error, setError] = useState(false);
  const px = typeof size === "number" ? `${size}px` : size;
  const src = (!error && (imageUrl || (teamId ? `/api/team-logo/${teamId}` : null)));
  if (!src) {
    return (
      <div className="rounded-full bg-gray-800 flex items-center justify-center shrink-0 ring-2 ring-gray-700" style={{ width: px, height: px }}>
        <span className="font-bold text-gray-500" style={{ fontSize: Math.max(14, parseInt(px) * 0.4) }}>{name?.charAt(0) || "?"}</span>
      </div>
    );
  }
  return (
    <div className="rounded-full overflow-hidden bg-gray-800 ring-2 ring-gray-700 shrink-0 flex items-center justify-center" style={{ width: px, height: px }}>
      <img src={src} alt="" className="w-full h-full object-contain p-1" loading="lazy" onError={() => setError(true)} />
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

const statusLabels = {
  live: { text: "LIVE", class: "bg-red-600 text-white" },
  inprogress: { text: "LIVE", class: "bg-red-600 text-white" },
  finished: { text: "FT", class: "bg-gray-700 text-gray-300" },
  scheduled: { text: "لم تبدأ بعد", class: "bg-gray-700/50 text-gray-400" },
  notstarted: { text: "لم تبدأ بعد", class: "bg-gray-700/50 text-gray-400" },
};

function ScoreDisplay({ match }) {
  const isLive = match?.status === "live" || match?.status === "inprogress";
  const isFinished = match?.status === "finished";
  const meta = match?.metadata || {};

  if (isLive || isFinished) {
    return (
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <span className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${isLive ? "text-white" : "text-gray-400"}`}>
            {match?.home_score ?? 0}
          </span>
          <span className="text-gray-600 text-lg font-bold mx-0.5">-</span>
          <span className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${isLive ? "text-white" : "text-gray-400"}`}>
            {match?.away_score ?? 0}
          </span>
        </div>
        {meta?.homeScorePeriod1 !== undefined && meta?.homeScorePeriod1 !== null && (
          <div className="text-[10px] text-gray-500 mt-0.5">
            ({meta.homeScorePeriod1}-{meta.awayScorePeriod1})
          </div>
        )}
      </div>
    );
  }

  if (match?.start_time) {
    return (
      <div className="text-center">
        <span className="text-lg sm:text-xl font-bold text-gray-400">VS</span>
        <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
          <FiClock size={10} /> {formatTime(match.start_time)}
        </div>
      </div>
    );
  }

  return <span className="text-lg font-bold text-gray-500">VS</span>;
}

function GoalScorers({ match }) {
  const meta = match?.metadata || {};
  const homeScorers = meta?.homeScorePeriod1 !== undefined && meta?.homeScorePeriod1 > 0
    ? `${meta.homeScorePeriod1} goals` : null;
  if (!homeScorers && !meta?.awayScorePeriod1) return null;

  return (
    <div className="mt-2 text-[11px] text-gray-500 leading-tight text-center max-w-full truncate">
      {match?.status === "finished" && (
        <span className="text-gray-600">{match.home_team} {match.home_score} - {match.away_score} {match.away_team}</span>
      )}
    </div>
  );
}

export default function MatchCard({ match }) {
  const meta = match?.metadata || {};
  const statusInfo = statusLabels[match?.status] || statusLabels.scheduled;

  return (
    <Link
      to={`/matches/${match?.id}`}
      className="block bg-[#1a1d2e] hover:bg-[#202436] border border-gray-800 hover:border-red-900/50 rounded-xl p-4 transition-all group"
    >
      {match?.league && (
        <p className="text-[11px] text-gray-500 mb-3 text-center truncate font-medium uppercase tracking-wider">{match.league}</p>
      )}

      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <TeamLogo teamId={meta?.homeTeamId} name={match?.home_team} imageUrl={meta?.teamALogo} size={52} />
          <span className="text-xs sm:text-sm font-semibold text-gray-200 text-center truncate max-w-full leading-tight">
            {match?.home_team}
          </span>
        </div>

        <div className="flex flex-col items-center shrink-0 min-w-[80px]">
          <ScoreDisplay match={match} />
          <span className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.class}`}>
            {statusInfo.text}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <TeamLogo teamId={meta?.awayTeamId} name={match?.away_team} imageUrl={meta?.teamBLogo} size={52} />
          <span className="text-xs sm:text-sm font-semibold text-gray-200 text-center truncate max-w-full leading-tight">
            {match?.away_team}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MatchCardGrid({ match }) {
  return <MatchCard match={match} />;
}
