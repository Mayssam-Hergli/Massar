from __future__ import annotations

_SCORE_MAPS: dict[str, dict[str, int]] = {
    "replicability": {
        "manual":    20,
        "semi_auto": 60,
        "automated": 100,
    },
    "manual_dependency": {
        # Inverted scale: less human intervention required = higher score
        "high":   10,
        "medium": 40,
        "low":    70,
        "none":   100,
    },
    "geographic_potential": {
        "local":    25,
        "national": 50,
        "regional": 75,
        "global":   100,
    },
}

_SUB_CRITERIA = [
    ("replicabilite",          "replicability",        0.35),
    ("dependance_manuelle",    "manual_dependency",    0.30),
    ("potentiel_geographique", "geographic_potential", 0.35),
]


def compute_scalability_score(answers: dict) -> dict:
    sub_scores: dict[str, dict] = {}
    composite_raw = 0.0

    for key, field, weight in _SUB_CRITERIA:
        value = _SCORE_MAPS[field][answers[field]]
        sub_scores[key] = {"value": value, "weight": weight, "max": 100}
        composite_raw += value * weight

    return {
        "composite": round(composite_raw, 1),
        "sub_scores": sub_scores,
    }
