import { label, type Project } from "@/lib/api";

type Choice = { id: string; name: string; provenance: string; originating_module_id?: string | null };
type ModuleChoice = { id: string; name: string; semester: number; programme_id: string; programme_name: string; provenance: string };
type CurriculumCandidate = {
  id: string;
  name: string;
  source_label: string;
  provenance: string;
  modules: {
    id: string; name: string; semester: number; outcomes: string[]; assignment: string;
    provenance: string; required_competencies: string[] | null; prerequisite_mapping_status: string;
  }[];
};

function Provenance({ value }: { value: string }) {
  return <span className={`provenance ${value.toLowerCase()}`}>{value.replaceAll("_", " ").toLowerCase()}</span>;
}

export function SourcesWorkspace({
  candidateProgrammes, candidateProjects, modules, curriculumCandidate, candidateProject, repoUrl, busy,
  onInspectCurriculum, onConfirmCurriculum, onInspectProject, onRepoUrlChange, onAnalyzeGithub,
  onImportZip, onProjectOrigin, onConfirmProject,
}: {
  candidateProgrammes: Choice[];
  candidateProjects: Choice[];
  modules: ModuleChoice[];
  curriculumCandidate: CurriculumCandidate | null;
  candidateProject: Project | null;
  repoUrl: string;
  busy: boolean;
  onInspectCurriculum: (id: string) => void;
  onConfirmCurriculum: () => void;
  onInspectProject: (id: string) => void;
  onRepoUrlChange: (url: string) => void;
  onAnalyzeGithub: () => void;
  onImportZip: (file: File) => void;
  onProjectOrigin: (id: string) => void;
  onConfirmProject: () => void;
}) {
  const moduleById = new Map(modules.map(module => [module.id, module]));
  const orderedCandidateProjects = [...candidateProjects].sort((a, b) => {
    const moduleA = a.originating_module_id ? moduleById.get(a.originating_module_id) : undefined;
    const moduleB = b.originating_module_id ? moduleById.get(b.originating_module_id) : undefined;
    return (moduleA?.programme_name ?? "").localeCompare(moduleB?.programme_name ?? "")
      || (moduleA?.semester ?? Number.MAX_SAFE_INTEGER) - (moduleB?.semester ?? Number.MAX_SAFE_INTEGER)
      || a.name.localeCompare(b.name);
  });

  return <section className="view-panel" aria-labelledby="sources-title">
    <div className="view-intro"><div><p className="eyebrow">DATA SOURCES · REVIEW</p><h2 id="sources-title">Review learning and project information</h2></div>
      <p>Review imported coursework and repository evidence before using them in forecasts.</p></div>

    <div className="sources-grid">
      <section className="surface source-panel" aria-labelledby="curriculum-sources-title">
        <div className="surface-heading"><div><p className="eyebrow">PROGRAMME INPUTS</p><h3 id="curriculum-sources-title">Coursework to review</h3></div><span className="count-pill">{candidateProgrammes.length} to review</span></div>
        {candidateProgrammes.length ? <div className="candidate-list">{candidateProgrammes.map(item => <article className="candidate-row" key={item.id}>
          <div className="candidate-row-main"><strong>{item.name}</strong><Provenance value={item.provenance} /></div>
          <button type="button" className="secondary-button" onClick={() => onInspectCurriculum(item.id)}>Review materials</button>
        </article>)}</div> : <div className="empty-state compact-empty"><h4>No coursework candidates</h4><p>Imported candidate material will appear here for review.</p></div>}
        {curriculumCandidate && <div className="candidate-detail">
          <div className="candidate-detail-heading"><div><span className="eyebrow">SOURCE REVIEW</span><h4>{curriculumCandidate.name}</h4></div><Provenance value={curriculumCandidate.provenance} /></div>
          <p className="source-label">{curriculumCandidate.source_label}</p>
          <div className="programme-warning"><strong>User-provided semester order</strong><span>These briefs follow your Semester 1–5 labels. The Semester 1 brief identifies Diploma coursework, so this sequence remains a candidate rather than an officially verified programme specification. Degree-level OODJ material stays separate.</span></div>
          <div className="module-review-list">{curriculumCandidate.modules.map(item => <article key={item.id}>
            <div><span>SEMESTER {item.semester}</span><strong>{item.name}</strong></div><p>{item.assignment}</p>
            <p><strong>Required-skill mapping:</strong> {item.prerequisite_mapping_status === "UNKNOWN"
              ? "Unknown; map required skills or explicitly confirm none before curriculum confirmation."
              : item.required_competencies?.length
                ? item.required_competencies.map(label).join(", ")
                : item.prerequisite_mapping_status === "CONFIRMED_NONE"
                  ? "Reviewed: no required skills."
                  : "No required skills recorded in the candidate source."}</p>
            {item.outcomes.length > 0 && <ul>{item.outcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul>}
          </article>)}</div>
          {curriculumCandidate.provenance === "EXTRACTED_CANDIDATE" && <button type="button" className="secondary-button" disabled={busy} onClick={onConfirmCurriculum}>Confirm reviewed source</button>}
        </div>}
      </section>

      <section className="surface source-panel" aria-labelledby="project-sources-title">
        <div className="surface-heading"><div><p className="eyebrow">PROJECT INPUTS</p><h3 id="project-sources-title">Student projects and repositories</h3></div><span className="count-pill">{candidateProjects.length} to review</span></div>
        {candidateProjects.length > 0 ? <div className="candidate-list">{orderedCandidateProjects.map(item => <article className="candidate-row" key={item.id}>
          <div className="candidate-row-main"><strong>{item.name}</strong>{item.originating_module_id && moduleById.get(item.originating_module_id) && <span className="candidate-semester">{moduleById.get(item.originating_module_id)?.programme_name} · Semester {moduleById.get(item.originating_module_id)?.semester} · {moduleById.get(item.originating_module_id)?.name}</span>}<Provenance value={item.provenance} /></div>
          <button type="button" className="secondary-button" onClick={() => onInspectProject(item.id)}>Review evidence</button>
        </article>)}</div> : <div className="empty-state compact-empty"><h4>No project evidence to review</h4><p>Submitted project reports and analyzed repositories will appear here for review.</p></div>}
        <form className="import-form" onSubmit={e => { e.preventDefault(); onAnalyzeGithub(); }}>
          <label className="field" htmlFor="repo-url"><span>Public GitHub project repository</span><input id="repo-url" type="url" autoComplete="url" placeholder="https://github.com/owner/repository" value={repoUrl} onChange={e => onRepoUrlChange(e.target.value)} /></label>
          <button type="submit" className="secondary-button" disabled={busy || !repoUrl}>Inspect repository</button>
        </form>
        <label className="field upload-field"><span>Or upload a project ZIP</span><input type="file" accept=".zip,application/zip" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) onImportZip(file); }} /></label>
        {candidateProject && <div className="candidate-detail">
          <div className="candidate-detail-heading"><div><span className="eyebrow">SOURCE REVIEW</span><h4>{candidateProject.name}</h4></div><Provenance value={candidateProject.provenance} /></div>
          <p className="source-label">{candidateProject.source_label} · {candidateProject.files_scanned ? `${candidateProject.files_scanned} source files scanned` : "No repository files scanned"}</p>
          {candidateProject.provenance === "EXTRACTED_CANDIDATE" && <label className="field origin-field"><span>Link to coursework only if verified</span><select value={candidateProject.originating_module_id || ""} onChange={e => { if (e.target.value) onProjectOrigin(e.target.value); }}>
            <option value="">No coursework link selected</option>
            {modules.map(module => <option key={module.id} value={module.id}>{module.name} · {module.programme_name} · {module.provenance.replaceAll("_", " ").toLowerCase()}</option>)}
          </select></label>}
          {candidateProject.evidence.length ? <div className="candidate-evidence-list">{candidateProject.evidence.map((item, index) => <article key={`${item.source}-${index}`}><strong>{label(item.competency)}</strong><span>{item.detail}</span><code>{item.source}</code></article>)}</div>
            : <p className="empty-note">No supported signals were found. Review the repository manually before drawing a conclusion.</p>}
          <p className="small-note">Evidence comes from the report summary or a static repository inspection. Code was not run; evidence does not prove quality, passing tests, or a student’s skill level.</p>
          {candidateProject.provenance === "EXTRACTED_CANDIDATE" && <button type="button" className="secondary-button" disabled={busy} onClick={onConfirmProject}>Confirm reviewed evidence</button>}
        </div>}
      </section>
    </div>
  </section>;
}
