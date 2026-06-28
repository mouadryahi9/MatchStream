import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useMatch } from "../hooks/useMatches";
import { useStream } from "../hooks/useStreams";
import VideoPlayer from "../components/VideoPlayer";
import api from "../services/api/client";
import { FiArrowLeft, FiAlertCircle, FiTv } from "react-icons/fi";

export default function WatchPage() {
  const { id } = useParams();
  const isTest = id === "test";
  const { data: match, isLoading: matchLoading } = useMatch(id);
  const { data: stream, isLoading: streamLoading } = useStream(id);
  const [hlsUrl, setHlsUrl] = useState(null);
  const [hlsLoading, setHlsLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const MAX_RETRIES = 5;

  const isHlsUrl = (url) => url?.match(/\.m3u8/i) || url?.includes("m3u8");

  useEffect(() => {
    let cancelled = false;
    let currentChannelId = null;
    if (isTest) {
      setHlsLoading(true);
      api.get("/iptv/test", { timeout: 30000 })
        .then((r) => { if (!cancelled) { currentChannelId = r.data.streamId; setHlsUrl(r.data.hlsUrl); setHlsLoading(false); } })
        .catch(() => { if (!cancelled) setHlsLoading(false); });
    } else if (match?.stream_url && isHlsUrl(match.stream_url)) {
      setHlsLoading(true);
      setHlsUrl(null);
      api.get("/iptv/hls", { params: { url: match.stream_url }, timeout: 30000 })
        .then((r) => { if (!cancelled) { currentChannelId = r.data.streamId; setHlsUrl(r.data.hlsUrl); setHlsLoading(false); } })
        .catch(() => { if (!cancelled) setHlsLoading(false); });
    }
    return () => {
      cancelled = true;
      if (currentChannelId) {
        api.post("/iptv/leave", { channelId: currentChannelId }).catch(() => {});
      }
    };
  }, [match?.stream_url, retry, isTest]);

  const handleStreamError = () => {
    if (retry < MAX_RETRIES) {
      setTimeout(() => setRetry((r) => r + 1), 4000);
    }
  };

  if (isTest) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl text-gray-800 dark:text-white">Test Stream</h1>
          <Link to="/" className="text-sm text-gray-400 hover:text-white">Back Home</Link>
        </div>
        {hlsLoading ? (
          <div className="block-card p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-red mx-auto mb-4" />
            <p className="text-gray-600 dark:text-dark-300 font-semibold">Starting test stream...</p>
          </div>
        ) : hlsUrl ? (
          <div className="block-card">
            <VideoPlayer
              streamUrl={hlsUrl.startsWith("http") ? hlsUrl : `${window.location.origin}${hlsUrl}`}
              streamType="hls"
              onStreamError={handleStreamError}
            />
          </div>
        ) : (
          <div className="block-card p-12 text-center">
            <FiAlertCircle className="mx-auto mb-4 text-brand-red" size={40} />
            <p className="text-brand-red font-semibold">Failed to start test stream</p>
          </div>
        )}
      </div>
    );
  }

  if (matchLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-red" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="block-card p-12">
          <FiAlertCircle className="mx-auto mb-4 text-gray-300 dark:text-dark-400" size={40} />
          <p className="text-gray-500 dark:text-dark-300 mb-4">Match not found</p>
          <Link to="/matches" className="btn-primary inline-flex items-center gap-1">Back to Matches</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Link to={`/matches/${id}`} className="inline-flex items-center gap-1.5 text-gray-400 dark:text-dark-400 hover:text-brand-purple dark:hover:text-white text-sm font-medium transition-colors">
        <FiArrowLeft size={14} /> Back to Match
      </Link>

      {hlsLoading ? (
        <div className="block-card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-red mx-auto mb-4" />
          <p className="text-gray-600 dark:text-dark-300 font-semibold">Starting stream...</p>
        </div>
      ) : hlsUrl ? (
        <div className="block-card">
          <VideoPlayer
            streamUrl={hlsUrl.startsWith("http") ? hlsUrl : `${window.location.origin}${hlsUrl}`}
            streamType="hls"
            fallbackUrl={match?.stream_url || (stream?.source_url)}
            onStreamError={handleStreamError}
          />
        </div>
      ) : stream?.hls_url ? (
        <div className="block-card">
          <VideoPlayer
            streamUrl={stream.hls_url.startsWith("http") ? stream.hls_url : `${window.location.origin}${stream.hls_url}`}
            streamType={stream.stream_type || "hls"}
            fallbackUrl={stream.source_url}
            onStreamError={handleStreamError}
          />
        </div>
      ) : match?.stream_url ? (
        <div className="block-card">
          <VideoPlayer
            streamUrl={`/api/iptv/stream?url=${encodeURIComponent(match.stream_url)}`}
            streamType="mpegts"
            fallbackUrl={match.stream_url}
            onStreamError={handleStreamError}
          />
        </div>
      ) : stream?.status === "idle" || stream?.status === "starting" ? (
        <div className="block-card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-red mx-auto mb-4" />
          <p className="text-gray-600 dark:text-dark-300 font-semibold">Stream is starting...</p>
          <p className="text-gray-400 dark:text-dark-500 text-sm mt-2">Please wait while we connect to the stream</p>
        </div>
      ) : stream?.status === "error" ? (
        <div className="block-card p-12 text-center">
          <FiAlertCircle className="mx-auto mb-4 text-brand-red" size={40} />
          <p className="text-brand-red font-semibold mb-2">Stream Error</p>
          <p className="text-gray-400 dark:text-dark-400 text-sm mb-4">{stream.error_message || "Unable to load stream"}</p>
          <Link to={`/matches/${id}`} className="btn-primary">Back to Match</Link>
        </div>
      ) : (
        <div className="block-card p-12 text-center">
          <FiTv className="mx-auto mb-4 text-gray-300 dark:text-dark-500" size={40} />
          <p className="text-gray-500 dark:text-dark-300 mb-2 font-semibold">No active stream available</p>
          <p className="text-gray-400 dark:text-dark-500 text-sm">Check back later or try a different stream</p>
        </div>
      )}

      <div className="block-card p-4 flex items-center gap-3">
        <div className="flex-1">
          <h2 className="font-semibold text-gray-800 dark:text-white">{match.title}</h2>
          <p className="text-sm text-gray-500 dark:text-dark-400">
            {match.home_team} vs {match.away_team} &bull; {match.sport}
            {match.status === "live" && <span className="ml-2 badge badge-live">LIVE</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
