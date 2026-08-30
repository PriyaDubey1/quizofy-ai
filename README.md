# Quizofy AI

Generate multiple-choice quizzes from a topic or your own notes (PDF/text upload), take them,
and track your score history. Full-stack app: FastAPI + MongoDB backend, React + Vite frontend,
Groq (free) for quiz generation.

## 1. Get your free accounts (5 min)

1. **Groq API key** (free, no card): https://console.groq.com/keys → "Create API Key"
2. **MongoDB Atlas** (free M0 cluster): https://www.mongodb.com/cloud/atlas/register
   - Create a free cluster → Database Access: add a user with a password →
     Network Access: add `0.0.0.0/0` (allow from anywhere) →
     Connect → Drivers → copy the connection string (looks like
     `mongodb+srv://user:pass@cluster.mongodb.net/...`)

## 2. Deploy the backend to Render (free)

1. Push this whole project to a GitHub repo.
2. Go to https://render.com → New → Web Service → connect your GitHub repo.
3. Set **Root Directory** to `backend`.
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Add environment variables (Render dashboard → Environment):
   - `MONGO_URL` = your Atlas connection string
   - `DB_NAME` = `quizofy`
   - `JWT_SECRET` = any long random string (e.g. generate one with `openssl rand -hex 32`)
   - `GROQ_API_KEY` = your Groq key
   - `CORS_ORIGINS` = `*` for now (tighten to your Vercel URL after step 3)
7. Deploy. Once live, copy your backend URL, e.g. `https://quizofy-backend.onrender.com`.
   Test it by visiting `https://quizofy-backend.onrender.com/api/` — you should see
   `{"message": "Quizofy AI API is running"}`.

   Note: Render's free tier spins down when idle, so the first request after a while
   can take ~30-50 seconds to wake up. That's normal.

## 3. Deploy the frontend to Vercel (free)

1. Go to https://vercel.com → Add New → Project → import the same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Framework preset: Vite (should auto-detect).
4. Add environment variable:
   - `VITE_BACKEND_URL` = your Render backend URL from step 2 (no trailing slash)
5. Deploy. You'll get a live URL like `https://quizofy-ai.vercel.app`.
6. Go back to Render and set `CORS_ORIGINS` to that exact Vercel URL, then redeploy the backend.

You now have a live link to submit.

## Running locally (optional, for testing before you deploy)

Backend:
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in MONGO_URL, JWT_SECRET, GROQ_API_KEY
uvicorn server:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
cp .env.example .env   # VITE_BACKEND_URL=http://localhost:8000
npm run dev
```
Visit http://localhost:3000

## What it does

- Sign up / log in (JWT auth, passwords hashed with bcrypt)
- Generate a quiz from a **topic** (e.g. "Photosynthesis") or from **your notes**
  (upload a PDF/.txt or paste text) — Groq's Llama model returns structured questions
- Take the quiz, see your score and a full answer review with explanations
- All attempts are saved per-user and viewable on the History page

## Project structure

```
backend/
  server.py       - FastAPI app: auth, quiz generation, history, all in one file
  requirements.txt
  render.yaml      - Render deploy config
frontend/
  src/
    pages/          - Login, Register, Dashboard, QuizPage, ResultsPage, HistoryPage
    components/     - Navbar, ProtectedRoute
    context/        - AuthContext (JWT stored in localStorage)
    lib/api.js       - axios client, attaches auth token to requests
```
