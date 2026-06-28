import { useState, useEffect, useCallback } from "react";
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
  const { data: stream } = useStream(id);
  const [hlsUrl, setHlsUrl] = useState(null);
  const [hlsLoading, setHlsLoading] = useState(false);
  const [hlsFailed, setHlsFailed] = useState(false);
  const [proxyRetry, setProxyRetry] = useState(0);

  useEffect(() => {
    if (isTest || !match?.stream_url) return;
    let cancelled = false;
    let channelId = null;

    async function startHls() {
      setHlsLoading(true);
      setHlsFailed(false);
      try {
        const r = await api.get("/iptv/hls", { params: { url: match.stream_url }, timeout: 20000 });
        if (cancelled) return;
        channelId = r.data.streamId;
        setHlsUrl(r.data.hlsUrl);
      } catch {
        if (!cancelled) setHlsFailed(true);
      } finally {
        if (!cancelled) setHlsLoading(false);
      }
    }
    startHls();

    return () => {
      cancelled = true;
      if (channelId) api.post("/iptv/leave", { channelId }).catch(() => {});
    };
  }, [isTest, match?.stream_url]);

  const handleStreamError = useCallback(() => {
    if (hlsUrl) {
      setHlsUrl(null);
      setHlsFailed(true);
    } else {
      setProxyRetry((r) => (r < 3 ? r + 1 : r));
    }
  }, [hlsUrl]);

  if (isTest) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl text-gray-800 dark:text-white">Test Stream</h1>
          <Link to="/" className="text-sm text-gray-400 hover:text-white">Back Home</Link>
        </div>
        <TestStreamSection />
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

  const isM3u8 = match.stream_url?.includes(".m3u8");

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
            fallbackUrl={match?.stream_url}
            onStreamError={handleStreamError}
          />
        </div>
      ) : isM3u8 ? (
        <div className="block-card">
          <VideoPlayer
            streamUrl={match.stream_url.startsWith("http") ? match.stream_url : `${window.location.origin}${match.stream_url}`}
            streamType="hls"
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
      ) : stream?.hls_url ? (
        <div className="block-card">
          <VideoPlayer
            streamUrl={stream.hls_url.startsWith("http") ? stream.hls_url : `${window.location.origin}${stream.hls_url}`}
            streamType={stream.stream_type || "hls"}
            fallbackUrl={stream.source_url}
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

function TestStreamSection() {
  const [hlsUrl, setHlsUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let channelId = null;
    setLoading(true);
    api.get("/iptv/test", { timeout: 30000 })
      .then((r) => { if (!cancelled) { channelId = r.data.streamId; setHlsUrl(r.data.hlsUrl); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; if (channelId) api.post("/iptv/leave", { channelId }).catch(() => {}); };
  }, []);

  if (loading) {
    return (
      <div className="block-card p-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-red mx-auto mb-4" />
        <p className="text-gray-600 dark:text-dark-300 font-semibold">Starting test stream...</p>
      </div>
    );
  }

  if (!hlsUrl) {
    return (
      <div className="block-card p-12 text-center">
        <FiAlertCircle className="mx-auto mb-4 text-brand-red" size={40} />
        <p className="text-brand-red font-semibold">Failed to start test stream</p>
      </div>
    );
  }

  return (
    <div className="block-card">
      <VideoPlayer
        streamUrl={hlsUrl.startsWith("http") ? hlsUrl : `${window.location.origin}${hlsUrl}`}
        streamType="hls"
      />
    </div>
  );
}
