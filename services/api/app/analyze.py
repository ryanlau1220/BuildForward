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
                     ".js": "JavaScript", ".jsx": "JavaScript", ".cpp": "C++", ".hpp": "C++",
                     ".h": "C++", ".cs": "C#", ".dart": "Dart"}


def is_test_source(path: str) -> bool:
    """Recognize conventional test locations/names without matching ordinary routes."""
    parts = PurePosixPath(path).parts
    filename = PurePosixPath(path).name
    name = filename.lower()
    if any(part.lower() in {"test", "tests", "spec", "specs", "__tests__"} for part in parts[:-1]):
        return True
    stem = PurePosixPath(filename).stem
    lower_stem = stem.lower()
    return (
        name.startswith("test_")
        or lower_stem in {"test", "_test", "tests", "_tests"}
        or lower_stem.endswith(("_test", "_tests"))
        or ".test." in name
        or ".spec." in name
        or (PurePosixPath(name).suffix in {".java", ".cs"}
            and (stem.startswith("Test") or stem.endswith(("Test", "Tests"))))
    )


def should_scan_path(filename: str) -> bool:
    path = PurePosixPath(filename)
    if (path.is_absolute() or ".." in path.parts
            or any(part.lower() in IGNORED_PARTS for part in path.parts)
            or path.name.lower().startswith(".env")
            or (path.suffix.lower() in {".txt", ".csv", ".jsonl", ".db", ".sqlite"}
                and path.name.lower() != "requirements.txt")):
        return False
    name = str(path).lower()
    is_config = path.name.lower() in {
        "pom.xml", "build.gradle", "package.json", "pyproject.toml",
        "requirements.txt", "dockerfile",
    } or (".github/workflows/" in name and path.suffix.lower() in {".yml", ".yaml"})
    return bool(SOURCE_EXTENSIONS.get(path.suffix.lower()) or is_config)


def analyze_files(files: dict[str, bytes]) -> dict:
    """Extract static project evidence from already bounded repository files."""
    if len(files) > MAX_FILES or sum(map(len, files.values())) > MAX_UNCOMPRESSED_BYTES:
        raise ValueError("Repository has too many files or too much uncompressed content")
    paths: list[str] = []
    contents: dict[str, str] = {}
    languages: Counter[str] = Counter()
    for filename, content in files.items():
        path = PurePosixPath(filename)
        if not should_scan_path(filename):
            continue
        name = str(path).lower()
        language = SOURCE_EXTENSIONS.get(path.suffix.lower())
        paths.append(name)
        if language:
            languages[language] += 1
        if len(content) <= MAX_TEXT_BYTES and (language or path.name.lower() in {
            "pom.xml", "build.gradle", "package.json", "pyproject.toml", "requirements.txt",
            "dockerfile",
        } or ".github/workflows/" in name):
            contents[name] = content.decode("utf-8", errors="replace")

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
    if any(PurePosixPath(p).suffix in {".java", ".dart"} for p in source_paths) and re.search(
        r"\b(class|interface)\s+\w+", joined
    ):
        add("object-oriented-design", "Java or Dart source", "Class or interface declaration found")
    test_paths = [p for p in source_paths if is_test_source(p)]
    if test_paths:
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

    # Assignment-specific evidence is based on named types and operations, not
    # on repository descriptions or presumed student proficiency.
    cpp_paths = [p for p in source_paths if PurePosixPath(p).suffix in {".cpp", ".hpp", ".h"}]
    if cpp_paths:
        add("cpp-programming", cpp_paths[0], "C++ source or header files found")
    if re.search(r"\bclass\s+arraylist\b", joined):
        add("custom-array", "C++ source text", "ArrayList type declaration found")
    if (re.search(r"\bclass\s+linkedlist\b", joined)
            and re.search(r"\bnode\s*\*\s*next\b", joined)):
        add("singly-linked-list", "C++ source text", "LinkedList node with a next pointer found")
    if re.search(r"\b(selectionsort|mergesort)\s*\(", joined):
        add("sorting-algorithms", "source text", "Sorting operation declarations or calls found")
    if re.search(r"\b(sortedsearch|linearsearch|binarysearch)\s*\(", joined):
        add("searching-algorithms", "source text", "Search operation declarations or calls found")
    if re.search(r"\b(struct|class)\s+patient\b", joined) and re.search(
        r"\b(agegroupof|caretypeof|agegroup|caretype)\b", joined
    ):
        add("patient-record-analysis", "source text", "Patient record and grouping fields found")
    if re.search(r"\b(totalcost|basecostperhour)\b", joined):
        add("cost-calculation", "source text", "Cost fields or calculation references found")
    if re.search(r"\b(steady_clock|nanoseconds|comparisons)\b", joined):
        add("performance-measurement", "source text", "Timing or operation-count references found")
    if re.search(r"\b(selectionsort|mergesort)\s*\(", joined) and re.search(
        r"\b(arraylist|linkedlist)\b", joined
    ):
        add("algorithm-comparison", "source text", "Multiple sort algorithms and container types referenced")
    if re.search(r"#include\s*<iostream>", joined) and re.search(r"\b(cout|print)\b", joined):
        add("console-reporting", "source text", "Console output operations found")

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
        files: dict[str, bytes] = {}
        for info in infos:
            if should_scan_path(info.filename):
                files[info.filename] = archive.read(info)
    return analyze_files(files)
