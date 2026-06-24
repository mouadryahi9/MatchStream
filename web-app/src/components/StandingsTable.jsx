import { FiAlertCircle } from "react-icons/fi";

function TeamLogoImg({ team, size = 24 }) {
  const px = typeof size === "number" ? `${size}px` : size;
  const src = team?.logo || (team?.id ? `/api/team-logo/${team.id}` : null);
  if (!src) return (
    <div className="rounded-full bg-gray-800 flex items-center justify-center shrink-0" style={{ width: px, height: px }}>
      <span className="text-xs font-bold text-gray-500">{team?.name?.charAt(0) || "?"}</span>
    </div>
  );
  return (
    <div className="rounded-full overflow-hidden bg-gray-800 shrink-0 flex items-center justify-center" style={{ width: px, height: px }}>
      <img src={src} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
    </div>
  );
}

export default function StandingsTable({ data, loading, tournamentName }) {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500 mx-auto" />
      </div>
    );
  }

  if (!data?.standings?.length) {
    return (
      <div className="p-8 text-center">
        <FiAlertCircle className="mx-auto mb-2 text-gray-600" size={28} />
        <p className="text-sm text-gray-500">Standings not available</p>
      </div>
    );
  }

  const primary = data.standings[0];
  const rows = primary.standings?.[0]?.rows || primary.standings?.[0]?.table || [];
  const name = tournamentName || primary.tournamentName || "League Standings";

  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-white">{name}</h3>
        <span className="text-[11px] text-gray-500 uppercase tracking-wider">Standings</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
              <th className="text-left py-3 px-3 font-semibold w-8">#</th>
              <th className="text-left py-3 pr-3 font-semibold">Team</th>
              <th className="text-center py-3 px-2 font-semibold">P</th>
              <th className="text-center py-3 px-2 font-semibold hidden sm:table-cell">W</th>
              <th className="text-center py-3 px-2 font-semibold hidden sm:table-cell">D</th>
              <th className="text-center py-3 px-2 font-semibold hidden sm:table-cell">L</th>
              <th className="text-center py-3 px-3 font-semibold">GD</th>
              <th className="text-right py-3 px-3 font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {rows.slice(0, 10).map((row, i) => {
              const gd = (row.scoresFor || 0) - (row.scoresAgainst || 0);
              const isPromo = row.position <= 4;
              const isReleg = row.position > rows.length - 3;
              return (
                <tr key={row.team?.id || i} className="hover:bg-[#202436] transition-colors">
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                      row.position === 1 ? "bg-yellow-900/40 text-yellow-400" :
                      row.position <= 3 ? "bg-green-900/30 text-green-400" :
                      isReleg ? "bg-red-900/30 text-red-400" :
                      "bg-gray-800 text-gray-500"
                    }`}>{row.position}</span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <TeamLogoImg team={row.team} size={24} />
                      <span className="font-semibold text-gray-300 truncate max-w-[140px] sm:max-w-[200px]">{row.team?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="text-center py-2.5 px-2 text-gray-400 font-medium">{row.matches || 0}</td>
                  <td className="text-center py-2.5 px-2 text-gray-500 hidden sm:table-cell">{row.wins || 0}</td>
                  <td className="text-center py-2.5 px-2 text-gray-500 hidden sm:table-cell">{row.draws || 0}</td>
                  <td className="text-center py-2.5 px-2 text-gray-500 hidden sm:table-cell">{row.losses || 0}</td>
                  <td className={`text-center py-2.5 px-3 font-mono font-semibold ${
                    gd > 0 ? "text-green-400" : gd < 0 ? "text-red-400" : "text-gray-500"
                  }`}>{gd > 0 ? `+${gd}` : gd}</td>
                  <td className="text-right py-2.5 px-3 font-extrabold text-white">{row.points || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
