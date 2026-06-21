import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiMail, FiLock, FiUser, FiAlertCircle } from "react-icons/fi";

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, username, password);
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-400">MatchStream</h1>
          <p className="text-dark-400 mt-2">{mode === "login" ? "Sign in to your account" : "Create a new account"}</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-3 text-sm">
              <FiAlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-dark-300 mb-1">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field pl-10" placeholder="you@example.com" />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-sm text-dark-300 mb-1">Username</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="input-field pl-10" placeholder="username" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-dark-300 mb-1">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="input-field pl-10" placeholder="********" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-sm text-dark-400">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="text-primary-400 hover:underline">
              {mode === "login" ? "Register" : "Sign In"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
