# Model and repository robustness review

This review records concrete behavior of the current static analyzer and Project Reuse Check model. It is a focused proof-of-concept evaluation, not a measured real-world false-alarm rate. The real project-module set has 15 candidates and zero human-reviewed labels, so false positives and false negatives on real reuse decisions cannot yet be estimated.

## Scenarios checked

| Scenario | Test input | Observed behavior | Evidence |
| --- | --- | --- | --- |
| Clean project | Supported source files with recognizable structures and a conventional test directory | Detects languages and supported skills from source evidence; the sample project's runtime check returns the model decision alongside matched/missing skills and evidence paths | `services/api/tests/test_flow.py::test_sample_predictions_are_explained_and_scenario_is_labelled`; `test_repository_analysis_recognizes_cpp_headers_and_conventional_tests_only` |
| Noisy repository | `.env`, CSV data, arbitrary notes, an unknown extension, and files under ignored data paths | Sensitive/data files are not used as evidence; ordinary prose and unknown source types do not create skills | `services/api/tests/test_flow.py::test_archive_limits_and_unfamiliar_text_do_not_create_false_competencies`; `test_repository_analysis_skips_data_files_and_scans_source_only` |
| Sparse project | No supported files or evidence | The analyzer returns zero scanned files and no inferred competencies; the model still emits a class with zero evidence counts and requires human review | `services/api/tests/test_flow.py::test_sparse_project_emits_a_low_evidence_signal_without_probability_claim` |
| Unfamiliar file types | Unsupported file containing phrases such as “continuous integration” | No known competency is inferred from the prose | `test_archive_limits_and_unfamiliar_text_do_not_create_false_competencies` |
| Missing required-skill map | Candidate module omits `required_competencies` | API reports `UNKNOWN`; programme confirmation and prediction are blocked until the map is supplied or an explicit empty list is reviewed | `services/api/tests/test_flow.py::test_unknown_prerequisite_mapping_cannot_be_confirmed_as_no_requirements` |
| Explicitly no required skills | Reviewed module sends `required_competencies: []` | The map is distinct from unknown and yields 100% prerequisite coverage by definition | `test_imported_curriculum_and_cohort_are_blocked_until_reviewed`; `ml/tests/test_prepare_real_validation.py::test_explicitly_empty_prerequisite_map_is_full_coverage` |

## Outlier sensitivity

The synthetic training generator uses `evidence_count` from 1–8 and `files_scanned` from 0 or 8–120. Its authored labels depend on prerequisite coverage, reuse-signal count, and whether evidence is absent; they do not depend on target overlap or file count. The runtime classifier nevertheless uses all five features.

I compared predictions for all 100 combinations of coverage `{0, 0.25, 0.5, 0.75, 1}`, reuse-signal count `{0, 1, 2, 3}`, and target overlap `{0, 0.25, 0.5, 0.75, 1}`. Each ordinary input used `evidence_count=1` and `files_scanned=8`; its paired outlier input used `2000` for both counts. The classifier changed its result in **7 of 100** comparisons. For example, `(coverage=0, reuse=1, overlap=0.5)` changed from `PARTIAL_REUSE` to `RESET`.

This confirms that out-of-training-range counts can affect decisions. It does not establish that normal repositories cause false alarms. Repository extraction limits cap scanned files, while `evidence_count` is the number of detected evidence items; future changes to extraction or seeded metadata should keep those inputs within the training ranges or trigger a reviewed model update. No anomaly detector or calibrated confidence threshold is implemented.

## Interpretation limits

- A prediction is a class label, not a probability. The Random Forest is not calibrated.
- Synthetic holdout and grouped cross-validation measure agreement with authored synthetic scenarios, not transfer accuracy.
- “Low false alarms” is not currently a supportable claim: no real labels have been reviewed.
- Missing prerequisite data is blocked rather than imputed. An explicit empty requirement list is accepted only as a reviewed assertion.
- Static repository evidence does not prove code quality, successful tests, student proficiency, project ownership, or educational suitability.
- Human review remains required before acting on a prediction.

## Reproduction

Run the API tests and ML tests described in [`ml/README.md`](../ml/README.md). The outlier comparison is also asserted against the deployed model artifact by the API robustness test. Regenerate the synthetic dataset and model only through the documented ML training workflow; real candidate labels must remain separate and human-authored.
