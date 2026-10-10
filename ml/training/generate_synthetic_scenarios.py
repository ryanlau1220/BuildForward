"""Generate grouped, rubric-labeled continuity scenarios for a runtime demo.

These examples are synthetic teaching data. They are not observed student
projects and do not establish institutional predictive validity.
"""

import argparse
import csv
import random
from pathlib import Path

FIELDS = [
    "anchor_project_id",
    "label_source",
    "label",
    "prerequisite_coverage",
    "reuse_signal_count",
    "target_overlap",
    "evidence_count",
    "files_scanned",
]
LABEL_SOURCE = "synthetic_rubric_v1"
ANCHOR_GROUPS = 12
VARIANTS_PER_LABEL = 2


def decision_from_rubric(coverage: float, reuse_signal_count: int, evidence_count: int) -> str:
    if evidence_count == 0 or coverage < 0.5:
        return "RESET"
    if coverage >= 0.75 and reuse_signal_count > 0:
        return "CONTINUE"
    return "PARTIAL_REUSE"


def generate_rows() -> list[dict[str, str | int | float]]:
    rng = random.Random(20261010)
    rows = []
    for anchor_number in range(1, ANCHOR_GROUPS + 1):
        anchor_id = f"synthetic_anchor_{anchor_number:02d}"
        evidence_count = rng.randint(1, 8)
        files_scanned = rng.choice([0, *range(8, 121, 8)])

        scenarios = [
            ("CONTINUE", 0.76, 1.0, 1, 3),
            ("PARTIAL_REUSE", 0.5, 0.75, 0, 2),
            ("RESET", 0.0, 0.49, 0, 0),
        ]
        for intended_label, coverage_min, coverage_max, reuse_min, reuse_max in scenarios:
            for _ in range(VARIANTS_PER_LABEL):
                coverage = round(rng.uniform(coverage_min, coverage_max), 2)
                reuse_count = rng.randint(reuse_min, reuse_max)
                label = decision_from_rubric(coverage, reuse_count, evidence_count)
                if label != intended_label:
                    raise AssertionError(f"Scenario does not follow the rubric: {intended_label} -> {label}")
                rows.append({
                    "anchor_project_id": anchor_id,
                    "label_source": LABEL_SOURCE,
                    "label": label,
                    "prerequisite_coverage": coverage,
                    "reuse_signal_count": reuse_count,
                    "target_overlap": round(rng.uniform(0, 1), 2),
                    "evidence_count": evidence_count,
                    "files_scanned": files_scanned,
                })
    return rows


def write_dataset(path: Path) -> int:
    rows = generate_rows()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "output",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "datasets" / "continuity_pairs.synthetic.csv",
    )
    args = parser.parse_args()
    count = write_dataset(args.output)
    print(f"Wrote {count} synthetic pairs from {ANCHOR_GROUPS} grouped scenario anchors to {args.output}")
