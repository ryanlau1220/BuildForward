"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { api, studentIntakeLabel, type Continuity, type Demo, type Forecast, type Project } from "@/lib/api";
import { ContinuityWorkspace } from "@/components/continuity-workspace";
import { CohortOutlook } from "@/components/cohort-outlook";
import { SourcesWorkspace } from "@/components/sources-workspace";

type View = "cohort" | "continuity" | "sources";
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
  assignment: string;
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
    required_competencies: string[] | null;
    prerequisite_mapping_status: string;
  }[];
};

const viewLabels: Record<View, string> = {
  continuity: "Project Reuse Check",
  cohort: "Graduation Skills Forecast",
  sources: "Data Sources",
};
const mobileViewLabels: Record<View, string> = {
  continuity: "Project Reuse",
  cohort: "Skills Forecast",
  sources: "Data Sources",
};

export default function Home() {
  const [view, setView] = useState<View>("cohort");
  const [demo, setDemo] = useState<Demo | null>(null);
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

  const project = demo?.project;
  const programmeModules = useMemo(() => {
    if (!demo) return [];
    return modules
      .filter(m => m.programme_id === demo.programme.id
        && (m.provenance === "SAMPLE" || m.provenance === "CONFIRMED_FACT"))
      .filter(m => m.semester > demo.cohort.current_semester)
      .sort((a, b) => a.semester - b.semester);
  }, [demo, modules]);
  const selectedModule = programmeModules.find(m => m.id === moduleId);
  const positiveGaps = forecast?.ranked_findings.filter(f => f.projected_gap > 0) || [];
  const linkedFocus = selectedModule && continuity
    ? positiveGaps.find(f => continuity.target_to_develop.includes(f.competency)
      && selectedModule.target_competencies?.includes(f.competency))?.competency
    : undefined;
  const activeIntervention = forecast?.intervention
    ? forecast.ranked_findings.find(f => f.competency === forecast.intervention?.competency)
    : undefined;

  function applyWorkspace(data: Demo) {
    setDemo(data);
    setContinuity(data.continuity);
    setForecast(data.forecast);
    setModuleId(data.continuity?.module_id || "");
    setWorkspaceIds({ programme_id: data.programme.id, cohort_id: data.cohort.id, project_id: data.project.id });
    const targetModule = data.modules.find(m => m.id === data.continuity?.module_id);
    const suggested = data.forecast.ranked_findings.find(f => f.projected_gap > 0
      && data.continuity?.target_to_develop.includes(f.competency)
      && targetModule?.target_competencies.includes(f.competency));
    setInterventionSkill(suggested?.competency
      || data.forecast.ranked_findings.find(f => f.projected_gap > 0)?.competency || "");
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
      setMessage("Student intake and project selection updated.");
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
      const suggested = positiveGaps.find(f => result.target_to_develop.includes(f.competency)
        && selectedModule.target_competencies?.includes(f.competency))?.competency;
      if (suggested) setInterventionSkill(suggested);
      setMessage("Project reuse check complete. Review the evidence and decide whether to reuse the project.");
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
        body: JSON.stringify({ cohort_id: demo.cohort.id, intervention: {
          competency: interventionSkill,
          assumed_gain: gain,
          description: "Proposed project work to reinforce this competency",
        } }),
      });
      setForecast(result);
      setMessage("Graduation skills forecast recalculated using your stated action assumption.");
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
      const result = await api<{ next_step: string }>(
        `/api/v1/programmes/${curriculumCandidate.id}/confirm`, { method: "POST" },
      );
      setCurriculumCandidate(null);
      await refreshChoices();
      setMessage(`${result.next_step}. Check the programme sequence separately.`);
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
      setMessage("Repository inspected. Review the extracted evidence before confirming it.");
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
      setMessage("Repository inspected. Review the extracted evidence before confirming it.");
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
      setMessage("Coursework link saved as candidate context. Confirm it only if verified.");
      setError("");
    } catch (e) { setError((e as Error).message); }
  }

  async function confirmProject() {
    if (!candidateProject) return;
    setBusy(true);
    try {
      setCandidateProject(await api<Project>(`/api/v1/projects/${candidateProject.id}/confirm`, { method: "POST" }));
      await refreshChoices();
      setMessage("Project evidence marked reviewed. It stays separate from the active project until selected.");
      setError("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const candidateProgrammes = programmes.filter(p => p.provenance === "EXTRACTED_CANDIDATE");
  const candidateProjects = projects.filter(p => p.provenance === "EXTRACTED_CANDIDATE");
  const compatibleCohorts = cohorts.filter(c => c.programme_id === workspaceIds.programme_id
    && c.provenance !== "EXTRACTED_CANDIDATE");
  const compatibleModules = modules.filter(m => m.programme_id === workspaceIds.programme_id);
  const compatibleProjects = projects.filter(p => p.provenance !== "EXTRACTED_CANDIDATE"
    && (!p.originating_module_id || compatibleModules.some(m => m.id === p.originating_module_id
      && m.provenance !== "EXTRACTED_CANDIDATE")));
  const provenanceStatus = demo?.cohort.provenance === "SIMULATED" || demo?.programme.provenance === "SAMPLE"
    ? "Demo data · simulated student intake"
    : "Reviewed sources · assumptions remain";

  if (loading) return <main className="loading-screen" aria-live="polite"><span className="loading-mark" />Loading decision workspace…</main>;

  return <div className="app-shell">
    <aside className="app-sidebar">
      <a className="brand" href="/" aria-label="BuildForward workspace"><Image className="brand-logo" src="/brand/logo.png" alt="BuildForward" width={1606} height={709} priority /></a>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Workspace views">
        {(Object.keys(viewLabels) as View[]).map(item => <button
          className={`nav-item ${view === item ? "active" : ""}`}
          type="button"
          aria-label={viewLabels[item]}
          aria-current={view === item ? "page" : undefined}
          key={item}
          onClick={() => { setView(item); setError(""); setMessage(""); }}
        ><span className="nav-label-full">{viewLabels[item]}</span><span className="nav-label-mobile" aria-hidden="true">{mobileViewLabels[item]}</span></button>)}
      </nav>
    </aside>

    <main className="main-area">
      <header className="workspace-header">
        <div className="workspace-switcher" aria-label="Active decision inputs">
          <label><span>PROGRAMME</span><select aria-label="Select programme" value={workspaceIds.programme_id} onChange={e => {
            const programmeId = e.target.value;
            const cohort = cohorts.find(c => c.programme_id === programmeId && c.provenance !== "EXTRACTED_CANDIDATE");
            const projectChoice = projects.find(p => p.provenance !== "EXTRACTED_CANDIDATE"
              && (!p.originating_module_id || modules.some(m => m.id === p.originating_module_id
                && m.programme_id === programmeId && m.provenance !== "EXTRACTED_CANDIDATE")));
            setWorkspaceIds({ programme_id: programmeId, cohort_id: cohort?.id || "", project_id: projectChoice?.id || "" });
          }}>{programmes.filter(p => p.provenance !== "EXTRACTED_CANDIDATE").map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
          <label><span>STUDENT INTAKE</span><select aria-label="Select student intake" value={workspaceIds.cohort_id} onChange={e => setWorkspaceIds(w => ({ ...w, cohort_id: e.target.value }))}>{compatibleCohorts.map(c => <option key={c.id} value={c.id}>{studentIntakeLabel(c.name)}</option>)}</select></label>
          <label><span>PROJECT</span><select aria-label="Select project" value={workspaceIds.project_id} onChange={e => setWorkspaceIds(w => ({ ...w, project_id: e.target.value }))}>{compatibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <button className="load-button" type="button" disabled={busy || !workspaceIds.cohort_id || !workspaceIds.project_id} onClick={() => void loadWorkspace()} aria-busy={busy}>Load</button>
        </div>
      </header>

      <div className="content-wrap">
        {error && <div className="notice notice-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
        {message && <div className="notice notice-success" role="status"><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Dismiss message">×</button></div>}
        {!demo || !forecast || !project ? <section className="empty-workspace"><h2>Decision inputs are unavailable</h2><p>Check that the API is running, then reload this workspace.</p></section> : <>
          <div className="data-status"><span className="status-dot" /><span>{provenanceStatus}</span></div>
          {view === "continuity" && <ContinuityWorkspace
            project={project}
            modules={programmeModules}
            selectedModule={selectedModule}
            moduleId={moduleId}
            continuity={continuity}
            busy={busy}
            onModuleChange={id => { setModuleId(id); setContinuity(null); }}
            onCompare={() => void runContinuity()}
          />}
          {view === "cohort" && <CohortOutlook
            demo={demo}
            positiveGaps={positiveGaps}
            interventionSkill={interventionSkill}
            gain={gain}
            busy={busy}
            linkedFocus={linkedFocus}
            activeIntervention={activeIntervention}
            continuity={continuity}
            selectedModule={selectedModule}
            project={project}
            onSkillChange={skill => { setInterventionSkill(skill); setForecast(current => current ? { ...current, intervention: null } : current); }}
            onGainChange={value => { setGain(value); setForecast(current => current ? { ...current, intervention: null } : current); }}
            onCompare={() => void runScenario()}
          />}
          {view === "sources" && <SourcesWorkspace
            candidateProgrammes={candidateProgrammes}
            candidateProjects={candidateProjects}
            modules={modules}
            curriculumCandidate={curriculumCandidate}
            candidateProject={candidateProject}
            repoUrl={repoUrl}
            busy={busy}
            onInspectCurriculum={id => void inspectCurriculum(id)}
            onConfirmCurriculum={() => void confirmCurriculum()}
            onInspectProject={id => void inspectProject(id)}
            onRepoUrlChange={setRepoUrl}
            onAnalyzeGithub={() => void importGithub()}
            onImportZip={file => void importZip(file)}
            onProjectOrigin={id => void setProjectOrigin(id)}
            onConfirmProject={() => void confirmProject()}
          />}
        </>}
      </div>
      <footer className="main-footer">BuildForward supports educator decisions. It does not make curriculum changes.</footer>
    </main>
  </div>;
}
