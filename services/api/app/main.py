import os
import re
from contextlib import asynccontextmanager
from uuid import uuid4

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .analyze import MAX_ARCHIVE_BYTES, analyze_zip
from .db import Base, engine, get_db
from .intelligence import continuity, forecast
from .models import Cohort, Module, Programme, Project
from .schemas import CohortIn, ContinuityRequest, ForecastRequest, ProgrammeIn, ProjectOriginIn
from .seed import seed_sample, seed_source_candidates


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        seed_sample(session)
        seed_source_candidates(session)
    yield


app = FastAPI(title="BuildForward API", version="0.1.0", lifespan=lifespan)
cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
cors_origins.extend(origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip())
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def module_out(m: Module) -> dict:
    return {
        "id": m.id, "name": m.name, "semester": m.semester,
        "prerequisites": m.prerequisites,
        "required_competencies": m.required_competencies,
        "target_competencies": m.target_competencies,
        "reuse_signals": m.reuse_signals,
        "outcomes": m.outcomes, "assignment": m.assignment,
        "provenance": m.provenance,
    }


def project_out(p: Project) -> dict:
    return {
        "id": p.id, "name": p.name, "source_label": p.source_label,
        "provenance": p.provenance, "originating_module_id": p.originating_module_id,
        "competencies": p.competencies, "evidence": p.evidence,
        "languages": p.languages, "files_scanned": p.files_scanned,
    }


def require_confirmed(provenance: str) -> None:
    if provenance not in {"SAMPLE", "SIMULATED", "CONFIRMED_FACT"}:
        raise HTTPException(409, "Review and confirm extracted candidate data before prediction")


@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/v1/demo")
def demo(db: Session = Depends(get_db)) -> dict:
    return workspace("sample-se", "sample-cohort", "sample-record-app", db)


@app.get("/api/v1/programmes")
def list_programmes(db: Session = Depends(get_db)) -> list[dict]:
    return [{"id": p.id, "name": p.name, "provenance": p.provenance}
            for p in db.scalars(select(Programme).order_by(Programme.name)).all()]


@app.get("/api/v1/cohorts")
def list_cohorts(db: Session = Depends(get_db)) -> list[dict]:
    return [{"id": c.id, "name": c.name, "programme_id": c.programme_id,
             "provenance": c.provenance}
            for c in db.scalars(select(Cohort).order_by(Cohort.name)).all()]


@app.get("/api/v1/modules")
def list_modules(db: Session = Depends(get_db)) -> list[dict]:
    modules = db.scalars(select(Module).order_by(Module.semester, Module.name)).all()
    programmes = {p.id: p.name for p in db.scalars(select(Programme)).all()}
    return [{**module_out(m), "programme_id": m.programme_id,
             "programme_name": programmes.get(m.programme_id, "Unknown programme")}
            for m in modules]


@app.get("/api/v1/projects")
def list_projects(db: Session = Depends(get_db)) -> list[dict]:
    return [{"id": p.id, "name": p.name, "provenance": p.provenance}
            for p in db.scalars(select(Project).order_by(Project.name)).all()]


@app.get("/api/v1/workspace")
def workspace(
    programme_id: str = Query(default="sample-se"),
    cohort_id: str = Query(default="sample-cohort"),
    project_id: str = Query(default="sample-record-app"),
    db: Session = Depends(get_db),
) -> dict:
    programme = db.get(Programme, programme_id)
    cohort = db.get(Cohort, cohort_id)
    project = db.get(Project, project_id)
    if not programme or not cohort or not project:
        raise HTTPException(404, "Programme, cohort or project not found")
    if cohort.programme_id != programme.id:
        raise HTTPException(422, "Cohort must belong to the selected programme")
    require_confirmed(programme.provenance)
    require_confirmed(cohort.provenance)
    require_confirmed(project.provenance)
    modules = db.scalars(
        select(Module).where(Module.programme_id == programme.id).order_by(Module.semester)
    ).all()
    if any(m.provenance == "EXTRACTED_CANDIDATE" for m in modules):
        raise HTTPException(409, "Confirm curriculum data before prediction")
    next_module = next((m for m in modules if m.semester > cohort.current_semester), None)
    return {
        "notice": (
            "Illustrative sample and simulated cohort; real university sources are pending."
            if programme.provenance == "SAMPLE" else
            "Source data was manually confirmed. Cohort forecasts still depend on stated assumptions."
        ),
        "programme": {"id": programme.id, "name": programme.name, "provenance": programme.provenance},
        "modules": [module_out(m) for m in modules],
        "project": project_out(project),
        "cohort": {"id": cohort.id, "name": cohort.name, "coverage": cohort.coverage,
                   "current_semester": cohort.current_semester, "provenance": cohort.provenance},
        "continuity": continuity(project, next_module) if next_module else None,
        "forecast": forecast(cohort, modules, None),
    }


@app.post("/api/v1/programmes/import", status_code=201)
def import_programme(payload: ProgrammeIn, db: Session = Depends(get_db)) -> dict:
    if db.get(Programme, payload.id):
        raise HTTPException(409, "Programme ID already exists")
    ids = [m.id for m in payload.modules]
    if len(ids) != len(set(ids)):
        raise HTTPException(422, "Module IDs must be unique")
    if any(prereq not in ids for m in payload.modules for prereq in m.prerequisites):
        raise HTTPException(422, "All prerequisite module IDs must be included")
    db.add(Programme(id=payload.id, name=payload.name, source_label=payload.source_label,
                     provenance="EXTRACTED_CANDIDATE"))
    for item in payload.modules:
        db.add(Module(**item.model_dump(), programme_id=payload.id, provenance="EXTRACTED_CANDIDATE"))
    db.commit()
    return {"id": payload.id, "provenance": "EXTRACTED_CANDIDATE",
            "next_step": "Review imported modules and call confirm before prediction"}


@app.get("/api/v1/programmes/{programme_id}")
def get_programme(programme_id: str, db: Session = Depends(get_db)) -> dict:
    programme = db.get(Programme, programme_id)
    if not programme:
        raise HTTPException(404, "Programme not found")
    modules = db.scalars(select(Module).where(Module.programme_id == programme_id).order_by(Module.semester)).all()
    return {"id": programme.id, "name": programme.name, "source_label": programme.source_label,
            "provenance": programme.provenance, "modules": [module_out(m) for m in modules]}


@app.post("/api/v1/programmes/{programme_id}/confirm")
def confirm_programme(programme_id: str, db: Session = Depends(get_db)) -> dict:
    programme = db.get(Programme, programme_id)
    if not programme:
        raise HTTPException(404, "Programme not found")
    if programme.provenance != "EXTRACTED_CANDIDATE":
        raise HTTPException(409, "Only imported candidates can be confirmed")
    programme.provenance = "CONFIRMED_FACT"
    modules = db.scalars(select(Module).where(Module.programme_id == programme_id)).all()
    for module in modules:
        module.provenance = "CONFIRMED_FACT"
    db.commit()
    return {"id": programme_id, "provenance": "CONFIRMED_FACT"}


@app.post("/api/v1/cohorts/import", status_code=201)
def import_cohort(payload: CohortIn, db: Session = Depends(get_db)) -> dict:
    if db.get(Cohort, payload.id):
        raise HTTPException(409, "Cohort ID already exists")
    programme = db.get(Programme, payload.programme_id)
    if not programme:
        raise HTTPException(404, "Programme not found")
    if any(not 0 <= value <= 1 for value in payload.coverage.values()):
        raise HTTPException(422, "Coverage values must be between 0 and 1")
    if not payload.coverage:
        raise HTTPException(422, "At least one competency coverage value is required")
    cohort = Cohort(**payload.model_dump(), provenance="EXTRACTED_CANDIDATE")
    db.add(cohort)
    db.commit()
    return {"id": cohort.id, "provenance": cohort.provenance,
            "next_step": "Review the cohort coverage and confirm before prediction"}


@app.get("/api/v1/cohorts/{cohort_id}")
def get_cohort(cohort_id: str, db: Session = Depends(get_db)) -> dict:
    cohort = db.get(Cohort, cohort_id)
    if not cohort:
        raise HTTPException(404, "Cohort not found")
    return {"id": cohort.id, "name": cohort.name, "programme_id": cohort.programme_id,
            "current_semester": cohort.current_semester, "coverage": cohort.coverage,
            "provenance": cohort.provenance}


@app.post("/api/v1/cohorts/{cohort_id}/confirm")
def confirm_cohort(cohort_id: str, db: Session = Depends(get_db)) -> dict:
    cohort = db.get(Cohort, cohort_id)
    if not cohort:
        raise HTTPException(404, "Cohort not found")
    if cohort.provenance != "EXTRACTED_CANDIDATE":
        raise HTTPException(409, "Only imported candidates can be confirmed")
    cohort.provenance = "CONFIRMED_FACT"
    db.commit()
    return {"id": cohort.id, "provenance": cohort.provenance}


def save_project(analysis: dict, name: str, source_label: str, db: Session) -> dict:
    project = Project(
        id=f"project-{uuid4().hex[:12]}", name=name, source_label=source_label,
        provenance="EXTRACTED_CANDIDATE", originating_module_id=None,
        competencies=analysis["competencies"], evidence=analysis["evidence"],
        languages=analysis["languages"], files_scanned=analysis["files_scanned"],
    )
    db.add(project)
    db.commit()
    return {**project_out(project), "limitations": analysis["limitations"],
            "next_step": "Review evidence and confirm this candidate before prediction"}


@app.post("/api/v1/projects/analyze", status_code=201)
async def analyze_project(file: UploadFile = File(...), db: Session = Depends(get_db)) -> dict:
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(422, "Upload a ZIP archive")
    content = await file.read(MAX_ARCHIVE_BYTES + 1)
    try:
        analysis = analyze_zip(content)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return save_project(analysis, file.filename.removesuffix(".zip"), file.filename, db)


@app.post("/api/v1/projects/analyze-github", status_code=201)
async def analyze_github(payload: dict[str, str], db: Session = Depends(get_db)) -> dict:
    url = payload.get("url", "")
    match = re.fullmatch(r"https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?", url)
    if not match:
        raise HTTPException(422, "Enter a public https://github.com/owner/repository URL")
    owner, repo = match.groups()
    api_url = f"https://api.github.com/repos/{owner}/{repo}/zipball"
    try:
        async with (
            httpx.AsyncClient(timeout=20, follow_redirects=True) as client,
            client.stream("GET", api_url, headers={"Accept": "application/vnd.github+json"}) as response,
        ):
            response.raise_for_status()
            chunks = bytearray()
            async for chunk in response.aiter_bytes():
                chunks.extend(chunk)
                if len(chunks) > MAX_ARCHIVE_BYTES:
                    raise HTTPException(413, "Repository archive exceeds the 20 MB limit")
            content = bytes(chunks)
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Could not download the public repository") from exc
    try:
        analysis = analyze_zip(content)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return save_project(analysis, repo, url, db)


@app.get("/api/v1/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)) -> dict:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project_out(project)


@app.post("/api/v1/projects/{project_id}/confirm")
def confirm_project(project_id: str, db: Session = Depends(get_db)) -> dict:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if project.provenance != "EXTRACTED_CANDIDATE":
        raise HTTPException(409, "Only extracted candidates can be confirmed")
    project.provenance = "CONFIRMED_FACT"
    db.commit()
    return project_out(project)


@app.patch("/api/v1/projects/{project_id}/origin")
def set_project_origin(project_id: str, payload: ProjectOriginIn, db: Session = Depends(get_db)) -> dict:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if project.provenance != "EXTRACTED_CANDIDATE":
        raise HTTPException(409, "Set the originating module during candidate review")
    module = db.get(Module, payload.module_id)
    if not module:
        raise HTTPException(404, "Module not found")
    project.originating_module_id = module.id
    db.commit()
    return project_out(project)


@app.post("/api/v1/predictions/continuity")
def predict_continuity(payload: ContinuityRequest, db: Session = Depends(get_db)) -> dict:
    project = db.get(Project, payload.project_id)
    module = db.get(Module, payload.module_id)
    if not project or not module:
        raise HTTPException(404, "Project or module not found")
    require_confirmed(project.provenance)
    require_confirmed(module.provenance)
    return continuity(project, module)


@app.post("/api/v1/predictions/cohort-gap")
def predict_gap(payload: ForecastRequest, db: Session = Depends(get_db)) -> dict:
    cohort = db.get(Cohort, payload.cohort_id)
    if not cohort:
        raise HTTPException(404, "Cohort not found")
    require_confirmed(cohort.provenance)
    modules = db.scalars(select(Module).where(Module.programme_id == cohort.programme_id)).all()
    if any(module.provenance == "EXTRACTED_CANDIDATE" for module in modules):
        raise HTTPException(409, "Confirm curriculum data before prediction")
    return forecast(cohort, modules, payload.intervention)
