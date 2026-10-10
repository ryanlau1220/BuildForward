"""Train a proof-of-concept continuity classifier on labelled project-module pairs.

The CSV must contain independent anchor_project_id groups. Related synthetic
variants must share an anchor ID so they cannot leak across the evaluation split.
"""

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

import joblib
import numpy as np
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
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
        raise ValueError("At least 30 labelled project-module pairs are required")
    if len({row["anchor_project_id"] for row in rows}) < 3:
        raise ValueError("At least three independent anchor projects are required")
    if {row["label"] for row in rows} != set(LABELS):
        raise ValueError("The dataset must contain all three continuity classes")
    if any(not row["label_source"] for row in rows):
        raise ValueError("Every label must identify its source")
    for index, row in enumerate(rows, start=2):
        for feature in FEATURES:
            raw_value = row[feature].strip()
            try:
                value = float(raw_value)
            except ValueError as exc:
                raise ValueError(f"Invalid {feature} at CSV row {index}: {raw_value!r}") from exc
            if not np.isfinite(value):
                raise ValueError(f"Non-finite {feature} at CSV row {index}")
            if feature in {"prerequisite_coverage", "target_overlap"} and not 0 <= value <= 1:
                raise ValueError(f"{feature} must be between 0 and 1 at CSV row {index}")
            if feature in {"reuse_signal_count", "evidence_count", "files_scanned"} and value < 0:
                raise ValueError(f"{feature} cannot be negative at CSV row {index}")
    return rows


def baseline_decision(row: dict[str, str]) -> str:
    coverage = float(row["prerequisite_coverage"])
    reuse_count = float(row["reuse_signal_count"])
    evidence_count = float(row["evidence_count"])
    if evidence_count == 0 or coverage < 0.5:
        return "RESET"
    if coverage >= 0.75 and reuse_count > 0:
        return "CONTINUE"
    return "PARTIAL_REUSE"


def summarize_external_validation(model, path: Path | None) -> dict:
    if path is None:
        return {
            "dataset": None, "candidate_pairs": 0, "reviewed_pairs": 0,
            "pending_pairs": 0, "project_groups": 0, "metrics": None,
            "status": "No real project-module validation dataset configured.",
        }
    with path.open(newline="") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames or not set(FEATURES + ["project_id", "label", "label_source"]) <= set(reader.fieldnames):
            raise ValueError("External validation CSV is missing project_id, model features, label, or label_source")
        rows = list(reader)
    reviewed = [row for row in rows if row["label"].strip()]
    if any(row["label"] not in LABELS for row in reviewed):
        raise ValueError("External validation labels must be CONTINUE, PARTIAL_REUSE, or RESET")
    if any(not row["label_source"].strip() for row in reviewed):
        raise ValueError("Every reviewed external label must identify its human-review source")
    for index, row in enumerate(reviewed, start=2):
        for feature in FEATURES:
            if not row[feature].strip():
                raise ValueError(f"Reviewed external row {index} is missing {feature}")
            try:
                value = float(row[feature])
            except ValueError as exc:
                raise ValueError(f"Invalid {feature} in reviewed external row {index}") from exc
            if not np.isfinite(value):
                raise ValueError(f"Non-finite {feature} in reviewed external row {index}")
            if feature in {"prerequisite_coverage", "target_overlap"} and not 0 <= value <= 1:
                raise ValueError(f"{feature} must be between 0 and 1 in reviewed external row {index}")
            if feature in {"reuse_signal_count", "evidence_count", "files_scanned"} and value < 0:
                raise ValueError(f"{feature} cannot be negative in reviewed external row {index}")

    result = {
        "dataset": path.name,
        "dataset_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "candidate_pairs": len(rows),
        "reviewed_pairs": len(reviewed),
        "pending_pairs": len(rows) - len(reviewed),
        "project_groups": len({row.get("anchor_project_id") or row["project_id"] for row in rows}),
        "label_sources": dict(Counter(row["label_source"] for row in reviewed)),
        "label_distribution": dict(Counter(row["label"] for row in reviewed)),
        "metrics": None,
        "status": "No human-reviewed labels yet; real-data metric unavailable.",
    }
    if reviewed:
        x = np.array([[float(row[name]) for name in FEATURES] for row in reviewed], dtype=float)
        y = np.array([row["label"] for row in reviewed])
        predictions = model.predict(x)
        baseline = [baseline_decision(row) for row in reviewed]
        result["metrics"] = {
            "reviewed_pairs": len(reviewed),
            "model_macro_f1": float(f1_score(y, predictions, labels=LABELS, average="macro", zero_division=0)),
            "baseline_macro_f1": float(f1_score(y, baseline, labels=LABELS, average="macro", zero_division=0)),
            "classification_report": classification_report(
                y, predictions, labels=LABELS, output_dict=True, zero_division=0
            ),
            "confusion_matrix": confusion_matrix(y, predictions, labels=LABELS).tolist(),
        }
        result["status"] = (
            "Descriptive external evaluation on human-reviewed pairs; small samples do not establish generalisation."
        )
    return result


def train(input_path: Path, output_dir: Path, external_validation_path: Path | None = None) -> dict:
    rows = load_rows(input_path)
    x = np.array([[float(row[name]) for name in FEATURES] for row in rows], dtype=float)
    y = np.array([row["label"] for row in rows])
    groups = np.array([row["anchor_project_id"] for row in rows])
    split = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx, test_idx = next(split.split(x, y, groups))
    if set(y[train_idx]) != set(LABELS) or set(y[test_idx]) != set(LABELS):
        raise ValueError("Grouped train and holdout splits must each contain all three classes")

    candidates = {
        "logistic_regression": make_pipeline(
            StandardScaler(),
            LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42),
        ),
        "random_forest": make_pipeline(
            RandomForestClassifier(n_estimators=100, max_depth=5, class_weight="balanced",
                                   random_state=42),
        ),
    }
    results = {}
    training_x, training_y, training_groups = x[train_idx], y[train_idx], groups[train_idx]
    group_cv = GroupKFold(n_splits=3)
    for name, model in candidates.items():
        fold_scores = []
        for fit_idx, validation_idx in group_cv.split(training_x, training_y, training_groups):
            fold_model = clone(model)
            fold_model.fit(training_x[fit_idx], training_y[fit_idx])
            validation_predictions = fold_model.predict(training_x[validation_idx])
            fold_scores.append(float(f1_score(
                training_y[validation_idx], validation_predictions,
                labels=LABELS, average="macro", zero_division=0,
            )))

        holdout_model = clone(model)
        holdout_model.fit(x[train_idx], y[train_idx])
        predictions = holdout_model.predict(x[test_idx])
        results[name] = {
            "group_cv_macro_f1": float(np.mean(fold_scores)),
            "group_cv_fold_macro_f1": fold_scores,
            "macro_f1": float(f1_score(y[test_idx], predictions, average="macro", zero_division=0)),
            "classification_report": classification_report(
                y[test_idx], predictions, labels=LABELS, output_dict=True, zero_division=0
            ),
            "confusion_matrix": confusion_matrix(y[test_idx], predictions, labels=LABELS).tolist(),
        }
    # Model selection uses grouped CV within the training partition only. The
    # holdout is reserved for final reporting and never decides the winner.
    winner = max(results, key=lambda name: results[name]["group_cv_macro_f1"])
    selected_model = candidates[winner].fit(x, y)
    external_validation = summarize_external_validation(selected_model, external_validation_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    label_sources = dict(Counter(row["label_source"] for row in rows))
    all_labels_synthetic_or_rubric = all(
        "synthetic" in source.lower() or "rubric" in source.lower()
        for source in label_sources
    )
    claim_limit = (
        "Synthetic rubric labels measure agreement with the scenario rubric, not institutional predictive validity."
        if all_labels_synthetic_or_rubric
        else "This is a small proof-of-concept evaluation; independent institutional validation remains necessary."
    )
    dataset_hash = hashlib.sha256(input_path.read_bytes()).hexdigest()
    metadata = {
        "model_name": winner,
        "training_data_source": (
            "synthetic_rubric_scenarios" if all_labels_synthetic_or_rubric else "reviewed_pairs"
        ),
        "training_dataset": input_path.name,
        "dataset_sha256": dataset_hash,
        "training_rows": len(rows),
        "anchor_groups": len(set(groups)),
        "label_sources": label_sources,
        "evaluation": {
            "selection_method": "3-fold GroupKFold on the training partition",
            "holdout_method": "GroupShuffleSplit; project anchor groups held out",
            "holdout_macro_f1": results[winner]["macro_f1"],
            "holdout_anchor_groups": sorted(set(groups[test_idx])),
            "baseline_macro_f1": float(f1_score(
                y[test_idx],
                [baseline_decision(rows[index]) for index in test_idx],
                labels=LABELS, average="macro", zero_division=0,
            )),
        },
        "claim_limit": claim_limit,
        "real_validation": external_validation,
    }
    artifact = {
        "model": selected_model,
        "features": FEATURES,
        "labels": LABELS,
        "metadata": metadata,
    }
    joblib.dump(artifact, output_dir / "continuity.joblib")
    metrics = {
        "selected_model": winner,
        "selection_method": "3-fold GroupKFold on the training partition; holdout not used for model selection",
        "rows": len(rows),
        "anchor_groups": len(set(groups)),
        "train_anchor_groups": sorted(set(groups[train_idx])),
        "test_anchor_groups": sorted(set(groups[test_idx])),
        "label_sources": label_sources,
        "dataset_sha256": dataset_hash,
        "baseline_macro_f1": metadata["evaluation"]["baseline_macro_f1"],
        "results": results,
        "claim_limit": claim_limit,
        "real_validation": external_validation,
    }
    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--external-validation", type=Path)
    args = parser.parse_args()
    print(json.dumps(train(args.dataset, args.output_dir, args.external_validation), indent=2))
