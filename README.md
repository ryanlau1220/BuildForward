# BuildForward

BuildForward is a predictive curriculum decision-support app for educators. It checks whether an existing student project can be meaningfully reused and extended in a future module, and estimates a student intake’s expected skill coverage at graduation. Educators review the evidence and decide whether to act.

## Current data status

The workbench opens with an **illustrative programme** and a **simulated student intake**. A student intake means a group or batch progressing through a programme together; it is not a semester. Safe, paraphrased coursework candidates are tracked in `data/candidates/`. Original coursework and submission documents are local-only and are not included in this repository. The five-file user-labeled Semester 1–5 sequence remains unverified as an official programme: its Semester 1 brief identifies itself as Diploma coursework. The separate OODJ brief is from a Degree Semester 1 folder. No real student-intake data has been supplied; forecast values are not validated institutional predictions. A fixed DOSM Q2 2026 occupation-demand count and a separate BuildForward skill mapping provide a limited market signal; their scope is documented in [docs/market-data.md](docs/market-data.md).

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
- Student-intake skill coverage JSON import and explicit confirmation.
- Public GitHub repository or ZIP analysis through static file inspection.
- Evidence review and confirmation before new project data enters predictions.
- Project reuse check between an existing project and a future module, using a trained classifier with its simple baseline, reasons, and missing prerequisites.
- Predicted skill gaps at graduation and a with/without recommended-action scenario using a gain assumption set by the educator.
- A deterministic educator action suggestion when a forecast gap, future-module target, and project-reuse result support the same skill. The action requires human review; the scenario slider does not predict its effect.
- Source provenance and uncertainty labels throughout the interface.

The project-reuse model is a proof of concept trained on synthetic rubric scenarios, not historical student data. The interface reports that source and its grouped holdout macro-F1; this measures agreement with the scenario rubric rather than institutional predictive validity. A separate real-project review set contains 15 unlabeled, hypothetical cross-intake fit checks from five user-selected repositories and three module candidates. They are not observed student progressions or confirmed assignment substitutions. These pairs are not training data, and no external review metric is available until their suitability and labels are human-reviewed and the Capstone required-skill map is resolved. Even a future metric against hypothetical judgments would measure agreement with reviewers, not actual reuse outcomes. See [ml/README.md](ml/README.md) for the dataset method and reproducible commands.

The Graduation Skills Forecast ranks mapped skills by expected graduation gap, DOSM online-offering share for a linked occupation, and future learning opportunities. Skills without a BuildForward occupation mapping are marked unavailable and ordered by expected gap alone. An occupation's share of online offerings is not a measured skill-demand percentage; see [docs/market-data.md](docs/market-data.md).

For a short, reproducible walkthrough of the connected project-reuse, market-priority, and action-scenario flow, see [docs/golden-demo.md](docs/golden-demo.md).
For the specific noise, missing-data, and outlier checks and their limits, see [docs/model-robustness.md](docs/model-robustness.md).
For a visual explanation of how the three pages connect, open [docs/buildforward-explainer.html](docs/buildforward-explainer.html).

The interface has three focused work areas: **Project Reuse Check**, **Graduation Skills Forecast**, and **Data Sources**. See [DESIGN.md](DESIGN.md) for the interaction and scope rules.

The sample scenario assumes a 70% skill-coverage target and a 22-point gain for each future module that targets a skill. The slider adds an editable hypothetical gain to one skill. All three figures are demonstration assumptions, **not observed effects**.

## Importing real material

1. Candidate summaries are tracked in `data/candidates/`. The OODJ reference and CT077-3-2-DSTR brief remain separate from the user-labeled five-semester sequence. Software Testing and Data Structure have user-reviewed minimum project-reuse skills; Capstone and other candidate modules still lack required-skill maps. Fresh databases receive these review-only records automatically.
2. Open **Data Sources**. Review each candidate summary and consult the original coursework locally if available. Confirm only after educator review. The API equivalent is `POST /api/v1/programmes/{id}/confirm`.
3. In Data Sources, inspect the supplied OODJ repository evidence or analyze a public GitHub repository / ZIP. Review extracted evidence and confirm it only after human review.
4. If actual student-intake skill coverage is available, import it through the existing `POST /api/v1/cohorts/import` endpoint, review, and confirm. Otherwise, keep the student intake labelled as simulated.

Imported candidates are blocked from prediction until reviewed. An unknown required-skill map is distinct from an explicitly reviewed empty map; a programme with unknown maps cannot be confirmed for prediction. The two user-reviewed project-reuse criteria do not verify an official programme sequence or establish institutional prerequisites. The OODJ assignment and public repo are a separate coursework example; their relationship to the five-module sequence needs educator confirmation. Static repository inspection never runs uploaded code and skips data folders, database files, CSV/JSONL, environment files, and arbitrary text files.

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
