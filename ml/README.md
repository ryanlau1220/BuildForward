# Continuity model training

The live API currently uses an explained heuristic baseline. No supervised model has been trained because real anchor projects and independently reviewed project-module labels have not yet been supplied.

When labelled pairs are available, fill `datasets/continuity_pairs.template.csv`. Each controlled variant must retain its real project's `anchor_project_id`. Record whether a label came from a lecturer, a reviewed rubric, or a synthetic scenario.

```bash
cd ml
uv sync
uv run python training/train_continuity.py datasets/continuity_pairs.csv evaluation/run-001
```

Training compares logistic regression and a small random forest on a group-held-out split. It writes the selected model and metrics. The API will continue using the heuristic until a trained model has been reviewed and explicitly integrated. A high score on rubric-generated labels only shows agreement with that rubric.
