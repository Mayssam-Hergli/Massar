"""
LLM provider abstraction for the MS3 roadmap engine — ported from
MS3/backend/llm_client.py and extended with a Groq branch.

Why a Groq branch was added during integration:
MS3 originally supported only "gemini" and "anthropic", but this repo's
.env only has GROQ_API_KEY configured (same key already used by the MS2
scoring agent). Rather than asking for a new Gemini/Anthropic key just to
wire the pipeline, Groq's OpenAI-compatible API is used here with forced
tool-calling — the same approach scoring/llm_client.py already uses.

Provider is selected via RAG_LLM_PROVIDER (deliberately NOT the same env
var as MS2's LLM_PROVIDER — the two LLM subsystems are independent and
must be swappable without colliding with each other).

Supported providers (set via RAG_LLM_PROVIDER in .env):
  - "groq"      -> Groq's OpenAI-compatible API (default — matches the
                    GROQ_API_KEY already configured for MS2)
  - "gemini"    -> Google Gemini API (free tier, no card required)
  - "anthropic" -> Claude API directly, or any Anthropic-compatible endpoint
"""

import os
import json
from typing import Any, Dict, List

RAG_LLM_PROVIDER = os.getenv("RAG_LLM_PROVIDER", "groq").lower()


def _convert_schema_for_gemini(schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Gemini's response_schema uses a constrained subset of the OpenAPI schema
    dialect — notably, it does NOT support "additionalProperties" or
    "format": "date-time" / "uri" the way standard JSON Schema does.
    """
    if not isinstance(schema, dict):
        return schema

    cleaned = {}
    for key, value in schema.items():
        if key == "additionalProperties":
            continue
        if key == "format" and value not in ("enum", "date-time"):
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


def _call_groq(
    system_prompt: str,
    user_prompt: str,
    schema: Dict[str, Any],
    tool_name: str,
    tool_description: str,
    max_tokens: int,
    temperature: float,
) -> Dict[str, Any]:
    from openai import OpenAI

    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=os.environ["GROQ_API_KEY"],
    )
    model_name = os.getenv("RAG_LLM_MODEL", "llama-3.3-70b-versatile")

    response = client.chat.completions.create(
        model=model_name,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        tools=[{
            "type": "function",
            "function": {
                "name": tool_name,
                "description": tool_description,
                "parameters": schema,
            },
        }],
        tool_choice={"type": "function", "function": {"name": tool_name}},
    )

    message = response.choices[0].message
    if not message.tool_calls:
        raise ValueError("Model failed to use the required structured output tool.")
    return json.loads(message.tool_calls[0].function.arguments)


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

    model_name = os.getenv("RAG_LLM_MODEL", "gemini-2.5-flash")
    client = genai.Client(api_key=api_key)
    gemini_schema = _convert_schema_for_gemini(schema)

    response = client.models.generate_content(
        model=model_name,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=gemini_schema,
            max_output_tokens=max_tokens + 1000,
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
            f"Gemini returned an empty response (finish_reason={finish_reason})."
        )

    try:
        return json.loads(response.text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini's response was not valid JSON: {e}")


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

    client = Anthropic()
    model_name = os.getenv("RAG_LLM_MODEL", "claude-sonnet-4-6")

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
    """Provider-agnostic structured-output call. Returns a plain dict matching `schema`."""
    if RAG_LLM_PROVIDER == "groq":
        return _call_groq(
            system_prompt, user_prompt, schema, tool_name, tool_description,
            max_tokens, temperature,
        )
    elif RAG_LLM_PROVIDER == "gemini":
        return _call_gemini(system_prompt, user_prompt, schema, max_tokens, temperature)
    elif RAG_LLM_PROVIDER == "anthropic":
        return _call_anthropic(
            system_prompt, user_prompt, schema, tool_name, tool_description,
            max_tokens, temperature,
        )
    else:
        raise RuntimeError(
            f"Unknown RAG_LLM_PROVIDER '{RAG_LLM_PROVIDER}'. Set it to 'groq', 'gemini' or 'anthropic' in .env."
        )


def call_llm_chat(
    system_prompt: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 1500,
    temperature: float = 0.4,
) -> str:
    """Provider-agnostic plain-text conversational call (used by /roadmap/chat)."""
    if RAG_LLM_PROVIDER == "groq":
        from openai import OpenAI

        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ["GROQ_API_KEY"],
        )
        model_name = os.getenv("RAG_LLM_MODEL", "llama-3.3-70b-versatile")
        response = client.chat.completions.create(
            model=model_name,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "system", "content": system_prompt}] + messages,
        )
        return response.choices[0].message.content

    elif RAG_LLM_PROVIDER == "gemini":
        from google import genai
        from google.genai import types

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set in the environment.")
        model_name = os.getenv("RAG_LLM_MODEL", "gemini-2.5-flash")
        client = genai.Client(api_key=api_key)

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

    elif RAG_LLM_PROVIDER == "anthropic":
        from anthropic import Anthropic

        client = Anthropic()
        model_name = os.getenv("RAG_LLM_MODEL", "claude-sonnet-4-6")
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
            f"Unknown RAG_LLM_PROVIDER '{RAG_LLM_PROVIDER}'. Set it to 'groq', 'gemini' or 'anthropic' in .env."
        )
