import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const Layout = lazy(() => import("./components/Layout"));
const HomePage = lazy(() => import("./pages/HomePage"));
const MatchesPage = lazy(() => import("./pages/MatchesPage"));
const MatchDetailPage = lazy(() => import("./pages/MatchDetailPage"));
const WatchPage = lazy(() => import("./pages/WatchPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:id" element={<MatchDetailPage />} />
          <Route path="/watch/:id" element={<WatchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
