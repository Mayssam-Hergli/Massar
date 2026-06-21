import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring.innovation import compute_innovation_score

# -----------------------------------------------------------------------
# Test 1 — Strong profile with IP cap verification
# novelty=unique(100), tech=high(100), barrier=high(100)+granted(+15)
# IP bonus pushes barrier to 115 → capped at 100
# composite = 100*0.35 + 100*0.30 + 100*0.35 = 35.0 + 30.0 + 35.0 = 100.0
# -----------------------------------------------------------------------
STRONG_WITH_IP = {
    "local_novelty":        "unique",
    "technology_intensity": "high",
    "barrier_to_entry":     "high",
    "has_ip_protection":    "granted",
}

# -----------------------------------------------------------------------
# Test 2 — Weak profile
# novelty=existing(10), tech=none(10), barrier=none(10), no IP
# composite = 10*0.35 + 10*0.30 + 10*0.35 = 3.5 + 3.0 + 3.5 = 10.0
# -----------------------------------------------------------------------
WEAK = {
    "local_novelty":        "existing",
    "technology_intensity": "none",
    "barrier_to_entry":     "none",
    "has_ip_protection":    "none",
}

# -----------------------------------------------------------------------
# Test 3a — IP pending bonus: barrier=medium(70) + pending(+5) = 75
# novelty=new(70), tech=medium(70), barrier=medium+pending=75
# composite = 70*0.35 + 70*0.30 + 75*0.35 = 24.5 + 21.0 + 26.25 = 71.75
#           → 71.8 (Python banker's rounding: 71.8 has digit 8, even)
# -----------------------------------------------------------------------
IP_PENDING = {
    "local_novelty":        "new",
    "technology_intensity": "medium",
    "barrier_to_entry":     "medium",
    "has_ip_protection":    "pending",
}

# -----------------------------------------------------------------------
# Test 3b — IP granted bonus: barrier=medium(70) + granted(+15) = 85
# Same other fields as 3a
# composite = 70*0.35 + 70*0.30 + 85*0.35 = 24.5 + 21.0 + 29.75 = 75.25
#           → 75.2 (Python banker's rounding: 75.2 has digit 2, even)
# -----------------------------------------------------------------------
IP_GRANTED = {
    "local_novelty":        "new",
    "technology_intensity": "medium",
    "barrier_to_entry":     "medium",
    "has_ip_protection":    "granted",
}

# -----------------------------------------------------------------------
# Test 4 — "Unique but untechned" contradiction candidate
# novelty=unique(100), tech=none(10), barrier=none(10), no IP
# composite = 100*0.35 + 10*0.30 + 10*0.35 = 35.0 + 3.0 + 3.5 = 41.5
#
# CANDIDATE anomaly for anomaly.py:
#   local_novelty="unique" + technology_intensity="none" + barrier_to_entry="none"
#   → "Unicité déclarée sans différenciateur technologique ni barrière défendable"
#   Claiming to be unique on the Tunisian market without any technology component
#   or defensible barrier is highly suspicious — the "uniqueness" may be
#   perception rather than structural advantage. Worth a cross-check,
#   possibly gated on barrier_to_entry < "medium" to avoid false positives
#   on non-tech businesses with genuine network effects or regulatory advantages.
# -----------------------------------------------------------------------
UNIQUE_NO_TECH = {
    "local_novelty":        "unique",
    "technology_intensity": "none",
    "barrier_to_entry":     "none",
    "has_ip_protection":    "none",
}


def test_strong_with_ip_cap():
    r = compute_innovation_score(STRONG_WITH_IP)
    s = r["sub_scores"]

    assert s["nouveaute_locale"]["value"]        == 100, \
        f"nouveaute_locale: expected 100, got {s['nouveaute_locale']['value']}"
    assert s["intensite_technologique"]["value"] == 100, \
        f"intensite_technologique: expected 100, got {s['intensite_technologique']['value']}"
    assert s["barriere_entree"]["value"]         == 100, \
        f"barriere_entree: expected 100 (capped from 115), got {s['barriere_entree']['value']}"
    assert r["composite"] == 100.0, \
        f"composite: expected 100.0, got {r['composite']}"

    print(f"PASS  Test 1 — Strong + IP cap | composite={r['composite']} "
          f"(novelty={s['nouveaute_locale']['value']}, "
          f"tech={s['intensite_technologique']['value']}, "
          f"barrier={s['barriere_entree']['value']} [capped from 115])")


def test_weak_profile():
    r = compute_innovation_score(WEAK)
    s = r["sub_scores"]

    assert s["nouveaute_locale"]["value"]        == 10, \
        f"nouveaute_locale: expected 10, got {s['nouveaute_locale']['value']}"
    assert s["intensite_technologique"]["value"] == 10, \
        f"intensite_technologique: expected 10, got {s['intensite_technologique']['value']}"
    assert s["barriere_entree"]["value"]         == 10, \
        f"barriere_entree: expected 10, got {s['barriere_entree']['value']}"
    assert r["composite"] == 10.0, \
        f"composite: expected 10.0, got {r['composite']}"

    print(f"PASS  Test 2 — Weak    | composite={r['composite']} "
          f"(novelty={s['nouveaute_locale']['value']}, "
          f"tech={s['intensite_technologique']['value']}, "
          f"barrier={s['barriere_entree']['value']})")


def test_ip_pending_bonus():
    r = compute_innovation_score(IP_PENDING)
    s = r["sub_scores"]

    assert s["barriere_entree"]["value"] == 75, \
        f"barriere_entree: expected 75 (70 base + 5 pending), got {s['barriere_entree']['value']}"
    assert r["composite"] == 71.8, \
        f"composite: expected 71.8, got {r['composite']}"

    print(f"PASS  Test 3a — IP pending | barrier={s['barriere_entree']['value']} "
          f"(70+5) | composite={r['composite']}")


def test_ip_granted_bonus():
    r = compute_innovation_score(IP_GRANTED)
    s = r["sub_scores"]

    assert s["barriere_entree"]["value"] == 85, \
        f"barriere_entree: expected 85 (70 base + 15 granted), got {s['barriere_entree']['value']}"
    assert r["composite"] == 75.2, \
        f"composite: expected 75.2, got {r['composite']}"

    print(f"PASS  Test 3b — IP granted | barrier={s['barriere_entree']['value']} "
          f"(70+15) | composite={r['composite']}")


def test_unique_no_tech_contradiction():
    r = compute_innovation_score(UNIQUE_NO_TECH)
    s = r["sub_scores"]

    assert s["nouveaute_locale"]["value"]        == 100, \
        f"nouveaute_locale: expected 100, got {s['nouveaute_locale']['value']}"
    assert s["intensite_technologique"]["value"] == 10, \
        f"intensite_technologique: expected 10, got {s['intensite_technologique']['value']}"
    assert s["barriere_entree"]["value"]         == 10, \
        f"barriere_entree: expected 10, got {s['barriere_entree']['value']}"
    assert r["composite"] == 41.5, \
        f"composite: expected 41.5, got {r['composite']}"

    print(f"PASS  Test 4 — Unique/no-tech | composite={r['composite']} "
          f"(novelty={s['nouveaute_locale']['value']}, "
          f"tech={s['intensite_technologique']['value']}, "
          f"barrier={s['barriere_entree']['value']})")
    print(f"      [CANDIDATE ANOMALY] local_novelty=unique + "
          f"technology_intensity=none + barrier_to_entry=none "
          f"— uniqueness claimed without any defensible differentiator")


if __name__ == "__main__":
    test_strong_with_ip_cap()
    test_weak_profile()
    test_ip_pending_bonus()
    test_ip_granted_bonus()
    test_unique_no_tech_contradiction()
    print("\nAll tests passed.")
