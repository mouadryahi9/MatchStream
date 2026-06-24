import { useRef, useEffect, useState, useCallback } from "react";
import { FiMaximize, FiMinimize, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

export default function TsPlayer({ streamUrl, autoPlay = true }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  const destroy = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!streamUrl) return;
    let cancelled = false;

    (async () => {
      try {
        destroy();
        setError(null);
        const mpegts = (await import("mpegts.js")).default;
        if (cancelled) return;

        const player = mpegts.createPlayer({
          type: "mse",
          url: streamUrl,
          isLive: true,
        });

        playerRef.current = player;
        player.attachMediaElement(videoRef.current);
        player.load();
        if (autoPlay) videoRef.current?.play().catch(() => {});
      } catch {
        if (!cancelled) setError("Failed to load player");
      }
    })();

    return () => { cancelled = true; destroy(); };
  }, [streamUrl, autoPlay, destroy]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (fullscreen) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
      setFullscreen(!fullscreen);
    } catch {}
  };

  const reconnect = () => {
    setError(null);
    destroy();
    if (streamUrl) {
      (async () => {
        try {
          const mpegts = (await import("mpegts.js")).default;
          const player = mpegts.createPlayer({
            type: "mse",
            url: streamUrl,
            isLive: true,
          });
          playerRef.current = player;
          player.attachMediaElement(videoRef.current);
          player.load();
          videoRef.current?.play().catch(() => {});
        } catch {
          setError("Failed to load player");
        }
      })();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group">
      <video ref={videoRef} className="w-full h-full object-contain" playsInline />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <FiAlertTriangle className="mx-auto text-yellow-400 mb-2" size={32} />
            <p className="text-sm text-dark-300 mb-3">{error}</p>
            <button onClick={reconnect} className="btn-primary text-sm flex items-center gap-2 mx-auto">
              <FiRefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={toggleFullscreen} className="text-white hover:text-primary-400 transition-colors">
          {fullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
        </button>
      </div>
    </div>
  );
}
