"""Build a human-review CSV from local copies of curated real repositories.

The repository copies stay outside Git. This script reads only paths accepted by
BuildForward's static analyzer and never executes source files.
"""

import argparse
import csv
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services" / "api"))
from app.analyze import IGNORED_PARTS, analyze_files, should_scan_path

FEATURES = (
    "prerequisite_coverage", "reuse_signal_count", "target_overlap",
    "evidence_count", "files_scanned",
)
FIELDS = (
    "project_id", "anchor_project_id", "project_name", "project_source", "project_origin",
    "module_id", "module_name", "module_source", "module_pair_status", "pairing_rationale",
    *FEATURES, "evidence_skills", "label", "label_source", "review_notes",
)


def read_manifest(path: Path) -> tuple[list[dict], list[dict]]:
    manifest = json.loads(path.read_text())
    projects = manifest["projects"]
    modules = []
    for candidate in manifest["modules"]:
        source = json.loads((ROOT / candidate["definition_file"]).read_text())
        module = next((item for item in source["modules"] if item["id"] == candidate["id"]), None)
        if module is None:
            raise ValueError(f"Module {candidate['id']} not found in {candidate['definition_file']}")
        modules.append({**module, "source_label": candidate["source_label"]})
    project_ids = [project["id"] for project in projects]
    if len(project_ids) != len(set(project_ids)):
        raise ValueError("Project IDs in the manifest must be unique")
    if len({module["id"] for module in modules}) != len(modules):
        raise ValueError("Module IDs in the manifest must be unique")
    return projects, modules


def analyze_repository(root: Path) -> dict:
    files: dict[str, bytes] = {}
    total_bytes = 0
    for current, directories, filenames in os.walk(root, followlinks=False):
        directories[:] = [directory for directory in directories if directory.lower() not in IGNORED_PARTS]
        for filename in filenames:
            path = Path(current) / filename
            if path.is_symlink():
                continue
            relative = path.relative_to(root).as_posix()
            if not should_scan_path(relative):
                continue
            size = path.stat().st_size
            total_bytes += size
            if len(files) >= 2000 or total_bytes > 40 * 1024 * 1024:
                raise ValueError(f"Repository exceeds analyzer limits: {root}")
            files[relative] = path.read_bytes()
    return analyze_files(files)


def feature_values(module: dict, analysis: dict) -> dict[str, str | int]:
    found = set(analysis["competencies"])
    required = module.get("required_competencies")
    targets = module.get("target_competencies", [])
    reuse_signals = module.get("reuse_signals", [])
    return {
        # Null means unknown; an explicit empty list means no skills are required.
        "prerequisite_coverage": (
            "" if required is None else
            round(len(found & set(required)) / len(required), 4) if required else 1.0
        ),
        "reuse_signal_count": len(found & set(reuse_signals)),
        "target_overlap": round(len(found & set(targets)) / len(targets), 4) if targets else 0,
        "evidence_count": len(analysis["evidence"]),
        "files_scanned": analysis["files_scanned"],
    }


def prepare(manifest_path: Path, repositories_dir: Path, output: Path) -> list[dict]:
    projects, modules = read_manifest(manifest_path)
    analyses: dict[str, dict] = {}
    for project in projects:
        repository = repositories_dir / project["id"]
        if not repository.is_dir():
            raise FileNotFoundError(f"Missing local repository copy: {repository}")
        analyses[project["id"]] = analyze_repository(repository)

    rows = []
    for project in projects:
        analysis = analyses[project["id"]]
        for module in modules:
            row = {
                "project_id": project["id"],
                "anchor_project_id": project["id"],
                "project_name": project["name"],
                "project_source": project["source_url"],
                "project_origin": project["origin"],
                "module_id": module["id"],
                "module_name": module["name"],
                "module_source": module["source_label"],
                "module_pair_status": "CANDIDATE_PAIR_REVIEW_REQUIRED",
                "pairing_rationale": (
                    "Exploratory candidate: repository and module were selected for review coverage; "
                    "module fit, intake alignment, and permission to reuse require human confirmation."
                ),
                **feature_values(module, analysis),
                "evidence_skills": ";".join(analysis["competencies"]),
                "label": "",
                "label_source": "",
                "review_notes": "Human review required; confirm same or comparable module, intake context, project ownership/reuse permission, and educational value before labeling.",
            }
            rows.append(row)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    return rows


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=ROOT / "ml/datasets/real_validation_manifest.json")
    parser.add_argument("--repositories", type=Path, required=True,
                        help="Directory containing one source-only checkout per project ID")
    parser.add_argument("--output", type=Path,
                        default=ROOT / "ml/datasets/continuity_pairs.real.csv")
    args = parser.parse_args()
    rows = prepare(args.manifest, args.repositories, args.output)
    print(f"Wrote {len(rows)} unlabeled candidate project-module pairs to {args.output}")
