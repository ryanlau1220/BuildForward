from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Programme(Base):
    __tablename__ = "programmes"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    source_label: Mapped[str] = mapped_column(String(200))
    provenance: Mapped[str] = mapped_column(String(40))


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    programme_id: Mapped[str] = mapped_column(ForeignKey("programmes.id"))
    name: Mapped[str] = mapped_column(String(200))
    semester: Mapped[int] = mapped_column(Integer)
    prerequisites: Mapped[list] = mapped_column(JSON)
    required_competencies: Mapped[list | None] = mapped_column(JSON)
    target_competencies: Mapped[list] = mapped_column(JSON)
    reuse_signals: Mapped[list] = mapped_column(JSON)
    outcomes: Mapped[list] = mapped_column(JSON)
    assignment: Mapped[str] = mapped_column(String(300))
    provenance: Mapped[str] = mapped_column(String(40))


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    source_label: Mapped[str] = mapped_column(String(300))
    provenance: Mapped[str] = mapped_column(String(40))
    competencies: Mapped[list] = mapped_column(JSON)
    evidence: Mapped[list] = mapped_column(JSON)
    languages: Mapped[list] = mapped_column(JSON)
    files_scanned: Mapped[int] = mapped_column(Integer)
    originating_module_id: Mapped[str | None] = mapped_column(String(80), nullable=True)


class Cohort(Base):
    __tablename__ = "cohorts"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    programme_id: Mapped[str] = mapped_column(ForeignKey("programmes.id"))
    current_semester: Mapped[int] = mapped_column(Integer)
    coverage: Mapped[dict] = mapped_column(JSON)
    provenance: Mapped[str] = mapped_column(String(40))
