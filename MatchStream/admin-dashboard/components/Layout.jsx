import Link from "next/link";
import { useRouter } from "next/router";
import { FiActivity, FiList, FiServer, FiTerminal, FiUsers, FiDatabase, FiHome, FiLogOut } from "react-icons/fi";

const navItems = [
  { href: "/", label: "Dashboard", icon: FiHome },
  { href: "/streams", label: "Streams", icon: FiServer },
  { href: "/matches", label: "Matches", icon: FiList },
  { href: "/logs", label: "Logs", icon: FiTerminal },
  { href: "/users", label: "Users", icon: FiUsers },
];

export default function Layout({ children, title }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    router.push("/");
  };

  return (
    <div className="flex h-screen bg-dark-950">
      <aside className="w-64 bg-dark-900 border-r border-dark-700 flex flex-col">
        <div className="p-6 border-b border-dark-700">
          <h1 className="text-xl font-bold text-primary-400">MatchStream</h1>
          <p className="text-xs text-dark-500 mt-1">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-primary-600/20 text-primary-400" : "text-dark-400 hover:text-white hover:bg-dark-700"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-dark-700">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-dark-400 hover:text-red-400 hover:bg-dark-700 w-full transition-colors">
            <FiLogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
}
