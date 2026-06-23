import os
from typing import Dict, List, Literal, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError
import json
from dotenv import load_dotenv

from llm_client import call_llm_structured, call_llm_chat

load_dotenv()  # reads .env so GEMINI_API_KEY / ANTHROPIC_API_KEY / LLM_PROVIDER are picked up

app = FastAPI(title="MS3 — Roadmap Generation Engine")

# ---------------------------------------------------------------------------
# LLM Provider Configuration
# ---------------------------------------------------------------------------
# All LLM calls now go through llm_client.call_llm_structured() /
# call_llm_chat(), which read LLM_PROVIDER from the environment and route to
# either Gemini or Anthropic accordingly. See llm_client.py for details.
#
# Today: LLM_PROVIDER=gemini (free tier, no card required).
# Later: set LLM_PROVIDER=anthropic and ANTHROPIC_API_KEY to the real Claude
# key. Nothing in this file changes — only .env.

ROADMAP_SCHEMA = {
    "type": "object",
    "properties": {
        "project_id": {"type": "string"},
        "generated_at": {"type": "string", "format": "date-time"},
        "maturity_stage": {"type": "string"},
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "order": {"type": "integer"},
                    "title": {"type": "string"},
                    "title_en_short": {"type": "string"},
                    "time_horizon": {"type": "string"},
                    "icon": {"type": "string"},
                    "addresses": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string"},
                            "ref_id": {"type": "string"},
                            "label": {"type": "string"}
                        },
                        "required": ["type", "ref_id", "label"],
                        "additionalProperties": False
                    },
                    "explanation": {"type": "string"},
                    "resources": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "source_id": {"type": "string"},
                                "title": {"type": "string"},
                                "type": {"type": "string"},
                                "link": {"type": "string", "format": "uri"},
                                "downloadable": {"type": "boolean"}
                            },
                            "required": ["source_id", "title", "type", "link", "downloadable"],
                            "additionalProperties": False
                        }
                    }
                },
                "required": [
                    "id", "order", "title", "title_en_short", "time_horizon",
                    "icon", "addresses", "explanation", "resources"
                ],
                "additionalProperties": False
            }
        }
    },
    "required": ["project_id", "generated_at", "maturity_stage", "steps"],
    "additionalProperties": False
}

PROGRESS_SCHEMA = {
    "type": "object",
    "properties": {
        "progress_score": {
            "type": "integer",
            "description": "An integer from 0 to 100 representing the absolute maturity and completion of the project."
        },
        "reasoning": {
            "type": "string",
            "description": "A short, encouraging explanation for the entrepreneur explaining why their score changed based on their latest action."
        },
        "momentum": {
            "type": "string",
            "enum": ["stagnant", "steady", "accelerating", "breakthrough"],
            "description": "An indicator of the project's current momentum based on the latest update."
        }
    },
    "required": ["progress_score", "reasoning", "momentum"],
    "additionalProperties": False
}

# --- Pydantic Schemas for Input Validation ---

active_chat_sessions: Dict[str, List[Dict[str, str]]] = {}


class RoadmapResource(BaseModel):
    source_id: str
    title: str
    type: str
    link: str
    downloadable: bool


class RoadmapAddresses(BaseModel):
    type: str
    ref_id: str
    label: str


class RoadmapStep(BaseModel):
    id: str
    order: int
    title: str
    title_en_short: str
    time_horizon: str
    icon: str
    addresses: RoadmapAddresses
    explanation: str
    resources: List[RoadmapResource]


class RoadmapOutput(BaseModel):
    project_id: str
    generated_at: str
    maturity_stage: str
    steps: List[RoadmapStep]


class ComponentContext(BaseModel):
    title: str
    description: str
    step_id: Optional[str] = None


class ContextualChatPayload(BaseModel):
    session_id: str
    project_id: str
    clicked_component: ComponentContext
    new_message: str


class Gap(BaseModel):
    gap_id: str
    domain: str
    description: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]


class ProjectMetadata(BaseModel):
    sector: str
    current_stage: str
    legal_form: str


class ProgressEvaluationPayload(BaseModel):
    project_id: str
    latest_update: str = Field(..., description="A brief description of the entrepreneur's latest action or update.")


class DiagnosticData(BaseModel):
    project_metadata: ProjectMetadata
    identified_gaps: List[Gap]


class MaturityScores(BaseModel):
    overall_score: float
    financial_readiness: float
    legal_compliance: float
    technical_execution: float
    market_fit: float


class ScoringFlags(BaseModel):
    is_eligible_for_startup_act: bool
    requires_immediate_capital_injection: bool


class ScoringData(BaseModel):
    maturity_scores: MaturityScores
    flags: ScoringFlags


class KBChunk(BaseModel):
    kb_id: str
    title: str
    type: str
    description: str
    link: str
    downloadable: bool = False
    stage_relevance: List[str]
    domain: List[str]


class RetrievalData(BaseModel):
    retrieved_chunks: List[KBChunk]


class RoadmapPayload(BaseModel):
    diagnostic: DiagnosticData
    scoring: ScoringData
    knowledge_chunks: RetrievalData


# --- Endpoints ---

@app.post("/api/v1/roadmap/generate")
async def generate_roadmap(payload: RoadmapPayload):
    try:
        system_prompt = """
        You are a deterministic routing and reasoning engine for Tunisian startups.
        Analyze the input blocks and return a structured JSON roadmap.

        Strict structural constraints:
        - Return ONLY JSON matching the requested payload format.
        - No conversational filler, backticks, or markdown envelopes.
        - Do not hallucinate fields or program names outside of provided chunks.
        """

        user_prompt = f"""
        Execute roadmap building using these precise modules:

        1. DIAGNOSTIC INPUT:
        {payload.diagnostic.model_dump_json(indent=2)}

        2. SCORING INPUT:
        {payload.scoring.model_dump_json(indent=2)}

        3. RETRIEVED KNOWLEDGE BASE CHUNKS:
        {payload.knowledge_chunks.model_dump_json(indent=2)}

        Construct the final JSON plan containing:
        - roadmap summary
        - sequential milestones grouped by Horizon 1, 2, or 3
        - explicit map links using 'addresses.ref_id' and 'resources'.
        """

        structured_data = call_llm_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            schema=ROADMAP_SCHEMA,
            tool_name="generate_roadmap_json",
            tool_description="Generates the final structured JSON roadmap.",
            max_tokens=4000,
            temperature=0.1,
        )

        try:
            validated = RoadmapOutput.model_validate(structured_data)
        except ValidationError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Model output failed schema validation: {e}"
            )
        return {"status": "success", "data": validated.model_dump()}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/roadmap/evaluate-progress")
async def evaluate_project_progress(payload: ProgressEvaluationPayload):
    try:
        current_stage = "Structuration"
        previous_score = 22
        remaining_gaps = [
            {"domain": "Legal", "description": "Missing company registration.", "severity": "CRITICAL"},
            {"domain": "Market", "description": "No proof of traction.", "severity": "HIGH"}
        ]

        system_prompt = """
        You are an expert startup evaluator for the Tunisian ecosystem.
        Your job is to evaluate the absolute progress of a startup project from 0 to 100.
        0 = Just an idea in the entrepreneur's head.
        100 = Fully funded, legally structured, and operational.

        Analyze the entrepreneur's current stage, their remaining gaps, and their latest action.
        Weigh the impact of their latest action heavily: administrative tasks add little progress,
        while proving market traction, securing legal status, or locking funding add massive progress.

        Return your evaluation using ONLY the provided structured tool.
        """

        user_prompt = f"""
        Evaluate the new progress score for this project.

        CURRENT STATUS:
        - Stage: {current_stage}
        - Previous Score: {previous_score if previous_score is not None else 'N/A (Initial Calculation)'}

        WHAT THE ENTREPRENEUR JUST DID:
        - {payload.latest_update}

        CRITICAL REMAINING GAPS WEIGHING THE PROJECT DOWN:
        {json.dumps(remaining_gaps, indent=2)}
        """

        evaluation_data = call_llm_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            schema=PROGRESS_SCHEMA,
            tool_name="record_progress_evaluation",
            tool_description="Records the evaluated progress score and reasoning.",
            max_tokens=1000,
            temperature=0.2,
        )

        return {"status": "success", "data": evaluation_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/roadmap/chat")
async def contextual_roadmap_chat(payload: ContextualChatPayload):
    try:
        current_stage = "Structuration"
        sector = "HealthTech"
        key_weakness = "Lacks proof of client traction and legal incorporation."

        system_prompt = f"""
        You are a highly helpful and expert startup advisor for the Tunisian ecosystem.
        You are directly assisting an entrepreneur in a contextual chat window.

        OVERALL PROJECT CONTEXT:
        - Sector: {sector}
        - Current Maturity Stage: {current_stage}
        - Key Vulnerabilities: {key_weakness}

        CURRENT FOCUS (What the user is looking at right now):
        The user just Ctrl+Clicked on a specific component in their dashboard.
        Focus your advice heavily on this component:
        - Component Title: {payload.clicked_component.title}
        - Component Details: {payload.clicked_component.description}

        RULES:
        - Keep answers concise, actionable, and encouraging.
        - Reference their specific sector or stage if it adds value.
        - If they ask a general question, gently bring it back to their current focus.
        """

        session_id = payload.session_id

        if session_id not in active_chat_sessions:
            active_chat_sessions[session_id] = []

        session_history = active_chat_sessions[session_id]
        session_history.append({"role": "user", "content": payload.new_message})

        ai_reply = call_llm_chat(
            system_prompt=system_prompt,
            messages=session_history,
            max_tokens=1500,
            temperature=0.4,
        )

        session_history.append({"role": "assistant", "content": ai_reply})
        active_chat_sessions[session_id] = session_history

        return {
            "status": "success",
            "data": {
                "reply": ai_reply
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))