import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { WebSocketProvider } from "../context/WebSocketContext";
import { useState } from "react";
import { FiMenu, FiX, FiHome, FiList, FiHeart, FiLogOut, FiUser } from "react-icons/fi";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-dark-800 border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary-400">MatchStream</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-dark-300 hover:text-white transition-colors text-sm font-medium">Home</Link>
            <Link to="/matches" className="text-dark-300 hover:text-white transition-colors text-sm font-medium">Matches</Link>
            {user && <Link to="/favorites" className="text-dark-300 hover:text-white transition-colors text-sm font-medium">Favorites</Link>}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-dark-400 hidden sm:block">{user.username}</span>
                {user.role === "admin" && (
                  <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1.5 px-3">
                    Admin
                  </a>
                )}
                <button onClick={handleLogout} className="text-dark-400 hover:text-red-400 transition-colors p-2" title="Logout">
                  <FiLogOut size={18} />
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary text-sm py-1.5 px-4">Login</Link>
            )}
            <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)}>
              {open ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-dark-300 hover:text-white rounded-lg hover:bg-dark-700"><FiHome /> Home</Link>
            <Link to="/matches" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-dark-300 hover:text-white rounded-lg hover:bg-dark-700"><FiList /> Matches</Link>
            {user && <Link to="/favorites" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-dark-300 hover:text-white rounded-lg hover:bg-dark-700"><FiHeart /> Favorites</Link>}
          </div>
        )}
      </div>
    </nav>
  );
}

export default function Layout() {
  return (
    <WebSocketProvider>
      <div className="min-h-screen flex flex-col bg-dark-900">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          <Outlet />
        </main>
        <footer className="bg-dark-800 border-t border-dark-700 py-4 text-center text-dark-500 text-xs">
          MatchStream v2.0 &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </WebSocketProvider>
  );
}
