"""
Lexical retrieval over the real Tunisian knowledge base — a deliberately
simple stand-in for MS3's intended vector-search retrieval.

Why lexical instead of the vector search MS3/backend/ingest_retievel.py
was built for: that script embeds knowledge_base.json into a Supabase
pgvector table (Gemini embeddings, 768-dim) — real infrastructure that
isn't configured in this repo (no SUPABASE_URL/SUPABASE_SERVICE_KEY in
.env) and MS3/backend/ never actually shipped a retrieval QUERY function
— /api/v1/roadmap/generate expects the caller to already supply
`knowledge_chunks`. Until the Supabase side is set up, this module scores
the same 36 real resources by tag overlap (domain + maturity stage) so
the roadmap is still grounded in real KB entries, never invented ones.
Swap this file for a real vector-search call later — `retrieve_chunks()`
is the only function callers (rag/roadmap.py) depend on.
"""

import json
from pathlib import Path
from typing import Any

KB_PATH = Path(__file__).parent / "knowledge_base.json"

with open(KB_PATH, "r", encoding="utf-8") as f:
    _KB = json.load(f)["resources"]

# Our 5 score dimensions don't have a 1:1 match with the KB's domain tags
# (administrative, financial, innovation, legal, market, organisational,
# technical) — there is no "environmental" tag in the 36 resources, so
# green-driven retrieval naturally returns fewer/no matches. Documented,
# not silently papered over.
DIMENSION_TO_KB_DOMAINS: dict[str, tuple[str, ...]] = {
    "market": ("market", "financial"),
    "commercial": ("market", "organisational"),
    "innovation": ("innovation", "technical"),
    "scalability": ("organisational", "technical"),
    "green": (),  # no environmental domain exists in the current KB
}


def _score_resource(resource: dict, domains: set[str], stage: str | None) -> int:
    score = 0
    resource_domains = set(resource.get("domain", []))
    score += 2 * len(resource_domains & domains)
    if stage and stage in resource.get("stage_relevance", []):
        score += 3
    return score


def retrieve_chunks(
    low_scoring_dimensions: list[str],
    anomaly_codes: list[str],
    stage: str | None = None,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """
    Returns up to `top_k` KB resources, ranked by overlap with the
    dimensions that scored low and the entrepreneur's current maturity
    stage — shaped to match MS3's KBChunk schema exactly (kb_id, title,
    type, description, link, downloadable, stage_relevance, domain).
    """
    domains: set[str] = set()
    for dim in low_scoring_dimensions:
        domains.update(DIMENSION_TO_KB_DOMAINS.get(dim, ()))
    # Anomaly codes are prefixed by dimension (e.g. "market_no_validation")
    for code in anomaly_codes:
        for dim in DIMENSION_TO_KB_DOMAINS:
            if code.startswith(dim):
                domains.update(DIMENSION_TO_KB_DOMAINS[dim])

    # Nothing to anchor retrieval on (e.g. no anomalies, no low scores) —
    # fall back to administrative/financial basics every founder needs.
    if not domains:
        domains = {"administrative", "financial"}

    scored = [
        (_score_resource(r, domains, stage), r) for r in _KB
    ]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    top = [r for score, r in scored if score > 0][:top_k]
    if not top:
        top = [r for _, r in scored[:top_k]]

    return [
        {
            "kb_id": r["kb_id"],
            "title": r["title"],
            "type": r["type"],
            "description": r["description"],
            "link": r.get("source_url") or "",
            "downloadable": bool(r.get("downloadable_doc_url")),
            "stage_relevance": r.get("stage_relevance", []),
            "domain": r.get("domain", []),
        }
        for r in top
    ]
