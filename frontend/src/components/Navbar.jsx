import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-ink/10 bg-paper/90 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight text-ink">
          Quizofy <span className="text-highlight">·</span> AI
        </Link>
        {user ? (
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard" className="text-ink/70 hover:text-ink transition-colors focus-ring rounded">
              New quiz
            </Link>
            <Link to="/history" className="text-ink/70 hover:text-ink transition-colors focus-ring rounded">
              History
            </Link>
            <span className="text-ink/40">|</span>
            <span className="text-ink/70">{user.name}</span>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-ink/70 hover:text-ink transition-colors focus-ring rounded"
            >
              Log out
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/login" className="text-ink/70 hover:text-ink transition-colors focus-ring rounded">
              Log in
            </Link>
            <Link
              to="/register"
              className="bg-ink text-paper px-4 py-2 rounded-md hover:bg-ink/90 transition-colors focus-ring"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
