import { useAuth } from "../context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { FiHeart, FiArrowLeft } from "react-icons/fi";

export default function FavoritesPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
        <FiHeart className="text-brand-red" /> My Favorites
      </h1>
      <div className="block-card p-12 text-center">
        <FiHeart className="mx-auto mb-3 text-gray-300 dark:text-dark-500" size={32} />
        <p className="text-gray-500 dark:text-dark-300 mb-1">No favorites yet</p>
        <p className="text-sm text-gray-400 dark:text-dark-400">Browse matches and add your favorites</p>
        <Link to="/matches" className="btn-primary inline-flex items-center gap-1.5 mt-4">
          <FiArrowLeft /> Browse Matches
        </Link>
      </div>
    </div>
  );
}
