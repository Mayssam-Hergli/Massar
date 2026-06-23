"""
ingest_knowledge_base.py

Reads knowledge_base.json, generates a 768-dim embedding for each resource
using Gemini's gemini-embedding-001 model, then upserts every row into the
Supabase knowledge_base table.

Run once (or re-run safely — uses upsert on kb_id so no duplicates).

Usage:
    python ingest_knowledge_base.py

Required .env variables:
    GEMINI_API_KEY      — your Google AI Studio key (same one used by main.py)
    SUPABASE_URL        — https://xxxxxxxxxxxx.supabase.co
    SUPABASE_SERVICE_KEY — your service role / secret key
"""

import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY")
SUPABASE_URL       = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

EMBEDDING_MODEL    = "gemini-embedding-001"
EMBEDDING_DIM      = 768          # must match vector(768) in your table
BATCH_PAUSE_SEC    = 1.0          # pause between Gemini calls (free tier: 1500 req/min, but be polite)
KB_JSON_PATH       = Path(__file__).parent / "knowledge_base.json"

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def validate_env():
    missing = []
    if not GEMINI_API_KEY:
        missing.append("GEMINI_API_KEY")
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY:
        missing.append("SUPABASE_SERVICE_KEY")
    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            "Make sure your .env file is present and complete."
        )

# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------
def embed_text(text: str) -> list[float]:
    """
    Calls Gemini's embedding API and returns a 768-dim float list.
    Uses task_type=RETRIEVAL_DOCUMENT since we're embedding KB entries
    that will later be retrieved via similarity search.
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)

    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=EMBEDDING_DIM,
        ),
    )
    return result.embeddings[0].values


def build_embed_text(resource: dict) -> str:
    """
    Constructs the text that gets embedded for each resource.
    We combine title + description + eligibility + domain tags because
    retrieval queries will be built from gap/score descriptions — this
    gives the embedding the richest semantic surface to match against.
    """
    parts = [
        resource.get("title", ""),
        resource.get("description", ""),
    ]
    if resource.get("eligibility"):
        parts.append(f"Éligibilité: {resource['eligibility']}")
    if resource.get("domain"):
        parts.append(f"Domaines: {', '.join(resource['domain'])}")
    if resource.get("stage_relevance"):
        parts.append(f"Stades: {', '.join(resource['stage_relevance'])}")
    return " | ".join(p for p in parts if p.strip())


# ---------------------------------------------------------------------------
# Supabase upsert
# ---------------------------------------------------------------------------
def upsert_resource(supabase_client, resource: dict, embedding: list[float]):
    """
    Upserts one resource row into knowledge_base.
    On conflict on kb_id, updates all fields (safe to re-run).
    """
    row = {
        "kb_id":               resource["kb_id"],
        "title":               resource["title"],
        "type":                resource["type"],
        "category_tags":       resource.get("category_tags", []),
        "description":         resource["description"],
        "eligibility":         resource.get("eligibility"),
        "stage_relevance":     resource.get("stage_relevance", []),
        "domain":              resource.get("domain", []),
        "source_url":          resource.get("source_url"),
        "source_name":         resource.get("source_name"),
        "downloadable_doc_url": resource.get("downloadable_doc_url"),
        "language":            resource.get("language", "fr"),
        "last_verified":       resource.get("last_verified"),
        "embedding":           embedding,
    }

    result = (
        supabase_client
        .table("knowledge_base")
        .upsert(row, on_conflict="kb_id")
        .execute()
    )
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    validate_env()

    # Load resources
    if not KB_JSON_PATH.exists():
        raise FileNotFoundError(
            f"knowledge_base.json not found at {KB_JSON_PATH}\n"
            "Place it in the same folder as this script."
        )

    with open(KB_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    resources = data.get("resources", [])
    total = len(resources)
    print(f"Loaded {total} resources from {KB_JSON_PATH}\n")

    # Init Supabase client
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Process each resource
    success_count = 0
    failed = []

    for i, resource in enumerate(resources, start=1):
        kb_id = resource.get("kb_id", f"unknown_{i}")
        title = resource.get("title", "")
        print(f"[{i}/{total}] Embedding: {kb_id} — {title[:60]}...")

        try:
            # Build and embed the text
            embed_text_str = build_embed_text(resource)
            embedding = embed_text(embed_text_str)

            if len(embedding) != EMBEDDING_DIM:
                raise ValueError(
                    f"Expected {EMBEDDING_DIM} dims, got {len(embedding)}"
                )

            # Upsert into Supabase
            upsert_resource(supabase, resource, embedding)
            print(f"  ✓ Inserted ({len(embedding)} dims)")
            success_count += 1

        except Exception as e:
            print(f"  ✗ FAILED: {e}")
            failed.append({"kb_id": kb_id, "error": str(e)})

        # Pause between calls to respect free-tier rate limits
        if i < total:
            time.sleep(BATCH_PAUSE_SEC)

    # Summary
    print(f"\n{'='*50}")
    print(f"Done. {success_count}/{total} resources ingested successfully.")
    if failed:
        print(f"\n{len(failed)} failures:")
        for f in failed:
            print(f"  - {f['kb_id']}: {f['error']}")
        print("\nRe-run the script to retry failed entries — upsert is safe to repeat.")
    else:
        print("All resources ingested. Your knowledge_base table is ready.")


if __name__ == "__main__":
    main()