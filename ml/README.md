# Project Reuse Check model and real-project review set

The API loads `services/api/artifacts/continuity.joblib` for Project Reuse Check inference. The current model is trained on **72 synthetic rubric scenarios grouped into 12 synthetic project anchors**. These are not observed submissions or lecturer-reviewed outcomes. The grouped holdout and rule-based baseline measure agreement with the authored scenario rubric; they do not establish institutional predictive validity.

## Reproduce the current artifact

From the repository root:

```bash
uv sync --project ml --locked
uv run --project ml python ml/training/generate_synthetic_scenarios.py
uv run --project ml python ml/training/train_continuity.py \
  ml/datasets/continuity_pairs.synthetic.csv services/api/artifacts \
  --external-validation ml/datasets/continuity_pairs.real.csv
```

The synthetic generator keeps project-level evidence and file counts fixed within each anchor while varying pair-level features. Its labels come from `synthetic_rubric_v1`. The trainer compares logistic regression and random forest, chooses by 3-fold `GroupKFold` inside the training partition, and reserves a project-grouped holdout for reporting. It reports macro-F1, per-class metrics, confusion matrix, baseline comparison, split groups, label sources, and dataset hash.

The selected estimator is refit on the synthetic scenarios. The real-project CSV is evaluated separately and is never mixed into synthetic training or used for model selection. The current real set has no reviewed labels, so the model artifact reports its candidate/reviewed counts and leaves the real metric unavailable.

## Current real-project review set

`datasets/real_validation_manifest.json` records six repositories and two supplied future-module candidates: Software Testing and Capstone Project. `datasets/continuity_pairs.real.csv` contains the 12 resulting project-module candidates. Their labels are empty by design. Project origins are recorded with uncertainty where the repository README or supplied brief does not establish the context. Hackathon projects can be useful technical evidence, but they must be identified as hackathon projects and should not be presented as university submissions.

The CSV contains computed analyzer evidence (reuse-signal count, target overlap, evidence count, files scanned, and detected skills). The two candidate module definitions have no prerequisite competency map, so `prerequisite_coverage` is blank; it must not be read as 100%. A row is not ready for real-data scoring until its module pairing is reviewed, required skills are mapped, and the missing feature is computed.

To regenerate feature rows, make local checkouts under a directory named by each manifest project ID, for example `repositories/oodj-apuasc/`. Then run:

```bash
uv run --project ml python ml/training/prepare_real_validation.py \
  --repositories /path/to/repositories
```

The preparation script reads only source files and supported build metadata accepted by the API analyzer. It does not read database, upload, CSV/JSONL, environment, or arbitrary text files, and does not execute repository code. Keep downloaded repositories outside Git; `/data/validation/repositories/` is ignored.

## Human review and labels

Review each project-module pair independently. Check that the module is genuinely a plausible future learning context for the project, inspect its supplied brief, confirm the prerequisite mapping, then assign exactly one label and record the reviewer/source in `label_source` and the rationale in `review_notes`:

- `CONTINUE`: key prerequisites and project structure support meaningful extension aligned with the module’s learning goals.
- `PARTIAL_REUSE`: useful parts carry forward, but important gaps or changes remain.
- `RESET`: prerequisites or project fit are insufficient, or reuse would undermine the learning goals.

Do not label a pair from the analyzer output or current heuristic alone. If there are enough complete human-reviewed rows for a real training experiment, copy them into a distinct dataset with `anchor_project_id` equal to `project_id` for every pair from the same repository. Never split pairs from one project across train and holdout. The existing trainer requires at least 30 training rows, at least three project groups, and all three labels in each grouped partition. If that threshold is not met, retain synthetic training and use reviewed real pairs only for separate descriptive evaluation.

Run API and ML tests with:

```bash
cd services/api && uv run pytest -q && uv run ruff check app tests
cd ../../ml && uv run pytest -q && uv run ruff check training tests
```
