import { useParams, Link } from "react-router-dom";
import { useMatch } from "../hooks/useMatches";
import { useStream } from "../hooks/useStreams";
import VideoPlayer from "../components/VideoPlayer";
import { FiArrowLeft, FiAlertCircle } from "react-icons/fi";

export default function WatchPage() {
  const { id } = useParams();
  const { data: match, isLoading: matchLoading } = useMatch(id);
  const { data: stream, isLoading: streamLoading } = useStream(id);

  if (matchLoading || streamLoading) {
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

  return (
    <div>
      <Link to={`/matches/${id}`} className="inline-flex items-center gap-1 text-dark-400 hover:text-white mb-4 transition-colors">
        <FiArrowLeft /> {match.title}
      </Link>

      {stream?.hls_url ? (
        <VideoPlayer
          streamUrl={stream.hls_url.startsWith("http") ? stream.hls_url : `${window.location.origin}${stream.hls_url}`}
          streamType={stream.stream_type || "hls"}
          fallbackUrl={stream.source_url}
        />
      ) : stream?.status === "idle" || stream?.status === "starting" ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-300">Stream is starting...</p>
          <p className="text-dark-500 text-sm mt-2">Please wait while we connect to the stream</p>
        </div>
      ) : stream?.status === "error" ? (
        <div className="card p-12 text-center">
          <FiAlertCircle className="mx-auto mb-4 text-red-400" size={40} />
          <p className="text-red-400 font-medium mb-2">Stream Error</p>
          <p className="text-dark-400 text-sm mb-4">{stream.error_message || "Unable to load stream"}</p>
          <Link to={`/matches/${id}`} className="btn-primary">Back to Match</Link>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <FiAlertCircle className="mx-auto mb-4 text-dark-400" size={40} />
          <p className="text-dark-300 mb-2">No active stream available</p>
          <p className="text-dark-500 text-sm">Check back later or try a different match</p>
        </div>
      )}

      <div className="mt-4 card p-4">
        <h2 className="font-semibold mb-2">{match.title}</h2>
        <p className="text-sm text-dark-400">
          {match.home_team} vs {match.away_team} &bull; {match.sport}
          {match.status === "live" && <span className="ml-2 badge badge-live">LIVE</span>}
        </p>
      </div>
    </div>
  );
}
