# BuildForward

BuildForward is a proof-of-concept curriculum decision-support app. It compares a student project with an upcoming module and projects cohort competency coverage at graduation. Educators review the evidence and decide whether to act.

## Current data status

The workbench opens with an **illustrative programme** and a **simulated cohort**. User-provided coursework is available in `data/materials/`; the five briefs are normalized in their user-labeled Semester 1–5 order as an unconfirmed candidate in `data/imports/apu-curriculum-candidate.json`. The Semester 1 brief identifies itself as Diploma coursework, so this remains a user-provided sequence rather than an officially verified programme specification. The separate OODJ brief is from a Degree Semester 1 folder and stays separate. No real cohort data has been supplied; forecast values are not validated institutional predictions. A small DOSM/ILMIA role-profile sample contributes a limited market relevance signal; its age and scope are documented in [docs/market-data.md](docs/market-data.md).

## Run locally

Requirements: Python 3.13+, [uv](https://docs.astral.sh/uv/), Node.js 24+, pnpm 10.32.1.

Terminal 1:

```bash
cd services/api
uv sync --group dev
uv run uvicorn app.main:app --reload --port 8000
```

Terminal 2:

```bash
cd apps/web
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. Interactive API documentation is served by Scalar at http://localhost:8000/docs; the OpenAPI schema remains available at http://localhost:8000/openapi.json.

Local runs use SQLite by default. To run the same API against PostgreSQL, use:

```bash
docker compose up --build
```

The demo data is seeded on first startup. Deleting the local `services/api/buildforward.db` recreates that illustrative seed; do not delete a database containing imported work.

## What works

- Curriculum JSON import and explicit confirmation.
- Cohort coverage JSON import and explicit confirmation.
- Public GitHub repository or ZIP analysis through static file inspection.
- Evidence review and confirmation before new project data enters predictions.
- Project-to-module continuity comparison using a trained classifier, with its heuristic baseline, reasons, and missing prerequisites.
- Ranked graduation gaps and a with/without intervention scenario.
- Source provenance and uncertainty labels throughout the interface.

The continuity model is a proof of concept trained on synthetic rubric scenarios, not historical student data. The interface reports that source and its grouped holdout macro-F1; this measures agreement with the scenario rubric rather than institutional predictive validity. See [ml/README.md](ml/README.md) for the dataset method and reproducible training commands.

The cohort outlook ranks competencies with mapped ILMIA role-profile skills by projected gap, selected-profile coverage, and remaining curriculum opportunities. Skills without mapped evidence are marked unavailable and use gap-only ordering. These role-profile shares are not percentages of all job ads; see [docs/market-data.md](docs/market-data.md).

For a short, reproducible walkthrough of the connected continuity, market-priority, and intervention flow, see [docs/golden-demo.md](docs/golden-demo.md).

The interface has three focused work areas: **Project continuity**, **Cohort outlook**, and **Sources**. See [DESIGN.md](DESIGN.md) for the interaction and scope rules.

The sample scenario assumes a 70% programme coverage target and a 22-point gain for each remaining module targeting a competency. The slider adds an editable hypothetical gain to one skill. All three figures are demonstration assumptions, **not observed effects**.

## Importing real material

1. The five supplied materials are normalized in `data/imports/apu-curriculum-candidate.json` and seeded locally as extracted candidates, along with the separate OODJ module and repository candidates. Fresh databases receive the same review-only records automatically.
2. Open **Sources**. Inspect the candidate module outcomes and assignment summaries against files in `data/materials/`. Confirm only after educator review. The API equivalent is `POST /api/v1/programmes/{id}/confirm`.
3. In Sources, inspect the supplied OODJ repository evidence or analyze a public GitHub repository / ZIP. Review extracted evidence and confirm it only after human review.
4. If actual cohort coverage is available, import it through `POST /api/v1/cohorts/import`, review, and confirm. Otherwise, keep the cohort labelled as simulated.

Imported candidates are blocked from prediction until confirmed. The materials do not specify prerequisites, so none are inferred. The OODJ assignment and public repo are a separate coursework example; their relationship to the five-module sequence needs educator confirmation. Static repository inspection never runs uploaded code and skips data folders, database files, CSV/JSONL, environment files, and arbitrary text files.

## Verification

```bash
cd services/api
uv run pytest -q
uv run ruff check app tests
cd ../../apps/web
pnpm typecheck
pnpm build
```

See [HANDOFF.md](HANDOFF.md) for scope and claim boundaries.
