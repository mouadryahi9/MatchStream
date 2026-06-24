import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { FiGrid, FiMonitor, FiUpload, FiTv, FiLogOut } from "react-icons/fi";
import { useAuth } from "./context/AuthContext";
import MatchesPage from "./pages/MatchesPage";
import ChannelsPage from "./pages/ChannelsPage";
import UploadPage from "./pages/UploadPage";
import LoginPage from "./pages/LoginPage";

const navItems = [
  { to: "/matches", label: "Matches", icon: FiGrid },
  { to: "/channels", label: "Channels", icon: FiMonitor },
  { to: "/upload", label: "Upload M3U", icon: FiUpload },
];

function ProtectedLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#0f1119]">
      <aside className="w-56 bg-[#1a1d2e] border-r border-gray-800 flex flex-col shrink-0">
        <div className="flex items-center justify-between gap-2.5 px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <FiTv size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-base">Admin</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? "bg-red-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-500">
            <span className="truncate flex-1">{user?.email}</span>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors" title="Sign out">
              <FiLogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/channels" element={<ChannelsPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-[#0f1119] flex items-center justify-center text-gray-500">Loading...</div>;

  if (!user) return <LoginPage />;

  return <ProtectedLayout />;
}
