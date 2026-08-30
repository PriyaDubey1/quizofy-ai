import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function HistoryPage() {
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/history")
      .then(({ data }) => setAttempts(data))
      .catch((err) => setError(err?.response?.data?.detail || "Could not load your history"));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink mb-8">Your history</h1>

      {error && <p className="text-wrong text-sm mb-4">{error}</p>}

      {attempts === null && !error && <p className="text-ink/50">Loading…</p>}

      {attempts?.length === 0 && (
        <p className="text-ink/50">No quizzes yet. Generate one to see it show up here.</p>
      )}

      <div className="space-y-3">
        {attempts?.map((a) => {
          const date = new Date(a.created_at);
          return (
            <button
              key={a.id}
              onClick={() => navigate("/results", { state: { attempt: a } })}
              className="w-full text-left bg-white border border-ink/10 rounded-xl p-5 flex items-center justify-between hover:border-ink/30 transition-colors focus-ring"
            >
              <div>
                <p className="font-medium text-ink">{a.quiz_title}</p>
                <p className="text-xs text-ink/50 mt-1">
                  {date.toLocaleDateString()} · {a.source_mode === "topic" ? "Topic" : "Notes"}
                </p>
              </div>
              <p className="font-mono text-lg font-semibold text-ink">
                {a.score}/{a.total}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
