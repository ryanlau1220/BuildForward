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

The selected estimator is refit on the synthetic scenarios. The real-project CSV is evaluated separately and is never mixed into synthetic training or used for model selection. The current real set has no reviewed labels, so the model artifact reports its candidate/reviewed counts and leaves the external metric unavailable. A future metric against hypothetical human judgments would measure reviewer agreement, not observed student reuse outcomes.

## Current real-project review set

`datasets/real_validation_manifest.json` records the five repositories selected by the user and three module candidates: Software Testing, Capstone Project, and Degree Semester 2 Data Structure (CT077-3-2-DSTR). `datasets/continuity_pairs.real.csv` contains 15 hypothetical project-to-future-module fit checks across different intakes. The repositories are real, but the pairings are not observed student progressions or evidence that an assignment permits project substitution. The full matrix broadens review coverage; it does not claim every pairing is suitable. Labels are empty by design, and each row calls for confirmation of module fit, intake context, ownership/reuse permission, and educational value. Project origins retain uncertainty where sources do not establish context.

The CSV contains computed analyzer evidence (required-skill coverage, reuse-signal count, target overlap, evidence count, files scanned, and detected skills). The user reviewed `testable-code` as the minimum requirement for reusing a project in Software Testing and `cpp-programming` for Data Structure. These are project-reuse criteria, not official module entry requirements. Capstone has no approved automatic required-skill map: its coverage remains blank, and substantive business logic must be inspected manually. An unknown map is not treated as 100%; an explicitly reviewed empty requirement list means no required skills and yields 100%. The module target skills remain provisional mappings from the supplied briefs and should be checked by a subject educator. A row is not ready for real-data scoring until its module pairing and educational fit are reviewed and any missing feature is resolved.

To regenerate feature rows, make local checkouts under a directory named by each manifest project ID, for example `repositories/oodj-apuasc/`. Then run:

```bash
uv run --project ml python ml/training/prepare_real_validation.py \
  --repositories /path/to/repositories
```

The preparation script reads only source files and supported build metadata accepted by the API analyzer. It does not read database, upload, CSV/JSONL, environment, or arbitrary text files, and does not execute repository code. Keep downloaded repositories outside Git; `/data/validation/repositories/` is ignored.

## Human review and labels

Review each project-module pair independently as a hypothetical fit judgment. Check that the module is genuinely a plausible future learning context for the project, inspect its supplied brief, and confirm the required-skill map. For an eligible pair, assign exactly one label and record the reviewer/source in `label_source` and the rationale in `review_notes`. If the project is already a submission for that module, leave its reuse label blank and record why the comparison is ineligible. The Software Testing brief's ShopEasy case study does not establish permission to use an earlier project; that permission remains unknown, so a hypothetical fit label must not imply actual assignment permission. For Capstone, inspect substantive business logic and suitability for the documented system hierarchy and design diagrams; the brief names DFDs and an ERD, not UML. For Data Structure, confirm the project's fit with the specified C++ patient-record assignment. The Data Structure repository and NextGen Fitness capstone appear to be submissions for their matching modules, so do not treat either as a prior project being carried into that same module without evidence of an earlier version.

Use these labels:

- `CONTINUE`: key prerequisites and project structure support meaningful extension aligned with the module’s learning goals.
- `PARTIAL_REUSE`: useful parts carry forward, but important gaps or changes remain.
- `RESET`: prerequisites or project fit are insufficient, or reuse would undermine the learning goals.

Do not label a pair from the analyzer output or current heuristic alone. If there are enough complete human-reviewed rows for a real training experiment, copy them into a distinct dataset with `anchor_project_id` equal to `project_id` for every pair from the same repository. Never split pairs from one project across train and holdout. The existing trainer requires at least 30 training rows, at least three project groups, and all three labels in each grouped partition. If that threshold is not met, retain synthetic training and use reviewed real pairs only for separate descriptive evaluation.

Run API and ML tests with:

```bash
cd services/api && uv run pytest -q && uv run ruff check app tests
cd ../../ml && uv run pytest -q && uv run ruff check training tests
```
