import { useLocation, useNavigate, Navigate, Link } from "react-router-dom";

export default function ResultsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const attempt = state?.attempt;

  if (!attempt) return <Navigate to="/dashboard" replace />;

  const pct = Math.round((attempt.score / attempt.total) * 100);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <p className="text-ink/50 text-sm mb-2">{attempt.quiz_title}</p>
        <p className="font-mono text-6xl font-bold text-ink">
          {attempt.score}
          <span className="text-ink/30">/{attempt.total}</span>
        </p>
        <p className="text-ink/60 mt-2">{pct}% correct</p>
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 rounded-md font-medium bg-ink text-paper hover:bg-ink/90 focus-ring"
          >
            New quiz
          </button>
          <Link
            to="/history"
            className="px-5 py-2.5 rounded-md font-medium border border-ink/20 text-ink hover:border-ink/40 focus-ring"
          >
            View history
          </Link>
        </div>
      </div>

      <h2 className="font-display text-xl font-semibold text-ink mb-4">Review</h2>
      <div className="space-y-4">
        {attempt.questions.map((q, idx) => {
          const selected = attempt.selected_answers[idx];
          const isCorrect = selected === q.correct_index;
          return (
            <div key={idx} className="bg-white border border-ink/10 rounded-xl p-5">
              <p className="font-medium text-ink mb-3">{q.question}</p>
              <div className="space-y-2 mb-3">
                {q.options.map((opt, oIdx) => {
                  let style = "border-ink/10 text-ink/70";
                  if (oIdx === q.correct_index) style = "border-correct bg-correct/10 text-ink";
                  else if (oIdx === selected) style = "border-wrong bg-wrong/10 text-ink";
                  return (
                    <div key={oIdx} className={`px-3 py-2 rounded-md border text-sm ${style}`}>
                      {opt}
                    </div>
                  );
                })}
              </div>
              <p className={`text-sm ${isCorrect ? "text-correct" : "text-wrong"} font-medium mb-1`}>
                {isCorrect ? "Correct" : selected === null ? "Not answered" : "Incorrect"}
              </p>
              <p className="text-sm text-ink/60">{q.explanation}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
