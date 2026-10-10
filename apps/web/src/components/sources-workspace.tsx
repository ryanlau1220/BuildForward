import { label, type Project } from "@/lib/api";

type Choice = { id: string; name: string; provenance: string };
type ModuleChoice = { id: string; name: string; semester: number; programme_id: string; programme_name: string; provenance: string };
type CurriculumCandidate = {
  id: string;
  name: string;
  source_label: string;
  provenance: string;
  modules: { id: string; name: string; semester: number; outcomes: string[]; assignment: string; provenance: string }[];
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
  return <section className="view-panel" aria-labelledby="sources-title">
    <div className="view-intro"><div><p className="eyebrow">DATA REVIEW</p><h2 id="sources-title">Inspect inputs before using them</h2></div>
      <p>Imported coursework and repository scans remain candidates until reviewed. Confirming extracted details does not validate a programme sequence or prove student proficiency.</p></div>

    <div className="sources-grid">
      <section className="surface source-panel" aria-labelledby="curriculum-sources-title">
        <div className="surface-heading"><div><p className="eyebrow">PROGRAMME INPUTS</p><h3 id="curriculum-sources-title">Coursework candidates</h3></div><span className="count-pill">{candidateProgrammes.length} to review</span></div>
        {candidateProgrammes.length ? <div className="candidate-list">{candidateProgrammes.map(item => <article className="candidate-row" key={item.id}>
          <div className="candidate-row-main"><strong>{item.name}</strong><Provenance value={item.provenance} /></div>
          <button type="button" className="secondary-button" onClick={() => onInspectCurriculum(item.id)}>Review materials</button>
        </article>)}</div> : <div className="empty-state compact-empty"><h4>No coursework candidates</h4><p>Imported candidate material will appear here for review.</p></div>}
        {curriculumCandidate && <div className="candidate-detail">
          <div className="candidate-detail-heading"><div><span className="eyebrow">SOURCE REVIEW</span><h4>{curriculumCandidate.name}</h4></div><Provenance value={curriculumCandidate.provenance} /></div>
          <p className="source-label">{curriculumCandidate.source_label}</p>
          <div className="programme-warning"><strong>Programme alignment is unverified</strong><span>The supplied briefs may span different qualifications. Keep them separate until an educator verifies the sequence.</span></div>
          <div className="module-review-list">{curriculumCandidate.modules.map(item => <article key={item.id}>
            <div><span>SEMESTER {item.semester}</span><strong>{item.name}</strong></div><p>{item.assignment}</p>
            {item.outcomes.length > 0 && <ul>{item.outcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul>}
          </article>)}</div>
          {curriculumCandidate.provenance === "EXTRACTED_CANDIDATE" && <button type="button" className="secondary-button" disabled={busy} onClick={onConfirmCurriculum}>Confirm reviewed source</button>}
        </div>}
      </section>

      <section className="surface source-panel" aria-labelledby="project-sources-title">
        <div className="surface-heading"><div><p className="eyebrow">PROJECT INPUTS</p><h3 id="project-sources-title">Repository evidence</h3></div><span className="count-pill">{candidateProjects.length} to review</span></div>
        {candidateProjects.length > 0 && <div className="candidate-list">{candidateProjects.map(item => <article className="candidate-row" key={item.id}>
          <div className="candidate-row-main"><strong>{item.name}</strong><Provenance value={item.provenance} /></div>
          <button type="button" className="secondary-button" onClick={() => onInspectProject(item.id)}>Review evidence</button>
        </article>)}</div>}
        <form className="import-form" onSubmit={e => { e.preventDefault(); onAnalyzeGithub(); }}>
          <label className="field" htmlFor="repo-url"><span>Public GitHub repository</span><input id="repo-url" type="url" autoComplete="url" placeholder="https://github.com/owner/repository" value={repoUrl} onChange={e => onRepoUrlChange(e.target.value)} /></label>
          <button type="submit" className="secondary-button" disabled={busy || !repoUrl}>Analyze repository</button>
        </form>
        <label className="field upload-field"><span>Or upload a source ZIP</span><input type="file" accept=".zip,application/zip" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) onImportZip(file); }} /></label>
        {candidateProject && <div className="candidate-detail">
          <div className="candidate-detail-heading"><div><span className="eyebrow">SOURCE REVIEW</span><h4>{candidateProject.name}</h4></div><Provenance value={candidateProject.provenance} /></div>
          <p className="source-label">{candidateProject.source_label} · {candidateProject.files_scanned} source files scanned</p>
          {candidateProject.provenance === "EXTRACTED_CANDIDATE" && <label className="field origin-field"><span>Link to coursework only if verified</span><select value={candidateProject.originating_module_id || ""} onChange={e => { if (e.target.value) onProjectOrigin(e.target.value); }}>
            <option value="">No coursework link selected</option>
            {modules.map(module => <option key={module.id} value={module.id}>{module.name} · {module.programme_name} · {module.provenance.replaceAll("_", " ").toLowerCase()}</option>)}
          </select></label>}
          {candidateProject.evidence.length ? <div className="candidate-evidence-list">{candidateProject.evidence.map((item, index) => <article key={`${item.source}-${index}`}><strong>{label(item.competency)}</strong><span>{item.detail}</span><code>{item.source}</code></article>)}</div>
            : <p className="empty-note">No supported signals were found. Review the repository manually before drawing a conclusion.</p>}
          <p className="small-note">Static scanning does not run code or prove code quality, successful tests or proficiency.</p>
          {candidateProject.provenance === "EXTRACTED_CANDIDATE" && <button type="button" className="secondary-button" disabled={busy} onClick={onConfirmProject}>Confirm reviewed evidence</button>}
        </div>}
      </section>
    </div>
  </section>;
}
