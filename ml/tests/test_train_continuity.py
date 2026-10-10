import json

import joblib

from training.generate_synthetic_scenarios import write_dataset
from training.train_continuity import train


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
