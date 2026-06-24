import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api/client";
import { FiSave, FiLink, FiX } from "react-icons/fi";

const LEAGUES = [
  { key: "world-cup", label: "World Cup", queries: ["%World Cup%", "%كأس العالم%"] },
  { key: "ucl", label: "Champions League", queries: ["%Champions%", "%الأبطال%"] },
  { key: "laliga", label: "La Liga", queries: ["%La Liga%", "%الليغا%"] },
  { key: "botola", label: "Botola", queries: ["%Botola%", "%البطولة%"] },
];

export default function MatchesPage() {
  const qc = useQueryClient();
  const [leagueTab, setLeagueTab] = useState("world-cup");
  const [editingId, setEditingId] = useState(null);
  const [editUrl, setEditUrl] = useState("");
  const [pickerMatchId, setPickerMatchId] = useState(null);
  const [chanSearch, setChanSearch] = useState("");

  const activeLeague = LEAGUES.find((l) => l.key === leagueTab);

  const { data, isLoading } = useQuery({
    queryKey: ["matches", leagueTab],
    queryFn: () => api.get("/matches/football", { params: { limit: 200, league: activeLeague?.queries?.join(",") } }).then(r => r.data),
  });

  const { data: channelsData } = useQuery({
    queryKey: ["channels", chanSearch],
    queryFn: () => api.get("/iptv/channels", { params: { limit: 50, search: chanSearch || undefined } }).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, stream_url }) => api.patch(`/matches/${id}`, { stream_url }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["matches"] }); setEditingId(null); },
  });

  const matches = data?.matches || [];
  const channels = channelsData?.channels || [];

  const handleSave = (id) => {
    updateMutation.mutate({ id, stream_url: editUrl });
  };

  const pickChannel = (url) => {
    setEditUrl(url);
    setPickerMatchId(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-center gap-2 mb-6 bg-[#1a1d2e] rounded-xl p-1.5 border border-gray-800">
        {LEAGUES.map((l) => (
          <button
            key={l.key}
            onClick={() => { setLeagueTab(l.key); setEditingId(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              leagueTab === l.key
                ? "bg-red-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <div key={m.id} className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{m.league || "—"}</span>
                  <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                    m.status === "live" || m.status === "inprogress"
                      ? "bg-red-600/20 text-red-400"
                      : m.status === "scheduled"
                        ? "bg-yellow-600/20 text-yellow-400"
                        : "bg-gray-800 text-gray-500"
                  }`}>{m.status}</span>
                </div>
                <span className="text-xs text-gray-600">{m.start_time ? new Date(m.start_time).toLocaleDateString() : "—"}</span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-white min-w-0 flex-1 text-right">{m.home_team}</span>
                <span className="text-xs font-bold text-gray-500 shrink-0 px-2">
                  {m.home_score != null ? `${m.home_score} - ${m.away_score}` : "VS"}
                </span>
                <span className="text-sm font-semibold text-white min-w-0 flex-1">{m.away_team}</span>
              </div>

              <div className="flex items-center gap-2">
                {editingId === m.id ? (
                  <>
                    <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="Stream URL..." className="input-field flex-1 text-xs" />
                    <button onClick={() => handleSave(m.id)} className="btn-primary !p-2" title="Save"><FiSave size={14} /></button>
                    <button onClick={() => { setPickerMatchId(m.id); }} className="btn-secondary !p-2" title="Pick channel"><FiLink size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary !p-2" title="Cancel"><FiX size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-xs text-gray-500 truncate">{m.stream_url || "No URL"}</span>
                    <button onClick={() => { setEditingId(m.id); setEditUrl(m.stream_url || ""); }} className="btn-secondary text-xs">Edit URL</button>
                    <button onClick={() => { setPickerMatchId(m.id); }} className="btn-secondary text-xs">Channels</button>
                  </>
                )}
              </div>
            </div>
          ))}

          {matches.length === 0 && (
            <div className="text-center py-20 text-gray-600">No matches for {activeLeague?.label}</div>
          )}
        </div>
      )}

      {pickerMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPickerMatchId(null)}>
          <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl w-full max-w-lg max-h-[70vh] flex flex-col m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-sm font-bold text-white">Choose a channel</h3>
              <button onClick={() => setPickerMatchId(null)} className="text-gray-500 hover:text-white"><FiX size={18} /></button>
            </div>
            <div className="p-3">
              <input value={chanSearch} onChange={e => setChanSearch(e.target.value)} placeholder="Search channels..." className="input-field w-full text-sm" autoFocus />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => pickChannel(ch.url)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 text-sm text-gray-300 hover:text-white transition-all flex items-center gap-2"
                >
                  {ch.logo && <img src={ch.logo} alt="" className="w-5 h-5 rounded object-contain" onError={e => e.target.style.display = "none"} />}
                  <span className="truncate flex-1">{ch.name}</span>
                  <span className="text-xs text-gray-600 shrink-0">{ch.category || ""}</span>
                </button>
              ))}
              {channels.length === 0 && <p className="text-center py-8 text-gray-600 text-sm">No channels found</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
