"use client";

import { useEffect, useMemo, useState } from "react";
import { api, label, type Continuity, type Demo, type Forecast, type Project } from "@/lib/api";

type View = "overview" | "continuity" | "evidence" | "sources";
type Choice = { id: string; name: string; provenance: string; programme_id?: string };
type ModuleChoice = { id: string; name: string; semester: number; provenance: string; programme_name: string; outcomes: string[] };
type CurriculumCandidate = { id: string; name: string; source_label: string; provenance: string; modules: { id: string; name: string; semester: number; outcomes: string[]; assignment: string; provenance: string }[] };
const views: { id: View; name: string; number: string }[] = [
  { id: "overview", name: "Overview", number: "01" },
  { id: "continuity", name: "Project continuity", number: "02" },
  { id: "evidence", name: "Evidence", number: "03" },
  { id: "sources", name: "Sources & import", number: "04" },
];

function Percent({ value }: { value: number }) {
  return <>{Math.round(value * 100)}%</>;
}

function Provenance({ value }: { value: string }) {
  return <span className={`provenance ${value.toLowerCase()}`}>{value.replaceAll("_", " ")}</span>;
}

function CoverageBar({ current, projected, target = 0.7 }: { current: number; projected: number; target?: number }) {
  return <div className="coverage-track">
    <span className="coverage-current" style={{ width: `${current * 100}%` }} />
    <span className="coverage-future" style={{ left: `${current * 100}%`, width: `${Math.max(0, projected - current) * 100}%` }} />
    <span className="coverage-target" style={{ left: `${target * 100}%` }} title={`Programme target ${Math.round(target * 100)}%`} />
  </div>;
}

export default function Home() {
  const [demo, setDemo] = useState<Demo | null>(null);
  const [view, setView] = useState<View>("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [moduleId, setModuleId] = useState("testing");
  const [continuity, setContinuity] = useState<Continuity | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [interventionSkill, setInterventionSkill] = useState("");
  const [gain, setGain] = useState(0.18);
  const [repoUrl, setRepoUrl] = useState("");
  const [programmes, setProgrammes] = useState<Choice[]>([]);
  const [availableModules, setAvailableModules] = useState<ModuleChoice[]>([]);
  const [curriculumCandidate, setCurriculumCandidate] = useState<CurriculumCandidate | null>(null);
  const [cohorts, setCohorts] = useState<Choice[]>([]);
  const [projects, setProjects] = useState<Choice[]>([]);
  const [workspaceIds, setWorkspaceIds] = useState({ programme_id: "sample-se", cohort_id: "sample-cohort", project_id: "sample-record-app" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function applyWorkspace(data: Demo) {
      setDemo(data);
      setProject(data.project);
      setContinuity(data.continuity);
      setForecast(data.forecast);
      setModuleId(data.continuity?.module_id || data.modules[0]?.id || "");
      setInterventionSkill(data.forecast.ranked_findings[0]?.competency || "");
      setWorkspaceIds({programme_id: data.programme.id, cohort_id: data.cohort.id, project_id: data.project.id});
  }

  async function refreshChoices() {
    const [p, c, r, m] = await Promise.all([
      api<Choice[]>("/api/v1/programmes"),
      api<Choice[]>("/api/v1/cohorts"),
      api<Choice[]>("/api/v1/projects"),
      api<ModuleChoice[]>("/api/v1/modules"),
    ]);
    setProgrammes(p); setCohorts(c); setProjects(r); setAvailableModules(m);
  }

  async function inspectCurriculum(id: string) {
    try {
      setCurriculumCandidate(await api<CurriculumCandidate>(`/api/v1/programmes/${id}`));
      setError("");
    } catch (e) { setError((e as Error).message); }
  }

  async function inspectProjectCandidate(id: string) {
    try {
      setProject(await api<Project>(`/api/v1/projects/${id}`));
      setView("evidence");
      setError("");
    } catch (e) { setError((e as Error).message); }
  }

  async function confirmCurriculum() {
    if (!curriculumCandidate) return;
    setBusy(true);
    try {
      await api(`/api/v1/programmes/${curriculumCandidate.id}/confirm`, { method: "POST" });
      setMessage("Curriculum candidate confirmed. Predictions can now use its module outcomes.");
      setCurriculumCandidate(null);
      await refreshChoices();
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("buildforward-workspace");
    let path = "/api/v1/demo";
    if (saved) {
      try { path = `/api/v1/workspace?${new URLSearchParams(JSON.parse(saved))}`; }
      catch { window.localStorage.removeItem("buildforward-workspace"); }
    }
    api<Demo>(path).catch(() => api<Demo>("/api/v1/demo")).then(applyWorkspace)
      .catch(e => setError(e.message));
    void refreshChoices().catch(e => setError(e.message));
  }, []);

  async function loadWorkspace() {
    setBusy(true);
    try {
      const data = await api<Demo>(`/api/v1/workspace?${new URLSearchParams(workspaceIds)}`);
      applyWorkspace(data);
      window.localStorage.setItem("buildforward-workspace", JSON.stringify(workspaceIds));
      setMessage("Workspace loaded.");
      setError("");
      setView("overview");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const selectedModule = availableModules.find(m => m.id === moduleId);
  const top = forecast?.ranked_findings[0];
  const activeIntervention = forecast?.ranked_findings.find(f => f.competency === forecast.intervention?.competency);
  const gapCount = useMemo(() => forecast?.ranked_findings.filter(f => f.projected_gap > 0).length || 0, [forecast]);

  async function runContinuity(nextProject = project, nextModuleId = moduleId) {
    if (!nextProject) return;
    try {
      const result = await api<Continuity>("/api/v1/predictions/continuity", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: nextProject.id, module_id: nextModuleId }),
      });
      setContinuity(result);
      setError("");
    } catch (e) { setError((e as Error).message); }
  }

  async function runScenario() {
    if (!demo || !interventionSkill) return;
    setBusy(true);
    try {
      const result = await api<Forecast>("/api/v1/predictions/cohort-gap", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohort_id: demo.cohort.id,
          intervention: {
            competency: interventionSkill,
            assumed_gain: gain,
            description: "Proposed additional project work in a later module",
          },
        }),
      });
      setForecast(result);
      setError("");
      setMessage("Scenario recalculated. The gain is an assumption, not a measured result.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function importZip(file: File) {
    setBusy(true); setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const candidate = await api<Project>("/api/v1/projects/analyze", { method: "POST", body: form });
      setProject(candidate);
      await refreshChoices();
      setView("evidence");
      setMessage("Repository scanned. Review the candidate evidence, then confirm it.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function importGithub() {
    setBusy(true); setMessage("");
    try {
      const candidate = await api<Project>("/api/v1/projects/analyze-github", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl }),
      });
      setProject(candidate);
      await refreshChoices();
      setView("evidence");
      setMessage("Public repository scanned. Review the candidate evidence, then confirm it.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function confirmProject() {
    if (!project) return;
    setBusy(true);
    try {
      const confirmed = await api<Project>(`/api/v1/projects/${project.id}/confirm`, { method: "POST" });
      setProject(confirmed);
      setContinuity(null);
      await refreshChoices();
      setMessage("Project evidence confirmed. Select a confirmed module before running a continuity comparison.");
      setView("continuity");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function setProjectOrigin(moduleId: string) {
    if (!project) return;
    try {
      const updated = await api<Project>(`/api/v1/projects/${project.id}/origin`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: moduleId }),
      });
      setProject(updated);
      setMessage("Originating module linked. Review the relationship before confirming the project.");
      setError("");
    } catch (e) { setError((e as Error).message); }
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">↗</span><div><strong>BuildForward</strong><small>CURRICULUM INTELLIGENCE</small></div></div>
      <div className="side-rule" />
      <div className="side-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {views.map(item => <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}>
          <span className="nav-number">{item.number}</span><span>{item.name}</span><span className="nav-arrow">↗</span>
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><span className="note-spark">✳</span><span>Decisions stay with educators. BuildForward only predicts, explains and recommends.</span></div>
        <div className="sidebar-footer">PREDICT EARLY · DECIDE BETTER</div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumb">PROGRAMME INTELLIGENCE <span>/</span> {views.find(v => v.id === view)?.name.toUpperCase()}</div><div className="top-actions"><span className="live-dot" /> PROOF OF CONCEPT <span className="top-separator" /> <span className="avatar">BF</span></div></header>
      {error && <div className="alert error" role="alert"><strong>Action needed</strong><span>{error}</span><button onClick={() => setError("")}>×</button></div>}
      {message && <div className="alert success" role="status"><strong>Updated</strong><span>{message}</span><button onClick={() => setMessage("")}>×</button></div>}
      {!demo || !forecast || !project ? <div className="loading">Loading the curriculum workspace…</div> : <>
        {view === "overview" && <>
          <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> THE EARLY SIGNAL</div><h1>See the gap <em>before</em><br /> graduation.</h1><p>Turn the work students have already built into evidence for better curriculum decisions.</p><button className="primary-button" onClick={() => setView("continuity")}>Explore the decision <span>↗</span></button></div><div className="hero-graphic" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="orbit-center"><span>BF</span><small>INSIGHT ENGINE</small></div><span className="orbit-point p1" /><span className="orbit-point p2" /><span className="orbit-point p3" /></div></section>
          <div className="context-strip"><div><span className="context-label">PROGRAMME</span><strong>{demo.programme.name}</strong></div><div><span className="context-label">COHORT</span><strong>{demo.cohort.name}</strong></div><div><span className="context-label">DATA STATUS</span><Provenance value={demo.cohort.provenance} /></div></div>
          <div className="section-heading"><div><div className="eyebrow dark">01 / FORECAST</div><h2>Graduation outlook</h2></div><div className="section-intro">Scenario-based forecast from current coverage and remaining modules. Programme target: <strong>70%</strong>.</div></div>
          <div className="metrics"><article className="metric-card"><span className="metric-icon">↘</span><span className="metric-label">TOP PROJECTED GAP</span><strong>{top ? label(top.competency) : "—"}</strong><span className="metric-foot">{top ? `${Math.round(top.projected_gap * 100)} percentage points below target` : "No gap"}</span></article><article className="metric-card"><span className="metric-icon">◎</span><span className="metric-label">SKILLS BELOW TARGET</span><strong>{gapCount.toString().padStart(2, "0")}</strong><span className="metric-foot">At projected graduation</span></article><article className="metric-card"><span className="metric-icon">↗</span><span className="metric-label">FUTURE MODULES</span><strong>{demo.modules.filter(m => m.semester > demo.cohort.current_semester).length.toString().padStart(2, "0")}</strong><span className="metric-foot">Opportunities to intervene</span></article></div>
          <div className="dashboard-grid"><section className="paper-card coverage-card"><div className="card-title"><div><span className="mini-label">RANKED FINDINGS</span><h3>Where to focus first</h3></div><span className="legend"><i /> Current <i /> Projected</span></div><div className="skill-list">{forecast.ranked_findings.slice(0, 5).map((f, i) => <div className="skill-row" key={f.competency}><div className="skill-title"><span className="rank">{String(i + 1).padStart(2, "0")}</span><strong>{label(f.competency)}</strong><span className={`risk ${f.priority.toLowerCase()}`}>{f.priority}</span></div><CoverageBar current={f.current_coverage} projected={f.projected_graduation_coverage} /><div className="skill-meta"><span><Percent value={f.current_coverage} /> now</span><span><Percent value={f.projected_graduation_coverage} /> projected</span><span>{f.priority_reason}</span></div></div>)}</div><div className="card-footer"><span>│</span> Dashed marker = 70% programme target · Ranked by projected gap</div></section><section className="paper-card opportunity-card"><div className="mini-label">02 / NEXT DECISION</div><h3>One project.<br /><em>Another chapter.</em></h3><p>Before setting a new assignment, compare an existing artifact with the next module.</p><div className="decision-preview"><div><small>EXISTING WORK</small><strong>{project.name}</strong></div><span className="flow-arrow">→</span><div><small>UPCOMING MODULE</small><strong>{selectedModule?.name}</strong></div></div><div className="decision-preview-footer"><span className={`decision-badge ${continuity?.decision.toLowerCase()}`}>{continuity?.decision.replaceAll("_", " ")}</span><button className="text-button" onClick={() => setView("continuity")}>View evidence ↗</button></div></section></div>
          <section className="scenario-card"><div className="scenario-intro"><span className="mini-label">03 / INTERVENTION SCENARIO</span><h3>What if we reinforce a skill?</h3><p>Set an assumed coverage gain to see how the projected graduation gap could change. This is a planning scenario, not measured impact.</p></div><div className="scenario-controls"><label htmlFor="scenario-skill">COMPETENCY</label><select id="scenario-skill" value={interventionSkill} onChange={e => setInterventionSkill(e.target.value)}>{forecast.ranked_findings.filter(f => f.projected_gap > 0).map(f => <option value={f.competency} key={f.competency}>{label(f.competency)}</option>)}</select><label htmlFor="scenario-gain">ASSUMED COVERAGE GAIN <strong>+{Math.round(gain * 100)} points</strong></label><input id="scenario-gain" type="range" min="0" max="0.4" step="0.01" value={gain} onChange={e => setGain(Number(e.target.value))} /><button className="primary-button" disabled={busy} onClick={runScenario}>Compare scenarios <span>↗</span></button></div><div className="scenario-result"><span className="mini-label">PROJECTED GRADUATION GAP</span>{activeIntervention ? <><div><small>WITHOUT</small><strong><Percent value={activeIntervention.projected_gap} /></strong></div><span className="scenario-arrow">→</span><div><small>WITH PROPOSED WORK</small><strong><Percent value={activeIntervention.with_intervention_gap} /></strong></div><p>Potential reduction: <strong>{Math.round(activeIntervention.potential_gap_reduction * 100)} percentage points</strong> under your assumption.</p></> : <p>Choose a competency and compare the two projections.</p>}</div></section>
          <div className="method-note"><strong>Read this forecast carefully.</strong> {forecast.method}. Each remaining module is assumed to add 22 percentage points of coverage for its target competencies. These are scenario assumptions, not measured student outcomes. No market data has been added yet.</div>
        </>}

        {view === "continuity" && <>
          <div className="page-intro"><div className="eyebrow dark">02 / PROJECT CONTINUITY</div><h1>Should this work <em>carry forward?</em></h1><p>Compare project evidence with the outcomes of an upcoming module. The final teaching decision remains yours.</p></div>
          <div className="compare-controls"><div><label htmlFor="project-select">PROJECT ARTIFACT</label><strong id="project-select">{project.name}</strong><Provenance value={project.provenance} /></div><span>×</span><div><label htmlFor="module-select">TARGET MODULE</label><select id="module-select" value={moduleId} onChange={e => { setModuleId(e.target.value); setContinuity(null); }}>{availableModules.filter(m => m.provenance !== "EXTRACTED_CANDIDATE").map(m => <option value={m.id} key={m.id}>{m.name} · S{m.semester} · {m.programme_name}</option>)}</select></div><button className="primary-button" disabled={project.provenance === "EXTRACTED_CANDIDATE" || !availableModules.length} onClick={() => void runContinuity()}>Run comparison ↗</button></div>
          <div className="result-grid"><div className="result-main"><div className="mini-label">RECOMMENDATION · HEURISTIC BASELINE</div><div className="result-word">{continuity?.decision.replaceAll("_", " ")}</div><p>{continuity?.reason}</p><div className="score-row"><div><span>Prerequisites evidenced</span><strong><Percent value={continuity?.prerequisite_coverage || 0} /></strong></div><div><span>Reusable signals</span><strong>{continuity?.reuse_signals.length || 0}</strong></div><div><span>To develop next</span><strong>{continuity?.target_to_develop.length || 0}</strong></div></div></div><div className="result-side"><span className="mini-label">WHY THIS RESULT</span><h3>Evidence before opinion.</h3><div className="factor-list"><div><span className="factor-symbol positive">+</span><span>Matched prerequisites</span><strong>{continuity?.matched_prerequisites.map(label).join(", ") || "None"}</strong></div><div><span className="factor-symbol positive">+</span><span>Reusable signals</span><strong>{continuity?.reuse_signals.map(label).join(", ") || "None"}</strong></div><div><span className="factor-symbol negative">−</span><span>Missing prerequisites</span><strong>{continuity?.missing_prerequisites.map(label).join(", ") || "None"}</strong></div></div><button className="outline-button" onClick={() => setView("evidence")}>Inspect source evidence ↗</button></div></div>
          <div className="two-column"><section className="paper-card"><span className="mini-label">NEXT MODULE OUTCOMES</span><h3>{selectedModule?.name}</h3><ul className="outcome-list">{selectedModule?.outcomes.map(item => <li key={item}>{item}</li>)}</ul></section><section className="paper-card"><span className="mini-label">POSSIBLE EVOLUTION</span><h3>Build on what exists</h3><p>Target the skills this project has not yet demonstrated:</p><div className="tag-list">{continuity?.target_to_develop.map(skill => <span key={skill}>{label(skill)}</span>)}</div></section></div>
          <div className="method-note">{continuity?.method}. The label supports lecturer review; it does not authorize changing an assignment.</div>
        </>}

        {view === "evidence" && <>
          <div className="page-intro"><div className="eyebrow dark">03 / ARTIFACT EVIDENCE</div><h1>Trace every <em>claim.</em></h1><p>Static repository signals remain candidates until a person reviews and confirms them.</p></div>
          <div className="evidence-summary"><div><span className="mini-label">ARTIFACT</span><h2>{project.name}</h2><p>{project.source_label}</p></div><div className="evidence-stats"><div><strong>{project.files_scanned}</strong><span>files scanned</span></div><div><strong>{project.competencies.length}</strong><span>candidate skills</span></div><div><strong>{project.languages.join(", ") || "—"}</strong><span>languages</span></div></div></div>
          {project.provenance === "EXTRACTED_CANDIDATE" && <div className="origin-review"><label htmlFor="origin-module">ORIGINATING MODULE (REVIEW)</label><select id="origin-module" value={project.originating_module_id || ""} onChange={e => { if (e.target.value) void setProjectOrigin(e.target.value); }}><option value="">Choose if known</option>{availableModules.map(m => <option key={m.id} value={m.id}>{m.name} · S{m.semester} · {m.programme_name} · {m.provenance.replaceAll("_", " ")}</option>)}</select><p>Link the artifact to its source coursework when the relationship is known. Candidate modules still require separate confirmation.</p></div>}
          <div className="evidence-header"><h3>Competency evidence</h3><Provenance value={project.provenance} /></div>
          <div className="evidence-table"><div className="table-head"><span>COMPETENCY</span><span>SOURCE</span><span>OBSERVATION</span></div>{project.evidence.map((e, i) => <div className="evidence-row" key={i}><strong>{label(e.competency)}</strong><code>{e.source}</code><span>{e.detail}</span></div>)}</div>
          {project.evidence.length === 0 && <div className="empty-state">No supported signals found. Review the repository manually before drawing a conclusion.</div>}
          {project.provenance === "EXTRACTED_CANDIDATE" && <div className="review-box"><div><strong>Human review required</strong><p>Confirm only if these observations are accurate. This action promotes candidate evidence into the prediction pipeline.</p></div><button className="primary-button" disabled={busy} onClick={confirmProject}>Confirm evidence ↗</button></div>}
          <div className="method-note">Static inspection cannot prove proficiency, code quality, successful test execution, or deployment. Review source files and project context before relying on this evidence.</div>
        </>}

        {view === "sources" && <>
          <div className="page-intro"><div className="eyebrow dark">04 / DATA SOURCES</div><h1>Ground the model <em>in real work.</em></h1><p>Import an actual project to replace the illustrative artifact. Extracted signals are held for review before prediction.</p></div>
          <div className="source-grid"><section className="source-card"><span className="source-icon">↗</span><span className="mini-label">PUBLIC REPOSITORY</span><h3>Connect GitHub</h3><p>Analyze a public repository’s source tree, tests, workflows and dependency files.</p><label htmlFor="repo-url">REPOSITORY URL</label><input id="repo-url" type="url" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} /><button className="primary-button" disabled={busy || !repoUrl} onClick={importGithub}>Analyze repository <span>↗</span></button></section><section className="source-card"><span className="source-icon">▤</span><span className="mini-label">LOCAL ARTIFACT</span><h3>Upload ZIP</h3><p>Inspect a project archive without running its code. Maximum compressed size: 20 MB.</p><label className="upload-zone" htmlFor="zip-upload"><span>＋</span><strong>Choose a ZIP archive</strong><small>Files remain candidate evidence until confirmed</small></label><input id="zip-upload" className="sr-only" type="file" accept=".zip,application/zip" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void importZip(file); }} /></section></div>
          <div className="workspace-picker"><div><span className="mini-label">ACTIVE WORKSPACE</span><h3>Choose the evidence set</h3><p>Confirmed sources can be paired for a new comparison. The cohort must belong to the selected programme.</p></div><label>PROGRAMME<select value={workspaceIds.programme_id} onChange={e => {const id=e.target.value; const cohort=cohorts.find(c => c.programme_id===id);setWorkspaceIds(w=>({...w,programme_id:id,cohort_id:cohort?.id||""}));}}>{programmes.filter(p=>p.provenance!=="EXTRACTED_CANDIDATE").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>COHORT<select value={workspaceIds.cohort_id} onChange={e=>setWorkspaceIds(w=>({...w,cohort_id:e.target.value}))}>{cohorts.filter(c=>c.programme_id===workspaceIds.programme_id&&c.provenance!=="EXTRACTED_CANDIDATE").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>PROJECT<select value={workspaceIds.project_id} onChange={e=>setWorkspaceIds(w=>({...w,project_id:e.target.value}))}>{projects.filter(p=>p.provenance!=="EXTRACTED_CANDIDATE").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="primary-button" disabled={busy||!workspaceIds.cohort_id} onClick={loadWorkspace}>Load workspace ↗</button></div>
          {programmes.some(p => p.provenance === "EXTRACTED_CANDIDATE") && <section className="paper-card curriculum-review"><div className="card-title"><div><span className="mini-label">CURRICULUM CANDIDATE</span><h3>Review imported module material</h3></div><Provenance value="EXTRACTED_CANDIDATE" /></div><div className="candidate-list">{programmes.filter(p => p.provenance === "EXTRACTED_CANDIDATE").map(p => <button className="outline-button" key={p.id} onClick={() => void inspectCurriculum(p.id)}>{p.name} · inspect ↗</button>)}</div>{curriculumCandidate && <><p className="method-note">{curriculumCandidate.source_label}</p><div className="candidate-modules">{curriculumCandidate.modules.map(m => <article key={m.id}><span className="mini-label">SEMESTER {m.semester}</span><h4>{m.name}</h4><strong>Learning outcomes</strong><ul className="outcome-list">{m.outcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul><strong>Assignment summary</strong><p>{m.assignment}</p></article>)}</div>{curriculumCandidate.provenance === "EXTRACTED_CANDIDATE" && <div className="review-box"><div><strong>Educator review required</strong><p>Check module names, semester order, outcomes and summaries against the supplied source files before confirming this full set.</p></div><button className="primary-button" disabled={busy} onClick={() => void confirmCurriculum()}>Confirm curriculum ↗</button></div>}</>}</section>}
          {projects.some(p => p.provenance === "EXTRACTED_CANDIDATE") && <section className="paper-card curriculum-review"><div className="card-title"><div><span className="mini-label">PROJECT CANDIDATE</span><h3>Review repository evidence</h3></div><Provenance value="EXTRACTED_CANDIDATE" /></div><p>Inspect static evidence for the supplied public repository. Its OODJ source module is linked as a candidate relationship.</p><div className="candidate-list">{projects.filter(p => p.provenance === "EXTRACTED_CANDIDATE").map(p => <button className="outline-button" key={p.id} onClick={() => void inspectProjectCandidate(p.id)}>{p.name} · inspect evidence ↗</button>)}</div></section>}
          <div className="source-status"><div><span className="mini-label">CURRENT SOURCE REGISTER</span><h3>What this demo is using</h3></div><div><span>Curriculum</span><Provenance value={demo.programme.provenance} /></div><div><span>Project</span><Provenance value={project.provenance} /></div><div><span>Cohort</span><Provenance value={demo.cohort.provenance} /></div><div><span>Market signals</span><strong>Not supplied</strong></div></div>
          <div className="method-note">Curriculum import is available through <code>POST /api/v1/programmes/import</code> and must be confirmed before it is used. The OpenAPI schema is available at <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API documentation ↗</a>.</div>
        </>}
      </>}
      <footer className="footer"><span>BUILDFORWARD / PREDICTIVE CURRICULUM INTELLIGENCE</span><span>Human decision required for every recommendation.</span></footer>
    </main>
  </div>;
}
