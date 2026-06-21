import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { adminApi } from "../lib/api";
import {
  FiActivity, FiServer, FiUsers, FiList, FiRefreshCw,
  FiStopCircle, FiPlay, FiExternalLink, FiCopy,
} from "react-icons/fi";

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminApi.login({ email, password });
      if (data.user.role !== "admin") {
        setError("Admin access required");
        return;
      }
      localStorage.setItem("adminToken", data.accessToken);
      localStorage.setItem("adminUser", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-400">MatchStream</h1>
          <p className="text-dark-400 mt-2">Admin Dashboard Login</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-3 text-sm">{error}</div>}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="admin@matchstream.com" />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" placeholder="********" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? "Loading..." : "Sign In"}</button>
        </form>
      </div>
    </div>
  );
}

const colorMap = {
  green: "text-green-400",
  primary: "text-primary-400",
  yellow: "text-yellow-400",
  blue: "text-blue-400",
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-dark-400 text-sm">{label}</span>
        <Icon className={colorMap[color] || "text-primary-400"} size={20} />
      </div>
      <p className="text-3xl font-bold">{value ?? "..."}</p>
    </div>
  );
}

const statusColors = {
  running: "badge-green",
  starting: "badge-yellow",
  idle: "badge-gray",
  error: "badge-red",
  stopped: "badge-gray",
};

function LiveStreamsCard({ streams, ffmpegProcesses, onStop, onRestart, onRefresh }) {
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <h2 className="font-semibold">Live Streams</h2>
        <button onClick={onRefresh} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
          <FiRefreshCw size={12} /> Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700 bg-dark-900">
              <th className="text-left p-3 text-dark-400 font-medium">Title</th>
              <th className="text-left p-3 text-dark-400 font-medium">Status</th>
              <th className="text-left p-3 text-dark-400 font-medium">Source URL</th>
              <th className="text-left p-3 text-dark-400 font-medium">HLS Link</th>
              <th className="text-left p-3 text-dark-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {streams?.map((stream) => (
              <tr key={stream.id} className="border-b border-dark-700 hover:bg-dark-700/50">
                <td className="p-3 font-medium">{stream.title}</td>
                <td className="p-3">
                  <span className={`badge ${statusColors[stream.status] || "badge-gray"}`}>{stream.status}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 max-w-[250px]">
                    <span className="text-dark-400 truncate">{stream.source_url || "-"}</span>
                    {stream.source_url && (
                      <button
                        onClick={() => copyToClipboard(stream.source_url, `src-${stream.id}`)}
                        className="text-dark-500 hover:text-primary-400 shrink-0"
                        title="Copy source URL"
                      >
                        {copiedId === `src-${stream.id}` ? <span className="text-green-400 text-xs">Copied!</span> : <FiCopy size={14} />}
                      </button>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 max-w-[250px]">
                    {stream.hls_url ? (
                      <>
                        <span className="text-primary-400 truncate">{stream.hls_url}</span>
                        <a
                          href={stream.hls_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-dark-500 hover:text-primary-400 shrink-0"
                          title="Open HLS URL"
                        >
                          <FiExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => copyToClipboard(stream.hls_url, `hls-${stream.id}`)}
                          className="text-dark-500 hover:text-primary-400 shrink-0"
                          title="Copy HLS URL"
                        >
                          {copiedId === `hls-${stream.id}` ? <span className="text-green-400 text-xs">Copied!</span> : <FiCopy size={14} />}
                        </button>
                      </>
                    ) : <span className="text-dark-500">-</span>}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {stream.status === "running" && (
                      <button onClick={() => onStop(stream.id)} className="btn-danger text-xs py-1.5 flex items-center gap-1">
                        <FiStopCircle size={12} /> Stop
                      </button>
                    )}
                    {(stream.status === "error" || stream.status === "stopped") && (
                      <button onClick={() => onRestart(stream.id)} className="btn-primary text-xs py-1.5 flex items-center gap-1">
                        <FiPlay size={12} /> Restart
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(!streams || streams.length === 0) && (
              <tr><td colSpan={5} className="p-8 text-center text-dark-400">No streams yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {ffmpegProcesses?.length > 0 && (
        <div className="border-t border-dark-700 p-4 bg-dark-800/50">
          <p className="text-xs text-dark-500">{ffmpegProcesses.length} active FFmpeg process{ffmpegProcesses.length > 1 ? "es" : ""}</p>
        </div>
      )}
    </div>
  );
}

function DashboardContent() {
  const [stats, setStats] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [error, setError] = useState("");

  const fetchAll = () => {
    setError("");
    Promise.all([
      adminApi.stats(),
      adminApi.streams(),
    ])
      .then(([statsResult, streamsResult]) => {
        setStats(statsResult);
        setStreamData(streamsResult);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleStop = async (id) => {
    try {
      await adminApi.stopStream(id);
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRestart = async (id) => {
    try {
      await adminApi.restartStream(id);
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout title="Dashboard">
      {error && <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 mb-6">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FiActivity} label="Active Streams" value={stats?.activeStreams} color="green" />
        <StatCard icon={FiList} label="Total Matches" value={stats?.totalMatches} color="primary" />
        <StatCard icon={FiServer} label="Total Streams" value={stats?.totalStreams} color="yellow" />
        <StatCard icon={FiUsers} label="Users" value={stats?.totalUsers} color="blue" />
      </div>
      <LiveStreamsCard
        streams={streamData?.streams}
        ffmpegProcesses={streamData?.ffmpegProcesses}
        onStop={handleStop}
        onRestart={handleRestart}
        onRefresh={fetchAll}
      />
    </Layout>
  );
}

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("adminUser");
    const token = localStorage.getItem("adminToken");
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("adminUser");
        localStorage.removeItem("adminToken");
      }
    }
  }, []);

  if (!user) return <LoginForm onLogin={setUser} />;
  return <DashboardContent />;
}
