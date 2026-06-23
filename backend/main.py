from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os

load_dotenv()

from database import init_db
from api.auth import router as auth_router
from api.profiles import router as profiles_router
from api.scoring import router as scoring_router
from api.diagnostic import router as diagnostic_router
from api.roadmap import router as roadmap_router

# ─── App Instance ────────────────────────────────────────────
app = FastAPI(
    title="AINS 2026 — Plateforme IA pour l'Entrepreneuriat",
    description="""
    Plateforme de diagnostic, scoring et orientation
    pour les entrepreneurs tunisiens.

    3 modules intégrés:
    - Moteur de diagnostic adaptatif (6 stades de maturité)
    - Scoring multi-dimensionnel explicable (5 dimensions)
    - RAG + Roadmap ancrée dans 41+ ressources tunisiennes réelles

    Assistant trilingue: Français / Arabe / Darija Tunisienne
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Rate Limiting ────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGINS", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Database init ────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()

# ─── Routers ──────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(scoring_router)
app.include_router(diagnostic_router)   # MS1 — diagnostic intake (integrated)
app.include_router(roadmap_router)      # MS3 — RAG & roadmap (integrated)

# ─── Health ───────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "platform": "AINS 2026 — Plateforme IA pour l'Entrepreneuriat",
        "status": "running",
        "version": "1.0.0",
        "modules": ["diagnostic", "scoring", "rag", "assistant"],
        "languages": ["fr", "ar", "tn"],
        "docs": "/docs",
    }

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}

# ─── Diagnostic (MS1) ── now served by api/diagnostic.py (mounted above) ──
#   GET  /diagnostic/schema · POST /diagnostic/answers/{id}

# ─── RAG + Roadmap (MS3) ── now served by api/roadmap.py (mounted above) ──
#   POST /roadmap/generate/{id} · GET /roadmap/{id} · POST /roadmap/chat
#   POST /roadmap/evaluate-progress

# ─── Assistant Routes (stub) ──────────────────────────────────

@app.post("/assistant/chat", tags=["Assistant"])
def chat():
    """
    Assistant conversationnel trilingue (FR/AR/Darija).
    Ancré dans le profil diagnostic + scores + KB de l'entrepreneur.
    Jamais de réponses génériques — toujours contextualisé.
    """
    return {"message": "assistant chat — coming Day 3"}

@app.get("/assistant/history/{profile_id}", tags=["Assistant"])
def get_history(profile_id: str):
    return {"message": f"chat history for {profile_id} — coming Day 3"}
