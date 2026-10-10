# Golden demo scenario

Use the default **illustrative sample** to show one decision path through the Project Reuse Check and Graduation Skills Forecast. The sample contains an assumed OOP record-management project, a future Software Testing module, and a simulated student intake. It is not a real student's submission or an institutional student batch.

## Walkthrough

1. Start in **Graduation Skills Forecast**. The first market-supported gap is **Unit Testing**: current skill coverage is 18%, expected coverage at graduation is 40%, and the gap to the illustrative 70% target is 30 points. Two of six selected ILMIA role profiles list a related testing skill (33%). This is role-profile coverage, not a share of Malaysian job ads.
2. Explain the ordering score: `0.30 × 0.333 × 0.5 = 0.050`. The `0.5` factor represents one remaining future learning opportunity. The score helps order skills for review; it is not a probability. Skills without a mapped market signal are labeled **Gap only**.
3. Open **Project Reuse Check** and keep **Software Testing · Semester 2** selected. The illustrative project assumes reusable object-oriented code, modular structure, persistence, and testable business logic. Run the check to show **CONTINUE**, the five model inputs, supporting evidence, simple baseline, and synthetic-scenario limitation. The default workspace also loads this result before interaction; pressing the button runs a fresh check. Its 1.00 rubric holdout score is not real-world validation. “Project files recorded: 0” is sample metadata, not a repository scan result.
4. Return to **Graduation Skills Forecast**. Keep **Unit Testing** selected and the assumed gain at **+18 percentage points**, then update the forecast scenario. The illustrative skill gap changes from 30% to 12%. Describe this as a hypothetical action scenario, not an observed effect or a system recommendation.
5. Close with the educator decision: consider whether a later module could meaningfully reuse and extend the existing project. BuildForward presents evidence and a scenario; educators decide whether reuse is appropriate.

## Presenter preflight

- Start the API and web app using the commands in [README.md](../README.md), then open a fresh browser session to avoid prior workspace selections.
- Confirm the header shows **Software Engineering pathway — illustrative sample**, **Simulated Student Intake A**, and **Record management application — illustrative sample**.
- Confirm **Graduation Skills Forecast** opens first, the first ranked gap is **Unit Testing**, and the market signal reads 33% from 2 of 6 profiles.
- Run the Project Reuse Check once and check for **CONTINUE**. Return to the forecast and recalculate the +18-point scenario; verify the gap changes from 30% to 12%.
- The user-supplied coursework reports and degree materials are review candidates; they are not the active pitch dataset. The live three-minute demo uses the labeled illustrative project and simulated student intake.
- Keep both local servers running during the pitch. The demo prediction and market data are local; the walkthrough does not depend on live extraction or network calls.

## Keep the story accurate

- The programme, project evidence, and student-intake values are illustrative or simulated.
- Project Reuse Check training labels are synthetic and generated from the same rubric used in evaluation.
- The ILMIA role-profile skill material cites Q1 2024 and samples six selected roles. See [market-data.md](market-data.md) for profiles, mappings, and limits.
- The 70% target, 22-point per-module coverage gain, and +18-point action gain are demo assumptions.
- Do not claim that CI/CD has 46% demand or that the market dataset measures all Malaysian software job advertisements.
