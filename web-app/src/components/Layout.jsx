import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { WebSocketProvider } from "../context/WebSocketContext";
import { useState } from "react";
import { FiMenu, FiX, FiLogOut, FiUser, FiChevronDown, FiTv, FiHome, FiCalendar, FiStar, FiMonitor } from "react-icons/fi";

const navLinks = [
  { to: "/", label: "Home", icon: FiHome },
  { to: "/favorites", label: "Favorites", icon: FiStar },
];

export default function Layout() {
  return (
    <WebSocketProvider>
      <div className="min-h-screen flex flex-col bg-[#0f1119]">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </WebSocketProvider>
  );
}

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-[#1a1d2e] border-b border-gray-800 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg">
              <FiMonitor className="text-white" size={18} />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">MatchStream</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === link.to
                      ? "bg-red-600/20 text-red-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Icon size={14} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-gray-300"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                    <FiUser size={14} className="text-white" />
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{user.username}</span>
                  <FiChevronDown size={14} className="text-gray-500" />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1d2e] border border-gray-700 rounded-xl shadow-xl z-20 py-1">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm font-medium text-gray-200">{user.username}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      {user.role === "admin" && (
                        <Link to="/admin/" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                          Admin Panel
                        </Link>
                      )}
                      <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 transition-colors">
                        <FiLogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login" className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2 rounded-xl transition-all">
                Sign In
              </Link>
            )}

            <button
              className="md:hidden w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <FiX size={18} /> : <FiMenu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#1a1d2e] border-t border-gray-800 pb-3">
          <div className="px-4 pt-2 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === link.to
                      ? "bg-red-600/20 text-red-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-[#1a1d2e] border-t border-gray-800 mt-10">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <FiMonitor className="text-white" size={16} />
              </div>
              <span className="font-bold text-white">MatchStream</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">Watch live sports streaming from around the world.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-300 mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/matches" className="text-xs text-gray-500 hover:text-red-400 transition-colors">Live Matches</Link></li>
              <li><Link to="/matches" className="text-xs text-gray-500 hover:text-red-400 transition-colors">Upcoming</Link></li>
              <li><Link to="/favorites" className="text-xs text-gray-500 hover:text-red-400 transition-colors">Favorites</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-300 mb-3">Leagues</h3>
            <ul className="space-y-2">
              {["Premier League", "La Liga", "Serie A", "Bundesliga"].map((l) => (
                <li key={l}><Link to={`/matches?league=${encodeURIComponent(l)}`} className="text-xs text-gray-500 hover:text-red-400 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-300 mb-3">Support</h3>
            <ul className="space-y-2">
              <li><span className="text-xs text-gray-500 hover:text-red-400 transition-colors cursor-pointer">About Us</span></li>
              <li><span className="text-xs text-gray-500 hover:text-red-400 transition-colors cursor-pointer">Contact</span></li>
              <li><span className="text-xs text-gray-500 hover:text-red-400 transition-colors cursor-pointer">Privacy</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-600">MatchStream v2.0 &copy; {new Date().getFullYear()}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
