import { Link } from "react-router-dom";
import { FiClock, FiCalendar, FiTv } from "react-icons/fi";

const statusBadge = {
  live: "badge badge-live",
  scheduled: "badge badge-scheduled",
  finished: "badge badge-finished",
  cancelled: "badge bg-red-900 text-red-300",
};

export default function MatchCard({ match }) {
  const startDate = match.start_time ? new Date(match.start_time) : null;

  return (
    <Link to={`/matches/${match.id}`} className="card block">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={statusBadge[match.status] || "badge bg-dark-600"}>{match.status}</span>
          <span className="text-xs text-dark-400">{match.sport}</span>
        </div>

        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{match.title}</h3>

        {(match.home_team || match.away_team) && (
          <p className="text-sm text-dark-300 mb-3">{match.home_team} vs {match.away_team}</p>
        )}

        <div className="flex items-center justify-between text-xs text-dark-400">
          {startDate ? (
            <span className="flex items-center gap-1">
              <FiCalendar size={12} />
              {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span className="flex items-center gap-1"><FiClock size={12} /> TBD</span>
          )}
          <FiTv size={14} />
        </div>
      </div>
    </Link>
  );
}
