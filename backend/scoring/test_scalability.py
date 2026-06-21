import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring.scalability import compute_scalability_score

# -----------------------------------------------------------------------
# Test 1 — Strong profile
# replicability=automated(100), manual_dependency=none(100),
# geographic_potential=global(100)
# composite = 100*0.35 + 100*0.30 + 100*0.35 = 35.0 + 30.0 + 35.0 = 100.0
# -----------------------------------------------------------------------
STRONG = {
    "replicability":        "automated",
    "manual_dependency":    "none",
    "geographic_potential": "global",
}

# -----------------------------------------------------------------------
# Test 2 — Weak profile
# replicability=manual(20), manual_dependency=high(10),
# geographic_potential=local(25)
# composite = 20*0.35 + 10*0.30 + 25*0.35 = 7.0 + 3.0 + 8.75 = 18.75
#           → 18.8 (banker's rounding: 18.8 has digit 8, even)
# Note: local maps to 25 (not 10), so composite lands at 18.8,
# not the 12-13 range one might estimate assuming all-min values.
# -----------------------------------------------------------------------
WEAK = {
    "replicability":        "manual",
    "manual_dependency":    "high",
    "geographic_potential": "local",
}

# -----------------------------------------------------------------------
# Test 3 — Anomaly contradiction case (matches scalability_manual_conflict
# check in anomaly.py exactly)
# replicability=automated(100), manual_dependency=high(10),
# geographic_potential=global(100)
# composite = 100*0.35 + 10*0.30 + 100*0.35 = 35.0 + 3.0 + 35.0 = 73.0
#
# This profile scores 73.0 — deceptively healthy looking.
# The dependance_manuelle sub-score (10, worst possible) is structurally
# contradicted by automated replicability and global potential, but a
# 0.30 weight alone cannot drag the composite low enough to reveal the
# problem. This is exactly why the anomaly check lives in anomaly.py
# (cross-module, runs after all 5 scores) rather than inside this
# function: scalability.py cannot know whether this contradiction is
# real until it is weighed against the full diagnostic picture.
# anomaly.py fires scalability_manual_conflict when:
#   (replicability=="automated" OR geographic_potential in
#    ("global","regional")) AND manual_dependency in ("high","medium")
# -----------------------------------------------------------------------
CONTRADICTION = {
    "replicability":        "automated",
    "manual_dependency":    "high",
    "geographic_potential": "global",
}

# -----------------------------------------------------------------------
# Test 4a — Inversion check: manual_dependency="none" (no human needed)
# replicability=semi_auto(60), manual_dependency=none(100),
# geographic_potential=national(50)
# composite = 60*0.35 + 100*0.30 + 50*0.35 = 21.0 + 30.0 + 17.5 = 68.5
# -----------------------------------------------------------------------
INVERSION_NONE = {
    "replicability":        "semi_auto",
    "manual_dependency":    "none",
    "geographic_potential": "national",
}

# -----------------------------------------------------------------------
# Test 4b — Inversion check: manual_dependency="high" (heavy human required)
# Same replicability and geographic_potential as 4a — only dependency changes
# composite = 60*0.35 + 10*0.30 + 50*0.35 = 21.0 + 3.0 + 17.5 = 41.5
# -----------------------------------------------------------------------
INVERSION_HIGH = {
    "replicability":        "semi_auto",
    "manual_dependency":    "high",
    "geographic_potential": "national",
}


def test_strong_profile():
    r = compute_scalability_score(STRONG)
    s = r["sub_scores"]

    assert s["replicabilite"]["value"]          == 100, \
        f"replicabilite: expected 100, got {s['replicabilite']['value']}"
    assert s["dependance_manuelle"]["value"]    == 100, \
        f"dependance_manuelle: expected 100, got {s['dependance_manuelle']['value']}"
    assert s["potentiel_geographique"]["value"] == 100, \
        f"potentiel_geographique: expected 100, got {s['potentiel_geographique']['value']}"
    assert r["composite"] == 100.0, \
        f"composite: expected 100.0, got {r['composite']}"

    print(f"PASS  Test 1 — Strong  | composite={r['composite']} "
          f"(replic={s['replicabilite']['value']}, "
          f"dep_man={s['dependance_manuelle']['value']}, "
          f"geo={s['potentiel_geographique']['value']})")


def test_weak_profile():
    r = compute_scalability_score(WEAK)
    s = r["sub_scores"]

    assert s["replicabilite"]["value"]          == 20, \
        f"replicabilite: expected 20, got {s['replicabilite']['value']}"
    assert s["dependance_manuelle"]["value"]    == 10, \
        f"dependance_manuelle: expected 10, got {s['dependance_manuelle']['value']}"
    assert s["potentiel_geographique"]["value"] == 25, \
        f"potentiel_geographique: expected 25, got {s['potentiel_geographique']['value']}"
    assert r["composite"] == 18.8, \
        f"composite: expected 18.8, got {r['composite']}"

    print(f"PASS  Test 2 — Weak    | composite={r['composite']} "
          f"(replic={s['replicabilite']['value']}, "
          f"dep_man={s['dependance_manuelle']['value']}, "
          f"geo={s['potentiel_geographique']['value']})")


def test_contradiction_profile():
    r = compute_scalability_score(CONTRADICTION)
    s = r["sub_scores"]

    assert s["replicabilite"]["value"]          == 100, \
        f"replicabilite: expected 100, got {s['replicabilite']['value']}"
    assert s["dependance_manuelle"]["value"]    == 10, \
        f"dependance_manuelle: expected 10, got {s['dependance_manuelle']['value']}"
    assert s["potentiel_geographique"]["value"] == 100, \
        f"potentiel_geographique: expected 100, got {s['potentiel_geographique']['value']}"
    assert r["composite"] == 73.0, \
        f"composite: expected 73.0, got {r['composite']}"

    print(f"PASS  Test 3 — Contradiction | composite={r['composite']} "
          f"(replic={s['replicabilite']['value']}, "
          f"dep_man={s['dependance_manuelle']['value']}, "
          f"geo={s['potentiel_geographique']['value']})")
    print(f"      [ANOMALY LINK] composite=73.0 looks healthy but masks "
          f"dep_man=10 — anomaly.py scalability_manual_conflict fires on this profile")


def test_manual_dependency_inversion():
    none_r = compute_scalability_score(INVERSION_NONE)
    high_r = compute_scalability_score(INVERSION_HIGH)

    none_dep = none_r["sub_scores"]["dependance_manuelle"]["value"]
    high_dep = high_r["sub_scores"]["dependance_manuelle"]["value"]

    assert none_dep == 100, \
        f"manual_dependency=none should score 100, got {none_dep}"
    assert high_dep == 10, \
        f"manual_dependency=high should score 10, got {high_dep}"
    assert none_dep > high_dep, \
        f"inversion broken: none ({none_dep}) should > high ({high_dep})"

    assert none_r["composite"] == 68.5, \
        f"none composite: expected 68.5, got {none_r['composite']}"
    assert high_r["composite"] == 41.5, \
        f"high composite: expected 41.5, got {high_r['composite']}"

    print(f"PASS  Test 4 — Inversion | "
          f"dep=none -> sub_score={none_dep}, composite={none_r['composite']} | "
          f"dep=high -> sub_score={high_dep}, composite={high_r['composite']}")
    print(f"      Inversion confirmed: none({none_dep}) > high({high_dep})")


if __name__ == "__main__":
    test_strong_profile()
    test_weak_profile()
    test_contradiction_profile()
    test_manual_dependency_inversion()
    print("\nAll tests passed.")
