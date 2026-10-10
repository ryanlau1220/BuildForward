# Golden demo scenario

Use the default **illustrative sample** to show one decision path across the two predictive features. The sample describes an assumed OOP record-management project, the next Software Testing module, and a simulated cohort. It is not a real student's submission or institutional cohort.

## Walkthrough

1. Start in **Cohort outlook**. The first market-supported gap is **Unit Testing**: 18% current coverage, 40% projected by graduation, and a 30-point gap to the illustrative 70% target. Two of the six selected ILMIA role profiles list a mapped testing skill (33%). This is role-profile coverage, not a share of Malaysian job ads.
2. Explain the ordering score: `0.30 × 0.333 × 0.5 = 0.050`, where `0.5` is the runway factor for one remaining module opportunity. It is an ordinal planning aid, not a probability. Competencies without a mapped market signal are labeled **Gap only**.
3. Open **Project continuity** and keep **Software Testing · Semester 2** selected. The illustrative project assumes reusable object-oriented code, modular structure, persistence and testable business logic. Run the comparison to show the trained classifier’s **CONTINUE** result, the five input values, supporting evidence, heuristic baseline and synthetic-rubric limitation. The default workspace also loads this result before interaction; pressing the button demonstrates a fresh inference. Its 1.00 rubric holdout score is not real-world validation. “File-count input: 0” is sample metadata, not a repository scan result.
4. Return to **Cohort outlook**. Keep **Unit Testing** selected and the assumed gain at **+18 percentage points**, then recalculate. The illustrative gap changes from 30% to 12%. Describe this as a hypothetical scenario, not an observed intervention effect or an automatic recommendation.
5. Close with the educator decision: consider whether a later assessment should extend and test prior project work. BuildForward presents evidence and a scenario; educators decide whether reuse is pedagogically appropriate.

## Presenter preflight

- Start the API and web app using the commands in [README.md](../README.md), then open a fresh browser session to remove uncertainty from prior workspace selections.
- Confirm the header shows **Software Engineering pathway — illustrative sample**, **Simulated cohort A**, and **Record management application — illustrative sample**.
- Confirm **Cohort outlook** opens first, the first ranked gap is **Unit Testing**, and the market signal reads 33% from 2 of 6 profiles.
- Run the continuity comparison once and check for **CONTINUE**. Return to **Cohort outlook** and recalculate the +18-point scenario; verify the result is 30% to 12%.
- The user-supplied coursework reports and degree materials are review candidates; they are not the active pitch dataset. The live three-minute demo uses the labeled illustrative project and simulated cohort.
- Keep both local servers running during the pitch. The demo prediction and market data are local; the walkthrough does not depend on live extraction or network calls.

## Keep the story accurate

- The programme, project evidence, and cohort values are illustrative or simulated.
- Continuity training labels are synthetic and generated from the same rubric used in evaluation.
- The ILMIA role-profile skill material cites Q1 2024 and samples six selected roles. See [market-data.md](market-data.md) for profiles, mappings, and limits.
- The 70% target, 22-point per-module coverage gain, and +18-point intervention gain are demo assumptions.
- Do not claim that CI/CD has 46% demand or that the market dataset measures all Malaysian software job advertisements.
