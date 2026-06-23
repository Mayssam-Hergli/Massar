"""
llm_client.py — single chokepoint for calling whichever LLM provider is
currently configured.

Why this file exists:
Anthropic (Claude) and Google (Gemini) use different mechanisms to force
structured JSON output:
  - Anthropic: tool_choice={"type": "tool", "name": ...} + tools[].input_schema
  - Gemini:    response_mime_type="application/json" + response_schema

main.py should never need to know which one is active. Every endpoint calls
call_llm_structured(...) below and gets back a plain Python dict that already
matches the requested schema. Swapping providers means changing LLM_PROVIDER
in .env — zero changes to main.py's endpoint logic.

Supported providers (set via LLM_PROVIDER in .env):
  - "gemini"    -> Google Gemini API (free tier, no card required)
  - "anthropic" -> Claude API directly, or any Anthropic-compatible endpoint
                   (e.g. DeepSeek's /anthropic base_url) via ANTHROPIC_BASE_URL
"""

import os
import json
from typing import Any, Dict, List

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()


def _convert_schema_for_gemini(schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Gemini's response_schema uses a constrained subset of the OpenAPI schema
    dialect — notably, it does NOT support "additionalProperties" or
    "format": "date-time" / "uri" the way standard JSON Schema does.
    This strips/adapts the unsupported keywords recursively so the same
    ROADMAP_SCHEMA / PROGRESS_SCHEMA dicts defined in main.py can be reused
    for both providers without maintaining two separate schema definitions.
    """
    if not isinstance(schema, dict):
        return schema

    cleaned = {}
    for key, value in schema.items():
        if key == "additionalProperties":
            continue  # unsupported by Gemini, silently drop
        if key == "format" and value not in ("enum", "date-time"):
            # Gemini only recognizes a small set of format values; drop the
            # rest (e.g. "uri") rather than risk a schema rejection error.
            continue
        if isinstance(value, dict):
            cleaned[key] = _convert_schema_for_gemini(value)
        elif isinstance(value, list):
            cleaned[key] = [
                _convert_schema_for_gemini(v) if isinstance(v, dict) else v
                for v in value
            ]
        else:
            cleaned[key] = value
    return cleaned


def _call_gemini(
    system_prompt: str,
    user_prompt: str,
    schema: Dict[str, Any],
    max_tokens: int,
    temperature: float,
) -> Dict[str, Any]:
    from google import genai
    from google.genai import types

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in the environment.")

    model_name = os.getenv("LLM_MODEL", "gemini-2.5-flash")

    client = genai.Client(api_key=api_key)

    gemini_schema = _convert_schema_for_gemini(schema)

    response = client.models.generate_content(
        model=model_name,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=gemini_schema,
            max_output_tokens=max_tokens + 1000,  # headroom above the caller's budget
            temperature=temperature,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )

    if not response.text:
        finish_reason = None
        try:
            finish_reason = response.candidates[0].finish_reason
        except (AttributeError, IndexError):
            pass
        raise ValueError(
            f"Gemini returned an empty response (finish_reason={finish_reason}). "
            "This usually means max_output_tokens was hit or content was blocked."
        )
 
    try:
        return json.loads(response.text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini's response was not valid JSON, likely truncated mid-output. "
            f"Try increasing max_tokens for this call. Raw error: {e}"
        )
    
def _call_anthropic(
    system_prompt: str,
    user_prompt: str,
    schema: Dict[str, Any],
    tool_name: str,
    tool_description: str,
    max_tokens: int,
    temperature: float,
) -> Dict[str, Any]:
    from anthropic import Anthropic

    client = Anthropic()  # reads ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL from env
    model_name = os.getenv("LLM_MODEL", "claude-sonnet-4-6")

    response = client.messages.create(
        model=model_name,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[{
            "name": tool_name,
            "description": tool_description,
            "input_schema": schema,
        }],
        tool_choice={"type": "tool", "name": tool_name},
    )

    for block in response.content:
        if block.type == "tool_use":
            return block.input

    raise ValueError("Model failed to use the required structured output tool.")


def call_llm_structured(
    system_prompt: str,
    user_prompt: str,
    schema: Dict[str, Any],
    tool_name: str = "generate_structured_output",
    tool_description: str = "Generates the required structured JSON output.",
    max_tokens: int = 4000,
    temperature: float = 0.1,
) -> Dict[str, Any]:
    """
    Provider-agnostic structured-output call. Returns a plain dict matching
    `schema`. Raises on failure — callers should catch and wrap in
    HTTPException same as before.
    """
    if LLM_PROVIDER == "gemini":
        return _call_gemini(system_prompt, user_prompt, schema, max_tokens, temperature)
    elif LLM_PROVIDER == "anthropic":
        return _call_anthropic(
            system_prompt, user_prompt, schema, tool_name, tool_description,
            max_tokens, temperature,
        )
    else:
        raise RuntimeError(
            f"Unknown LLM_PROVIDER '{LLM_PROVIDER}'. Set it to 'gemini' or 'anthropic' in .env."
        )


def call_llm_chat(system_prompt: str, messages: List[Dict[str, str]], max_tokens: int = 1500, temperature: float = 0.4) -> str:
    """
    Provider-agnostic plain-text conversational call (used by /roadmap/chat,
    which doesn't need forced structured output — just a text reply).
    `messages` follows the same [{"role": "user"/"assistant", "content": str}]
    shape used by both SDKs already, so no per-message conversion is needed.
    """
    if LLM_PROVIDER == "gemini":
        from google import genai
        from google.genai import types

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set in the environment.")
        model_name = os.getenv("LLM_MODEL", "gemini-2.5-flash")
        client = genai.Client(api_key=api_key)

        # Gemini expects role "model" instead of "assistant"
        gemini_history = [
            types.Content(
                role="model" if m["role"] == "assistant" else "user",
                parts=[types.Part(text=m["content"])],
            )
            for m in messages
        ]

        response = client.models.generate_content(
            model=model_name,
            contents=gemini_history,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )
        return response.text

    elif LLM_PROVIDER == "anthropic":
        from anthropic import Anthropic

        client = Anthropic()
        model_name = os.getenv("LLM_MODEL", "claude-sonnet-4-6")

        response = client.messages.create(
            model=model_name,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=messages,
        )
        return response.content[0].text

    else:
        raise RuntimeError(
            f"Unknown LLM_PROVIDER '{LLM_PROVIDER}'. Set it to 'gemini' or 'anthropic' in .env."
        )