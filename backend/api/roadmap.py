"""
MS3 — Roadmap API routes, integrated from MS3/backend/main.py into this
backend's FastAPI app (no separate MS3 server). Reads MS2's scores and
MS1's diagnostic_answers straight from project_profiles — same database,
same profile_id, no duplicated state.

  POST /roadmap/generate/{profile_id}   — build + cache a roadmap from the
                                           profile's current scores
  GET  /roadmap/{profile_id}            — return the cached roadmap
  POST /roadmap/chat                    — contextual chat grounded in the
                                           profile's real scores/anomalies
  POST /roadmap/evaluate-progress       — progress score grounded in the
                                           profile's real anomaly history

Owner-protected like profiles/scoring: every query's WHERE clause includes
user_id = current_user["id"].
"""

import json
import sqlite3
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_db
from security.auth import get_current_user
from rag.roadmap import generate_roadmap, evaluate_progress, contextual_chat, derive_maturity_stage

router = APIRouter(prefix="/roadmap", tags=["Roadmap (MS3)"])

# In-memory chat session store — mirrors MS3's original design (not
# persisted; fine for a demo, would move to a table for production).
_active_chat_sessions: Dict[str, List[Dict[str, str]]] = {}


def _load_profile(db: sqlite3.Connection, profile_id: str, user_id: str) -> sqlite3.Row:
    row = db.execute(
        "SELECT * FROM project_profiles WHERE id = ? AND user_id = ?",
        (profile_id, user_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return row


def _parse_json(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default


def _scores_from_row(row: sqlite3.Row) -> dict:
    return {
        "market": _parse_json(row["market_score"], None),
        "commercial": _parse_json(row["commercial_score"], None),
        "innovation": _parse_json(row["innovation_score"], None),
        "scalability": _parse_json(row["scalability_score"], None),
        "green": _parse_json(row["green_score"], None),
    }


# ---------------------------------------------------------------------------
# POST /roadmap/generate/{profile_id}
# ---------------------------------------------------------------------------

@router.post("/generate/{profile_id}")
def generate(
    profile_id: str,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    row = _load_profile(db, profile_id, current_user["id"])

    diagnostic_answers = _parse_json(row["diagnostic_answers"], None)
    if not diagnostic_answers:
        raise HTTPException(status_code=400, detail="Profile has no diagnostic_answers. Complete the diagnostic first.")

    if row["market_score"] is None:
        raise HTTPException(status_code=400, detail="Profile has no scores yet. POST /scores/compute/{profile_id} first.")

    scores = _scores_from_row(row)
    anomaly_flags = _parse_json(row["anomaly_flags"], [])
    low_scoring_dimensions = _parse_json(row["low_scoring_dimensions"], [])

    try:
        roadmap = generate_roadmap(
            profile_id=profile_id,
            diagnostic_answers=diagnostic_answers,
            scores=scores,
            anomaly_flags=anomaly_flags,
            low_scoring_dimensions=low_scoring_dimensions,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Roadmap generation failed: {exc}")

    db.execute(
        "UPDATE project_profiles SET roadmap = ? WHERE id = ?",
        (json.dumps(roadmap), profile_id),
    )

    return {"profile_id": profile_id, "status": "success", "data": roadmap}


# ---------------------------------------------------------------------------
# GET /roadmap/{profile_id}
# ---------------------------------------------------------------------------

@router.get("/{profile_id}")
def get_cached(
    profile_id: str,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    row = _load_profile(db, profile_id, current_user["id"])
    if not row["roadmap"]:
        raise HTTPException(status_code=404, detail="Roadmap not yet generated. POST /roadmap/generate/{profile_id} first.")
    return {"profile_id": profile_id, "status": "success", "data": json.loads(row["roadmap"])}


# ---------------------------------------------------------------------------
# POST /roadmap/evaluate-progress
# ---------------------------------------------------------------------------

class ProgressPayload(BaseModel):
    profile_id: str
    latest_update: str


@router.post("/evaluate-progress")
def evaluate(
    payload: ProgressPayload,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    row = _load_profile(db, payload.profile_id, current_user["id"])
    diagnostic_answers = _parse_json(row["diagnostic_answers"], {})
    scores = _scores_from_row(row)
    anomaly_flags = _parse_json(row["anomaly_flags"], [])

    current_stage = derive_maturity_stage(scores, diagnostic_answers)

    prev = db.execute(
        "SELECT market, commercial, innovation, scalability, green FROM scores_history WHERE profile_id = ? ORDER BY computed_at DESC LIMIT 1",
        (payload.profile_id,),
    ).fetchone()
    previous_score = None
    if prev:
        vals = [v for v in (prev["market"], prev["commercial"], prev["innovation"], prev["scalability"], prev["green"]) if v is not None]
        previous_score = round(sum(vals) / len(vals), 1) if vals else None

    remaining_gaps = [
        {"domain": f["code"], "description": f.get("message", ""), "severity": f.get("severity", "medium")}
        for f in anomaly_flags
    ]

    try:
        result = evaluate_progress(payload.latest_update, current_stage, previous_score, remaining_gaps)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Progress evaluation failed: {exc}")

    return {"status": "success", "data": result}


# ---------------------------------------------------------------------------
# POST /roadmap/chat
# ---------------------------------------------------------------------------

class ComponentContext(BaseModel):
    title: str
    description: str
    step_id: Optional[str] = None


class ChatPayload(BaseModel):
    session_id: str
    profile_id: str
    clicked_component: ComponentContext
    new_message: str


@router.post("/chat")
def chat(
    payload: ChatPayload,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    row = _load_profile(db, payload.profile_id, current_user["id"])
    diagnostic_answers = _parse_json(row["diagnostic_answers"], {})
    scores = _scores_from_row(row)
    anomaly_flags = _parse_json(row["anomaly_flags"], [])

    current_stage = derive_maturity_stage(scores, diagnostic_answers)
    key_weakness = anomaly_flags[0]["message"] if anomaly_flags else "Aucune faiblesse critique identifiée."

    history = _active_chat_sessions.setdefault(payload.session_id, [])

    try:
        reply = contextual_chat(
            session_history=history,
            new_message=payload.new_message,
            sector="Non renseigné",
            current_stage=current_stage,
            key_weakness=key_weakness,
            component_title=payload.clicked_component.title,
            component_description=payload.clicked_component.description,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Chat failed: {exc}")

    return {"status": "success", "data": {"reply": reply}}
