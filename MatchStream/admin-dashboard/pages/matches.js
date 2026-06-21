import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { adminApi } from "../lib/api";
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw } from "react-icons/fi";

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editMatch, setEditMatch] = useState(null);
  const [form, setForm] = useState({ title: "", sport: "", league: "", home_team: "", away_team: "", status: "scheduled" });

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await adminApi.matches({ limit: 100 });
      setMatches(data.matches || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, []);

  const resetForm = () => {
    setForm({ title: "", sport: "", league: "", home_team: "", away_team: "", status: "scheduled" });
    setEditMatch(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMatch) {
        await adminApi.matchUpdate(editMatch.id, form);
      } else {
        await adminApi.matchCreate(form);
      }
      resetForm();
      fetchMatches();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleEdit = (match) => {
    setEditMatch(match);
    setForm({ title: match.title, sport: match.sport, league: match.league || "", home_team: match.home_team || "", away_team: match.away_team || "", status: match.status });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this match?")) return;
    try {
      await adminApi.matchDelete(id);
      fetchMatches();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout title="Match Management">
      <div className="flex justify-between items-center mb-6">
        <p className="text-dark-400 text-sm">{matches.length} matches</p>
        <div className="flex gap-2">
          <button onClick={fetchMatches} className="btn-secondary flex items-center gap-2"><FiRefreshCw size={14} /> Refresh</button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2"><FiPlus size={14} /> Add Match</button>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 mb-6">{error}</div>}

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">{editMatch ? "Edit Match" : "Create Match"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-xs text-dark-400 mb-1">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="input-field" /></div>
            <div><label className="block text-xs text-dark-400 mb-1">Sport *</label><input value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} required className="input-field" /></div>
            <div><label className="block text-xs text-dark-400 mb-1">League</label><input value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs text-dark-400 mb-1">Home Team</label><input value={form.home_team} onChange={(e) => setForm({ ...form, home_team: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs text-dark-400 mb-1">Away Team</label><input value={form.away_team} onChange={(e) => setForm({ ...form, away_team: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs text-dark-400 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="finished">Finished</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <button type="submit" className="btn-primary">{editMatch ? "Update" : "Create"}</button>
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-900">
                <th className="text-left p-4 text-dark-400">Title</th>
                <th className="text-left p-4 text-dark-400">Sport</th>
                <th className="text-left p-4 text-dark-400">Status</th>
                <th className="text-left p-4 text-dark-400">League</th>
                <th className="text-left p-4 text-dark-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-dark-700 hover:bg-dark-700/50">
                  <td className="p-4 font-medium">{m.title}</td>
                  <td className="p-4 text-dark-400">{m.sport}</td>
                  <td className="p-4">
                    <span className={`badge ${m.status === "live" ? "badge-green" : m.status === "scheduled" ? "badge-yellow" : m.status === "finished" ? "badge-gray" : "badge-red"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-4 text-dark-400">{m.league || "-"}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(m)} className="text-primary-400 hover:text-primary-300"><FiEdit2 size={16} /></button>
                      <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-300"><FiTrash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
