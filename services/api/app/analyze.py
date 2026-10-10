import io
import re
import zipfile
from collections import Counter
from pathlib import PurePosixPath

MAX_ARCHIVE_BYTES = 20 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 40 * 1024 * 1024
MAX_FILES = 2000
MAX_TEXT_BYTES = 512 * 1024
IGNORED_PARTS = {".git", "node_modules", ".next", "dist", "build", "__pycache__",
                 "data", "database", "databases", "uploads", "storage"}
SOURCE_EXTENSIONS = {".java": "Java", ".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript",
                     ".js": "JavaScript", ".jsx": "JavaScript", ".cpp": "C++", ".cs": "C#"}


def analyze_zip(content: bytes) -> dict:
    if len(content) > MAX_ARCHIVE_BYTES:
        raise ValueError("Archive exceeds the 20 MB upload limit")
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise ValueError("Upload a valid ZIP archive") from exc
    with archive:
        infos = [i for i in archive.infolist() if not i.is_dir()]
        if len(infos) > MAX_FILES or sum(i.file_size for i in infos) > MAX_UNCOMPRESSED_BYTES:
            raise ValueError("Archive has too many files or too much uncompressed content")
        paths: list[str] = []
        contents: dict[str, str] = {}
        languages: Counter[str] = Counter()
        for info in infos:
            path = PurePosixPath(info.filename)
            # Repositories can contain exported student/user records or credentials.
            # Only inspect source and explicitly supported build metadata; never read
            # data files, environment files, or arbitrary text into the analyzer.
            if (path.is_absolute() or ".." in path.parts
                    or any(p.lower() in IGNORED_PARTS for p in path.parts)
                    or path.name.lower().startswith(".env")
                    or (path.suffix.lower() in {".txt", ".csv", ".jsonl", ".db", ".sqlite"}
                        and path.name.lower() != "requirements.txt")):
                continue
            name = str(path).lower()
            language = SOURCE_EXTENSIONS.get(path.suffix.lower())
            is_config = path.name.lower() in {
                "pom.xml", "build.gradle", "package.json", "pyproject.toml",
                "requirements.txt", "dockerfile",
            } or (".github/workflows/" in name and path.suffix.lower() in {".yml", ".yaml"})
            if not (language or is_config):
                continue
            paths.append(name)
            if language:
                languages[language] += 1
            if info.file_size <= MAX_TEXT_BYTES and (language or path.name.lower() in {
                "pom.xml", "build.gradle", "package.json", "pyproject.toml", "requirements.txt",
                "dockerfile",
            } or ".github/workflows/" in name):
                contents[name] = archive.read(info).decode("utf-8", errors="replace")

    evidence: list[dict] = []
    def add(skill: str, source: str, detail: str) -> None:
        evidence.append({"competency": skill, "source": source, "detail": detail})

    source_paths = [p for p in paths if PurePosixPath(p).suffix in SOURCE_EXTENSIONS]
    joined = "\n".join(contents.values()).lower()
    if len(source_paths) >= 3:
        add("modularity", "repository structure", f"{len(source_paths)} source files found")
    if any("service" in p or "domain" in p for p in source_paths):
        add("testable-code", "repository structure", "Service or domain code is separated into files")
        add("domain-model", "repository structure", "Domain or service files found")
    if any(p.endswith(".java") for p in source_paths) and re.search(r"\b(class|interface)\s+\w+", joined):
        add("object-oriented-design", "Java source", "Class or interface declaration found")
    if any("/test" in p or p.startswith("test") for p in source_paths):
        add("unit-testing", "repository structure", "Test source files found; test execution not verified")
        add("automated-tests", "repository structure", "Test source files found; test execution not verified")
    workflows = [p for p in paths if ".github/workflows/" in p and p.endswith((".yml", ".yaml"))]
    if workflows:
        add("continuous-integration", workflows[0], "CI workflow file found; execution not verified")
    dockerfiles = [p for p in paths if PurePosixPath(p).name.lower() == "dockerfile"]
    if dockerfiles:
        add("containerisation", dockerfiles[0], "Dockerfile found; image build not verified")
    if any(token in joined for token in ("jdbc", "sqlalchemy", "postgresql", "sqlite", "prisma")):
        add("persistence", "dependency or source text", "Database-related package or API reference found")
    if any(token in joined for token in ("fastapi", "express", "spring-boot", "springframework.web")):
        add("web-api", "dependency or source text", "Web framework reference found")

    return {
        "competencies": sorted({e["competency"] for e in evidence}),
        "evidence": evidence,
        "languages": [name for name, _ in languages.most_common()],
        "files_scanned": len(paths),
        "limitations": [
            "Static file inspection only; code, tests and CI were not executed",
            "A detected file or dependency is evidence of use, not proof of proficiency",
        ],
    }
