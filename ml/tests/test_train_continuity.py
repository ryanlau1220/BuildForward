import csv
import json

import joblib

from training.generate_synthetic_scenarios import write_dataset
from training.train_continuity import summarize_external_validation, train


def test_training_keeps_anchors_grouped_and_records_synthetic_limits(tmp_path):
    dataset = tmp_path / "continuity_pairs.synthetic.csv"
    artifact_dir = tmp_path / "artifacts"
    assert write_dataset(dataset) == 72

    metrics = train(dataset, artifact_dir)
    artifact = joblib.load(artifact_dir / "continuity.joblib")

    assert set(metrics["train_anchor_groups"]).isdisjoint(metrics["test_anchor_groups"])
    assert metrics["selection_method"].startswith("3-fold GroupKFold")
    assert metrics["label_sources"] == {"synthetic_rubric_v1": 72}
    assert metrics["baseline_macro_f1"] == 1.0
    assert artifact["metadata"]["training_data_source"] == "synthetic_rubric_scenarios"
    assert artifact["metadata"]["claim_limit"] == metrics["claim_limit"]
    assert json.loads((artifact_dir / "metrics.json").read_text())["dataset_sha256"] == metrics["dataset_sha256"]


def test_external_validation_reports_pending_real_pairs_without_a_metric(tmp_path):
    path = tmp_path / "real.csv"
    with path.open("w", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=[
            "project_id", "module_pair_status", "prerequisite_mapping_status",
            "prerequisite_coverage", "reuse_signal_count", "target_overlap",
            "evidence_count", "files_scanned", "label", "label_source",
        ])
        writer.writeheader()
        writer.writerow({"project_id": "repo-a", "module_pair_status": "HYPOTHETICAL_FIT_REVIEW_REQUIRED",
                         "prerequisite_mapping_status": "DEFINED", "label": "", "label_source": ""})
    summary = summarize_external_validation(None, path)
    assert summary["candidate_pairs"] == 1
    assert summary["reviewed_pairs"] == 0
    assert summary["pending_pairs"] == 1
    assert summary["metrics"] is None
