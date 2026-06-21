import { useState } from "react";
import { useMatches } from "../hooks/useMatches";
import MatchCard from "../components/MatchCard";
import { FiSearch, FiFilter, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function MatchesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sport, setSport] = useState("");

  const { data, isLoading } = useMatches({ page, limit: 20, search, status, sport });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Matches</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            placeholder="Search matches..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-10"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field sm:w-40">
          <option value="">All Status</option>
          <option value="live">Live</option>
          <option value="scheduled">Scheduled</option>
          <option value="finished">Finished</option>
        </select>
        <input
          type="text"
          placeholder="Sport filter"
          value={sport}
          onChange={(e) => { setSport(e.target.value); setPage(1); }}
          className="input-field sm:w-40"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-500"></div>
        </div>
      ) : data?.matches?.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {data.matches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary flex items-center gap-1 disabled:opacity-30">
              <FiChevronLeft /> Previous
            </button>
            <span className="text-sm text-dark-400">Page {data.page} of {Math.ceil(data.total / data.limit)}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={data.page >= Math.ceil(data.total / data.limit)} className="btn-secondary flex items-center gap-1 disabled:opacity-30">
              Next <FiChevronRight />
            </button>
          </div>
        </>
      ) : (
        <div className="card p-12 text-center text-dark-400">
          <FiFilter className="mx-auto mb-3" size={32} />
          <p>No matches found</p>
        </div>
      )}
    </div>
  );
}
