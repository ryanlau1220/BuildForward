# BuildForward Interface Design

## Product intent

BuildForward is a student learning decision-support tool for programme leaders and lecturers. Its interface helps educators review two related questions:

1. Can an existing student project be meaningfully reused and extended in a future module?
2. Which skills may remain under-covered by graduation, and how might a possible action change the forecast under stated assumptions?

The product presents evidence and projections for human review. It does not make academic decisions or change curriculum, assignments, student records, or LMS content.

## Information architecture

The application opens directly into the working interface. It is not a marketing site, pitch deck, LMS, or general analytics dashboard.

- **Project Reuse Check** — compare an existing student project with a selected future module; inspect project evidence, learning outcomes, prerequisites, missing skills, the trained model’s reuse decision, and its simple baseline.
- **Graduation Skills Forecast** — review a student intake’s expected skill coverage at graduation, ranked with a small DOSM/ILMIA role-profile signal where mapped, and explore a possible action using an explicit assumed gain.
- **Data Sources** — review coursework candidates, inspect project evidence, import a public GitHub repository or ZIP, and confirm extracted information.

A **student intake** is a group or batch of students progressing through the programme together. It is not a semester. Programme, student-intake, and project selectors stay available in the workspace header. Keep navigation limited to these work areas. Add a new area only when it directly supports a core decision or its evidence.

## Visual direction

Use a restrained academic analysis workbench: compact application navigation, clear section hierarchy, data-first panels, readable evidence lists, and understated green accents. Use color to communicate provenance, priority, and decision state. Avoid oversized promotional headlines, hero sections, decorative storytelling, generic KPI cards, and presentation-like layouts.

Current CSS tokens live in `apps/web/src/app/globals.css`. Preserve the existing token approach and keep small text readable. Prefer semantic HTML and native form controls over custom widgets. Interactive controls must retain visible keyboard focus and comfortable touch targets.

## Evidence, provenance, and uncertainty

- Keep extracted curriculum and project sources visibly marked as candidates until a person reviews and confirms them.
- A confirmation records that source details were reviewed; it does not prove programme alignment, project quality, successful tests, or individual proficiency.
- Keep Degree OODJ material separate from the five Semester 1–5 briefs unless a person verifies their programme relationship. The Semester 1 visual programming brief identifies Diploma coursework.
- Do not imply the five briefs form a verified curriculum sequence. Their semester labels are source context only; prerequisites and mappings remain provisional until verified.
- Keep simulated student-intake data, sample programme data, synthetic project-reuse training labels, and DOSM/ILMIA market-data scope visibly labelled. Show market-data age, selected profile coverage, and missing signals near results. Forecast assumptions and the illustrative target must remain legible near results.
- Show project evidence and reasons alongside reuse decisions. Display the model's training provenance, grouped holdout metric, and baseline. Never present model output or scores as calibrated probability.
- Recommended-action comparisons are user-set scenarios, not observed impact or validated recommendations. The educator remains responsible for the decision.

## Interaction and states

- The selected programme, student intake, and project determine the active workspace; changing them takes effect after an explicit load action.
- Changing the future module clears the previous project-reuse result until the new check runs.
- Keep loading, unavailable-data, empty, success, and error states understandable and recoverable.
- Use real buttons, links, labels, selects, and file inputs. Provide visible focus, status announcements for updated results, and reduced-motion support.
- At narrow widths, preserve the same tasks and evidence; stack panels and keep navigation reachable without horizontal page overflow.

## Out of scope for the hackathon interface

Do not add a general dashboard, user accounts, settings, LMS administration, curriculum editing, assignment generation, automated academic decisions, or unsupported claims about model validity. Prioritize one complete educator workflow and the evidence needed to trust its limits.
