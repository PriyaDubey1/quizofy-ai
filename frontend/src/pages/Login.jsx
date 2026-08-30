import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display text-3xl font-semibold text-ink mb-1">Welcome back</h1>
      <p className="text-ink/60 mb-8">Log in to pick up where you left off.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink/80 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-ink/20 rounded-md px-3 py-2 bg-white focus-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-ink/20 rounded-md px-3 py-2 bg-white focus-ring"
          />
        </div>

        {error && <p className="text-wrong text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-paper py-2.5 rounded-md font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 focus-ring"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-ink/60 mt-6">
        No account yet?{" "}
        <Link to="/register" className="text-ink font-medium underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </div>
  );
}
