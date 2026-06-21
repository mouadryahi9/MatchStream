import { useParams, Link } from "react-router-dom";
import { useMatch } from "../hooks/useMatches";
import { useStream } from "../hooks/useStreams";
import { FiArrowLeft, FiPlay, FiCalendar, FiClock, FiActivity } from "react-icons/fi";

export default function MatchDetailPage() {
  const { id } = useParams();
  const { data: match, isLoading } = useMatch(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-500"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="card p-12 text-center">
        <p className="text-dark-400 mb-4">Match not found</p>
        <Link to="/matches" className="btn-primary">Back to Matches</Link>
      </div>
    );
  }

  const startDate = match.start_time ? new Date(match.start_time) : null;

  return (
    <div>
      <Link to="/matches" className="inline-flex items-center gap-1 text-dark-400 hover:text-white mb-6 transition-colors">
        <FiArrowLeft /> Back to Matches
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <span className={`badge ${match.status === "live" ? "badge-live" : match.status === "scheduled" ? "badge-scheduled" : "badge-finished"} mb-2`}>
              {match.status}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold">{match.title}</h1>
            {match.league && <p className="text-dark-400 mt-1">{match.league}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-dark-400 mb-6">
          <span className="flex items-center gap-1"><FiActivity /> {match.sport}</span>
          {startDate && (
            <>
              <span className="flex items-center gap-1"><FiCalendar /> {startDate.toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><FiClock /> {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </>
          )}
        </div>

        {(match.home_team || match.away_team) && (
          <div className="grid grid-cols-3 gap-4 max-w-md mb-6">
            <div className="text-center p-4 bg-dark-700 rounded-lg">
              <p className="font-semibold">{match.home_team || "TBD"}</p>
              <p className="text-xs text-dark-400">Home</p>
            </div>
            <div className="text-center p-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-dark-400">VS</span>
            </div>
            <div className="text-center p-4 bg-dark-700 rounded-lg">
              <p className="font-semibold">{match.away_team || "TBD"}</p>
              <p className="text-xs text-dark-400">Away</p>
            </div>
          </div>
        )}

        {match.status === "live" || match.status === "scheduled" ? (
          <Link to={`/watch/${match.id}`} className="btn-primary inline-flex items-center gap-2">
            <FiPlay /> {match.status === "live" ? "Watch Live" : "View Streams"}
          </Link>
        ) : (
          <span className="text-dark-400 text-sm">This match has ended</span>
        )}
      </div>

      {match.metadata && Object.keys(match.metadata).length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Match Info</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(match.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between py-1 border-b border-dark-700">
                <span className="text-dark-400 capitalize">{key.replace(/_/g, " ")}</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
