import { useState, useEffect, useMemo } from "react";

const CATEGORY_RULES = [
  { name: "Sport", test: (name) => /^sport/i.test(name) },
  { name: "Arabi", test: (name) => /^AR:/i.test(name) },
  { name: "Maghribi", test: (name) => /^MA:/i.test(name) },
  { name: "Français", test: (name) => /^FR:/i.test(name) },
  { name: "UK", test: (name) => /^UK:/i.test(name) },
  { name: "US", test: (name) => /^US:/i.test(name) },
  { name: "Islami", test: (name) => /quran|islami|islam/i.test(name) },
  { name: "Allemand", test: (name) => /^DE:/i.test(name) },
];

function detectCategory(name) {
  for (const rule of CATEGORY_RULES) {
    if (rule.test(name)) return rule.name;
  }
  return "Other";
}

function parseM3U(text) {
  const lines = text.split("\n");
  const channels = [];
  let currentExtInf = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#EXTINF:")) {
      const nameMatch = trimmed.match(/tvg-name="([^"]*)"/) || trimmed.match(/,([^,]+)$/);
      const name = nameMatch ? nameMatch[1].trim() : "Unknown";
      currentExtInf = { name, category: detectCategory(name) };
    } else if (currentExtInf && trimmed && !trimmed.startsWith("#")) {
      channels.push({ name: currentExtInf.name, category: currentExtInf.category, url: trimmed });
      currentExtInf = null;
    }
  }
  return channels;
}

export function useM3U(m3uPath = "/channels.m3u") {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(m3uPath)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          setChannels(parseM3U(text));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [m3uPath]);

  const categories = useMemo(() => {
    const map = {};
    for (const ch of channels) {
      if (!map[ch.category]) map[ch.category] = [];
      map[ch.category].push(ch);
    }
    return map;
  }, [channels]);

  return { channels, categories, loading, error };
}
