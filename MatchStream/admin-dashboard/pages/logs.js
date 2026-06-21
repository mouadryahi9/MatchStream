import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { adminApi } from "../lib/api";
import { FiRefreshCw, FiTrash2 } from "react-icons/fi";

const LEVEL_COLORS = {
  debug: "text-dark-400",
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [level, setLevel] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.logs({ level, source, page, limit: 50 });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [level, source, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <Layout title="System Logs">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} className="input-field w-32">
            <option value="">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
          <input type="text" placeholder="Source filter" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className="input-field w-40" />
        </div>
        <button onClick={fetchLogs} className="btn-secondary flex items-center gap-2"><FiRefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 mb-6">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="h-[600px] overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="border-b border-dark-700 px-4 py-2 hover:bg-dark-700/30 text-sm font-mono">
              <div className="flex items-start gap-3">
                <span className="text-dark-500 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</span>
                <span className={`font-semibold uppercase text-[10px] ${LEVEL_COLORS[log.level] || "text-dark-400"} w-12`}>{log.level}</span>
                <span className="text-primary-400 w-24 shrink-0">[{log.source}]</span>
                <span className="text-dark-300 break-all">{log.message}</span>
              </div>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="mt-1 ml-28 text-dark-500 text-xs">{JSON.stringify(log.metadata)}</div>
              )}
            </div>
          ))}
          {logs.length === 0 && <div className="p-8 text-center text-dark-400">No logs found</div>}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-dark-400">{total} total logs</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-sm disabled:opacity-30">Previous</button>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 50)} className="btn-secondary text-sm disabled:opacity-30">Next</button>
        </div>
      </div>
    </Layout>
  );
}
