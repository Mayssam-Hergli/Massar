import os
from typing import Dict, List, Literal,Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel,Field
import json
from anthropic import Anthropic
from pydantic import ValidationError
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MS3 — Roadmap Generation Engine")

# Initialize Anthropic Client
# Expected environment variable: ANTHROPIC_API_KEY
client = Anthropic()
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-v4-pro")

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
# --- Output Schema (For Claude Tool Call) ---
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


# Temporary Local DB to hold active chat sessions.
# Structure: { "session_123": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}] }
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
    step_id: Optional[str] = None # In case they clicked a specific step in the JSON

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
    link: str                          # ADD: the real source URL, so Claude copies instead of invents
    downloadable: bool = False         # ADD: matches what ROADMAP_SCHEMA.resources[] already requires
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
        # Load system prompt engineering layer
        system_prompt = """
        You are a deterministic routing and reasoning engine for Tunisian startups. 
        Analyze the input blocks and return a structured JSON roadmap.
        
        Strict structural constraints:
        - Return ONLY JSON matching the requested payload format.
        - No conversational filler, backticks, or markdown envelopes.
        - Do not hallucinate fields or program names outside of provided chunks.
        """

        # Format user prompt context with data blocks
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
        - explicit map links using 'addresses_ref_id' and 'resources'.
        """

        # Call Claude using structural parameter limits
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=4000,
            temperature=0.1,  # Low temperature ensures high alignment with retrieval sources
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ],
            tools=[{
                "name": "generate_roadmap_json",
                "description": "Generates the final structured JSON roadmap.",
                "input_schema": ROADMAP_SCHEMA
            }],
            tool_choice={"type": "tool", "name": "generate_roadmap_json"}
        )
    
        for block in response.content:
            if block.type == "tool_use":
                structured_data = block.input
                try:
                    validated = RoadmapOutput.model_validate(structured_data)
                except ValidationError as e:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Model output failed schema validation: {e}"
                    )
                return {"status": "success", "data": validated.model_dump()}
        raise ValueError("Model failed to use the required structured output tool.")
        # Safe catch for potential front/end string wrappers from LLM responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/v1/roadmap/evaluate-progress")
async def evaluate_project_progress(payload: ProgressEvaluationPayload):
    try:
        # ---------------------------------------------------------
        # 1. FETCH CONTEXT FROM POSTGRESQL (Source of Truth)
        # ---------------------------------------------------------
        # Example SQLAlchemy queries you would write here:
        # project_state = db.query(Project).filter(Project.id == payload.project_id).first()
        # db_gaps = db.query(Gap).filter(Gap.project_id == payload.project_id, Gap.is_resolved == False).all()
        # 1. Craft the System Prompt to act as a strict evaluator
        # --- Mocking the DB data for demonstration ---
        current_stage = "Structuration"  # From project_state.maturity_stage
        previous_score = 22              # From project_state.current_score
        # Formatted directly from your DB gaps table
        remaining_gaps = [
            {"domain": "Legal", "description": "Missing company registration.", "severity": "CRITICAL"},
            {"domain": "Market", "description": "No proof of traction.", "severity": "HIGH"}
        ]
        # ---------------------------------------------------------
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

        # 2. Inject the dynamic project data into the user prompt
        user_prompt = f"""
        Evaluate the new progress score for this project.

        CURRENT STATUS:
        - Stage: {current_stage}
        - Previous Score: {previous_score if previous_score is not None else 'N/A (Initial Calculation)'}

        WHAT THE ENTREPRENEUR JUST DID:
        - {payload.latest_update}

        CRITICAL REMAINING GAPS GAPS WEIGHING THE PROJECT DOWN:
        {json.dumps([gap for gap in remaining_gaps], indent=2)}
        """

        # 3. Call Claude and force the structured JSON output
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=1000,
            temperature=0.2, # Slightly higher than 0.1 to allow for better qualitative reasoning
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ],
            tools=[{
                "name": "record_progress_evaluation",
                "description": "Records the evaluated progress score and reasoning.",
                "input_schema": PROGRESS_SCHEMA
            }],
            tool_choice={"type": "tool", "name": "record_progress_evaluation"}
        )

        # 4. Extract and return the structured data block directly
        for block in response.content:
            if block.type == "tool_use":
                evaluation_data = block.input
                
                # Here, you would typically save evaluation_data["progress_score"] to your PostgreSQL DB
                
                return {
                    "status": "success", 
                    "data": evaluation_data
                }

        raise ValueError("Claude failed to return the structured evaluation tool.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/v1/roadmap/chat")
async def contextual_roadmap_chat(payload: ContextualChatPayload):
    try:
        # ---------------------------------------------------------
        # 1. FETCH OVERALL PROJECT CONTEXT FROM DB
        # ---------------------------------------------------------
        # mock_project = db.query(Project).filter(Project.id == payload.project_id).first()
        current_stage = "Structuration"
        sector = "HealthTech"
        key_weakness = "Lacks proof of client traction and legal incorporation."

        # ---------------------------------------------------------
        # 2. BUILD THE SYSTEM PROMPT (The "Brain" of the Copilot)
        # ---------------------------------------------------------
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

        # ---------------------------------------------------------
        # 3. FORMAT THE MESSAGE HISTORY FOR ANTHROPIC
        # ---------------------------------------------------------
        # ---------------------------------------------------------
        # 3. MANAGE THE SESSION HISTORY (Local DB)
        # ---------------------------------------------------------
        session_id = payload.session_id
        
        # If this is a new session, initialize an empty list
        if session_id not in active_chat_sessions:
            active_chat_sessions[session_id] = []
            
        # Retrieve existing history for this session
        session_history = active_chat_sessions[session_id]
        
        # Append the new user message to the history
        session_history.append({"role": "user", "content": payload.new_message})

        # ---------------------------------------------------------
        # 4. CALL CLAUDE
        # ---------------------------------------------------------
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=1500,
            temperature=0.4, # Slightly higher temperature for conversational fluidity
            system=system_prompt,
            messages=session_history
        )

        # Extract Claude's text reply
        ai_reply = response.content[0].text
        # ---------------------------------------------------------
        # 5. UPDATE AND SAVE THE SESSION HISTORY
        # ---------------------------------------------------------
        # Append Claude's reply so it remembers it for the next turn
        session_history.append({"role": "assistant", "content": ai_reply})
        
        # Save it back to our "Local DB"
        active_chat_sessions[session_id] = session_history

        return {
            "status": "success",
            "data": {
                "reply": ai_reply
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))