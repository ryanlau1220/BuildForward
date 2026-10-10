"use client";

import { useEffect, useMemo, useState } from "react";
import { api, label, type Continuity, type Demo, type Forecast, type Project } from "@/lib/api";

type Choice = {
  id: string;
  name: string;
  provenance: string;
  programme_id?: string;
  originating_module_id?: string | null;
};
type ModuleChoice = {
  id: string;
  name: string;
  semester: number;
  provenance: string;
  programme_id: string;
  programme_name: string;
  outcomes: string[];
  target_competencies?: string[];
};
type CurriculumCandidate = {
  id: string;
  name: string;
  source_label: string;
  provenance: string;
  modules: {
    id: string;
    name: string;
    semester: number;
    outcomes: string[];
    assignment: string;
    provenance: string;
  }[];
};

function Provenance({ value }: { value: string }) {
  const text = value.replaceAll("_", " ").toLowerCase();
  return <span className={`provenance ${value.toLowerCase()}`}>{text}</span>;
}

function Percent({ value }: { value: number }) {
  return <>{Math.round(value * 100)}%</>;
}

function CoverageBar({ current, projected, target }: { current: number; projected: number; target: number }) {
  return <div
    className="coverage-track"
    role="img"
    aria-label={`Current ${Math.round(current * 100)} percent; projected ${Math.round(projected * 100)} percent; target ${Math.round(target * 100)} percent`}
  >
    <span className="coverage-current" style={{ width: `${current * 100}%` }} />
    <span className="coverage-future" style={{ left: `${current * 100}%`, width: `${Math.max(0, projected - current) * 100}%` }} />
    <span className="coverage-target" style={{ left: `${target * 100}%` }} />
  </div>;
}

export default function Home() {
  const [demo, setDemo] = useState<Demo | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [continuity, setContinuity] = useState<Continuity | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [moduleId, setModuleId] = useState("");
  const [interventionSkill, setInterventionSkill] = useState("");
  const [gain, setGain] = useState(0.18);
  const [programmes, setProgrammes] = useState<Choice[]>([]);
  const [cohorts, setCohorts] = useState<Choice[]>([]);
  const [projects, setProjects] = useState<Choice[]>([]);
  const [modules, setModules] = useState<ModuleChoice[]>([]);
  const [workspaceIds, setWorkspaceIds] = useState({
    programme_id: "sample-se",
    cohort_id: "sample-cohort",
    project_id: "sample-record-app",
  });
  const [curriculumCandidate, setCurriculumCandidate] = useState<CurriculumCandidate | null>(null);
  const [candidateProject, setCandidateProject] = useState<Project | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const programmeModules = useMemo(() => {
    if (!demo) return [];
    return modules
      .filter(m => m.programme_id === demo.programme.id && m.provenance !== "EXTRACTED_CANDIDATE")
      .filter(m => m.semester > demo.cohort.current_semester)
      .sort((a, b) => a.semester - b.semester);
  }, [demo, modules]);
  const selectedModule = programmeModules.find(m => m.id === moduleId);
  const positiveGaps = forecast?.ranked_findings.filter(f => f.projected_gap > 0) || [];
  const linkedFocus = selectedModule && continuity
    ? positiveGaps.find(f =>
      continuity.target_to_develop.includes(f.competency)
      && selectedModule.target_competencies?.includes(f.competency),
    )?.competency
    : undefined;
  const selectedLinkedFocus = selectedModule && continuity
    && continuity.target_to_develop.includes(interventionSkill)
    && selectedModule.target_competencies?.includes(interventionSkill)
    ? interventionSkill
    : undefined;
  const activeIntervention = forecast?.intervention
    ? forecast.ranked_findings.find(f => f.competency === forecast.intervention?.competency)
    : undefined;
  const illustrative = demo?.programme.provenance === "SAMPLE" || demo?.cohort.provenance === "SIMULATED";

  function applyWorkspace(data: Demo) {
    setDemo(data);
    setProject(data.project);
    setContinuity(data.continuity);
    setForecast(data.forecast);
    setModuleId(data.continuity?.module_id || "");
    const targetModule = data.modules.find(m => m.id === data.continuity?.module_id);
    setInterventionSkill(data.forecast.ranked_findings.find(f =>
      f.projected_gap > 0 && data.continuity?.target_to_develop.includes(f.competency)
      && targetModule?.target_competencies.includes(f.competency),
    )?.competency || data.forecast.ranked_findings.find(f => f.projected_gap > 0)?.competency || "");
    setWorkspaceIds({
      programme_id: data.programme.id,
      cohort_id: data.cohort.id,
      project_id: data.project.id,
    });
  }

  async function refreshChoices() {
    const [programmesResponse, cohortsResponse, projectsResponse, modulesResponse] = await Promise.all([
      api<Choice[]>("/api/v1/programmes"),
      api<Choice[]>("/api/v1/cohorts"),
      api<Choice[]>("/api/v1/projects"),
      api<ModuleChoice[]>("/api/v1/modules"),
    ]);
    setProgrammes(programmesResponse);
    setCohorts(cohortsResponse);
    setProjects(projectsResponse);
    setModules(modulesResponse);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const choicesPromise = refreshChoices();
        let data: Demo;
        const saved = window.localStorage.getItem("buildforward-workspace");
        if (saved) {
          try {
            data = await api<Demo>(`/api/v1/workspace?${new URLSearchParams(JSON.parse(saved))}`);
          } catch {
            window.localStorage.removeItem("buildforward-workspace");
            data = await api<Demo>("/api/v1/demo");
          }
        } else {
          data = await api<Demo>("/api/v1/demo");
        }
        await choicesPromise;
        if (!cancelled) applyWorkspace(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function loadWorkspace() {
    setBusy(true);
    try {
      const data = await api<Demo>(`/api/v1/workspace?${new URLSearchParams(workspaceIds)}`);
      applyWorkspace(data);
      window.localStorage.setItem("buildforward-workspace", JSON.stringify(workspaceIds));
      setMessage("Decision inputs updated.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function runContinuity() {
    if (!project || !selectedModule) return;
    setBusy(true);
    try {
      const result = await api<Continuity>("/api/v1/predictions/continuity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id, module_id: selectedModule.id }),
      });
      setContinuity(result);
      const suggested = positiveGaps.find(f =>
        result.target_to_develop.includes(f.competency)
        && selectedModule.target_competencies?.includes(f.competency),
      )?.competency;
      if (suggested) setInterventionSkill(suggested);
      setMessage("Comparison complete. Review the evidence behind the result.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function runScenario() {
    if (!demo || !interventionSkill) return;
    setBusy(true);
    try {
      const result = await api<Forecast>("/api/v1/predictions/cohort-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohort_id: demo.cohort.id,
          intervention: {
            competency: interventionSkill,
            assumed_gain: gain,
            description: "Proposed project work to reinforce this competency",
          },
        }),
      });
      setForecast(result);
      setMessage("Scenario updated using your assumed gain.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function inspectCurriculum(id: string) {
    try {
      setCurriculumCandidate(await api<CurriculumCandidate>(`/api/v1/programmes/${id}`));
      setError("");
    } catch (e) { setError((e as Error).message); }
  }

  async function confirmCurriculum() {
    if (!curriculumCandidate) return;
    setBusy(true);
    try {
      await api(`/api/v1/programmes/${curriculumCandidate.id}/confirm`, { method: "POST" });
      setCurriculumCandidate(null);
      await refreshChoices();
      setMessage("Curriculum source confirmed. It can now be selected where matching cohort data exists.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function inspectProject(id: string) {
    try {
      setCandidateProject(await api<Project>(`/api/v1/projects/${id}`));
      setError("");
    } catch (e) { setError((e as Error).message); }
  }

  async function importZip(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      setCandidateProject(await api<Project>("/api/v1/projects/analyze", { method: "POST", body: form }));
      await refreshChoices();
      setMessage("Project scanned. Review its evidence below before confirming it.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function importGithub() {
    setBusy(true);
    try {
      setCandidateProject(await api<Project>("/api/v1/projects/analyze-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl }),
      }));
      await refreshChoices();
      setMessage("Repository scanned. Review its evidence below before confirming it.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function setProjectOrigin(originModuleId: string) {
    if (!candidateProject) return;
    try {
      setCandidateProject(await api<Project>(`/api/v1/projects/${candidateProject.id}/origin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: originModuleId }),
      }));
      setMessage("Coursework link saved as candidate context; confirm it only if verified.");
      setError("");
    } catch (e) { setError((e as Error).message); }
  }

  async function confirmProject() {
    if (!candidateProject) return;
    setBusy(true);
    try {
      setCandidateProject(await api<Project>(`/api/v1/projects/${candidateProject.id}/confirm`, { method: "POST" }));
      await refreshChoices();
      setMessage("Project evidence confirmed. It remains separate from the active scenario until selected in a matching workspace.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const candidateProgrammes = programmes.filter(p => p.provenance === "EXTRACTED_CANDIDATE");
  const candidateProjects = projects.filter(p => p.provenance === "EXTRACTED_CANDIDATE");
  const compatibleCohorts = cohorts.filter(c => c.programme_id === workspaceIds.programme_id && c.provenance !== "EXTRACTED_CANDIDATE");
  const compatibleModules = modules.filter(m => m.programme_id === workspaceIds.programme_id);
  const compatibleProjects = projects.filter(p => p.provenance !== "EXTRACTED_CANDIDATE"
    && (!p.originating_module_id || compatibleModules.some(m => m.id === p.originating_module_id && m.provenance !== "EXTRACTED_CANDIDATE")));

  if (loading) return <main className="loading">Loading the decision workflow…</main>;

  return <main className="app-shell">
    <header className="masthead">
      <a className="wordmark" href="#top" aria-label="BuildForward home"><span className="wordmark-mark">B<span>↗</span></span><strong>BuildForward</strong></a>
      <span className="masthead-note">A curriculum decision, grounded in student work</span>
    </header>

    {error && <div className="notice notice-error" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
    {message && <div className="notice notice-success" role="status"><span>{message}</span><button onClick={() => setMessage("")} aria-label="Dismiss message">×</button></div>}

    {!demo || !forecast || !project ? <section className="empty-workspace"><p>BuildForward needs an API connection to load the decision inputs.</p><span>Start the API, then refresh this page.</span></section> : <>
      <section className="intro" id="top">
        <div className="intro-copy">
          <p className="kicker"><span className="kicker-rule" /> THE DECISION WALKTHROUGH</p>
          <h1>Can last semester’s work<br /><em>move the next one forward?</em></h1>
          <p className="intro-deck">Compare a project with the next module, then see which cohort skill may need attention before graduation.</p>
        </div>
        <div className="data-note">
          <span className="data-note-icon">i</span>
          <p><strong>{illustrative ? "Illustrative scenario" : "Reviewed source scenario"}</strong><br />{illustrative ? "The programme and cohort figures below are sample data, not verified university results." : "The sources were reviewed, but the forecast still uses unvalidated assumptions."}</p>
        </div>
      </section>

      <nav className="flow-nav" aria-label="Decision walkthrough">
        <a href="#continuity"><span>01</span> Project continuity</a>
        <i aria-hidden="true" />
        <a href="#cohort-outlook"><span>02</span> Cohort outlook</a>
      </nav>

      <section className="flow-section continuity-section" id="continuity">
        <div className="section-heading">
          <p className="step-label">01 <span>PROJECT CONTINUITY</span></p>
          <h2>Is there something worth carrying forward?</h2>
          <p>Match evidence from existing work against the next module’s prerequisites and reusable skills.</p>
        </div>

        <div className="decision-layout">
          <section className="project-card" aria-label="Project evidence">
            <div className="card-topline"><span>EXISTING PROJECT</span><Provenance value={project.provenance} /></div>
            <h3>{project.name}</h3>
            <p className="project-source">{project.source_label}</p>
            <div className="project-facts">
              <div><strong>{project.evidence.length}</strong><span>evidence signals</span></div>
              <div><strong>{project.languages.length ? project.languages.map(label).join(", ") : "—"}</strong><span>language detected</span></div>
            </div>
            <details className="evidence-details">
              <summary>Inspect evidence from this project</summary>
              {project.evidence.length ? <ul>{project.evidence.map((e, i) => <li key={`${e.source}-${i}`}><strong>{label(e.competency)}</strong><span>{e.detail}</span><code>{e.source}</code></li>)}</ul>
                : <p>No static evidence was found. Review the source manually before relying on a comparison.</p>}
            </details>
          </section>

          <section className="decision-card" aria-label="Continuity decision">
            <div className="comparison-fields">
              <div><span>PROGRAMME</span><strong>{demo.programme.name}</strong></div>
              <label htmlFor="module-select"><span>NEXT MODULE</span>
                <select id="module-select" value={moduleId} onChange={e => { setModuleId(e.target.value); setContinuity(null); }}>
                  {programmeModules.length === 0 && <option value="">No later confirmed modules</option>}
                  {programmeModules.map(m => <option value={m.id} key={m.id}>{m.name} · Semester {m.semester}</option>)}
                </select>
              </label>
            </div>
            <button className="primary-button" disabled={busy || !selectedModule || project.provenance === "EXTRACTED_CANDIDATE"} onClick={() => void runContinuity()}>
              {continuity ? "Run comparison again" : "Compare project with module"}<span aria-hidden="true">↗</span>
            </button>
            {project.provenance === "EXTRACTED_CANDIDATE" && <p className="inline-hint">Review and confirm this project in source materials before comparing it.</p>}
            {!programmeModules.length && <p className="inline-hint">No later confirmed modules are available in this programme.</p>}

            {continuity ? <div className="decision-result" aria-live="polite">
              <div className="decision-result-heading">
                <div><span className="result-caption">HEURISTIC RESULT</span><strong className={`decision-word ${continuity.decision.toLowerCase()}`}>{continuity.decision.replaceAll("_", " ")}</strong></div>
                <span className="decision-arrow" aria-hidden="true">→</span>
                <div className="target-module"><span>NEXT MODULE</span><strong>{selectedModule?.name}</strong></div>
              </div>
              <p className="decision-reason">{continuity.reason}</p>
              <div className="evidence-columns">
                <div><span>ALREADY SHOWN</span><strong>{continuity.matched_prerequisites.length ? continuity.matched_prerequisites.map(label).join(", ") : "No required skills matched"}</strong></div>
                <div><span>STILL TO DEVELOP</span><strong>{continuity.target_to_develop.length ? continuity.target_to_develop.map(label).join(", ") : "No new target skills identified"}</strong></div>
              </div>
            </div> : <div className="decision-prompt"><span>→</span><p>Run the comparison to see whether this project should continue, be partially reused, or start fresh.</p></div>}
            <p className="method-note">This transparent heuristic is a prototype, not a trained or validated model. A lecturer makes the final decision.</p>
          </section>
        </div>
      </section>

      <section className="flow-section outlook-section" id="cohort-outlook">
        <div className="section-heading">
          <p className="step-label">02 <span>COHORT OUTLOOK</span></p>
          <h2>Which skill may need attention?</h2>
          <p>Estimate where current coverage could finish, then explore a clearly labelled intervention scenario.</p>
        </div>

        <div className="outlook-layout">
          <section className="gap-panel" aria-label="Projected cohort competency gaps">
            <div className="panel-heading"><div><span className="card-topline">PROJECTED GRADUATION GAPS</span><h3>Where students may need more practice</h3></div><span className="target-key"><i /> 70% target</span></div>
            <div className="gap-list">
              {positiveGaps.slice(0, 4).map((finding, index) => <article className="gap-row" key={finding.competency}>
                <div className="gap-title"><span>{String(index + 1).padStart(2, "0")}</span><strong>{label(finding.competency)}</strong><b>{Math.round(finding.projected_gap * 100)} pt gap</b></div>
                <CoverageBar current={finding.current_coverage} projected={finding.projected_graduation_coverage} target={finding.programme_target} />
                <p><span><Percent value={finding.current_coverage} /> now</span><span><Percent value={finding.projected_graduation_coverage} /> projected</span><span>{finding.future_module_opportunities} future module {finding.future_module_opportunities === 1 ? "opportunity" : "opportunities"}</span></p>
              </article>)}
              {!positiveGaps.length && <p className="no-gaps">No projected gaps in the current illustrative scenario.</p>}
            </div>
            <p className="panel-footnote">Ranked by projected gap. Remaining-module gains and the 70% target are demonstration assumptions.</p>
          </section>

          <section className="scenario-panel" aria-label="Intervention scenario">
            <p className="card-topline">EXPLORE A POSSIBLE NEXT STEP</p>
            <h3>{selectedLinkedFocus ? `Build on the project with ${label(selectedLinkedFocus)}.` : "What if a future project reinforced a skill?"}</h3>
            <p className="scenario-copy">{selectedLinkedFocus
              ? "This skill is both a target for the selected module and a projected cohort gap. The overlap is a planning prompt, not a validated recommendation."
              : linkedFocus
                ? `The current project and module suggest ${label(linkedFocus)} as a possible focus. Select it to connect the two findings, or explore another cohort gap. These are planning prompts, not validated recommendations.`
                : "Choose a cohort gap and model an assumed coverage gain. This scenario is not a measured outcome."}</p>
            <label className="field-label" htmlFor="scenario-skill">SKILL TO REINFORCE</label>
            <select id="scenario-skill" value={interventionSkill} onChange={e => { setInterventionSkill(e.target.value); setForecast(current => current ? { ...current, intervention: null } : current); }}>
              {positiveGaps.map(f => <option value={f.competency} key={f.competency}>{label(f.competency)}</option>)}
            </select>
            <label className="field-label gain-label" htmlFor="scenario-gain">ASSUMED GAIN <strong>+{Math.round(gain * 100)} percentage points</strong></label>
            <input id="scenario-gain" type="range" min="0" max="0.4" step="0.01" value={gain} onChange={e => { setGain(Number(e.target.value)); setForecast(current => current ? { ...current, intervention: null } : current); }} />
            <button className="primary-button" disabled={busy || !interventionSkill} onClick={() => void runScenario()}>Compare the scenario<span aria-hidden="true">↗</span></button>
            {activeIntervention && <div className="scenario-result" aria-live="polite">
              <span>PROJECTED GAP · {label(activeIntervention.competency)}</span>
              <div><strong><Percent value={activeIntervention.projected_gap} /></strong><i>without</i><b aria-hidden="true">→</b><strong><Percent value={activeIntervention.with_intervention_gap} /></strong><i>with assumed gain</i></div>
              <p>Potential reduction: <strong>{Math.round(activeIntervention.potential_gap_reduction * 100)} points</strong>, under this assumption.</p>
            </div>}
            <p className="scenario-disclaimer">{demo.cohort.provenance === "SIMULATED" ? "No real cohort data has been supplied. Forecast values are simulated, assumption-based and not institutionally validated." : "Forecast values depend on unvalidated assumptions and are not institutionally validated."} Market data is not included.</p>
          </section>
        </div>
      </section>

      <details className="source-tools">
        <summary>Review sources or change the demo inputs</summary>
        <div className="source-tools-inner">
          <p className="source-context">The five supplied briefs and the Degree-level OODJ example remain separate candidate sets until their programme relationship is verified.</p>

          <section className="workspace-controls">
            <div><span className="card-topline">CURRENT SCENARIO</span><h3>Switch to another confirmed data set</h3></div>
            <label>PROGRAMME<select value={workspaceIds.programme_id} onChange={e => {
              const programmeId = e.target.value;
              const cohort = cohorts.find(c => c.programme_id === programmeId && c.provenance !== "EXTRACTED_CANDIDATE");
              const project = projects.find(p => p.provenance !== "EXTRACTED_CANDIDATE"
                && (!p.originating_module_id || modules.some(m => m.id === p.originating_module_id
                  && m.programme_id === programmeId && m.provenance !== "EXTRACTED_CANDIDATE")));
              setWorkspaceIds(w => ({ ...w, programme_id: programmeId, cohort_id: cohort?.id || "", project_id: project?.id || "" }));
            }}>{programmes.filter(p => p.provenance !== "EXTRACTED_CANDIDATE").map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <label>COHORT<select value={workspaceIds.cohort_id} onChange={e => setWorkspaceIds(w => ({ ...w, cohort_id: e.target.value }))}>{compatibleCohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>PROJECT<select value={workspaceIds.project_id} onChange={e => setWorkspaceIds(w => ({ ...w, project_id: e.target.value }))}>{compatibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <button className="secondary-button" disabled={busy || !workspaceIds.cohort_id || !workspaceIds.project_id} onClick={() => void loadWorkspace()}>Load scenario</button>
          </section>

          {candidateProgrammes.length > 0 && <section className="candidate-section">
            <div><span className="card-topline">COURSEWORK CANDIDATES</span><h3>Review a curriculum source</h3></div>
            <div className="candidate-buttons">{candidateProgrammes.map(p => <button className="secondary-button" key={p.id} onClick={() => void inspectCurriculum(p.id)}>{p.name}</button>)}</div>
            {curriculumCandidate && <div className="candidate-review">
              <div className="candidate-review-head"><h4>{curriculumCandidate.name}</h4><Provenance value={curriculumCandidate.provenance} /></div>
              <p>{curriculumCandidate.source_label}</p>
              <div className="candidate-module-list">{curriculumCandidate.modules.map(m => <article key={m.id}><span>SEMESTER {m.semester}</span><strong>{m.name}</strong><p>{m.assignment}</p></article>)}</div>
              {curriculumCandidate.provenance === "EXTRACTED_CANDIDATE" && <button className="secondary-button" disabled={busy} onClick={() => void confirmCurriculum()}>Confirm reviewed curriculum</button>}
            </div>}
          </section>}

          <section className="candidate-section">
            <div><span className="card-topline">PROJECT EVIDENCE</span><h3>Inspect or add a repository</h3></div>
            {candidateProjects.length > 0 && <div className="candidate-buttons">{candidateProjects.map(p => <button className="secondary-button" key={p.id} onClick={() => void inspectProject(p.id)}>Inspect {p.name}</button>)}</div>}
            <div className="import-row">
              <label className="repo-input">PUBLIC REPOSITORY URL<input type="url" placeholder="https://github.com/owner/repository" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} /></label>
              <button className="secondary-button" disabled={busy || !repoUrl} onClick={() => void importGithub()}>Analyze repository</button>
              <label className="file-input">OR UPLOAD A ZIP<input type="file" accept=".zip,application/zip" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void importZip(file); }} /></label>
            </div>
            {candidateProject && <div className="candidate-review">
              <div className="candidate-review-head"><h4>{candidateProject.name}</h4><Provenance value={candidateProject.provenance} /></div>
              <p>{candidateProject.source_label} · {candidateProject.files_scanned} source files scanned</p>
              {candidateProject.provenance === "EXTRACTED_CANDIDATE" && <label className="origin-select">LINK TO COURSEWORK (IF VERIFIED)
                <select value={candidateProject.originating_module_id || ""} onChange={e => { if (e.target.value) void setProjectOrigin(e.target.value); }}>
                  <option value="">No coursework link selected</option>
                  {modules.map(m => <option key={m.id} value={m.id}>{m.name} · {m.programme_name} · {m.provenance.replaceAll("_", " ")}</option>)}
                </select>
              </label>}
              {candidateProject.evidence.length ? <ul className="candidate-evidence">{candidateProject.evidence.slice(0, 6).map((e, i) => <li key={`${e.source}-${i}`}><strong>{label(e.competency)}</strong><span>{e.detail}</span><code>{e.source}</code></li>)}</ul> : <p>No supported signals found. Review the repository manually before drawing a conclusion.</p>}
              <p className="source-context">Static inspection does not run code or prove code quality, successful tests, or student proficiency.</p>
              {candidateProject.provenance === "EXTRACTED_CANDIDATE" && <button className="secondary-button" disabled={busy} onClick={() => void confirmProject()}>Confirm reviewed project evidence</button>}
            </div>}
          </section>
        </div>
      </details>
    </>}

    <footer className="page-footer"><span>BUILDFORWARD</span><span>Predictions support educator decisions; they do not make them.</span></footer>
  </main>;
}
