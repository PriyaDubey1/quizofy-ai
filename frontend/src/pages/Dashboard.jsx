import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [mode, setMode] = useState("topic");
  const [topic, setTopic] = useState("");
  const [notesText, setNotesText] = useState("");
  const [fileName, setFileName] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post("/quiz/upload-notes", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNotesText(data.notes_text);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not read that file");
      setFileName("");
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "topic" && !topic.trim()) {
      setError("Enter a topic to generate a quiz about");
      return;
    }
    if (mode === "notes" && !notesText.trim()) {
      setError("Upload a file or paste your notes first");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/quiz/generate", {
        mode,
        topic: mode === "topic" ? topic.trim() : undefined,
        notes_text: mode === "notes" ? notesText.trim() : undefined,
        num_questions: Number(numQuestions),
        difficulty,
      });
      navigate("/quiz", { state: { quiz: data } });
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not generate a quiz, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl font-semibold text-ink mb-2">Make a quiz</h1>
      <p className="text-ink/60 mb-10">Pick a topic, or turn your own notes into practice questions.</p>

      <div className="flex gap-2 mb-8 bg-white border border-ink/10 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("topic")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus-ring ${
            mode === "topic" ? "bg-highlight text-ink" : "text-ink/60 hover:text-ink"
          }`}
        >
          From a topic
        </button>
        <button
          type="button"
          onClick={() => setMode("notes")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus-ring ${
            mode === "notes" ? "bg-highlight text-ink" : "text-ink/60 hover:text-ink"
          }`}
        >
          From my notes
        </button>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        {mode === "topic" ? (
          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1">Topic</label>
            <input
              type="text"
              placeholder="e.g. Photosynthesis, The French Revolution, React hooks"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-ink/20 rounded-md px-3 py-2.5 bg-white focus-ring"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink/80">Study notes</label>
            <div className="border border-dashed border-ink/25 rounded-lg p-6 text-center bg-white">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFile}
                className="hidden"
                id="notes-file"
              />
              <label htmlFor="notes-file" className="cursor-pointer text-sm">
                <span className="font-medium text-ink underline underline-offset-2">Upload a PDF or .txt file</span>
                <span className="text-ink/50"> — or paste text below</span>
              </label>
              {fileName && <p className="text-xs text-ink/50 mt-2">Loaded: {fileName}</p>}
            </div>
            <textarea
              rows={6}
              placeholder="Paste your notes here…"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className="w-full border border-ink/20 rounded-md px-3 py-2.5 bg-white focus-ring text-sm"
            />
          </div>
        )}

        <div className="flex gap-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink/80 mb-1">Questions</label>
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
              className="w-full border border-ink/20 rounded-md px-3 py-2.5 bg-white focus-ring"
            >
              {[3, 5, 8, 10, 15].map((n) => (
                <option key={n} value={n}>
                  {n} questions
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink/80 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full border border-ink/20 rounded-md px-3 py-2.5 bg-white focus-ring"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {error && <p className="text-wrong text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-paper py-3 rounded-md font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 focus-ring"
        >
          {loading ? "Generating quiz…" : "Generate quiz"}
        </button>
      </form>
    </div>
  );
}
