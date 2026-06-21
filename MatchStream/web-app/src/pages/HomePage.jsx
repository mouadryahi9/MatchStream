import { Link } from "react-router-dom";
import { useLiveMatches, useUpcomingMatches } from "../hooks/useMatches";
import MatchCard from "../components/MatchCard";
import { FiArrowRight, FiTv, FiCalendar } from "react-icons/fi";

function HeroSection() {
  return (
    <section className="text-center py-12 md:py-20">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
        MatchStream
      </h1>
      <p className="text-dark-400 text-lg mb-8 max-w-lg mx-auto">
        Watch live sports streaming, anywhere, anytime.
      </p>
      <Link to="/matches" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3">
        Browse Matches <FiArrowRight />
      </Link>
    </section>
  );
}

function LiveSection() {
  const { data: matches, isLoading } = useLiveMatches();

  if (isLoading) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FiTv className="text-red-500" /> Live Now
        </h2>
      </div>
      {matches?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {matches.slice(0, 8).map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      ) : (
        <div className="card p-8 text-center text-dark-400">
          <FiTv className="mx-auto mb-2" size={32} />
          <p>No live matches right now</p>
          <Link to="/matches" className="text-primary-400 text-sm hover:underline mt-2 inline-block">View upcoming matches</Link>
        </div>
      )}
    </section>
  );
}

function UpcomingSection() {
  const { data: matches, isLoading } = useUpcomingMatches(8);

  if (isLoading) return null;

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <FiCalendar className="text-primary-400" /> Upcoming Matches
      </h2>
      {matches?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {matches.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      ) : (
        <div className="card p-8 text-center text-dark-400">
          <p>No upcoming matches scheduled</p>
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <LiveSection />
      <UpcomingSection />
    </div>
  );
}
