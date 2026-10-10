import numpy as np
import pytest

from training.prepare_real_validation import analyze_repository, feature_values, prepare
from training.train_continuity import summarize_external_validation


def test_candidate_features_keep_unmapped_prerequisites_blank():
    module = {
        "required_competencies": None,
        "target_competencies": ["unit-testing"],
        "reuse_signals": ["unit-testing"],
    }
    analysis = {"competencies": ["unit-testing"], "evidence": [{}, {}], "files_scanned": 3}
    values = feature_values(module, analysis)
    assert values["prerequisite_coverage"] == ""
    assert values["reuse_signal_count"] == 1
    assert values["target_overlap"] == 1
    assert values["evidence_count"] == 2


def test_explicitly_empty_prerequisite_map_is_full_coverage():
    module = {"required_competencies": [], "target_competencies": [], "reuse_signals": []}
    analysis = {"competencies": [], "evidence": [], "files_scanned": 0}
    assert feature_values(module, analysis)["prerequisite_coverage"] == 1.0


def test_repository_scan_uses_shared_safe_file_rules(tmp_path):
    (tmp_path / "tests").mkdir()
    (tmp_path / "app/api/test-update").mkdir(parents=True)
    (tmp_path / "tests/smoke.cpp").write_text("int smoke() { return 1; }")
    (tmp_path / "include.hpp").write_text("class Header {};")
    (tmp_path / "app/api/test-update/route.ts").write_text("export function POST() {}")
    (tmp_path / "users.csv").write_text("name,grade\nprivate,record")
    analysis = analyze_repository(tmp_path)
    assert analysis["files_scanned"] == 3
    assert "C++" in analysis["languages"]
    assert "unit-testing" in analysis["competencies"]


def test_data_structure_source_evidence_matches_named_operations():
    from app.analyze import analyze_files

    analysis = analyze_files({
        "include/ArrayList.hpp": b"template<class T> class ArrayList {};",
        "include/LinkedList.hpp": b"class LinkedList { struct Node { Node* next; }; };",
        "include/Patient.hpp": b"struct Patient { double totalCost; };",
        "src/main.cpp": (
            b"void selectionSort() {} void mergeSort() {} void sortedSearch() {} "
            b"auto duration = std::chrono::steady_clock::now(); int comparisons = 0; "
            b"#include <iostream> int main() { std::cout << 1; }"
        ),
    })
    assert {
        "cpp-programming", "custom-array", "singly-linked-list", "sorting-algorithms",
        "searching-algorithms", "cost-calculation", "performance-measurement",
        "algorithm-comparison", "console-reporting",
    } <= set(analysis["competencies"])


def test_review_manifest_uses_five_user_selected_repositories(tmp_path):
    from pathlib import Path

    root = Path(__file__).resolve().parents[2]
    manifest = root / "ml/datasets/real_validation_manifest.json"
    (tmp_path / "data-structure").mkdir()
    (tmp_path / "oodj-apuasc").mkdir()
    (tmp_path / "nextgen-fitness-capstone").mkdir()
    (tmp_path / "flowquest-webdev").mkdir()
    (tmp_path / "java-sem5-hrms").mkdir()
    rows = prepare(manifest, tmp_path, tmp_path / "pairs.csv")
    assert len(rows) == 15
    assert len({row["project_id"] for row in rows}) == 5
    assert len({row["module_id"] for row in rows}) == 3
    assert all(row["label"] == "" for row in rows)
    testing = next(row for row in rows if row["module_id"] == "apu-software-testing")
    assert testing["prerequisite_coverage"] == 0
    assert "ShopEasy" in testing["review_notes"]
    dstr = next(row for row in rows if row["module_id"] == "apu-degree-sem2-data-structure")
    assert dstr["prerequisite_coverage"] == 0
    assert dstr["pairing_rationale"]
    capstone = next(row for row in rows if row["module_id"] == "apu-sem5-capstone")
    assert capstone["prerequisite_coverage"] == ""
    assert "business logic" in capstone["review_notes"]


def test_external_validation_rejects_labels_without_computed_features(tmp_path):
    path = tmp_path / "real.csv"
    path.write_text(
        "project_id,anchor_project_id,prerequisite_coverage,reuse_signal_count,target_overlap,"
        "evidence_count,files_scanned,label,label_source\n"
        "repo-a,repo-a,,0,0,1,1,CONTINUE,educator_review\n"
    )
    with pytest.raises(ValueError, match="missing prerequisite_coverage"):
        summarize_external_validation(None, path)


def test_external_validation_scores_reviewed_pairs_without_retraining(tmp_path):
    path = tmp_path / "reviewed.csv"
    path.write_text(
        "project_id,anchor_project_id,prerequisite_coverage,reuse_signal_count,target_overlap,"
        "evidence_count,files_scanned,label,label_source\n"
        "repo-a,repo-a,0.9,1,0.2,2,10,CONTINUE,educator_review\n"
    )

    class Model:
        def predict(self, _features):
            return np.array(["CONTINUE"])

    summary = summarize_external_validation(Model(), path)
    assert summary["reviewed_pairs"] == 1
    assert summary["project_groups"] == 1
    assert summary["metrics"]["model_macro_f1"] == pytest.approx(1 / 3)
    assert "small samples" in summary["status"]
