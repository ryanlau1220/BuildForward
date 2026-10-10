import io
import os
import tempfile
import uuid
import zipfile

from fastapi.testclient import TestClient

# Keep test imports and mutations out of the developer's local demo database.
os.environ.setdefault(
    "DATABASE_URL",
    f"sqlite:///{tempfile.gettempdir()}/buildforward-tests-{uuid.uuid4().hex}.db",
)

from app.analyze import analyze_zip
from app.main import app


def test_scalar_docs_replace_swagger_and_redoc():
    with TestClient(app) as client:
        docs = client.get("/docs")
        assert docs.status_code == 200
        assert docs.headers["content-type"].startswith("text/html")
        assert "BuildForward API" in docs.text
        assert "/openapi.json" in docs.text
        assert client.get("/redoc").status_code == 404
        assert "/docs" not in client.get("/openapi.json").json()["paths"]


def test_project_choices_include_coursework_link():
    with TestClient(app) as client:
        projects = client.get("/api/v1/projects").json()
        sample = next(project for project in projects if project["id"] == "sample-record-app")
        assert sample["originating_module_id"] == "oop"


def archive(files: dict[str, str]) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as zipped:
        for path, content in files.items():
            zipped.writestr(path, content)
    return output.getvalue()


def test_sample_predictions_are_explained_and_scenario_is_labelled():
    with TestClient(app) as client:
        continuity = client.post(
            "/api/v1/predictions/continuity",
            json={"project_id": "sample-record-app", "module_id": "testing"},
        ).json()
        assert continuity["decision"] == "CONTINUE"
        assert continuity["prediction_source"] == "trained_model"
        assert continuity["model"]["name"] == "random_forest"
        assert continuity["model"]["training_data_source"] == "synthetic_rubric_scenarios"
        assert continuity["model"]["training_rows"] == 72
        assert continuity["model"]["real_validation"]["candidate_pairs"] == 12
        assert continuity["model"]["real_validation"]["reviewed_pairs"] == 0
        assert continuity["model"]["real_validation"]["metrics"] is None
        assert continuity["heuristic_baseline_decision"] == "CONTINUE"
        assert continuity["model_features"] == {
            "prerequisite_coverage": 1.0,
            "reuse_signal_count": 1,
            "target_overlap": 0.0,
            "evidence_count": 3,
            "files_scanned": 0,
        }
        assert len(continuity["model"]["dataset_sha256"]) == 64
        assert continuity["matched_prerequisites"] == ["modularity", "object-oriented-design"]
        assert continuity["human_decision_required"] is True

        baseline = client.post(
            "/api/v1/predictions/cohort-gap", json={"cohort_id": "sample-cohort"}
        ).json()
        scenario = client.post(
            "/api/v1/predictions/cohort-gap",
            json={"cohort_id": "sample-cohort", "intervention": {
                "competency": "continuous-integration", "assumed_gain": 0.18,
                "description": "Add CI work",
            }},
        ).json()
        before = next(f for f in baseline["ranked_findings"] if f["competency"] == "continuous-integration")
        after = next(f for f in scenario["ranked_findings"] if f["competency"] == "continuous-integration")
        assert after["projected_gap"] == before["projected_gap"]
        assert after["potential_gap_reduction"] > 0
        assert "assumption" in scenario["assumptions"]["intervention_gain"]
        assert scenario["assumptions"]["market_dataset"]["period"] == "Q1 2024"
        assert "Not a percentage of all job ads" in scenario["assumptions"]["market_dataset"]["claim_limit"]
        database_signal = next(
            f for f in baseline["ranked_findings"] if f["competency"] == "database-design"
        )
        assert database_signal["market_relevance"] == round(4 / 6, 3)
        assert database_signal["market_evidence"]["matched_profiles"] == 4
        unsupported = next(
            f for f in baseline["ranked_findings"] if f["competency"] == "continuous-integration"
        )
        assert unsupported["market_relevance"] is None
        assert unsupported["priority_score"] is None
        assert scenario["ranked_findings"] == sorted(
            scenario["ranked_findings"], key=lambda f: (
                f["priority_score"] is None,
                -(f["priority_score"] if f["priority_score"] is not None else f["projected_gap"]),
                f["competency"],
            )
        )


def test_supplied_material_candidates_are_seeded_but_not_confirmed():
    with TestClient(app) as client:
        curriculum = client.get("/api/v1/programmes/apu-coursework-sequence").json()
        oodj = client.get("/api/v1/programmes/apu-oodj-coursework-reference").json()
        project = client.get("/api/v1/projects/project-oodj-apuasc").json()
        assert curriculum["provenance"] == "EXTRACTED_CANDIDATE"
        assert curriculum["name"] == "APU coursework materials (user-labeled Semesters 1–5)"
        assert len(curriculum["source_label"]) <= 200
        assert len(curriculum["modules"]) == 5
        assert oodj["provenance"] == "EXTRACTED_CANDIDATE"
        assert [module["semester"] for module in oodj["modules"]] == [1, 2]
        assert oodj["modules"][1]["id"] == "apu-software-testing"
        assert "No submission has been supplied" in oodj["modules"][1]["assignment"]
        assert project["provenance"] == "EXTRACTED_CANDIDATE"
        assert project["originating_module_id"] == "apu-oodj-assignment"

        projects = client.get("/api/v1/projects").json()
        submitted = [p for p in projects if p["id"].startswith("submission-")]
        assert len(submitted) == 5
        assert all(p["provenance"] == "EXTRACTED_CANDIDATE" for p in submitted)
        for candidate in submitted:
            detail = client.get(f"/api/v1/projects/{candidate['id']}").json()
            assert detail["files_scanned"] == 0
            assert "report summary only" in detail["source_label"]

        oodj_detail = client.get("/api/v1/projects/project-oodj-apuasc").json()
        assert "OODJ_Assignment.docx" in oodj_detail["source_label"]


def test_project_evidence_requires_human_confirmation():
    name = f"project-{uuid.uuid4().hex[:8]}.zip"
    content = archive({
        "repo/src/service.py": "class RecordService:\n    pass\n",
        "repo/src/models.py": "class Record:\n    pass\n",
        "repo/tests/test_service.py": "def test_record():\n    assert True\n",
        "repo/.github/workflows/check.yml": "name: check\n",
    })
    with TestClient(app) as client:
        candidate_response = client.post(
            "/api/v1/projects/analyze", files={"file": (name, content, "application/zip")}
        )
        assert candidate_response.status_code == 201
        candidate = candidate_response.json()
        assert candidate["provenance"] == "EXTRACTED_CANDIDATE"
        assert {"unit-testing", "continuous-integration", "testable-code"} <= set(candidate["competencies"])
        origin = client.patch(f"/api/v1/projects/{candidate['id']}/origin", json={"module_id": "oop"})
        assert origin.status_code == 200
        assert origin.json()["originating_module_id"] == "oop"
        blocked = client.post(
            "/api/v1/predictions/continuity",
            json={"project_id": candidate["id"], "module_id": "testing"},
        )
        assert blocked.status_code == 409
        confirmed = client.post(f"/api/v1/projects/{candidate['id']}/confirm")
        assert confirmed.status_code == 200
        assert confirmed.json()["provenance"] == "CONFIRMED_FACT"
        predicted = client.post(
            "/api/v1/predictions/continuity",
            json={"project_id": candidate["id"], "module_id": "testing"},
        )
        assert predicted.status_code == 200


def test_archive_limits_and_unfamiliar_text_do_not_create_false_competencies():
    content = archive({
        "../outside.py": "from fastapi import FastAPI",
        "repo/notes.txt": "We hope to learn Docker and testing one day.",
        "repo/src/unknown.q": "Continuous integration sounds useful",
    })
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/projects/analyze", files={"file": ("notes.zip", content, "application/zip")}
        )
        assert response.status_code == 201
        candidate = response.json()
        assert candidate["competencies"] == []
        assert candidate["files_scanned"] == 0


def test_repository_analysis_skips_data_files_and_scans_source_only():
    content = archive({
        "repo/data/users.txt": "admin password: do-not-scan",
        "repo/data/grades.csv": "student,grade",
        "repo/.env": "SECRET_TOKEN=do-not-scan",
        "repo/src/Main.java": "public class Main {}",
        "repo/src/Service.java": "public class Service {}",
        "repo/src/Model.java": "public class Model {}",
    })
    analysis = analyze_zip(content)
    assert analysis["files_scanned"] == 3
    assert analysis["languages"] == ["Java"]
    assert all("do-not-scan" not in str(item) for item in analysis["evidence"])


def test_repository_analysis_recognizes_cpp_headers_and_conventional_tests_only():
    analysis = analyze_zip(archive({
        "repo/include/ArrayList.hpp": "class ArrayList {};",
        "repo/src/main.cpp": "int main() { return 0; }",
        "repo/src/model.cpp": "struct Model {};",
        "repo/tests/smoke.cpp": "int smoke() { return 1; }",
        "repo/app/api/test-update/route.ts": "export function POST() {}",
        "repo/src/testing.java": "class Testing {}",
        "repo/src/latest.java": "class Latest {}",
        "repo/frontend/main.dart": "class MainApp {}",
    }))
    assert analysis["files_scanned"] == 8
    assert "C++" in analysis["languages"]
    assert "Dart" in analysis["languages"]
    assert "object-oriented-design" in analysis["competencies"]
    assert {"unit-testing", "automated-tests"} <= set(analysis["competencies"])
    assert "object-oriented-design" in analysis["competencies"]

    without_tests = analyze_zip(archive({
        "repo/app/api/test-update/route.ts": "export function POST() {}",
        "repo/src/testing.java": "class Testing {}",
    }))
    assert "unit-testing" not in without_tests["competencies"]


def test_imported_curriculum_and_cohort_are_blocked_until_reviewed():
    suffix = uuid.uuid4().hex[:8]
    programme_id = f"programme-{suffix}"
    cohort_id = f"cohort-{suffix}"
    with TestClient(app) as client:
        imported = client.post("/api/v1/programmes/import", json={
            "id": programme_id, "name": "Reviewed test pathway", "source_label": "test fixture",
            "modules": [
                {"id": f"foundation-{suffix}", "name": "Foundation", "semester": 1,
                 "target_competencies": ["object-oriented-design"]},
                {"id": f"testing-{suffix}", "name": "Testing", "semester": 2,
                 "prerequisites": [f"foundation-{suffix}"],
                 "required_competencies": ["object-oriented-design"],
                 "target_competencies": ["unit-testing"],
                 "reuse_signals": ["testable-code"]},
            ],
        })
        assert imported.status_code == 201
        listed_modules = client.get("/api/v1/modules").json()
        candidate_module = next(m for m in listed_modules if m["id"] == f"foundation-{suffix}")
        assert candidate_module["provenance"] == "EXTRACTED_CANDIDATE"
        cohort = client.post("/api/v1/cohorts/import", json={
            "id": cohort_id, "name": "Reviewed test cohort",
            "programme_id": programme_id, "current_semester": 1,
            "coverage": {"unit-testing": 0.1},
        })
        assert cohort.status_code == 201
        params = {"programme_id": programme_id, "cohort_id": cohort_id,
                  "project_id": "sample-record-app"}
        assert client.get("/api/v1/workspace", params=params).status_code == 409
        assert client.post(f"/api/v1/programmes/{programme_id}/confirm").status_code == 200
        assert client.get("/api/v1/workspace", params=params).status_code == 409
        assert client.post(f"/api/v1/cohorts/{cohort_id}/confirm").status_code == 200
        ready = client.get("/api/v1/workspace", params=params)
        assert ready.status_code == 200
        assert ready.json()["programme"]["provenance"] == "CONFIRMED_FACT"
        assert ready.json()["continuity"]["module_id"] == f"testing-{suffix}"
