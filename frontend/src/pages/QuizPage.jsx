import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import api from "../lib/api";

export default function QuizPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const quiz = state?.quiz;

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(quiz ? Array(quiz.questions.length).fill(null) : []);
  const [submitting, setSubmitting] = useState(false);

  if (!quiz) return <Navigate to="/dashboard" replace />;

  const question = quiz.questions[current];
  const isLast = current === quiz.questions.length - 1;

  const selectOption = (idx) => {
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/quiz/submit", {
        quiz_title: quiz.title,
        source_mode: quiz.source_mode,
        questions: quiz.questions,
        selected_answers: answers,
      });
      navigate("/results", { state: { attempt: data } });
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl font-semibold text-ink">{quiz.title}</h1>
        <span className="font-mono text-sm text-ink/50">
          {current + 1} / {quiz.questions.length}
        </span>
      </div>

      <div className="h-1.5 bg-ink/10 rounded-full mb-10 overflow-hidden">
        <div
          className="h-full bg-highlight transition-all duration-300"
          style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-white border border-ink/10 rounded-xl p-6 mb-6">
        <p className="font-display text-xl text-ink mb-6 leading-snug">{question.question}</p>

        <div className="space-y-3">
          {question.options.map((opt, idx) => {
            const selected = answers[current] === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => selectOption(idx)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors focus-ring ${
                  selected
                    ? "border-ink bg-highlight/30"
                    : "border-ink/15 hover:border-ink/40 bg-white"
                }`}
              >
                <span className="text-ink">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => setCurrent((c) => c - 1)}
          className="px-5 py-2.5 rounded-md font-medium text-ink/70 hover:text-ink disabled:opacity-30 focus-ring"
        >
          Back
        </button>

        {isLast ? (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-md font-medium bg-ink text-paper hover:bg-ink/90 disabled:opacity-50 focus-ring"
          >
            {submitting ? "Submitting…" : "Finish quiz"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrent((c) => c + 1)}
            className="px-6 py-2.5 rounded-md font-medium bg-ink text-paper hover:bg-ink/90 focus-ring"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
