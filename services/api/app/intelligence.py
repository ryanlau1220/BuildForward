from collections import Counter

from .models import Cohort, Module, Project
from .schemas import Intervention

MIN_COVERAGE = 0.70
ASSUMED_MODULE_GAIN = 0.22


def continuity(project: Project, module: Module) -> dict:
    found = set(project.competencies)
    required = set(module.required_competencies)
    matched = sorted(found & required)
    missing = sorted(required - found)
    prerequisite_coverage = len(matched) / len(required) if required else 1.0
    reuse = sorted(found & set(module.reuse_signals))
    target_already_met = sorted(found & set(module.target_competencies))

    if not project.evidence or prerequisite_coverage < 0.5:
        decision = "RESET"
        reason = "The artifact lacks enough verified structure or prerequisite evidence."
    elif prerequisite_coverage >= 0.75 and reuse:
        decision = "CONTINUE"
        reason = "Prerequisite evidence and a reusable project signal support extending this artifact."
    elif prerequisite_coverage >= 0.5 or reuse:
        decision = "PARTIAL_REUSE"
        reason = "Some project work is relevant, but significant adaptation is needed."
    else:
        decision = "RESET"
        reason = "The project does not provide a useful starting point for this module."

    return {
        "project_id": project.id,
        "module_id": module.id,
        "decision": decision,
        "method": "transparent heuristic baseline; not a trained or calibrated model",
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
    for skill in skills:
        current = float(cohort.coverage.get(skill, 0))
        future = min(1.0, current + opportunities[skill] * ASSUMED_MODULE_GAIN)
        gap = max(0.0, MIN_COVERAGE - future)
        with_intervention = future
        if intervention and intervention.competency == skill:
            with_intervention = min(1.0, future + intervention.assumed_gain)
        remaining_gap = max(0.0, MIN_COVERAGE - with_intervention)
        findings.append({
            "competency": skill,
            "current_coverage": round(current, 2),
            "projected_graduation_coverage": round(future, 2),
            "programme_target": MIN_COVERAGE,
            "projected_gap": round(gap, 2),
            "future_module_opportunities": opportunities[skill],
            "priority": "HIGH" if gap >= 0.35 else "MEDIUM" if gap >= 0.15 else "LOW",
            "priority_reason": (
                f"Projected gap of {gap:.0%}; {opportunities[skill]} remaining module "
                f"{'opportunity' if opportunities[skill] == 1 else 'opportunities'}."
            ),
            "with_intervention_coverage": round(with_intervention, 2),
            "with_intervention_gap": round(remaining_gap, 2),
            "potential_gap_reduction": round(gap - remaining_gap, 2),
        })
    findings.sort(key=lambda f: (-f["projected_gap"], f["future_module_opportunities"], f["competency"]))
    return {
        "cohort_id": cohort.id,
        "provenance": cohort.provenance,
        "method": "assumption-based graduation scenario; not historically validated",
        "assumptions": {
            "programme_target": MIN_COVERAGE,
            "coverage_gain_per_remaining_module": ASSUMED_MODULE_GAIN,
            "market_signal": "unavailable; no market data included in ranking",
            "intervention_gain": (
                "user-supplied scenario assumption, not an observed effect" if intervention else None
            ),
        },
        "intervention": intervention.model_dump() if intervention else None,
        "ranked_findings": findings,
        "human_decision_required": True,
    }
