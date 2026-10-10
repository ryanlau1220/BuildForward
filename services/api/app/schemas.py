from pydantic import BaseModel, Field


class ModuleIn(BaseModel):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]+$")
    name: str
    semester: int = Field(ge=1, le=20)
    prerequisites: list[str] = []
    required_competencies: list[str] = []
    target_competencies: list[str] = []
    reuse_signals: list[str] = []
    outcomes: list[str] = []
    assignment: str = ""


class ProgrammeIn(BaseModel):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]+$")
    name: str
    source_label: str
    modules: list[ModuleIn] = Field(min_length=1)


class CohortIn(BaseModel):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]+$")
    name: str
    programme_id: str
    current_semester: int = Field(ge=1, le=20)
    coverage: dict[str, float]


class ContinuityRequest(BaseModel):
    project_id: str
    module_id: str


class ProjectOriginIn(BaseModel):
    module_id: str = Field(min_length=1)


class Intervention(BaseModel):
    competency: str
    assumed_gain: float = Field(ge=0, le=1)
    description: str


class ForecastRequest(BaseModel):
    cohort_id: str
    intervention: Intervention | None = None
