# Continuity model training

The API loads `services/api/artifacts/continuity.joblib` at startup and uses it for continuity decisions. The checked-in artifact is a proof-of-concept trained on **72 synthetic rubric scenarios grouped into 12 synthetic anchor IDs**. These are not observed student submissions or lecturer-reviewed outcomes. The model reproduces a declared rubric; it does not establish institutional predictive validity.

## Reproduce the demo artifact

From the repository root:

```bash
uv sync --project ml --locked
uv run --project ml python ml/training/generate_synthetic_scenarios.py
uv run --project ml python ml/training/train_continuity.py \
  ml/datasets/continuity_pairs.synthetic.csv services/api/artifacts
```

The generator keeps project-level evidence count and scanned-file count fixed within each anchor group, while creating module-pair scenarios with different prerequisite coverage and reuse signals. Labels come from the explicit synthetic rubric in the generator and are recorded as `synthetic_rubric_v1`.

The trainer compares logistic regression and random forest. It uses 3-fold `GroupKFold` within the training partition to choose a model, then reports one grouped holdout evaluation. It also reports the heuristic-rubric baseline. The selected estimator is refit on all 72 scenarios for runtime inference. `metrics.json` records the dataset hash, label sources, group split, macro-F1, classification report, confusion matrix, and claim limit.

The current holdout macro-F1 and the rubric baseline both score 1.00 because the synthetic labels are generated from that same rubric. That is an implementation check, not evidence that either method predicts real educational outcomes. The UI calls out this limitation alongside the model result.

## Replace synthetic scenarios with reviewed pairs

Use `datasets/continuity_pairs.template.csv` for reviewed examples. Keep all controlled variants of one real project under the same `anchor_project_id`; otherwise related work can leak across the evaluation split. Record the label source for every row and do not combine lecturer labels, rubric labels, and synthetic labels without preserving their provenance. The trainer requires at least 30 pairs, three anchor groups, and all three classes in both grouped partitions. Review metrics and label quality before presenting a new artifact as anything beyond a proof of concept.
