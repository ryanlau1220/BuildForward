import { label, projectReuseDecisionLabel, type Continuity, type Project } from "@/lib/api";

type ModuleOption = {
  id: string;
  name: string;
  semester: number;
  outcomes: string[];
  assignment: string;
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
  return <section className="view-panel" aria-labelledby="reuse-title">
    <div className="view-intro"><div><p className="eyebrow">EXISTING PROJECT × FUTURE MODULE</p><h2 id="reuse-title">Can this project be meaningfully reused and extended?</h2></div>
      <p>Compare an existing project with a future module’s learning goals. The result shows reuse potential for educator review.</p></div>

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
        <p className="small-note">Report summaries and detected files or dependencies indicate possible use; they do not prove code quality, test success or student proficiency.</p>
      </section>

      <section className="surface comparison-panel" aria-labelledby="comparison-title">
        <div className="surface-heading"><div><p className="eyebrow">PROJECT REUSE CHECK</p><h3 id="comparison-title">Choose the future module</h3></div></div>
        <label className="field"><span>Future module</span><select value={moduleId} onChange={e => onModuleChange(e.target.value)}>
          {modules.length === 0 && <option value="">No reviewed future modules available</option>}
          {modules.map(module => <option value={module.id} key={module.id}>{module.name} · Semester {module.semester}</option>)}
        </select></label>
        {selectedModule && <div className="module-context">
          <h4>Learning outcomes</h4>
          {selectedModule.outcomes.length ? <ul>{selectedModule.outcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul> : <p>No outcomes have been recorded for this module.</p>}
          {selectedModule.target_competencies?.length ? <p className="competency-tags">{selectedModule.target_competencies.map(item => <span key={item}>{label(item)}</span>)}</p> : null}
          <p><strong>Current assignment:</strong> {selectedModule.assignment}</p>
        </div>}
        {project.provenance === "EXTRACTED_CANDIDATE" && <p className="inline-hint">Review and confirm this project in Data Sources before checking reuse.</p>}
        {!modules.length && <p className="inline-hint">Review and confirm the course details in Data Sources before running this check.</p>}
        <button className="primary-button" type="button" disabled={busy || !selectedModule || project.provenance === "EXTRACTED_CANDIDATE"} onClick={onCompare} aria-busy={busy}>{busy ? "Checking project reuse…" : "Run project reuse check"}</button>

        {continuity ? <div className="result-block" aria-live="polite">
          <div className="result-topline"><div><span className="eyebrow">PROJECT REUSE DECISION</span><p className="model-name">{continuity.model.name.replaceAll("_", " ")} · {continuity.model.training_rows} synthetic rubric scenarios</p></div><span className={`decision-badge ${continuity.decision.toLowerCase()}`}>{projectReuseDecisionLabel(continuity.decision)}</span></div>
          <p className="result-reason">{continuity.reason}</p>
          <p className="small-note">This result estimates project fit with the module’s learning goals. It does not assess assignment rules or judge the brief. An educator decides whether to reuse the project, adapt an activity, or keep the current assignment.</p>
          <dl className="result-details">
          <div><dt>Required skills covered</dt><dd>{Math.round(continuity.prerequisite_coverage * 100)}%</dd></div>
          <div><dt>Skills already shown</dt><dd>{continuity.matched_prerequisites.length ? continuity.matched_prerequisites.map(label).join(", ") : "No required skills matched"}</dd></div>
          <div><dt>Skills to build in this module</dt><dd>{continuity.target_to_develop.length ? continuity.target_to_develop.map(label).join(", ") : "No additional targets identified"}</dd></div>
          <div><dt>Required skills not shown in project</dt><dd>{continuity.missing_prerequisites.length ? continuity.missing_prerequisites.map(label).join(", ") : "None listed"}</dd></div>
          </dl>
          <div className="model-inputs">
            <strong>Classifier inputs</strong><span>Values supplied to the proof-of-concept model</span>
            <dl>
              <div><dt>Required skills already covered</dt><dd>{Math.round(continuity.model_features.prerequisite_coverage * 100)}%</dd></div>
              <div><dt>Project reuse clues</dt><dd>{continuity.model_features.reuse_signal_count}</dd></div>
              <div><dt>Project skills matching module goals</dt><dd>{Math.round(continuity.model_features.target_overlap * 100)}%</dd></div>
              <div><dt>Evidence items</dt><dd>{continuity.model_features.evidence_count}</dd></div>
              <div><dt>Project files recorded</dt><dd>{continuity.model_features.files_scanned}</dd></div>
            </dl>
          </div>
          <p className="model-baseline">Simple rule-based comparison: <strong>{projectReuseDecisionLabel(continuity.heuristic_baseline_decision)}</strong> · grouped test macro-F1: {continuity.model.held_out_macro_f1.toFixed(2)} (simple baseline {continuity.model.baseline_macro_f1.toFixed(2)}).</p>
          <p className="model-baseline">Hypothetical module fit checks using real repositories: <strong>{continuity.model.real_validation.candidate_pairs} candidate pairs across {continuity.model.real_validation.project_groups} projects · {continuity.model.real_validation.reviewed_pairs} reviewed</strong>{continuity.model.real_validation.metrics ? ` · reviewer-agreement macro-F1 ${continuity.model.real_validation.metrics.model_macro_f1.toFixed(2)} (simple baseline ${continuity.model.real_validation.metrics.baseline_macro_f1.toFixed(2)})` : ` · ${continuity.model.real_validation.status}`}</p>
          <p className="small-note">{continuity.model.claim_limit} An educator makes the final decision.</p>
        </div> : <div className="result-placeholder"><strong>Project reuse result will appear here</strong><span>Run the check to review the model signal and supporting evidence.</span></div>}
      </section>
    </div>
  </section>;
}
