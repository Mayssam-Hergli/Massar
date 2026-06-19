import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring.market import compute_market_score

# -----------------------------------------------------------------------
# Test 1 — Strong profile
# market_size=large(75), interviews=10+(40), LOI=2(30), paying(30) → validation=100
# documented subscription → modele=100
# composite = 75*0.30 + 100*0.40 + 100*0.30 = 22.5 + 40 + 30 = 92.5
# -----------------------------------------------------------------------
STRONG = {
    "market_size":                "large",
    "customer_interviews":        "10+",
    "has_loi":                    2,
    "has_paying_customers":       True,
    "revenue_model_documented":   "documented",
    "revenue_model_type":         "subscription",
}

# -----------------------------------------------------------------------
# Test 2 — Weak profile
# market_size=small(25), interviews=0(0), LOI=0(0), no paying(0) → validation=0
# no revenue model → modele=10
# composite = 25*0.30 + 0*0.40 + 10*0.30 = 7.5 + 0 + 3 = 10.5
# -----------------------------------------------------------------------
WEAK = {
    "market_size":                "small",
    "customer_interviews":        "0",
    "has_loi":                    0,
    "has_paying_customers":       False,
    "revenue_model_documented":   "none",
    "revenue_model_type":         "undefined",
}

# -----------------------------------------------------------------------
# Test 3 — Anomaly case (SCORING_METHODOLOGY.md §1 anomaly rules)
# market_size=large(75)  ← strong
# customer_interviews=0 + no paying customers → validation=0  ← critical weakness
# documented subscription → modele=100  ← strong
# composite = 75*0.30 + 0*0.40 + 100*0.30 = 22.5 + 0 + 30 = 52.5
# Proves: 0.40 weight on validation collapses composite despite two strong sub-scores
# Both anomaly flags should fire
# -----------------------------------------------------------------------
ANOMALY = {
    "market_size":                "large",
    "customer_interviews":        "0",
    "has_loi":                    0,
    "has_paying_customers":       False,
    "revenue_model_documented":   "documented",
    "revenue_model_type":         "subscription",
}


def test_strong_profile():
    r = compute_market_score(STRONG)
    s = r["sub_scores"]

    assert s["taille_marche"]["value"]     == 75,  f"taille_marche: expected 75, got {s['taille_marche']['value']}"
    assert s["validation_client"]["value"] == 100, f"validation_client: expected 100, got {s['validation_client']['value']}"
    assert s["modele_revenus"]["value"]    == 100, f"modele_revenus: expected 100, got {s['modele_revenus']['value']}"
    assert r["composite"]                  == 92.5, f"composite: expected 92.5, got {r['composite']}"

    print(f"PASS  Test 1 — Strong | composite={r['composite']} "
          f"(marché={s['taille_marche']['value']}, "
          f"validation={s['validation_client']['value']}, "
          f"revenus={s['modele_revenus']['value']})")


def test_weak_profile():
    r = compute_market_score(WEAK)
    s = r["sub_scores"]

    assert s["taille_marche"]["value"]     == 25,  f"taille_marche: expected 25, got {s['taille_marche']['value']}"
    assert s["validation_client"]["value"] == 0,   f"validation_client: expected 0, got {s['validation_client']['value']}"
    assert s["modele_revenus"]["value"]    == 10,  f"modele_revenus: expected 10, got {s['modele_revenus']['value']}"
    assert r["composite"]                  == 10.5, f"composite: expected 10.5, got {r['composite']}"

    print(f"PASS  Test 2 — Weak  | composite={r['composite']} "
          f"(marché={s['taille_marche']['value']}, "
          f"validation={s['validation_client']['value']}, "
          f"revenus={s['modele_revenus']['value']})")


def test_anomaly_case():
    r = compute_market_score(ANOMALY)
    s = r["sub_scores"]

    assert s["taille_marche"]["value"]     == 75,  f"taille_marche: expected 75, got {s['taille_marche']['value']}"
    assert s["validation_client"]["value"] == 0,   f"validation_client: expected 0, got {s['validation_client']['value']}"
    assert s["modele_revenus"]["value"]    == 100, f"modele_revenus: expected 100, got {s['modele_revenus']['value']}"
    assert r["composite"]                  == 52.5, f"composite: expected 52.5, got {r['composite']}"

    print(f"PASS  Test 3 — Anomaly | composite={r['composite']} "
          f"(marché={s['taille_marche']['value']}, "
          f"validation={s['validation_client']['value']}, "
          f"revenus={s['modele_revenus']['value']})")


if __name__ == "__main__":
    test_strong_profile()
    test_weak_profile()
    test_anomaly_case()
    print("\nAll tests passed.")
