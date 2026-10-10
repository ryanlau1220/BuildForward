# BuildForward — Project Handoff

## Current Status — 10 October 2026

The concept, Track 1 positioning, data strategy, and application proof of concept are implemented. This workspace contains five supplied coursework briefs labeled Semesters 1–5 in `data/materials/`, a normalized material candidate in `data/imports/apu-curriculum-candidate.json`, and a separate OODJ assignment brief plus the user-provided public repository `jasonwong1025/oodj-apuasc`. Startup seeding registers these sources as `EXTRACTED_CANDIDATE`; they are reviewable but blocked from prediction until confirmed. The five files are not verified as one programme sequence: the Semester 1 visual programming brief identifies Diploma coursework, while the OODJ brief is identified as Degree Semester 1 in its supplied path. No real cohort data or market evidence has been provided. The decision walkthrough therefore uses an explicitly illustrative pathway and simulated cohort values by default.

The event slides require a public GitHub repository, a deployed application, and a PDF presentation for submission. The local Phase 1 pitch is three minutes plus two minutes of questions. Keep the demo focused on one complete decision flow. Frontend package management uses pnpm 10.32.1.

### Implementation checkpoint

- A focused Next.js workbench and FastAPI service are implemented locally. The interface has three task areas: Project continuity, Cohort outlook, and Sources. The active programme, cohort, and project remain available in the workspace header. Source candidates retain explicit review and confirmation gates.
- The user clarified the hackathon scope: support the key end-to-end decisions without building a broad platform. The previous presentation-like walkthrough has been refactored into a compact, task-oriented academic workbench. It avoids a general dashboard and marketing-style hero. See `DESIGN.md` for the interface rules and claim boundaries.
- Scalar now serves the interactive API reference at `/docs`; `/openapi.json` remains available, and the default Swagger UI and ReDoc routes are disabled. Scalar telemetry and its optional agent are disabled.
- Repository analysis is static and excludes data directories, database files, environment files, CSV/JSONL and arbitrary text. The supplied Java repository currently yields four candidate signals across 98 Java source files; tests and code were not executed.
- `data/imports/` contains normalized candidates and source mapping notes. The local API seeds them on startup as `EXTRACTED_CANDIDATE` so a fresh database retains the review workflow.
- Verified: API tests (8 passed), Ruff, frontend typecheck and production build. Chromium checks exercised continuity comparison, cohort scenario recalculation, navigation across all work areas, and layouts at 1280/768/375 px with no page overflow or JavaScript exceptions. The mobile screenshot review prompted a final three-column navigation adjustment. Scalar is included in the API dependency lock. The npm registry TLS failure was resolved after reinstalling Ubuntu's `ca-certificates` package and running `update-ca-certificates`; no certificate file was generated and TLS verification remains enabled. pnpm reported that it ignored sharp's build script; the frontend production build nevertheless completed successfully.

### Next source decision

Before treating the five uploaded briefs as a single curriculum, ask the user to confirm programme alignment. The Semester 1 visual-programming brief identifies Diploma coursework, while the OODJ brief is from a Degree Semester 1 folder. Both candidate sets remain unconfirmed in the application.

---

## 1. Project Summary

**BuildForward** is a predictive curriculum-intelligence platform for university Software Engineering programmes.

Its core premise is:

> **Students keep learning forward, but their projects often reset to zero.**

University learning is usually organised as a sequence of modules and prerequisites, yet student project work is often treated as disposable assessment output. Assignments are submitted, graded, and abandoned even when later modules depend on earlier knowledge.

BuildForward analyses previous assignments and student project artifacts, maps demonstrated competencies to upcoming modules, predicts whether existing projects should be continued or partially reused, and forecasts cohort-level competency gaps before graduation.

The system is designed as a **decision-support platform** for programme leaders and lecturers.

It does **not** autonomously modify curricula, assignments, LMS content, or student records.

---

## 2. Hackathon Track

**Track:** Predictive Model — *Predict Early, Decide Better*

BuildForward must remain clearly aligned with this track.

The project should not become:
- a generic AI assistant;
- an autonomous agent platform;
- a material generator;
- a curriculum chatbot;
- an LMS replacement;
- a general market-trend dashboard;
- an auto-execution workflow.

The predictive components are central:

### 2.1 Project Continuity Prediction

Predict whether a previous student project should be:

```text
CONTINUE
PARTIAL_REUSE
RESET
```

for a specific upcoming module.

### 2.2 Cohort Competency Gap Forecast

Predict what competencies a cohort is likely to still lack by graduation, given:
- completed modules;
- demonstrated project competencies;
- remaining curriculum;
- prerequisite structure;
- expected future learning;
- relevant market competency signals.

The key track narrative is:

> **Predict problems early enough that programme leaders can make better curriculum decisions before students graduate.**

---

## 3. Problem Statement

University learning is sequential, but practical project work is often fragmented.

Students may complete modules such as:
- Object-Oriented Programming;
- Database;
- Software Testing;
- Web Development;
- DevOps;
- Cloud;

yet each module may introduce a new isolated assignment from scratch.

This creates several problems:
- students repeatedly create throw-away coursework;
- practical learning does not accumulate into progressively more realistic engineering work;
- students gain limited experience with software maintenance, refactoring, migration, testing existing code, deployment, observability, and long-term architectural evolution;
- lecturers often lack visibility into what students actually built in previous modules;
- programme leaders lack a reliable view of the competencies an intake has truly accumulated;
- competency gaps may only become obvious near graduation.

A prerequisite graph can show:

```text
Module A → Module B
```

but it does not tell lecturers whether the **actual student artifacts** from Module A can meaningfully support Module B.

---

## 4. Product Philosophy

BuildForward should follow this principle:

> **Reuse when pedagogically valuable. Reset when pedagogically necessary.**

The product must not force one project to continue throughout an entire degree.

A project may need to reset because:
- architecture is unsuitable;
- module outcomes are unrelated;
- technology constraints differ;
- student group composition changes;
- prerequisite knowledge is insufficient;
- previous work quality is too low;
- assessment fairness would be affected.

BuildForward therefore predicts **continuity suitability**, not compulsory reuse.

---

## 5. Target Users

### Primary User
**Programme Leader**

Main question:

> “What will this intake actually know by graduation, and where should we intervene before it is too late?”

### Secondary User
**Lecturer / Module Leader**

Main questions:

> “What did these students actually build before entering my module?”

> “Can I reuse their previous project instead of making them start from zero?”

> “What is the lowest-friction way to evolve that project into my module’s learning outcomes?”

---

## 6. Core Product Flow

```text
Previous assignment briefs
+ student project artifacts
+ programme structure
+ module prerequisites
+ learning outcomes
+ demonstrated competencies
+ limited market signals
                ↓
        BuildForward Intelligence
                ↓
Project Continuity Prediction
+
Cohort Competency Gap Forecast
                ↓
Ranked Findings + Evidence + Recommended Intervention
                ↓
Projected Outcome Under Stated Assumptions
                ↓
Human Decision
```

The final decision always remains with:
- Programme Leader;
- Lecturer;
- Academic Committee.

BuildForward predicts and recommends. Humans approve and act.

---

## 7. Human-in-the-Loop Boundary

BuildForward must stop at:

```text
prediction
+
evidence
+
recommended intervention
```

It must **not** automatically:
- rewrite assignments;
- update LMS content;
- change programme structures;
- modify learning outcomes;
- publish new materials;
- notify students autonomously;
- alter grading workflows;
- create or execute curriculum changes.

Curriculum decisions involve pedagogy, accreditation, fairness, lecturer expertise, institutional policy, and academic governance.

Therefore:

> **BuildForward is predictive decision support, not autonomous execution.**

---

## 8. Core Product Capabilities

### 8.1 Curriculum Ingestion

Support:
- programme structure;
- semesters;
- modules;
- prerequisites;
- learning outcomes;
- assignment briefs.

MVP sources:
- CSV / JSON;
- PDF;
- DOCX;
- manual input.

Future sources:
- Moodle;
- Canvas;
- Blackboard;
- xAPI/LRS;
- LTI-enabled systems;
- university SIS/LMS APIs.

### 8.2 Student Project Artifact Analysis

Initial supported inputs:
- GitHub repository URL;
- ZIP archive;
- assignment report;
- optional lecturer feedback;
- optional rubric result.

Extract evidence such as:
- programming language;
- frameworks;
- architecture patterns;
- database usage;
- testing evidence;
- CI/CD evidence;
- deployment evidence;
- code organisation;
- project completeness;
- demonstrated competencies.

Prefer deterministic evidence where possible.

Examples:

```text
pom.xml contains JUnit
+ src/test exists
→ evidence of automated testing

Dockerfile exists
→ evidence of containerisation

GitHub Actions workflow runs tests
→ evidence of CI

Spring Boot dependencies present
→ evidence of backend framework usage
```

Do not rely on an LLM to guess evidence that can be derived deterministically.

### 8.3 Competency Model

Competencies must be represented independently from tools.

Example:

```text
Competency:
Automated Browser Testing

Possible Evidence:
- Playwright
- Cypress
- Selenium
```

Suggested conceptual model:

```text
Competency
- id
- canonical_name
- category
- description
- proficiency_level
- evidence_type
- prerequisites
```

Possible categories:
- programming;
- software architecture;
- database;
- testing;
- DevOps;
- cloud;
- security;
- observability;
- data/AI;
- collaboration / engineering process.

---

## 9. Predictive Model 1 — Project Continuity

For each pair:

```text
Student Project
        ×
Upcoming Module
```

predict:

```text
CONTINUE
PARTIAL_REUSE
RESET
```

Possible model features:

```text
competency_overlap
prerequisite_coverage
learning_outcome_similarity
technology_compatibility
architecture_reusability
artifact_completeness
project_complexity
testability
module_dependency_distance
missing_prerequisite_count
expected_reuse_value
```

Recommended initial models:

```text
Logistic Regression
Random Forest
LightGBM
```

Start simple. Do not use neural networks unless data volume and evidence justify them.

Expected output:

```json
{
  "decision": "CONTINUE",
  "reasons": [
    "Existing Java domain model is reusable",
    "Business logic is testable",
    "Software Testing prerequisites are satisfied"
  ],
  "missing": [
    "Automated build pipeline"
  ],
  "suggested_evolution": [
    "Add JUnit tests",
    "Add integration tests",
    "Add coverage reporting",
    "Run tests in CI"
  ]
}
```

Show a numeric confidence only after its meaning and calibration have been defined and evaluated. Otherwise show the decision, supporting evidence, missing evidence, and uncertainty in plain language. Do not mistake a model score for a validated probability.

---

## 10. Predictive Model 2 — Cohort Competency Gap Forecast

This is the strongest Track 1 differentiator.

Inputs:
- current cohort;
- completed modules;
- demonstrated competencies;
- upcoming modules;
- expected future competency acquisition;
- remaining semesters;
- market competency signals.

Output example:

```text
Projected graduation competency coverage

Backend Engineering: 82%
Testing:             68%
Cloud / DevOps:      41%
Security:            37%

Predicted Risk:
Cloud / DevOps competency gap = HIGH

Recommended Intervention:
Add containerisation + CI work
to an existing backend project
in a later module.
```

The percentages above are illustrative, not measured outcomes. The initial MVP forecasts coverage **by graduation**. Do not claim it predicts the semester when a gap will emerge unless intermediate-semester forecasting is implemented and evaluated.

Do not attempt to predict specific framework dominance.

Bad:

```text
"Playwright will dominate in 2029."
```

Better:

```text
"Automated end-to-end testing is likely
to remain under-covered for this cohort
by graduation."
```

### 10.1 Prioritize Findings and Interventions

Track 1 explicitly asks teams to prioritize findings. Rank forecast gaps so a programme leader can see what to address first, and explain the factors behind each rank.

Possible factors include:
- size of the projected graduation gap;
- importance to the programme's learning outcomes;
- relevant, sourced market demand;
- remaining opportunities to teach and reinforce the competency;
- feasibility and likely educational value of an intervention.

Define scales and weights before presenting an urgency score. Avoid counting the same deficit twice, and do not treat job-posting frequency as a direct measure of educational importance. If the inputs cannot support a defensible numeric rank, use explained priority bands.

Show the expected result of a proposed intervention as a **scenario comparison**: projected gap without the intervention versus projected gap with it, under explicit assumptions. The difference is projected potential gap reduction, not observed student improvement or proven impact.

---

## 11. Data Strategy

BuildForward must not pretend that one student’s completed assignments are enough to train a production-ready model.

Use:

```text
Real Curriculum Data
+
Real Anchor Projects
+
Controlled Synthetic Expansion
+
Real Public Market Signals
```

### 11.1 Real Curriculum Data

Use actual university materials where possible:
- module descriptions;
- learning outcomes;
- prerequisites;
- assignment questions;
- semester structure;
- programme progression.

### 11.2 Real Anchor Projects

Use the user’s actual completed assignments and repositories as reference archetypes.

Example:

```text
Real OOP Project
- Java SE
- basic layered structure
- persistence
- no tests
- no CI
```

These validate that BuildForward can analyse real student artifacts.

### 11.3 Controlled Synthetic Project Variants

Do not generate arbitrary fake projects just to inflate data volume.

Create structured variants from real anchor projects.

Example:

```text
Variant A
same project
+ JUnit tests
+ improved repository abstraction

Variant B
same project
+ weak modularity
+ no persistence abstraction

Variant C
same domain
+ Spring Boot
+ PostgreSQL
+ Docker

Variant D
incomplete project
+ missing business logic
```

Prefer feature/metadata-level synthetic data over full fake repositories.

Example:

```json
{
  "language": "Java",
  "has_tests": true,
  "has_ci": false,
  "uses_database": true,
  "architecture": "layered",
  "competencies": [
    "object-oriented design",
    "persistence",
    "automated testing"
  ]
}
```

### 11.4 Continuity Labels

Each project-module pair requires:

```text
CONTINUE
PARTIAL_REUSE
RESET
```

Labels should be transparent and rubric-based.

Example:

```text
CONTINUE
- prerequisite coverage is high;
- competency overlap is high;
- project artifact is reusable;
- architecture supports the next module.

PARTIAL_REUSE
- moderate competency overlap;
- some domain/business logic is reusable;
- architecture or platform requires significant change.

RESET
- major prerequisite gap;
- artifact is unsuitable;
- module outcome is fundamentally different;
- reuse would reduce learning quality or fairness.
```

Labels may initially be expert-labelled, manually curated, or rubric-derived.

Do not present them as historical institutional ground truth.

### 11.5 Synthetic Cohort Scenarios

Because historical cohort data may be unavailable, create simulated scenarios.

Examples:

```text
Cohort A
strong testing
weak DevOps

Cohort B
strong backend
weak security

Cohort C
balanced competency profile
```

Describe them explicitly as **simulated cohort scenarios**.

### 11.6 Market Data

Use real public market data where possible.

Initial scope:

```text
Location: Malaysia
Programme: Software Engineering

Target Role Families:
- Software Engineer
- Backend Engineer
- Full Stack Engineer
- QA / SDET
- DevOps / Cloud Engineer
```

Possible features:
- competency frequency;
- trend direction;
- junior/graduate relevance;
- role distribution;
- co-occurring competencies.

---

## 12. Dataset Roles

Keep data purposes separate:

```text
1. Curriculum Data
   → programme structure and learning intent

2. Project Data
   → demonstrated student competencies

3. Market Data
   → external competency demand

4. Synthetic Variants
   → controlled expansion of training scenarios

5. Simulated Cohorts
   → forecasting proof-of-concept
```

Do not search Kaggle simply because the project uses machine learning.

Use external datasets only when they match the prediction target.

Principle:

> **Define problem → define target variable → determine required data → find or collect that data.**

---

## 13. Data Analysis Techniques

BuildForward should include real data analysis.

### 13.1 Descriptive Analysis

Examples:
- competency frequency by semester;
- competency overlap across modules;
- duplicated learning outcomes;
- modules with weak practical progression;
- competencies taught once and never reinforced;
- project technology distribution;
- market competency frequency.

### 13.2 Semantic Similarity

Use embeddings to compare:

```text
Learning Outcome
        ↓
Embedding

Project Evidence
        ↓
Embedding

Cosine Similarity
        ↓
Alignment Score
```

Possible tools:
- sentence-transformers;
- cosine similarity;
- spaCy;
- clustering.

### 13.3 Competency Normalisation

Example raw signals:

```text
CI/CD
continuous integration
GitHub Actions
GitLab CI
Jenkins pipeline
deployment pipeline
```

Canonical representation:

```text
Competency:
Continuous Integration
```

Possible techniques:
- sentence embeddings;
- semantic similarity;
- hierarchical clustering;
- DBSCAN if useful;
- human validation.

### 13.4 Curriculum Graph Analysis

Represent module and competency relationships.

Possible analyses:
- prerequisite bottlenecks;
- orphan competencies;
- competencies never reinforced;
- excessive module overlap;
- missing progression links.

Use PostgreSQL recursive CTEs first.

### 13.5 Market Trend Analysis

Possible techniques:
- growth rate;
- moving averages;
- role-specific demand;
- geographic segmentation;
- co-occurrence analysis;
- graduate-role prevalence.

Only introduce formal time-series models if historical data volume supports them.

---

## 14. LLM Decision

LLMs are **optional**.

BuildForward must remain functional without an LLM.

Preferred LLM use cases:
- extracting structured information from assignment briefs;
- extracting candidate learning outcomes;
- normalising noisy competency wording;
- summarising complex documents;
- optional human-readable explanations.

LLMs must **not**:
- generate the predictive score;
- determine the final continuity class by themselves;
- make curriculum decisions;
- execute actions;
- modify LMS or university systems automatically.

Preferred architecture:

```text
Unstructured Document
        ↓
LLM / Rule-Based Extractor
        ↓
Structured Candidate Facts
        ↓
Pydantic Validation
        ↓
Human Review
        ↓
Confirmed Canonical Data
        ↓
Predictive Pipeline
```

The LLM is an extractor, not the authority.

---

## 15. Provenance for Extracted Data

Track:

```text
SOURCE_FACT
EXTRACTED_CANDIDATE
CONFIRMED_FACT
```

Do not silently convert uncertain extraction into ground truth.

---

## 16. Recommended MVP Data Workflow

Use real university materials as the canonical demo source.

```text
Real Module Descriptions
+ Real Assignment Questions
+ Real Completed Projects
        ↓
One-Time Extraction / Normalisation
        ↓
Validated Canonical Dataset
        ↓
Seed Database
```

Then support one manual upload flow:

```text
New PDF / DOCX / GitHub Repo
        ↓
Extraction
        ↓
Human Review
        ↓
Canonical Schema
```

This proves extensibility without making the live demo depend on fragile extraction.

---

## 17. Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query if useful
- Orval-generated API client

### Backend
- Python 3.13+
- FastAPI
- Pydantic v2
- SQLAlchemy 2
- Alembic

### Database
- PostgreSQL
- pgvector only if semantic retrieval becomes necessary

### ML / Data
- pandas and/or Polars
- scikit-learn
- LightGBM where justified
- spaCy
- sentence-transformers
- SHAP if explainability is needed
- joblib or equivalent for model persistence

### Engineering
- uv
- Ruff
- pytest
- mypy or pyright
- Docker
- Docker Compose
- GitHub Actions
- OpenTelemetry where practical

---

## 18. Monorepo Structure

Turborepo is not required.

```text
buildforward/
│
├── apps/
│   └── web/
│
├── services/
│   └── api/
│       ├── app/
│       │   ├── domain/
│       │   ├── routes/
│       │   ├── schemas/
│       │   ├── services/
│       │   ├── ingestion/
│       │   ├── extraction/
│       │   ├── prediction/
│       │   └── adapters/
│       └── tests/
│
├── ml/
│   ├── notebooks/
│   ├── training/
│   ├── datasets/
│   └── evaluation/
│
├── infra/
│   └── docker/
│
├── docs/
│
└── docker-compose.yml
```

Notebooks are for experimentation only.

---

## 19. API Contract

FastAPI owns the backend contract.

```text
Pydantic Models
      ↓
FastAPI
      ↓
OpenAPI
      ↓
Orval
      ↓
Generated TypeScript Client
```

Recommended CI flow:

```text
1. Generate OpenAPI schema
2. Run Orval
3. Verify generated client is up to date
4. Run frontend typecheck
5. Run backend tests
```

Keep SQLAlchemy models separate from Pydantic API schemas.

Suggested endpoints:

```text
POST /api/v1/programmes/import
POST /api/v1/assignments/analyze
POST /api/v1/projects/analyze
POST /api/v1/predictions/continuity
POST /api/v1/predictions/cohort-gap
GET  /api/v1/cohorts/{id}/competencies
GET  /api/v1/programmes/{id}/graph
```

---

## 20. Authentication

Do not implement authentication for the hackathon MVP.

Use seeded demo context.

Future:
- OIDC;
- university SSO;
- LTI 1.3;
- Microsoft Entra ID;
- Google Workspace.

---

## 21. Suggested Data Model

High-level entities:

```text
Programme
Semester
Module
ModulePrerequisite
LearningOutcome
Assignment
Cohort
StudentArtifact
ProjectRepository
Competency
CompetencyEvidence
ModuleCompetency
ArtifactCompetency
MarketCompetencySignal
Prediction
Intervention
```

Use PostgreSQL first.

---

## 22. Source Adapter Pattern

```text
SourceAdapter
├── ManualUploadAdapter
├── GitHubAdapter
├── CurriculumAdapter
├── JobMarketAdapter
├── LMSAdapter          # future
└── xAPIAdapter         # future
```

Every adapter should normalise source data into canonical domain objects.

---

## 23. LMS Integration Vision

Hackathon:

> **Standalone web application with manual upload and GitHub ingestion.**

Long-term:

> **Independent curriculum-intelligence service with LMS connectors.**

Possible future architecture:

```text
Moodle ─────┐
Canvas ─────┤
Blackboard ─┤
xAPI LRS ───┤
Manual ─────┤
            ↓
      Adapter Layer
            ↓
Canonical Curriculum Model
            ↓
BuildForward Intelligence
            ↓
Programme Dashboard
```

BuildForward should not become a Moodle-specific product.

---

## 24. Open-Source References Reviewed

### Curriculum Knowledge Graph
Reference for:
- curriculum graph modelling;
- module/prerequisite relationships;
- skills/outcomes relationships.

### Skill Gap Analysis
Reference for:
- skill extraction;
- taxonomy normalisation;
- market-demand analysis;
- co-occurrence analysis;
- NLP pipeline ideas.

### xAPI Learning Analytics Dashboard
Reference for:
- future LMS/LRS integration;
- activity normalisation;
- xAPI adapter patterns.

Core novelty remains:

> **project continuity prediction + graduation competency-gap forecasting.**

---

## 25. Model Evaluation

### Continuity Classification
Possible metrics:
- accuracy;
- precision;
- recall;
- F1;
- confusion matrix;
- calibration if useful.

### Cohort Forecasting
Use MAE, RMSE, calibration, or confidence intervals only when observed cohort outcomes and enough cases support them. For the initial simulated cohort scenario, document the forecast method, input assumptions, sensitivity to those assumptions, and the projected with/without intervention comparison. Do not report simulated scenario fit as real-world forecasting accuracy.

Possible metrics when suitable validation data becomes available:
- MAE;
- RMSE;
- trend error;
- calibration;
- confidence intervals where appropriate.

### Noisy Input and False Alarms

Prepare a small, separately reviewed evaluation set with clear, ambiguous, and unfamiliar wording, plus cases that should remain unmapped. Check whether competency normalization finds the expected concept and whether the system abstains or asks for review when evidence is weak. Record false positive mappings and continuity recommendations, especially incorrect `CONTINUE` decisions. A single successful messy demo example is not evidence of general robustness.

Synthetic project variants derived from one anchor can share many features. Keep related variants together when splitting training and evaluation data, and report results on real or independently curated examples separately. A classifier that reproduces its own label-generation rubric does not establish predictive validity beyond that rubric.

### Product-Level Evaluation

Ask:
- Can the model identify meaningful continuity opportunities?
- Can it detect a competency gap before graduation?
- Can it rank gaps with an understandable, defensible rationale?
- Can a programme leader understand the evidence?
- Does the recommended intervention make sense?
- Are projected benefits distinguished from observed impact?
- Would the prediction change a real curriculum decision?

---

## 26. Explainability

Prefer model-derived explanations.

Possible techniques:
- model coefficients;
- feature importance;
- SHAP where justified.

Example:

```text
Decision: CONTINUE

Positive factors:
+ competency overlap            +0.24
+ prerequisites satisfied       +0.18
+ reusable business logic       +0.15

Negative factors:
- no automated build            -0.06
- weak persistence abstraction  -0.04
```

Feature contributions above are illustrative. Display numeric contributions only when computed from the actual model using a documented method. Use evidence-backed text explanations otherwise.

---

## 27. MVP Scope

Recommended demo path:

```text
Semester 1
Object-Oriented Programming

Semester 2
Software Testing

Semester 3
Web / Enterprise Development

Semester 4
DevOps / Cloud
```

Use:
- real module descriptions;
- real assignment briefs;
- one or more real project repositories;
- controlled synthetic project variants;
- one small real market dataset;
- one simulated cohort.

For the pitch, lead with a likely graduation competency gap and its priority, then show the project continuity prediction as one way to address it. Both predictions remain core product capabilities and both need evidence and evaluation.

---

## 28. MVP Demo Flow

```text
Programme imported
        ↓
Previous assignment identified
        ↓
Real student project analysed
        ↓
Competencies extracted
        ↓
Upcoming module matched
        ↓
Continuity decision predicted
        ↓
Suggested project evolution shown
        ↓
Cohort competency coverage shown
        ↓
Graduation gap forecast
        ↓
Gaps ranked with reasons
        ↓
Programme intervention recommended
        ↓
Projected with/without intervention scenario shown
        ↓
Human chooses whether to act
```

---

## 29. Non-Goals for V1

Do not implement:
- LMS replacement;
- Moodle plugin;
- Canvas plugin;
- authentication;
- enterprise RBAC;
- autonomous AI agent;
- auto-execution;
- multi-agent orchestration;
- generic career recommendation;
- personalised employability scoring;
- automatic syllabus rewriting;
- automatic assignment generation;
- automatic grading;
- automatic curriculum modification;
- Kubernetes;
- Kafka;
- Neo4j;
- Temporal;
- separate vector database;
- custom feature store;
- fine-tuned LLM.

---

## 30. Suggested Implementation Order

This order describes the fuller product direction, not a requirement to build a complete platform for the hackathon. The current pitch scope is the single decision flow defined in Section 31; keep later phases deferred unless they are necessary to make that flow work end to end.

### Phase 1 — Canonical Domain Model
1. Define PostgreSQL schema.
2. Seed programme.
3. Seed modules and prerequisites.
4. Define initial competency taxonomy.
5. Import real module descriptions.
6. Import real assignment briefs.

### Phase 2 — Real Project Analysis
1. Connect one real GitHub repository.
2. Extract deterministic project evidence.
3. Map evidence to competencies.
4. Store evidence with provenance.

### Phase 3 — Controlled Dataset Expansion
1. Define continuity-label rubric.
2. Create synthetic metadata variants from real projects.
3. Generate project-module pairs.
4. Label `CONTINUE / PARTIAL_REUSE / RESET`.
5. Document synthetic-data assumptions and keep related variants together in evaluation splits.

### Phase 4 — Continuity Model
1. Create heuristic baseline.
2. Train Logistic Regression.
3. Compare Random Forest.
4. Compare LightGBM if justified.
5. Evaluate.
6. Add model explanation.

### Phase 5 — Cohort Forecast
1. Aggregate competency coverage.
2. Create simulated cohort scenarios.
3. Add remaining curriculum coverage.
4. Add limited real market signals.
5. Forecast likely graduation gaps.
6. Rank gaps with documented factors.
7. Compare projected coverage with and without a proposed intervention.
8. Surface uncertainty and scenario assumptions clearly.

### Phase 6 — Pitch UI
Use one concise guided page for the three-minute pitch. It should show:
1. Existing project evidence and its provenance.
2. A selected later module, a `CONTINUE / PARTIAL_REUSE / RESET` result, and the matching or missing evidence.
3. Ranked cohort competency gaps, followed by a transparent with/without scenario.
4. A possible assignment focus only when project targets overlap with a projected cohort gap; label the overlap as a planning prompt, not a validated recommendation.
5. A clear statement that the forecast uses simulated or unvalidated data and that educators make the decision.

Keep curriculum and repository review, imports, and workspace switching in an optional collapsed source panel. Do not add a separate dashboard, standalone analytics pages, or navigation that is not needed for the end-to-end decision flow.

### Phase 7 — Optional LLM Extraction
Only add if needed:
- assignment brief extraction;
- learning-outcome extraction;
- competency candidate mapping.

Require schema validation and human confirmation.

### Phase 8 — Demo Preparation
Use preloaded data for the main demo and label the illustrative pathway and simulated cohort clearly. Keep the Diploma-labelled five-brief candidate separate from the Degree-level OODJ example until their programme relationship is verified.

Do not make the pitch depend on live document extraction.

Fit one complete decision flow into the three-minute local presentation. Do not claim general robustness unless a separate evaluation set supports it.

---

## 31. Hackathon Pitch Acceptance Criteria

For the time-limited pitch, prioritize this end-to-end slice:

1. Show existing project evidence and its source status.
2. Compare that project with a later module in the same selected programme.
3. Return `CONTINUE / PARTIAL_REUSE / RESET` with matching and missing evidence.
4. Show ranked cohort gaps with explicit assumptions and simulated-data labels.
5. Connect an overlapping project target and cohort gap to a clearly labelled planning scenario.
6. Compare the scenario with and without an assumed gain.
7. Keep candidate sources behind review and confirmation; leave decisions to the educator.

Do not expand the hackathon build into the full research/product roadmap below. Empirical evaluation, trained models, real cohort data, market signals, LMS integrations, and production readiness remain future work unless explicitly prioritized later.

---

## 32. Limitations and Claims

Because the initial model may use:
- one student’s real anchor projects;
- curated labels;
- synthetic project variants;
- simulated cohort scenarios;

the correct claim is:

> **proof-of-concept predictive model**

not:

> **production-validated university prediction system**

Do not claim:
- certainty about future technology trends;
- perfect employability prediction;
- universal curriculum recommendations;
- observed competency improvement from a simulated intervention;
- proven accuracy or robustness from synthetic labels or one demo example;
- calibrated confidence from an unevaluated model score;
- automatic replacement of lecturer judgement.

---

## 33. Product Positioning

BuildForward is not:

> “AI that tells universities what to teach.”

It is:

> **Predictive curriculum intelligence that helps universities understand what students have actually built, determine when projects should continue across modules, and identify likely competency gaps before graduation.**

Short pitch:

> **Students keep learning forward, but their projects keep resetting to zero. BuildForward predicts when student projects can meaningfully continue across modules and forecasts competency gaps before graduation, helping programme leaders design more connected, industry-relevant learning journeys.**

Alternative:

> **BuildForward turns isolated semester assignments into a continuous engineering journey.**

---

## 34. Long-Term Vision

### Phase 1 — Hackathon
- manual upload;
- GitHub ingestion;
- curated real university dataset;
- controlled synthetic training scenarios;
- public market signals.

### Phase 2 — University Pilot
- Moodle / Canvas API adapter;
- automatic assignment import;
- module synchronisation;
- cohort synchronisation;
- validated historical labels.

### Phase 3 — Mature Product
- LTI 1.3 integration;
- OIDC / university SSO;
- xAPI / LRS support;
- programme-level dashboards;
- periodic competency forecasts;
- richer institutional historical data;
- model monitoring and recalibration.

---

## 35. Development Philosophy

Use boring infrastructure.

Keep the novelty in:

```text
competency modelling
project continuity prediction
cohort graduation-gap forecasting
evidence-backed intervention
```

Prefer:
- clear domain boundaries;
- reproducible training;
- typed API contracts;
- explicit evidence;
- provenance;
- simple deployment;
- understandable predictions;
- human-in-the-loop decisions.

Avoid:
- premature microservices;
- agentic complexity;
- opaque predictions;
- vendor lock-in;
- unnecessary infrastructure.

---

## 36. Guiding Principle

When uncertain about a feature, ask:

> **Does this help predict a meaningful future curriculum or competency problem early enough for a programme leader to make a better decision?**

If the answer is no, it is probably out of scope.
