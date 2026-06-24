import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api/client";
import { FiSearch, FiCopy } from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ChannelsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { data: catData } = useQuery({
    queryKey: ["channel-categories"],
    queryFn: () => api.get("/iptv/categories").then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["channels", search, category, page],
    queryFn: () => api.get("/iptv/channels", { params: { search: search || undefined, category: category || undefined, page, limit: 50 } }).then(r => r.data),
  });

  const categories = catData?.categories || [];
  const channels = data?.channels || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => toast("URL copied!", { autoClose: 1500 }));
  };

  return (
    <div className="p-6">
      <ToastContainer position="bottom-right" theme="dark" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Channels ({total})</h1>
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search..." className="input-field pl-9" />
          </div>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="input-field w-44">
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {channels.map((ch) => (
              <div key={ch.id} className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-3 flex items-start gap-3 group">
                {ch.logo ? (
                  <img src={ch.logo} alt="" className="w-10 h-10 rounded-lg object-contain shrink-0 bg-gray-900" onError={e => e.target.style.display = "none"} />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-800 shrink-0 flex items-center justify-center text-gray-600 text-xs">TV</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{ch.name}</p>
                  {ch.category && <p className="text-xs text-gray-500 mt-0.5">{ch.category}</p>}
                  <p className="text-[11px] text-gray-700 mt-1 truncate">{ch.url}</p>
                  <button onClick={() => copyUrl(ch.url)} className="btn-secondary text-xs mt-2 !py-1 !px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiCopy size={11} className="inline mr-1" /> Copy URL
                  </button>
                </div>
              </div>
            ))}
          </div>

          {channels.length === 0 && (
            <div className="text-center py-20 text-gray-600">No channels found</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs">Previous</button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
