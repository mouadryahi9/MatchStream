import { useState, useMemo } from "react";
import { FiSearch, FiMonitor, FiAlertTriangle } from "react-icons/fi";
import { useM3U } from "../hooks/useM3U";
import { useHLS } from "../hooks/useHLS";

function Sidebar({ categories, selected, onSelect, search, onSearchChange }) {
  const flatList = useMemo(() => {
    const all = [];
    for (const [cat, chs] of Object.entries(categories)) {
      for (const ch of chs) all.push(ch);
    }
    return all;
  }, [categories]);

  const filtered = useMemo(() => {
    if (!search) return { categories, flat: flatList };
    const q = search.toLowerCase();
    const filteredChannels = flatList.filter((ch) => ch.name.toLowerCase().includes(q) || ch.category.toLowerCase().includes(q));
    const grouped = {};
    for (const ch of filteredChannels) {
      if (!grouped[ch.category]) grouped[ch.category] = [];
      grouped[ch.category].push(ch);
    }
    return { categories: grouped, flat: filteredChannels };
  }, [categories, flatList, search]);

  return (
    <div className="w-full lg:w-80 bg-dark-800 border-r border-dark-700 flex flex-col h-full">
      <div className="p-3 border-b border-dark-700">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
          <input
            className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
            placeholder="Search channels..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(filtered.categories).map(([cat, chs]) => (
          <div key={cat}>
            <div className="px-3 py-2 text-xs font-semibold text-primary-400 uppercase tracking-wider bg-dark-900/50 sticky top-0">
              {cat} <span className="text-dark-500 font-normal">({chs.length})</span>
            </div>
            {chs.map((ch, i) => (
              <button
                key={`${ch.name}-${i}`}
                onClick={() => onSelect(ch)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  selected?.url === ch.url ? "bg-primary-600/20 text-primary-300 border-l-2 border-primary-500" : "text-dark-300 hover:bg-dark-700 hover:text-white"
                }`}
              >
                <FiMonitor size={14} className="shrink-0" />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        ))}
        {filtered.flat.length === 0 && (
          <p className="text-dark-500 text-sm text-center py-8">No channels found</p>
        )}
      </div>
    </div>
  );
}

function PlayerArea({ channel }) {
  const proxyUrl = channel ? `/stream-proxy/${channel.url.split("/").pop()}` : null;
  const { videoRef, error, playing, setPlaying } = useHLS(proxyUrl);

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-950">
        <div className="text-center text-dark-500">
          <FiMonitor size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Select a channel</p>
          <p className="text-sm">Choose from the sidebar to start watching</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-950">
      <div className="relative bg-black flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-contain max-h-full"
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <FiAlertTriangle className="mx-auto text-yellow-400 mb-2" size={32} />
              <p className="text-sm text-dark-300">{error}</p>
            </div>
          </div>
        )}
      </div>
      <div className="bg-dark-800 border-t border-dark-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">{channel.name}</h2>
          <span className="text-xs text-dark-400">{channel.category}</span>
        </div>
        <button
          onClick={() => videoRef.current?.[playing ? "pause" : "play"]().catch(() => {})}
          className="btn-primary text-sm"
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}

export default function IPTVPlayer() {
  const { categories, loading, error: m3uError } = useM3U();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="fixed inset-0 top-14 flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (m3uError) {
    return (
      <div className="fixed inset-0 top-14 flex items-center justify-center bg-dark-900">
        <div className="text-center text-dark-400">
          <FiAlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
          <p>Failed to load channels: {m3uError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-14 flex flex-col lg:flex-row">
      <div className={`${sidebarOpen ? "block" : "hidden"} lg:block`}>
        <Sidebar categories={categories} selected={selected} onSelect={setSelected} search={search} onSearchChange={setSearch} />
      </div>
      <PlayerArea channel={selected} />
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="lg:hidden fixed bottom-4 left-4 z-50 btn-primary text-xs px-3 py-2 shadow-lg"
      >
        {sidebarOpen ? "Hide List" : "Show List"}
      </button>
    </div>
  );
}
