import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring.engine import compute_all_scores

# -----------------------------------------------------------------------
# Test 1 — Complete strong profile
# All 5 modules have valid answers. No anomaly should fire.
# All composites > 50 -> low_scoring_dimensions = []
#
# Expected composites:
#   market:      75*0.30 + 100*0.40 + 100*0.30 = 22.5 + 40.0 + 30.0 = 92.5
#   commercial:  100*0.30 + 100*0.25 + 100*0.25 + 100*0.20 = 100.0
#   innovation:  100*0.35 + 100*0.30 + 100*0.35 = 100.0  (barrier capped at 100)
#   scalability: 100*0.35 + 100*0.30 + 100*0.35 = 100.0
#   green:       undp_raw_total=4.0 (all 1s) -> display=100.0
# -----------------------------------------------------------------------
STRONG = {
    # Market
    "market_size":               "large",
    "customer_interviews":       "10+",
    "has_loi":                   2,
    "has_paying_customers":      True,
    "revenue_model_documented":  "documented",
    "revenue_model_type":        "recurring",
    # Commercial
    "value_proposition_clarity": "differentiated",
    "product_maturity":          "product",
    "pricing_strategy":          "defined",
    "offer_need_alignment":      "validated",
    # Innovation
    "local_novelty":             "unique",
    "technology_intensity":      "high",
    "barrier_to_entry":          "high",
    "has_ip_protection":         "granted",
    # Scalability
    "replicability":             "automated",
    "manual_dependency":         "none",
    "geographic_potential":      "global",
    # Green — all lowest-impact values -> undp_raw_total = 4.0
    "energy_source":             "solar_wind",
    "energy_consumption":        "minimal",
    "transport_activity":        "none",
    "water_volume":              "none",
    "water_origin":              "rainwater_recycled",
    "wastewater_treatment":      "none_generated",
    "zone_type":                 "urban_industrial",
    "surface_impacted":          "none",
    "ecosystem_disruption":      "none",
    "raw_material_consumption":  "none_minimal",
    "waste_volume":              "none",
    "recycling_strategy":        "full_circular",
}

# -----------------------------------------------------------------------
# Test 2 — Overconfident founder ("Mohamed-style")
# Claims: very large market, automated scale, global reach.
# Reality: zero customer validation, product built without need validation,
#          automated reach but high manual dependency.
#
# Expected composites:
#   market:      100*0.30 + 0*0.40 + 40*0.30 = 30.0 + 0.0 + 12.0 = 42.0  <- LOW
#   commercial:  100*0.30 + 100*0.25 + 100*0.25 + 10*0.20 = 82.0
#   innovation:  100*0.35 + 100*0.30 + 100*0.35 = 100.0
#   scalability: 100*0.35 + 10*0.30 + 100*0.35 = 35 + 3 + 35 = 73.0
#   green:       undp_raw_total=12.0 (all 3s) -> display=50.0
#
# Expected anomaly flags (in detection order from anomaly.py):
#   1. market_no_validation   (a)
#   2. scalability_manual_conflict  (c)
#   3. product_built_unvalidated    (e)
#
# low_scoring_dimensions: ["market"]  (42.0 < 50; green=50.0 is NOT < 50)
# green_pillars_flagged: all 4 pillars (each = 3.0 >= 3)
# -----------------------------------------------------------------------
OVERCONFIDENT = {
    # Market — very large claim, zero validation
    "market_size":               "very_large",
    "customer_interviews":       "0",
    "has_loi":                   0,
    "has_paying_customers":      False,
    "revenue_model_documented":  "draft",
    "revenue_model_type":        "undefined",
    # Commercial — product fully built, need never validated
    "value_proposition_clarity": "differentiated",
    "product_maturity":          "product",
    "pricing_strategy":          "defined",
    "offer_need_alignment":      "none",
    # Innovation — strong across the board
    "local_novelty":             "unique",
    "technology_intensity":      "high",
    "barrier_to_entry":          "high",
    "has_ip_protection":         "none",
    # Scalability — global reach declared, but high manual dependency
    "replicability":             "automated",
    "manual_dependency":         "high",
    "geographic_potential":      "global",
    # Green — moderate impact (all fields = 3) -> undp_raw_total=12.0
    "energy_source":             "grid_steg",
    "energy_consumption":        "moderate",
    "transport_activity":        "regional",
    "water_volume":              "moderate",
    "water_origin":              "municipal_uncontrolled",
    "wastewater_treatment":      "partial_treatment",
    "zone_type":                 "rural_agricultural",
    "surface_impacted":          "medium",
    "ecosystem_disruption":      "moderate_reversible",
    "raw_material_consumption":  "moderate_partial",
    "waste_volume":              "moderate_partial",
    "recycling_strategy":        "partial",
}

# -----------------------------------------------------------------------
# Test 3 — Incomplete profile (missing innovation, scalability, green fields)
# engine.py must NOT crash. It returns error stubs for failed dimensions
# and continues scoring the dimensions that have enough data.
#
# Expected:
#   market:      50*0.30 + 15*0.40 + 40*0.30 = 15 + 6 + 12 = 33.0  <- LOW
#   commercial:  40*0.30 + 15*0.25 + 10*0.25 + 50*0.20
#                = 12 + 3.75 + 2.5 + 10 = 28.25
#                -> 28.2 (banker's rounding: 28.2 has digit 2, even)  <- LOW
#   innovation:  KeyError -> {composite: None, error: "...", sub_scores: {}}
#   scalability: KeyError -> {composite: None, error: "...", sub_scores: {}}
#   green:       KeyError -> {composite: None, error: "...", sub_scores: {}}
#
# low_scoring_dimensions: ["market", "commercial"]
#   (None composites are excluded — can't classify missing data as low-scoring)
# green_pillars_flagged: []  (green failed, no pillars)
# anomaly_flags: []  (no checks trigger on this minimal profile)
# -----------------------------------------------------------------------
INCOMPLETE = {
    # Market — all required fields present
    "market_size":               "medium",
    "customer_interviews":       "1-5",
    "has_loi":                   0,
    "has_paying_customers":      False,
    "revenue_model_documented":  "draft",
    "revenue_model_type":        "undefined",
    # Commercial — all required fields present
    "value_proposition_clarity": "vague",
    "product_maturity":          "idea",
    "pricing_strategy":          "none",
    "offer_need_alignment":      "partial",
    # Innovation, Scalability, Green fields intentionally absent
}


def test_strong_profile():
    result = compute_all_scores(STRONG)
    scores = result["scores"]

    # All 5 dimensions computed without error
    for dim in ("market", "commercial", "innovation", "scalability", "green"):
        assert scores[dim]["composite"] is not None, \
            f"{dim}: expected a score, got error: {scores[dim].get('error')}"

    assert scores["market"]["composite"]      == 92.5,  \
        f"market: expected 92.5, got {scores['market']['composite']}"
    assert scores["commercial"]["composite"]  == 100.0, \
        f"commercial: expected 100.0, got {scores['commercial']['composite']}"
    assert scores["innovation"]["composite"]  == 100.0, \
        f"innovation: expected 100.0, got {scores['innovation']['composite']}"
    assert scores["scalability"]["composite"] == 100.0, \
        f"scalability: expected 100.0, got {scores['scalability']['composite']}"
    assert scores["green"]["composite"]       == 100.0, \
        f"green: expected 100.0, got {scores['green']['composite']}"

    assert result["anomaly_flags"]          == [], \
        f"expected no anomalies, got {result['anomaly_flags']}"
    assert result["low_scoring_dimensions"] == [], \
        f"expected no low-scoring dims, got {result['low_scoring_dimensions']}"
    assert result["green_pillars_flagged"]  == [], \
        f"expected no flagged pillars, got {result['green_pillars_flagged']}"

    print(f"PASS  Test 1 — Strong | "
          f"market={scores['market']['composite']}, "
          f"commercial={scores['commercial']['composite']}, "
          f"innovation={scores['innovation']['composite']}, "
          f"scalability={scores['scalability']['composite']}, "
          f"green={scores['green']['composite']}")
    print(f"      anomaly_flags=[] low_scoring=[] green_pillars=[]")


def test_overconfident_founder():
    result = compute_all_scores(OVERCONFIDENT)
    scores = result["scores"]

    # All 5 dimensions must have computed scores (complete profile)
    for dim in ("market", "commercial", "innovation", "scalability", "green"):
        assert scores[dim]["composite"] is not None, \
            f"{dim}: unexpected error: {scores[dim].get('error')}"

    assert scores["market"]["composite"]      == 42.0, \
        f"market: expected 42.0, got {scores['market']['composite']}"
    assert scores["commercial"]["composite"]  == 82.0, \
        f"commercial: expected 82.0, got {scores['commercial']['composite']}"
    assert scores["innovation"]["composite"]  == 100.0, \
        f"innovation: expected 100.0, got {scores['innovation']['composite']}"
    assert scores["scalability"]["composite"] == 73.0, \
        f"scalability: expected 73.0, got {scores['scalability']['composite']}"
    assert scores["green"]["composite"]       == 50.0, \
        f"green: expected 50.0, got {scores['green']['composite']}"

    # Exactly 3 anomaly flags, in detection order
    codes = [f["code"] for f in result["anomaly_flags"]]
    assert codes == ["market_no_validation", "scalability_manual_conflict", "product_built_unvalidated"], \
        f"anomaly codes: expected [market_no_validation, scalability_manual_conflict, " \
        f"product_built_unvalidated], got {codes}"

    # Only market is below 50 — commercial=82, innovation=100, scalability=73, green=50.0 (not < 50)
    assert result["low_scoring_dimensions"] == ["market"], \
        f"low_scoring: expected ['market'], got {result['low_scoring_dimensions']}"

    # All 4 green pillars score 3.0 >= 3
    assert set(result["green_pillars_flagged"]) == {
        "climat_air", "eau", "sols_biodiversite", "ressources_dechets"
    }, f"green_pillars_flagged: got {result['green_pillars_flagged']}"

    print(f"PASS  Test 2 — Overconfident | "
          f"market={scores['market']['composite']} [LOW], "
          f"commercial={scores['commercial']['composite']}, "
          f"innovation={scores['innovation']['composite']}, "
          f"scalability={scores['scalability']['composite']}, "
          f"green={scores['green']['composite']}")
    print(f"      anomaly_flags={codes}")
    print(f"      low_scoring={result['low_scoring_dimensions']} "
          f"green_pillars={result['green_pillars_flagged']}")


def test_incomplete_profile_does_not_crash():
    result = compute_all_scores(INCOMPLETE)
    scores = result["scores"]

    # Dimensions with sufficient data must succeed
    assert scores["market"]["composite"]     == 33.0, \
        f"market: expected 33.0, got {scores['market']['composite']}"
    assert scores["commercial"]["composite"] == 28.2, \
        f"commercial: expected 28.2, got {scores['commercial']['composite']}"

    # Dimensions with missing fields must return error stubs, not raise
    for dim in ("innovation", "scalability", "green"):
        assert scores[dim]["composite"] is None, \
            f"{dim}: expected composite=None (error stub), got {scores[dim]['composite']}"
        assert "error" in scores[dim], \
            f"{dim}: expected 'error' key in stub, got {scores[dim]}"

    # low_scoring includes only dimensions that actually scored < 50
    # None composites are excluded — can't classify missing data as low-scoring
    assert result["low_scoring_dimensions"] == ["market", "commercial"], \
        f"low_scoring: expected ['market', 'commercial'], got {result['low_scoring_dimensions']}"

    assert result["green_pillars_flagged"] == [], \
        f"green_pillars: expected [] (green failed), got {result['green_pillars_flagged']}"

    assert result["anomaly_flags"] == [], \
        f"anomaly_flags: expected [], got {result['anomaly_flags']}"

    print(f"PASS  Test 3 — Incomplete | "
          f"market={scores['market']['composite']}, "
          f"commercial={scores['commercial']['composite']}, "
          f"innovation=None [error], scalability=None [error], green=None [error]")
    print(f"      engine did not crash | "
          f"low_scoring={result['low_scoring_dimensions']} | "
          f"anomaly_flags=[]")
    print(f"      innovation error: {scores['innovation']['error'][:60]}...")


if __name__ == "__main__":
    test_strong_profile()
    test_overconfident_founder()
    test_incomplete_profile_does_not_crash()
    print("\nAll engine tests passed.")
