import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FiTv, FiAlertCircle } from "react-icons/fi";

export default function LoginPage({ onLogin }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1119] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 text-white mb-4 shadow-lg">
            <FiTv size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">MatchStream</h1>
          <p className="text-gray-500 mt-2">Admin — Sign in required</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-400 rounded-xl p-3 text-sm">
              <FiAlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="admin@matchstream.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" placeholder="********" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 text-base">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
