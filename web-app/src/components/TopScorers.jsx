import { FiAlertCircle } from "react-icons/fi";

export default function TopScorers({ data, loading, tournamentName }) {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500 mx-auto" />
      </div>
    );
  }

  if (!data?.topScorers?.length) {
    return (
      <div className="p-8 text-center">
        <FiAlertCircle className="mx-auto mb-2 text-gray-600" size={28} />
        <p className="text-sm text-gray-500">Top scorers not available</p>
      </div>
    );
  }

  const primary = data.topScorers[0];
  const players = primary.topScorers || [];
  const name = tournamentName || primary.tournamentName || "Top Scorers";

  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-white">{name}</h3>
        <span className="text-[11px] text-gray-500 uppercase tracking-wider">Goals</span>
      </div>
      <div className="divide-y divide-gray-800/50">
        {players.slice(0, 10).map((item, i) => {
          const player = item.player || item;
          const team = item.team || null;
          const stats = item.statistics || {};
          const goals = stats?.goals || stats?.total || 0;
          const appearances = stats?.appearances || stats?.matches || 0;
          const name = player?.name || "Unknown";

          return (
            <div key={player?.id || i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#202436] transition-colors">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                i === 0 ? "bg-yellow-900/40 text-yellow-400" :
                i === 1 ? "bg-gray-700 text-gray-300" :
                i === 2 ? "bg-orange-900/30 text-orange-400" :
                "bg-gray-800 text-gray-500"
              }`}>{i + 1}</span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">{name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-200 truncate">{name}</p>
                {team?.name && <p className="text-[11px] text-gray-500 truncate">{team.name}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {appearances > 0 && (
                  <span className="text-xs text-gray-500 hidden sm:block">{appearances} apps</span>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-red-500 text-sm font-bold">⚽</span>
                  <span className="font-extrabold text-white tabular-nums">{goals}</span>
                </div>
              </div>
            </div>
          );
        })}
        {players.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No top scorer data available</div>
        )}
      </div>
    </div>
  );
}
