"""Train a proof-of-concept continuity classifier on reviewed project-module pairs.

The CSV must contain independent anchor_project_id groups. Related synthetic
variants must share an anchor ID so they cannot leak across the evaluation split.
"""

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = [
    "prerequisite_coverage",
    "reuse_signal_count",
    "target_overlap",
    "evidence_count",
    "files_scanned",
]
LABELS = ["CONTINUE", "PARTIAL_REUSE", "RESET"]
REQUIRED = set(FEATURES) | {"label", "anchor_project_id", "label_source"}


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames or REQUIRED - set(reader.fieldnames):
            raise ValueError(f"Missing columns: {sorted(REQUIRED - set(reader.fieldnames or []))}")
        rows = list(reader)
    if len(rows) < 30:
        raise ValueError("At least 30 reviewed project-module pairs are required")
    if len({row["anchor_project_id"] for row in rows}) < 3:
        raise ValueError("At least three independent anchor projects are required")
    if {row["label"] for row in rows} != set(LABELS):
        raise ValueError("The dataset must contain all three continuity classes")
    if any(not row["label_source"] for row in rows):
        raise ValueError("Every label must identify its source")
    return rows


def train(input_path: Path, output_dir: Path) -> dict:
    rows = load_rows(input_path)
    x = np.array([[float(row[name]) for name in FEATURES] for row in rows])
    y = np.array([row["label"] for row in rows])
    groups = np.array([row["anchor_project_id"] for row in rows])
    split = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx, test_idx = next(split.split(x, y, groups))
    if len(set(y[train_idx])) < 3 or len(set(y[test_idx])) < 2:
        raise ValueError("Grouped split has too few classes; add more independent anchors")

    candidates = {
        "logistic_regression": make_pipeline(
            SimpleImputer(strategy="median"), StandardScaler(),
            LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42),
        ),
        "random_forest": make_pipeline(
            SimpleImputer(strategy="median"),
            RandomForestClassifier(n_estimators=100, max_depth=5, class_weight="balanced",
                                   random_state=42),
        ),
    }
    results = {}
    for name, model in candidates.items():
        model.fit(x[train_idx], y[train_idx])
        predictions = model.predict(x[test_idx])
        results[name] = {
            "macro_f1": float(f1_score(y[test_idx], predictions, average="macro", zero_division=0)),
            "classification_report": classification_report(
                y[test_idx], predictions, labels=LABELS, output_dict=True, zero_division=0
            ),
            "confusion_matrix": confusion_matrix(y[test_idx], predictions, labels=LABELS).tolist(),
        }
    winner = max(results, key=lambda name: results[name]["macro_f1"])
    output_dir.mkdir(parents=True, exist_ok=True)
    artifact = {
        "model": candidates[winner],
        "features": FEATURES,
        "labels": LABELS,
        "model_name": winner,
    }
    joblib.dump(artifact, output_dir / "continuity.joblib")
    label_sources = dict(Counter(row["label_source"] for row in rows))
    metrics = {
        "selected_model": winner,
        "rows": len(rows),
        "anchor_groups": len(set(groups)),
        "train_anchor_groups": sorted(set(groups[train_idx])),
        "test_anchor_groups": sorted(set(groups[test_idx])),
        "label_sources": label_sources,
        "results": results,
        "claim_limit": (
            "Rubric-derived labels measure agreement with the rubric, not institutional predictive validity."
            if all("rubric" in source.lower() or "synthetic" in source.lower() for source in label_sources)
            else "This is a small proof-of-concept evaluation; independent institutional validation remains necessary."
        ),
    }
    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    print(json.dumps(train(args.dataset, args.output_dir), indent=2))
