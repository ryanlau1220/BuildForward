# Imported source candidates

These JSON files normalize user-provided material for review. They are candidate summaries, not verified institutional curriculum records. Learning outcomes and assignment descriptions are concise paraphrases; the original briefs remain in `data/materials/`.

## Five supplied materials

`apu-curriculum-candidate.json` maps one uploaded file to each filename semester:

- Semester 1: `Sem 1_Introduction to Visual and Interactive Programming.pdf`
- Semester 2: `Sem 2_Database Management.docx`
- Semester 3: `Sem 3_Programming with Python.pdf`
- Semester 4: `Sem 4_Responsive Web Design and Development.pdf`
- Semester 5: `Sem 5_Capstone Project.docx`

The user confirms the Semester 1–5 labels are the intended order for this five-file sequence, and the prototype uses that order. The Semester 1 brief identifies itself as Diploma coursework, so the sequence remains a user-provided candidate rather than an officially verified programme specification. No prerequisite sequence was supplied; prerequisites are intentionally left empty. Competency tags are provisional mappings for educator review, not verbatim module outcomes.

## Degree reference: OODJ followed by Software Testing

`oodj-coursework-candidate.json` summarizes the user-provided OODJ and Software Testing briefs in the order requested by the user. The software-testing brief is treated as the latest material and has no submission. The semester relationship and programme alignment are not independently verified; these modules stay in a separate candidate programme. The supplied Software Testing brief gives a November 2, 2026 submission date.

The public repository `https://github.com/jasonwong1025/oodj-apuasc` was scanned as source code only; data folders, environment files, database files, CSV/JSONL and arbitrary text files were excluded. The OODJ report is also summarized for review. Its project record is linked to the OODJ module candidate, and both remain unconfirmed.

## User-supplied project reports

`submission-projects-candidate.json` summarizes the five supplied reports matching the Semester 1–5 materials. Project labels and competency evidence are paraphrased from the reports. The original DOCX files contain personal information and are excluded from Git; no student names or IDs are copied into this metadata. Report content is not source code: these candidates have zero repository files scanned, and no code was run. All remain `EXTRACTED_CANDIDATE` until an educator reviews them.

## Confirmation boundary

Both programme records, the repository project and six report-derived project records are registered in the local API as `EXTRACTED_CANDIDATE`. An educator should inspect the source summaries, mappings and project/module relationship in Sources before confirming. A confirmed module does not provide cohort coverage; no real cohort data has been supplied.
