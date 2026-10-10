import json
from pathlib import Path

from sqlalchemy.orm import Session

from .models import Cohort, Module, Programme, Project

SEED_PATH = Path(__file__).resolve().parents[3] / "data" / "sample_demo.json"
IMPORTS_PATH = Path(__file__).resolve().parents[3] / "data" / "imports"


def seed_sample(session: Session) -> None:
    if session.get(Programme, "sample-se"):
        return
    data = json.loads(SEED_PATH.read_text())
    programme = data["programme"]
    session.add(Programme(
        id=programme["id"],
        name=programme["name"],
        source_label="Illustrative sample; awaiting real university material",
        provenance="SAMPLE",
    ))
    for item in data["modules"]:
        session.add(Module(**item, programme_id=programme["id"], provenance="SAMPLE"))
    session.add(Project(**data["project"], provenance="SAMPLE"))
    session.add(Cohort(**data["cohort"], programme_id=programme["id"], provenance="SIMULATED"))
    session.commit()


def seed_source_candidates(session: Session) -> None:
    """Register supplied source summaries as review-only candidates on fresh databases."""
    for filename in ("apu-curriculum-candidate.json", "oodj-coursework-candidate.json"):
        data = json.loads((IMPORTS_PATH / filename).read_text())
        programme_id = data["id"]
        existing = session.get(Programme, programme_id)
        if existing:
            if existing.provenance != "EXTRACTED_CANDIDATE":
                continue
            existing.name = data["name"]
            existing.source_label = data["source_label"]
        else:
            session.add(Programme(
                id=programme_id,
                name=data["name"],
                source_label=data["source_label"],
                provenance="EXTRACTED_CANDIDATE",
            ))
        for item in data["modules"]:
            module = session.get(Module, item["id"])
            if module and module.provenance != "EXTRACTED_CANDIDATE":
                continue
            session.merge(Module(**item, programme_id=programme_id,
                                 provenance="EXTRACTED_CANDIDATE"))
    session.flush()

    project_files = ["oodj-project-candidate.json", "submission-projects-candidate.json"]
    for filename in project_files:
        candidate_data = json.loads((IMPORTS_PATH / filename).read_text())
        candidates = candidate_data if isinstance(candidate_data, list) else [candidate_data]
        for data in candidates:
            existing = session.get(Project, data["id"])
            if existing:
                if existing.provenance != "EXTRACTED_CANDIDATE":
                    continue
                for key, value in data.items():
                    setattr(existing, key, value)
            else:
                session.add(Project(**data, provenance="EXTRACTED_CANDIDATE"))
    session.commit()
