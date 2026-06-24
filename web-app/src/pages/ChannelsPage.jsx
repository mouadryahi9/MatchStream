import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api/client";
import { FiSearch, FiChevronLeft, FiChevronRight, FiTv, FiX } from "react-icons/fi";
import TsPlayer from "../components/TsPlayer";

export default function ChannelsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [activeChannel, setActiveChannel] = useState(null);

  const params = { page, limit: 50 };
  if (search) params.search = search;
  if (category) params.category = category;

  const { data, isLoading } = useQuery({
    queryKey: ["iptv-channels", search, category, page],
    queryFn: () => api.get("/iptv/channels", { params }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: catData } = useQuery({
    queryKey: ["iptv-categories"],
    queryFn: () => api.get("/iptv/categories").then((r) => r.data),
  });

  const channels = data?.channels || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);
  const categories = catData?.categories || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <FiTv className="text-brand-red" /> Channels
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">{total} channels</span>
      </div>

      {activeChannel && (
        <div className="mb-6 block-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">{activeChannel.name}</h2>
            <button onClick={() => setActiveChannel(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1">
              <FiX size={20} />
            </button>
          </div>
          <TsPlayer streamUrl={`${window.location.origin}/api/iptv/stream?url=${encodeURIComponent(activeChannel.url)}`} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-10"
            placeholder="Search channels..."
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="input-field sm:w-48"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-red" />
        </div>
      ) : channels.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={`block-card text-left p-4 hover:border-brand-red/50 transition-all ${
                  activeChannel?.id === ch.id ? "border-brand-red ring-1 ring-brand-red/30" : ""
                }`}
              >
                <p className="font-medium text-sm truncate text-gray-800 dark:text-gray-100">{ch.name}</p>
                {ch.category && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 inline-block">{ch.category}</span>
                )}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-30"
                >
                  <FiChevronLeft /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-30"
                >
                  Next <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 block-card">
          <FiTv className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={36} />
          <p className="text-gray-500 dark:text-gray-400 mb-1">No channels found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{search ? "Try a different search term" : "Upload channels in the admin panel"}</p>
        </div>
      )}
    </div>
  );
}
