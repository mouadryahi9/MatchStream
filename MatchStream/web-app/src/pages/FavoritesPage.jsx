import { useAuth } from "../context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { FiHeart, FiArrowLeft } from "react-icons/fi";

export default function FavoritesPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FiHeart className="text-red-400" /> My Favorites
      </h1>
      <div className="card p-12 text-center text-dark-400">
        <FiHeart className="mx-auto mb-3" size={32} />
        <p className="mb-1">No favorites yet</p>
        <p className="text-sm">Browse matches and add your favorites</p>
        <Link to="/matches" className="btn-primary inline-flex items-center gap-1 mt-4">
          <FiArrowLeft /> Browse Matches
        </Link>
      </div>
    </div>
  );
}
