from __future__ import annotations

from scoring.green import compute_green_score
from scoring.market import compute_market_score
from scoring.commercial import compute_commercial_score
from scoring.innovation import compute_innovation_score
from scoring.scalability import compute_scalability_score
from scoring.anomaly import detect_all_anomalies

_DIMENSIONS = [
    ("market",      compute_market_score),
    ("commercial",  compute_commercial_score),
    ("innovation",  compute_innovation_score),
    ("scalability", compute_scalability_score),
    ("green",       compute_green_score),
]


def compute_all_scores(diagnostic_answers: dict) -> dict:
    """
    Pure deterministic aggregator. Zero LLM calls.

    Calls all 5 scoring functions in fixed order, then anomaly detection.
    Individual dimension failures are caught and returned as error stubs so
    incomplete profiles never crash the pipeline — missing green fields do
    not prevent market/commercial/innovation/scalability from scoring.

    Serves as ground truth: agent.py must produce identical composite values
    for every non-error dimension when wrapping this with Claude orchestration.

    Returns:
        {
            "scores": {
                "market": {composite, sub_scores} | {composite: None, error, sub_scores: {}},
                "commercial": ...,
                "innovation": ...,
                "scalability": ...,
                "green": {composite, undp_raw_total, undp_classification, pillars}
                         | {composite: None, error, sub_scores: {}},
            },
            "anomaly_flags": [{code, message, severity}, ...],
            "low_scoring_dimensions": [<names where composite < 50>],
            "green_pillars_flagged": [<pillar names where score >= 3>],
        }
    """
    scores: dict[str, dict] = {}

    for name, fn in _DIMENSIONS:
        try:
            scores[name] = fn(diagnostic_answers)
        except Exception as exc:
            scores[name] = {"composite": None, "error": str(exc), "sub_scores": {}}

    anomaly_result = detect_all_anomalies(diagnostic_answers, scores)

    low_scoring = [
        name for name, score in scores.items()
        if score.get("composite") is not None and score["composite"] < 50
    ]

    green = scores.get("green", {})
    green_flagged = [
        pillar
        for pillar, data in green.get("pillars", {}).items()
        if data.get("score", 0) >= 3
    ]

    return {
        "scores": scores,
        "anomaly_flags": anomaly_result["anomaly_flags"],
        "low_scoring_dimensions": low_scoring,
        "green_pillars_flagged": green_flagged,
    }
