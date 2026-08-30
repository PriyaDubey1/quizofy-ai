import os
import uuid
import json
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from dotenv import load_dotenv
from pypdf import PdfReader
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
JWT_ALGO = "HS256"
JWT_EXPIRE_DAYS = 30

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Quizofy AI")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()


# ---------- Models ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str


class TokenResponse(BaseModel):
    token: str
    user: UserOut


class QuizGenerateRequest(BaseModel):
    mode: str  # "topic" or "notes"
    topic: Optional[str] = None
    notes_text: Optional[str] = None
    num_questions: int = 5
    difficulty: str = "medium"  # easy | medium | hard


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str


class QuizOut(BaseModel):
    id: str
    title: str
    source_mode: str
    questions: List[QuizQuestion]


class AnswerSubmit(BaseModel):
    quiz_title: str
    source_mode: str
    questions: List[QuizQuestion]
    selected_answers: List[Optional[int]]


class AttemptOut(BaseModel):
    id: str
    quiz_title: str
    source_mode: str
    score: int
    total: int
    created_at: datetime
    questions: List[QuizQuestion]
    selected_answers: List[Optional[int]]


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Auth routes ----------
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(body: UserCreate):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": body.name.strip(),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return TokenResponse(token=token, user=UserOut(id=user_id, name=user_doc["name"], email=user_doc["email"]))


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_token(user["id"])
    return TokenResponse(token=token, user=UserOut(id=user["id"], name=user["name"], email=user["email"]))


@api_router.get("/auth/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return UserOut(id=current_user["id"], name=current_user["name"], email=current_user["email"])


# ---------- Quiz generation ----------
QUIZ_SYSTEM_PROMPT = """You are a quiz generator. Given study material or a topic, produce a multiple-choice quiz.
Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this schema:
{
  "title": "short quiz title",
  "questions": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_index": 0,
      "explanation": "one sentence explaining why the correct answer is right"
    }
  ]
}
Rules:
- Exactly 4 options per question.
- correct_index is the 0-based index of the correct option.
- Vary which index is correct across questions, do not always use 0.
- Questions must be answerable from the given material/topic and factually accurate.
- No duplicate questions.
"""


def call_groq(topic_or_notes: str, mode: str, num_questions: int, difficulty: str) -> dict:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Server is not configured with an AI API key")

    if mode == "topic":
        user_prompt = (
            f"Create a {difficulty} difficulty quiz with exactly {num_questions} multiple-choice "
            f"questions about this topic: {topic_or_notes}"
        )
    else:
        user_prompt = (
            f"Create a {difficulty} difficulty quiz with exactly {num_questions} multiple-choice "
            f"questions based strictly on the following study notes:\n\n{topic_or_notes[:12000]}"
        )

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.6,
                "response_format": {"type": "json_object"},
            },
            timeout=60,
        )
    except requests.RequestException as e:
        logger.error(f"Groq request failed: {e}")
        raise HTTPException(status_code=502, detail="Could not reach the AI service, please try again")

    if resp.status_code != 200:
        logger.error(f"Groq error {resp.status_code}: {resp.text}")
        raise HTTPException(status_code=502, detail="The AI service returned an error, please try again")

    content = resp.json()["choices"][0]["message"]["content"]
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        logger.error(f"Bad JSON from model: {content}")
        raise HTTPException(status_code=502, detail="The AI returned an unexpected response, please try again")

    return parsed


@api_router.post("/quiz/generate", response_model=QuizOut)
async def generate_quiz(body: QuizGenerateRequest, current_user: dict = Depends(get_current_user)):
    if body.mode == "topic":
        if not body.topic or not body.topic.strip():
            raise HTTPException(status_code=400, detail="Please enter a topic")
        source_text = body.topic.strip()
    elif body.mode == "notes":
        if not body.notes_text or not body.notes_text.strip():
            raise HTTPException(status_code=400, detail="No notes text was provided")
        source_text = body.notes_text.strip()
    else:
        raise HTTPException(status_code=400, detail="mode must be 'topic' or 'notes'")

    num_questions = max(3, min(body.num_questions, 15))
    parsed = call_groq(source_text, body.mode, num_questions, body.difficulty)

    questions_raw = parsed.get("questions", [])[:num_questions]
    questions = []
    for q in questions_raw:
        opts = q.get("options", [])
        if len(opts) != 4:
            continue
        questions.append(
            QuizQuestion(
                question=q.get("question", "").strip(),
                options=[o.strip() for o in opts],
                correct_index=int(q.get("correct_index", 0)),
                explanation=q.get("explanation", "").strip(),
            )
        )

    if not questions:
        raise HTTPException(status_code=502, detail="Could not generate a quiz from that input, please try again")

    return QuizOut(
        id=str(uuid.uuid4()),
        title=parsed.get("title", body.topic or "Quiz from notes"),
        source_mode=body.mode,
        questions=questions,
    )


@api_router.post("/quiz/upload-notes")
async def upload_notes(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    filename = (file.filename or "").lower()
    raw = await file.read()

    if filename.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(raw))
            text = "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception as e:
            logger.error(f"PDF parse error: {e}")
            raise HTTPException(status_code=400, detail="Could not read that PDF, try a different file")
    else:
        try:
            text = raw.decode("utf-8", errors="ignore")
        except Exception:
            raise HTTPException(status_code=400, detail="Unsupported file type, please upload a PDF or .txt file")

    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No readable text was found in that file")

    return {"notes_text": text[:20000]}


# ---------- Attempts / history ----------
@api_router.post("/quiz/submit", response_model=AttemptOut)
async def submit_quiz(body: AnswerSubmit, current_user: dict = Depends(get_current_user)):
    score = sum(
        1
        for q, ans in zip(body.questions, body.selected_answers)
        if ans is not None and ans == q.correct_index
    )
    attempt_id = str(uuid.uuid4())
    doc = {
        "id": attempt_id,
        "user_id": current_user["id"],
        "quiz_title": body.quiz_title,
        "source_mode": body.source_mode,
        "score": score,
        "total": len(body.questions),
        "questions": [q.model_dump() for q in body.questions],
        "selected_answers": body.selected_answers,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.attempts.insert_one(doc)
    return AttemptOut(
        id=attempt_id,
        quiz_title=body.quiz_title,
        source_mode=body.source_mode,
        score=score,
        total=len(body.questions),
        created_at=datetime.fromisoformat(doc["created_at"]),
        questions=body.questions,
        selected_answers=body.selected_answers,
    )


@api_router.get("/history", response_model=List[AttemptOut])
async def get_history(current_user: dict = Depends(get_current_user)):
    cursor = db.attempts.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1)
    attempts = await cursor.to_list(200)
    for a in attempts:
        a["created_at"] = datetime.fromisoformat(a["created_at"])
    return attempts


@api_router.get("/")
async def root():
    return {"message": "Quizofy AI API is running"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
