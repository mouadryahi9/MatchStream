import { useRef, useEffect, useCallback, useState } from "react";

export function useHLS(url) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const retriesRef = useRef(0);
  const timerRef = useRef(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);

  const destroy = useCallback(() => {
    clearTimeout(timerRef.current);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const getBackoff = useCallback(() => {
    const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 15000);
    retriesRef.current += 1;
    return delay;
  }, []);

  const attach = useCallback(async (src) => {
    if (!videoRef.current) return;
    destroy();
    setError(null);

    try {
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        videoRef.current.src = src;
        videoRef.current.play().catch(() => {});
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backbufferLength: 30,
        maxBufferLength: 30,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
        fragLoadingTimeOut: 10000,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        retriesRef.current = 0;
        videoRef.current?.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          const delay = getBackoff();
          setError(`Stream error, retrying in ${Math.round(delay / 1000)}s...`);
          timerRef.current = setTimeout(() => {
            hlsRef.current = null;
            attach(src);
          }, delay);
        }
      });
    } catch {
      videoRef.current.src = src;
      videoRef.current.play().catch(() => {});
    }
  }, [destroy, getBackoff]);

  useEffect(() => {
    if (!url) return;
    attach(url);
    return destroy;
  }, [url, attach, destroy]);

  return { videoRef, error, playing, setPlaying };
}
