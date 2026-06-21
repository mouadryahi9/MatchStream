import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { adminApi } from "../lib/api";
import { FiRefreshCw, FiShield } from "react-icons/fi";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.users();
      setUsers(data || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (id, role) => {
    try {
      await adminApi.updateRole(id, role);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout title="User Management">
      <div className="flex justify-between items-center mb-6">
        <p className="text-dark-400 text-sm">{users.length} users</p>
        <button onClick={fetchUsers} className="btn-secondary flex items-center gap-2"><FiRefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 mb-6">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-900">
                <th className="text-left p-4 text-dark-400">Username</th>
                <th className="text-left p-4 text-dark-400">Email</th>
                <th className="text-left p-4 text-dark-400">Role</th>
                <th className="text-left p-4 text-dark-400">Status</th>
                <th className="text-left p-4 text-dark-400">Created</th>
                <th className="text-left p-4 text-dark-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-dark-700 hover:bg-dark-700/50">
                  <td className="p-4 font-medium">{u.username}</td>
                  <td className="p-4 text-dark-400">{u.email}</td>
                  <td className="p-4">
                    <span className={`badge ${u.role === "admin" ? "badge-green" : u.role === "editor" ? "badge-yellow" : "badge-gray"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`badge ${u.is_active ? "badge-green" : "badge-red"}`}>{u.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="p-4 text-dark-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-dark-700 border border-dark-500 rounded px-2 py-1 text-xs"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
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
