import { Routes, Route, Navigate, Link } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-3xl mx-auto px-6 py-24 text-center">
      <p className="inline-block bg-highlight/40 text-ink text-xs font-medium px-3 py-1 rounded-full mb-6">
        Practice smarter
      </p>
      <h1 className="font-display text-5xl font-semibold text-ink leading-tight mb-5">
        Turn any topic or your own notes into a quiz.
      </h1>
      <p className="text-ink/60 text-lg mb-10 max-w-xl mx-auto">
        Quizofy AI generates multiple-choice practice questions instantly, so you can
        check what you actually know before the real test.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          to="/register"
          className="bg-ink text-paper px-6 py-3 rounded-md font-medium hover:bg-ink/90 transition-colors focus-ring"
        >
          Get started free
        </Link>
        <Link
          to="/login"
          className="border border-ink/20 text-ink px-6 py-3 rounded-md font-medium hover:border-ink/40 transition-colors focus-ring"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <QuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
