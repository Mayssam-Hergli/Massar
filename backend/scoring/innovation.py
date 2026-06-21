from __future__ import annotations

_SCORE_MAPS: dict[str, dict[str, int]] = {
    "local_novelty": {
        "existing": 10,
        "similar":  40,
        "new":      70,
        "unique":   100,
    },
    "technology_intensity": {
        "none":   10,
        "low":    40,
        "medium": 70,
        "high":   100,
    },
    "barrier_to_entry": {
        "none":   10,
        "low":    40,
        "medium": 70,
        "high":   100,
    },
}

_IP_BONUS: dict[str, int] = {
    "none":    0,
    "pending": 5,
    "granted": 15,
}


def compute_innovation_score(answers: dict) -> dict:
    novelty  = _SCORE_MAPS["local_novelty"][answers["local_novelty"]]
    tech     = _SCORE_MAPS["technology_intensity"][answers["technology_intensity"]]
    barrier  = _SCORE_MAPS["barrier_to_entry"][answers["barrier_to_entry"]]
    barrier  = min(100, barrier + _IP_BONUS[answers.get("has_ip_protection", "none")])

    composite = round(novelty * 0.35 + tech * 0.30 + barrier * 0.35, 1)

    return {
        "composite": composite,
        "sub_scores": {
            "nouveaute_locale":        {"value": novelty,  "weight": 0.35, "max": 100},
            "intensite_technologique": {"value": tech,     "weight": 0.30, "max": 100},
            "barriere_entree":         {"value": barrier,  "weight": 0.35, "max": 100},
        },
    }
