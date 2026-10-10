# Imported source candidates

These JSON files normalize user-provided material for review. They are candidate summaries, not verified institutional curriculum records. Learning outcomes and assignment descriptions are concise paraphrases; the original briefs remain in `data/materials/` and the user's supplied OODJ PDF location.

## Five supplied materials

`apu-curriculum-candidate.json` maps one uploaded file to each filename semester:

- Semester 1: `Sem 1_Introduction to Visual and Interactive Programming.pdf`
- Semester 2: `Sem 2_Database Management.docx`
- Semester 3: `Sem 3_Programming with Python.pdf`
- Semester 4: `Sem 4_Responsive Web Design and Development.pdf`
- Semester 5: `Sem 5_Capstone Project.docx`

The Semester 1 brief identifies itself as Diploma coursework. No complete programme specification or prerequisite sequence was supplied, so this five-file collection must not be treated as a verified single-programme curriculum. Prerequisites are intentionally left empty. Competency tags are provisional mappings for educator review, not verbatim module outcomes.

## Separate OODJ example

`oodj-coursework-candidate.json` summarizes the user-provided Object Oriented Development with Java assignment brief. The public repository `https://github.com/jasonwong1025/oodj-apuasc` was scanned as source code only; data folders, environment files, database files, CSV/JSONL and arbitrary text files were excluded. Its project record is linked to the OODJ module candidate, and both remain unconfirmed.

The brief and repository are kept separate from the five uploaded files. The brief is identified in its supplied path as Degree Semester 1 coursework; that differs from the Diploma Semester 1 source above. No relationship between those programmes is asserted.

## Confirmation boundary

Both programme records and the repository project are registered in the local API as `EXTRACTED_CANDIDATE`. An educator should inspect the source files, mappings and project/module relationship in the Sources and Evidence views before confirming. A confirmed module does not provide cohort coverage; no real cohort data has been supplied.
