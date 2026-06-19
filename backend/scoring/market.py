from __future__ import annotations

_MARKET_SIZE_SCORES: dict[str, int] = {
    "small": 25,
    "medium": 50,
    "large": 75,
    "very_large": 100,
}

_INTERVIEW_SCORES: dict[str, int] = {
    "0": 0,
    "1-5": 15,
    "6-10": 25,
    "10+": 40,
}


def _score_taille_marche(answers: dict) -> int:
    return _MARKET_SIZE_SCORES[answers["market_size"]]


def _score_validation_client(answers: dict) -> int:
    interview_pts = _INTERVIEW_SCORES[answers["customer_interviews"]]

    loi = int(answers["has_loi"])
    loi_pts = 0 if loi == 0 else (15 if loi == 1 else 30)

    paying_pts = 30 if answers["has_paying_customers"] else 0

    return interview_pts + loi_pts + paying_pts  # max 100


def _score_modele_revenus(answers: dict) -> int:
    documented = answers["revenue_model_documented"]
    rev_type = answers["revenue_model_type"]
    if documented == "documented":
        return 100 if rev_type != "undefined" else 60
    if documented == "draft":
        return 40
    return 10  # "none"


def compute_market_score(answers: dict) -> dict:
    taille = _score_taille_marche(answers)
    validation = _score_validation_client(answers)
    modele = _score_modele_revenus(answers)

    composite = round(taille * 0.30 + validation * 0.40 + modele * 0.30, 1)

    return {
        "composite": composite,
        "sub_scores": {
            "taille_marche":     {"value": taille,     "weight": 0.30, "max": 100},
            "validation_client": {"value": validation,  "weight": 0.40, "max": 100},
            "modele_revenus":    {"value": modele,      "weight": 0.30, "max": 100},
        },
    }
