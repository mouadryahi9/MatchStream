import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { adminApi } from "../lib/api";
import { FiRefreshCw, FiStopCircle, FiPlay, FiPlus } from "react-icons/fi";

const statusColors = {
  running: "badge-green",
  starting: "badge-yellow",
  idle: "badge-gray",
  error: "badge-red",
  stopped: "badge-gray",
};

export default function StreamsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    match_id: "", title: "", source_url: "", source_type: "m3u8",
  });
  const [matches, setMatches] = useState([]);

  const fetchStreams = async () => {
    setLoading(true);
    try {
      const result = await adminApi.streams();
      setData(result);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const result = await adminApi.matches({ limit: 100 });
      setMatches(result.matches || []);
    } catch (err) {
      console.error("Failed to load matches", err);
    }
  };

  useEffect(() => { fetchStreams(); fetchMatches(); }, []);

  const handleStop = async (id) => {
    try {
      await adminApi.stopStream(id);
      fetchStreams();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRestart = async (id) => {
    try {
      await adminApi.restartStream(id);
      fetchStreams();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartStream = async (e) => {
    e.preventDefault();
    try {
      await adminApi.startStream(form);
      setShowForm(false);
      setForm({ match_id: "", title: "", source_url: "", source_type: "m3u8" });
      fetchStreams();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <Layout title="Stream Management">
      <div className="flex justify-between items-center mb-6">
        <p className="text-dark-400 text-sm">
          {data?.ffmpegProcesses?.length || 0} active FFmpeg processes
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowForm(!showForm); fetchMatches(); }}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus size={14} /> {showForm ? "Cancel" : "Start Stream"}
          </button>
          <button onClick={fetchStreams} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 mb-6">{error}</div>}

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Start New Stream</h2>
          <form onSubmit={handleStartStream} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-dark-400 mb-1">Match *</label>
              <select
                value={form.match_id}
                onChange={(e) => setForm({ ...form, match_id: e.target.value })}
                required className="input-field"
              >
                <option value="">Select a match...</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.sport}){m.status === "live" ? " 🔴 LIVE" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Stream Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required className="input-field" placeholder="e.g. Stream 1 (HD)"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Source Type</label>
              <select
                value={form.source_type}
                onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                className="input-field"
              >
                <option value="m3u8">M3U8</option>
                <option value="url">URL</option>
                <option value="rtmp">RTMP</option>
                <option value="iframe">Iframe</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-dark-400 mb-1">Source URL *</label>
              <input
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                required className="input-field" placeholder="https://example.com/stream.m3u8"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">Start Stream</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-900">
                <th className="text-left p-4 text-dark-400 font-medium">Title</th>
                <th className="text-left p-4 text-dark-400 font-medium">Status</th>
                <th className="text-left p-4 text-dark-400 font-medium">PID</th>
                <th className="text-left p-4 text-dark-400 font-medium">HLS URL</th>
                <th className="text-left p-4 text-dark-400 font-medium">Restarts</th>
                <th className="text-left p-4 text-dark-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.streams?.map((stream) => (
                <tr key={stream.id} className="border-b border-dark-700 hover:bg-dark-700/50">
                  <td className="p-4">{stream.title}</td>
                  <td className="p-4"><span className={`badge ${statusColors[stream.status] || "badge-gray"}`}>{stream.status}</span></td>
                  <td className="p-4 text-dark-400">{stream.pid || "-"}</td>
                  <td className="p-4 text-dark-400 max-w-[200px] truncate">{stream.hls_url || "-"}</td>
                  <td className="p-4">{stream.restart_count || 0}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {stream.status === "running" && (
                        <button onClick={() => handleStop(stream.id)} className="btn-danger text-xs py-1.5 flex items-center gap-1">
                          <FiStopCircle size={12} /> Stop
                        </button>
                      )}
                      {(stream.status === "error" || stream.status === "stopped") && (
                        <button onClick={() => handleRestart(stream.id)} className="btn-primary text-xs py-1.5 flex items-center gap-1">
                          <FiPlay size={12} /> Restart
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.streams || data.streams.length === 0) && (
                <tr><td colSpan={6} className="p-8 text-center text-dark-400">No streams found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data?.ffmpegProcesses?.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold mb-4">Active FFmpeg Processes</h2>
          <div className="space-y-2">
            {data.ffmpegProcesses.map((proc) => (
              <div key={proc.id} className="flex items-center justify-between py-2 px-3 bg-dark-700 rounded-lg text-sm">
                <span className="font-mono text-primary-400">{proc.id.slice(0, 8)}...</span>
                <span className="text-dark-400">PID: {proc.pid}</span>
                <span className="text-dark-400">Uptime: {Math.floor(proc.uptime / 1000)}s</span>
                <span className="text-dark-400">Segments: {proc.segmentCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
