import { label, type Continuity, type Project } from "@/lib/api";

type ModuleOption = {
  id: string;
  name: string;
  semester: number;
  outcomes: string[];
  target_competencies?: string[];
};

function Provenance({ value }: { value: string }) {
  return <span className={`provenance ${value.toLowerCase()}`}>{value.replaceAll("_", " ").toLowerCase()}</span>;
}

export function ContinuityWorkspace({
  project, modules, selectedModule, moduleId, continuity, busy, onModuleChange, onCompare,
}: {
  project: Project;
  modules: ModuleOption[];
  selectedModule: ModuleOption | undefined;
  moduleId: string;
  continuity: Continuity | null;
  busy: boolean;
  onModuleChange: (id: string) => void;
  onCompare: () => void;
}) {
  return <section className="view-panel" aria-labelledby="continuity-title">
    <div className="view-intro"><div><p className="eyebrow">PROJECT × UPCOMING MODULE</p><h2 id="continuity-title">Assess whether prior work can carry forward</h2></div>
      <p>Compare repository evidence with the selected module’s expectations. The result is a review signal for an educator.</p></div>

    <div className="continuity-grid">
      <section className="surface project-summary" aria-labelledby="project-title">
        <div className="surface-heading"><div><p className="eyebrow">PROJECT EVIDENCE</p><h3 id="project-title">{project.name}</h3></div><Provenance value={project.provenance} /></div>
        <p className="source-label">{project.source_label}</p>
        <dl className="project-meta"><div><dt>Signals found</dt><dd>{project.evidence.length}</dd></div><div><dt>Languages</dt><dd>{project.languages.length ? project.languages.map(label).join(", ") : "Not detected"}</dd></div><div><dt>Files scanned</dt><dd>{project.files_scanned || "—"}</dd></div></dl>
        {project.evidence.length > 0 ? <div className="evidence-list">
          <div className="list-heading"><span>Detected evidence</span><span>Source</span></div>
          {project.evidence.map((item, index) => <article className="evidence-row" key={`${item.source}-${index}`}>
            <div><strong>{label(item.competency)}</strong><p>{item.detail}</p></div><code>{item.source}</code>
          </article>)}
        </div> : <p className="empty-note">No static evidence was detected. Review the repository manually before relying on a comparison.</p>}
        <p className="small-note">Detected files and dependencies indicate possible use; they do not prove code quality, test success or student proficiency.</p>
      </section>

      <section className="surface comparison-panel" aria-labelledby="comparison-title">
        <div className="surface-heading"><div><p className="eyebrow">CONTINUITY REVIEW</p><h3 id="comparison-title">Compare with a later module</h3></div></div>
        <label className="field"><span>Upcoming module</span><select value={moduleId} onChange={e => onModuleChange(e.target.value)}>
          {modules.length === 0 && <option value="">No later reviewed modules available</option>}
          {modules.map(module => <option value={module.id} key={module.id}>{module.name} · Semester {module.semester}</option>)}
        </select></label>
        {selectedModule && <div className="module-context">
          <h4>Learning outcomes</h4>
          {selectedModule.outcomes.length ? <ul>{selectedModule.outcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul> : <p>No outcomes have been recorded for this module.</p>}
          {selectedModule.target_competencies?.length ? <p className="competency-tags">{selectedModule.target_competencies.map(item => <span key={item}>{label(item)}</span>)}</p> : null}
        </div>}
        {project.provenance === "EXTRACTED_CANDIDATE" && <p className="inline-hint">Review and confirm this project in Sources before comparing it.</p>}
        {!modules.length && <p className="inline-hint">Confirm curriculum data in Sources before running this comparison.</p>}
        <button className="primary-button" type="button" disabled={busy || !selectedModule || project.provenance === "EXTRACTED_CANDIDATE"} onClick={onCompare} aria-busy={busy}>{busy ? "Comparing…" : "Run continuity comparison"}</button>

        {continuity ? <div className="result-block" aria-live="polite">
          <div className="result-topline"><div><span className="eyebrow">TRAINED MODEL OUTPUT</span><p className="model-name">{continuity.model.name.replaceAll("_", " ")} · {continuity.model.training_rows} synthetic rubric scenarios</p></div><span className={`decision-badge ${continuity.decision.toLowerCase()}`}>{continuity.decision.replaceAll("_", " ")}</span></div>
          <p className="result-reason">{continuity.reason}</p>
          <dl className="result-details">
            <div><dt>Prerequisite coverage</dt><dd>{Math.round(continuity.prerequisite_coverage * 100)}%</dd></div>
            <div><dt>Already evidenced</dt><dd>{continuity.matched_prerequisites.length ? continuity.matched_prerequisites.map(label).join(", ") : "No required skills matched"}</dd></div>
            <div><dt>Still to develop</dt><dd>{continuity.target_to_develop.length ? continuity.target_to_develop.map(label).join(", ") : "No additional targets identified"}</dd></div>
            <div><dt>Missing prerequisites</dt><dd>{continuity.missing_prerequisites.length ? continuity.missing_prerequisites.map(label).join(", ") : "None listed"}</dd></div>
          </dl>
          <p className="model-baseline">Heuristic baseline: <strong>{continuity.heuristic_baseline_decision.replaceAll("_", " ")}</strong> · grouped holdout macro-F1: {continuity.model.held_out_macro_f1.toFixed(2)} (baseline {continuity.model.baseline_macro_f1.toFixed(2)}).</p>
          <p className="small-note">{continuity.model.claim_limit} An educator makes the final decision.</p>
        </div> : <div className="result-placeholder"><strong>Comparison result will appear here</strong><span>Run the comparison to review the signal and supporting evidence.</span></div>}
      </section>
    </div>
  </section>;
}
