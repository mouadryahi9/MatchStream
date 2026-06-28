import { useRef, useEffect, useState, useCallback } from "react";
import { FiPlay, FiPause, FiMaximize, FiMinimize, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

export default function VideoPlayer({ streamUrl, streamType = "hls", fallbackUrl: fbUrl, onError, autoPlay = true, onStreamError }) {
  const fallbackUrl = fbUrl?.startsWith("http") ? `/api/iptv/stream?url=${encodeURIComponent(fbUrl)}` : fbUrl;
  const mpegtsRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [latencyMode, setLatencyMode] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const containerRef = useRef(null);
  const reconnectTimer = useRef(null);

  const destroyPlayer = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (mpegtsRef.current) { mpegtsRef.current.destroy(); mpegtsRef.current = null; }
  }, []);

  const initMpegts = useCallback(async (url) => {
    if (!videoRef.current) return;
    destroyPlayer();
    setError(null);
    try {
      const mpegts = (await import("mpegts.js")).default;
      if (mpegts.isSupported()) {
        const player = mpegts.createPlayer({
          type: "mse", url, isLive: true, lazyLoad: false,
          liveBufferLatencyChasing: true,
          enableWorker: true,
          liveBufferLatencyMaxLatency: 3,
          liveBufferLatencyMinRemain: 1,
          stashInitialSize: 128,
          preloadTime: 30,
        });
        mpegtsRef.current = player;
        player.attachMediaElement(videoRef.current);
        player.load();
        player.on(mpegts.Events.ERROR, () => onStreamError?.());
        if (autoPlay) videoRef.current?.play().catch(() => {});
        return;
      }
    } catch {}
    videoRef.current.src = url;
    if (autoPlay) videoRef.current.play().catch(() => {});
  }, [autoPlay, destroyPlayer, onStreamError]);

  const initHls = useCallback(async (url) => {
    if (!videoRef.current) return;
    clearTimeout(reconnectTimer.current);

    try {
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) { await initMpegts(url); return; }

      destroyPlayer();
      const hls = new Hls({
        enableWorker: true, lowLatencyMode: latencyMode,
        liveSyncDuration: latencyMode ? 1 : 3,
        liveMaxLatencyDuration: latencyMode ? 3 : 8,
        backbufferLength: 30, maxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000, maxBufferHole: 0.3,
        maxMaxBufferLength: 600,
        manifestLoadingTimeOut: 10000, levelLoadingTimeOut: 10000, fragLoadingTimeOut: 10000,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setError(null);
        if (autoPlay) videoRef.current?.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
            case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
            default:
              setError("Switching to direct stream...");
              destroyPlayer();
              setUseFallback(true);
              onStreamError?.();
              break;
          }
        }
      });
    } catch { initMpegts(url); }
  }, [latencyMode, autoPlay, destroyPlayer, initMpegts, onError, onStreamError]);

  useEffect(() => {
    if (!streamUrl) return;
    if (streamType === "mpegts") { initMpegts(streamUrl); }
    else if (streamType === "hls" && !useFallback) { initHls(streamUrl); }
    else { setUseFallback(true); }
    return () => { destroyPlayer(); clearTimeout(reconnectTimer.current); };
  }, [streamUrl, streamType, useFallback, latencyMode, initHls, initMpegts, destroyPlayer]);

  useEffect(() => {
    if (useFallback && fallbackUrl) {
      if (!videoRef.current) return;
      initMpegts(fallbackUrl);
    }
  }, [useFallback, fallbackUrl, autoPlay, initMpegts]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); }
    else { videoRef.current.play().catch(() => {}); }
    setPlaying(!playing);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (fullscreen) { await document.exitFullscreen(); }
      else { await containerRef.current.requestFullscreen(); }
      setFullscreen(!fullscreen);
    } catch {}
  };

  const toggleLatency = () => setLatencyMode((prev) => !prev);

  const reconnect = () => {
    setError(null); setUseFallback(false);
    destroyPlayer();
    if (streamUrl) initHls(streamUrl);
  };

  if (useFallback && fallbackUrl?.startsWith("http")) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden" ref={containerRef}>
        <iframe src={fallbackUrl} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen sandbox="allow-scripts allow-same-origin" title="Stream" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group">
      <video ref={videoRef} className="w-full h-full object-contain" playsInline
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onError={() => { setError("Playback error"); onStreamError?.(); }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <FiAlertTriangle className="mx-auto text-yellow-400 mb-2" size={32} />
            <p className="text-sm text-dark-300 mb-3">{error}</p>
            <button onClick={reconnect} className="btn-primary text-sm flex items-center gap-2 mx-auto">
              <FiRefreshCw size={14} /> Reconnect
            </button>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-primary-400 transition-colors">
              {playing ? <FiPause size={20} /> : <FiPlay size={20} />}
            </button>
            {streamType === "hls" && (
              <button onClick={toggleLatency}
                className={`text-xs px-2 py-1 rounded ${latencyMode ? "bg-primary-600 text-white" : "bg-dark-700 text-dark-300"} transition-colors`}>
                GO LIVE
              </button>
            )}
          </div>
          <button onClick={toggleFullscreen} className="text-white hover:text-primary-400 transition-colors">
            {fullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
