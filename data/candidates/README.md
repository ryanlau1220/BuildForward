# Review-only source candidates

The JSON files in this directory contain paraphrased, normalized summaries used by the API seed and the real-project review workflow. They are extracted candidates, not verified curriculum facts. The raw coursework and project report files are local-only and are not included in Git or Docker images.

## Curriculum candidates

- `apu-curriculum-candidate.json`: five user-labeled Semester 1–5 briefs. The first brief identifies itself as Diploma coursework, so the sequence is not represented as an official degree pathway.
- `oodj-coursework-candidate.json`: separate OODJ and Software Testing references. The user supplied this order; module and programme alignment remain unverified. The Software Testing brief has no supplied submission. The user reviewed `testable-code` as the minimum project-reuse requirement; test design and tool selection are module outcomes. Whether its fixed ShopEasy case study permits a previous project remains unconfirmed.
- `degree-sem2-data-structure.json`: the user-provided 2602 CT077-3-2-DSTR brief, labeled Degree Semester 2 by the user. The user reviewed `cpp-programming` as the minimum project-reuse requirement. Its target skills, including complexity analysis, are provisional mappings from assignment tasks.
- The Capstone candidate in `apu-curriculum-candidate.json` still has an unknown required-skill map. Substantive business logic must be inspected during human pair review rather than inferred by the static analyzer. The brief calls for a system hierarchy chart and design diagrams, including DFDs and an ERD; it does not specify UML diagrams.

## Project candidates

- `oodj-project-candidate.json`: OODJ report and repository evidence, awaiting review.
- `submission-projects-candidate.json`: five report summaries for the five-file sequence. They are report-derived descriptions; code was not scanned or executed.

Curriculum records are seeded as `EXTRACTED_CANDIDATE`. A `null` `required_competencies` value means the mapping is unknown; an empty list means a reviewer explicitly confirmed that no required skills are defined. Unknown mappings block prediction and programme confirmation. User-reviewed project-reuse criteria are not official module entry requirements. Review module relationships and project ownership before treating these records as verified facts or assigning real validation labels. No student names or IDs are included in these summaries.
