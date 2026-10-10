from collections import Counter
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np

from .market import load_market_signals, market_dataset_summary
from .models import Cohort, Module, Project
from .schemas import Intervention

MIN_COVERAGE = 0.70
ASSUMED_MODULE_GAIN = 0.22
CONTINUITY_FEATURES = [
    "prerequisite_coverage",
    "reuse_signal_count",
    "target_overlap",
    "evidence_count",
    "files_scanned",
]
CONTINUITY_ARTIFACT = Path(__file__).resolve().parents[1] / "artifacts" / "continuity.joblib"


@lru_cache(maxsize=1)
def load_continuity_model() -> dict:
    if not CONTINUITY_ARTIFACT.is_file():
        raise RuntimeError(f"Continuity model artifact not found: {CONTINUITY_ARTIFACT}")
    artifact = joblib.load(CONTINUITY_ARTIFACT)
    if artifact.get("features") != CONTINUITY_FEATURES:
        raise RuntimeError("Continuity model features do not match the API feature contract")
    if not {"model", "labels", "metadata"} <= artifact.keys():
        raise RuntimeError("Continuity model artifact is missing required metadata")
    return artifact


def _heuristic_decision(evidence_count: int, coverage: float, reuse_count: int) -> str:
    if evidence_count == 0 or coverage < 0.5:
        return "RESET"
    if coverage >= 0.75 and reuse_count > 0:
        return "CONTINUE"
    return "PARTIAL_REUSE"


def continuity(project: Project, module: Module) -> dict:
    found = set(project.competencies)
    required = set(module.required_competencies)
    matched = sorted(found & required)
    missing = sorted(required - found)
    prerequisite_coverage = len(matched) / len(required) if required else 1.0
    reuse = sorted(found & set(module.reuse_signals))
    target_already_met = sorted(found & set(module.target_competencies))

    targets = set(module.target_competencies)
    target_overlap = len(found & targets) / len(targets) if targets else 0.0
    feature_values = [[
        prerequisite_coverage,
        len(reuse),
        target_overlap,
        len(project.evidence),
        project.files_scanned or 0,
    ]]
    artifact = load_continuity_model()
    decision = str(artifact["model"].predict(np.asarray(feature_values, dtype=float))[0])
    baseline = _heuristic_decision(len(project.evidence), prerequisite_coverage, len(reuse))
    metadata = artifact["metadata"]
    model_summary = {
        "name": metadata["model_name"],
        "training_data_source": metadata["training_data_source"],
        "training_dataset": metadata["training_dataset"],
        "training_rows": metadata["training_rows"],
        "anchor_groups": metadata["anchor_groups"],
        "dataset_sha256": metadata["dataset_sha256"],
        "held_out_macro_f1": metadata["evaluation"]["holdout_macro_f1"],
        "baseline_macro_f1": metadata["evaluation"]["baseline_macro_f1"],
        "claim_limit": metadata["claim_limit"],
    }
    reason = (
        f"The trained classifier assigns {decision.replace('_', ' ')} from five project-module "
        "features. Review the measured evidence and compare the baseline before deciding."
    )

    return {
        "project_id": project.id,
        "module_id": module.id,
        "decision": decision,
        "prediction_source": "trained_model",
        "method": f"{metadata['model_name']} trained classifier",
        "model": model_summary,
        "heuristic_baseline_decision": baseline,
        "model_features": {
            "prerequisite_coverage": round(prerequisite_coverage, 2),
            "reuse_signal_count": len(reuse),
            "target_overlap": round(target_overlap, 2),
            "evidence_count": len(project.evidence),
            "files_scanned": project.files_scanned or 0,
        },
        "prerequisite_coverage": round(prerequisite_coverage, 2),
        "matched_prerequisites": matched,
        "missing_prerequisites": missing,
        "reuse_signals": reuse,
        "target_already_met": target_already_met,
        "target_to_develop": sorted(set(module.target_competencies) - found),
        "reason": reason,
        "evidence": [e for e in project.evidence if e["competency"] in set(matched + reuse)],
        "provenance": project.provenance,
        "human_decision_required": True,
    }


def forecast(cohort: Cohort, modules: list[Module], intervention: Intervention | None) -> dict:
    remaining = [m for m in modules if m.semester > cohort.current_semester]
    opportunities = Counter(
        skill for module in remaining for skill in set(module.target_competencies)
    )
    skills = sorted(set(cohort.coverage) | set(opportunities))
    findings = []
    market_signals = load_market_signals()
    for skill in skills:
        current = float(cohort.coverage.get(skill, 0))
        future = min(1.0, current + opportunities[skill] * ASSUMED_MODULE_GAIN)
        gap = max(0.0, MIN_COVERAGE - future)
        with_intervention = future
        if intervention and intervention.competency == skill:
            with_intervention = min(1.0, future + intervention.assumed_gain)
        remaining_gap = max(0.0, MIN_COVERAGE - with_intervention)
        market = market_signals.get(skill)
        runway_factor = 1 / (1 + opportunities[skill])
        priority_score = gap * market["role_coverage"] * runway_factor if market else None
        findings.append({
            "competency": skill,
            "current_coverage": round(current, 2),
            "projected_graduation_coverage": round(future, 2),
            "programme_target": MIN_COVERAGE,
            "projected_gap": round(gap, 2),
            "future_module_opportunities": opportunities[skill],
            "priority_score": round(priority_score, 3) if priority_score is not None else None,
            "market_relevance": round(market["role_coverage"], 3) if market else None,
            "market_evidence": {
                "skill_terms": market["market_skill_terms"],
                "profiles": market["profiles"],
                "matched_profiles": int(market["matched_profiles"]),
                "profile_sample_size": int(market["profile_sample_size"]),
                "match_type": market["match_type"],
            } if market else None,
            "runway_factor": round(runway_factor, 3),
            "priority_reason": (
                f"Market-weighted score {priority_score:.3f}: {gap:.0%} projected gap × "
                f"{market['role_coverage']:.0%} role-profile coverage × {runway_factor:.2f} "
                f"curriculum-runway factor."
                if market else
                f"No mapped market signal; shown by projected gap only ({gap:.0%}). "
                f"{opportunities[skill]} remaining module "
                f"{'opportunity' if opportunities[skill] == 1 else 'opportunities'}."
            ),
            "with_intervention_coverage": round(with_intervention, 2),
            "with_intervention_gap": round(remaining_gap, 2),
            "potential_gap_reduction": round(gap - remaining_gap, 2),
        })
    findings.sort(key=lambda f: (
        f["priority_score"] is None,
        -(f["priority_score"] if f["priority_score"] is not None else f["projected_gap"]),
        f["competency"],
    ))
    market_data = market_dataset_summary()
    return {
        "cohort_id": cohort.id,
        "provenance": cohort.provenance,
        "method": "assumption-based graduation scenario; not historically validated",
        "assumptions": {
            "programme_target": MIN_COVERAGE,
            "coverage_gain_per_remaining_module": ASSUMED_MODULE_GAIN,
            "market_signal": "partial; role-profile skill tags support selected competencies",
            "market_priority_formula": (
                "projected curriculum gap × role-profile coverage × curriculum-runway factor"
            ),
            "curriculum_runway_factor": "1 / (1 + remaining module opportunities for the competency)",
            "market_dataset": market_data,
            "intervention_gain": (
                "user-supplied scenario assumption, not an observed effect" if intervention else None
            ),
        },
        "intervention": intervention.model_dump() if intervention else None,
        "ranked_findings": findings,
        "human_decision_required": True,
    }
