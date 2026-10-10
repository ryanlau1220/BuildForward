import { label, projectReuseDecisionLabel, studentIntakeLabel, type Continuity, type Demo, type Finding, type Project } from "@/lib/api";

function CoverageBar({ current, projected, target }: { current: number; projected: number; target: number }) {
  const valuesClose = projected - current < 0.1;
  return <div className={`coverage-track${valuesClose ? " coverage-values-close" : ""}`} role="img" aria-label={`Current skill coverage ${Math.round(current * 100)} percent, expected skill coverage at graduation ${Math.round(projected * 100)} percent, illustrative target ${Math.round(target * 100)} percent`}>
    <span className="coverage-current" style={{ width: `${current * 100}%` }} />
    <span className="coverage-future" style={{ left: `${current * 100}%`, width: `${Math.max(0, projected - current) * 100}%` }} />
    <span className="coverage-target" style={{ left: `${target * 100}%` }} />
    <span className="coverage-value coverage-value-current" style={{ left: `clamp(20px, ${current * 100}%, calc(100% - 20px))` }} aria-hidden="true">{Math.round(current * 100)}%</span>
    <span className="coverage-value coverage-value-projected" style={{ left: `clamp(20px, ${projected * 100}%, calc(100% - 20px))` }} aria-hidden="true">{Math.round(projected * 100)}%</span>
  </div>;
}

function Percent({ value }: { value: number }) { return <>{Math.round(value * 100)}%</>; }

function chooseScenarioSkill(skill: string, onSkillChange: (skill: string) => void) {
  onSkillChange(skill);
  document.getElementById("scenario-skill")?.focus({ preventScroll: true });
}

function suggestedProjectWork(skill: string): string {
  const work: Record<string, string> = {
    "unit-testing": "write unit tests for core business rules and include them in the project's test run",
    "automated-tests": "add automated checks for key project behaviour and run them with the project checks",
    "test-automation": "automate execution of the module's test cases and record the results",
    "functional-testing": "write and execute test cases for the project's main user workflows",
    "continuous-integration": "add a CI workflow that builds the project and runs its tests",
  };
  return work[skill] ?? `add an assessed project extension that demonstrates ${label(skill)}`;
}

export function CohortOutlook({
  demo, positiveGaps, interventionSkill, gain, busy, linkedFocus, activeIntervention,
  continuity, selectedModule, project,
  onSkillChange, onGainChange, onCompare,
}: {
  demo: Demo;
  positiveGaps: Finding[];
  interventionSkill: string;
  gain: number;
  busy: boolean;
  linkedFocus?: string;
  activeIntervention?: Finding;
  continuity: Continuity | null;
  selectedModule: { id: string; name: string; target_competencies?: string[] } | undefined;
  project: Project;
  onSkillChange: (skill: string) => void;
  onGainChange: (gain: number) => void;
  onCompare: () => void;
}) {
  const recommendationGap = positiveGaps.find(item => item.competency === interventionSkill);
  const recommendation = recommendationGap && continuity && selectedModule
    && continuity.module_id === selectedModule.id
    && continuity.project_id === project.id
    && ["CONTINUE", "PARTIAL_REUSE"].includes(continuity.decision)
    && continuity.target_to_develop.includes(interventionSkill)
    && selectedModule.target_competencies?.includes(interventionSkill)
      ? { gap: recommendationGap, continuity, module: selectedModule }
      : null;
  return <section className="view-panel" aria-labelledby="forecast-title">
    <div className="view-intro"><div><p className="eyebrow">STUDENT INTAKE SKILL FORECAST</p><h2 id="forecast-title">Predicted Skill Gaps at Graduation</h2></div>
      <p>See expected skill coverage at graduation, which future modules can build each skill, and how a possible action changes the scenario.</p></div>

    <div className="forecast-meta"><div><span>STUDENT INTAKE</span><strong>{studentIntakeLabel(demo.cohort.name)}</strong></div><div><span>FORECAST HORIZON</span><strong>Graduation</strong></div><div><span>FORECAST BASIS</span><strong>Assumption-based; not validated on past intakes</strong></div></div>
    <p className="small-note">A student intake is a group of students progressing through this programme together. It is not a semester.</p>
    <div className="outlook-grid">
      <section className="surface gap-panel" aria-labelledby="gaps-title">
        <div className="surface-heading"><div><p className="eyebrow">SKILLS TO REVIEW</p><h3 id="gaps-title">Predicted Skill Gaps at Graduation</h3></div><span className="target-legend"><i />{positiveGaps[0] ? `${Math.round(positiveGaps[0].programme_target * 100)}% illustrative target` : "Illustrative target"}</span></div>
        {positiveGaps.length ? <div className="gap-list">
          {positiveGaps.map((finding, index) => <article className="gap-row" key={finding.competency}>
            <div className="gap-heading"><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><button className="skill-select-link" type="button" onClick={() => chooseScenarioSkill(finding.competency, onSkillChange)} aria-label={`Use ${label(finding.competency)} in the recommended action scenario`}>{label(finding.competency)}</button><span className={`priority ${finding.priority_score !== null ? "market" : "gap-only"}`} title="Planning score, not a probability">{finding.priority_score !== null ? `Score ${finding.priority_score.toFixed(4)}` : "Gap only"}</span></div>
            <CoverageBar current={finding.current_coverage} projected={finding.projected_graduation_coverage} target={finding.programme_target} />
            <div className="coverage-labels"><span className="coverage-label-current">Current coverage</span><span className="coverage-label-projected">Expected skill coverage at graduation</span><span><b>{finding.future_module_opportunities}</b> future learning opportunities</span></div>
            {finding.market_evidence ? <p className="market-signal">
              <strong>{finding.market_evidence.occupation.online_offerings.toLocaleString()}</strong> DOSM online job offerings for <a href={finding.market_evidence.occupation.source} target="_blank" rel="noreferrer">{finding.market_evidence.occupation.name}</a> in Q2 2026
              <span>{((finding.market_relevance ?? 0) * 100).toFixed(1)}% of {finding.market_evidence.occupation.total_online_offerings.toLocaleString()} online offerings were for this occupation, not this skill.</span>
              <span>BuildForward mapping ({finding.market_evidence.mapping_type}): {finding.market_evidence.mapping_note}</span>
            </p> : <p className="market-signal unavailable">No mapped market signal for this skill</p>}
            <p className="priority-reason">{finding.priority_reason
              .replaceAll("projected gap", "expected skill gap at graduation")
              .replaceAll("curriculum-runway factor", "future learning opportunities factor")
              .replaceAll("remaining module opportunities", "future learning opportunities")
              .replaceAll("remaining module opportunity", "future learning opportunity")
              .replaceAll("competency", "skill")}</p>
          </article>)}
        </div> : <div className="empty-state"><h4>No predicted skill gaps in this scenario</h4><p>No skills are below the illustrative graduation target.</p></div>}
        <div className="assumption-note"><strong>How to read this</strong><p>Skills with a BuildForward occupation mapping are ordered using the expected skill gap, DOSM occupation share, and future learning opportunities. Other skills are ordered by expected gap alone. DOSM reports online job offerings by occupation, not how many employers request each skill. See <a href="https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026" target="_blank" rel="noreferrer">DOSM Job Market Insights, Q2 2026</a>. The graduation target and coverage gains are illustrative assumptions.</p></div>
      </section>

      <section className="surface scenario-panel" aria-labelledby="scenario-title">
        <div className="recommendation-card" aria-live="polite">
          <p className="eyebrow">EDUCATOR ACTION TO REVIEW</p>
          {!recommendationGap ? <p>Select a predicted skill gap to see whether the current project and future module support a concrete action.</p>
            : !recommendation ? <p>No matching project-to-module result currently supports recommending reuse to build {label(interventionSkill)}. Run the Project Reuse Check for the selected project and future module; an educator can also choose a different learning activity.</p>
              : <>
                <h3>Consider developing {label(interventionSkill)} through project work</h3>
                <p>Consider extending <strong>{project.name}</strong> through work in <strong>{recommendation.module.name}</strong>: {suggestedProjectWork(interventionSkill)}. The project reuse model returned <strong>{projectReuseDecisionLabel(recommendation.continuity.decision)}</strong>; its evidence shows {recommendation.continuity.reuse_signals.length ? recommendation.continuity.reuse_signals.map(label).join(", ") : "the classifier supports reusing this project"}, while {label(interventionSkill)} is not yet demonstrated.</p>
                <p className="recommendation-basis">Review basis: {label(interventionSkill)} is {Math.round(recommendation.gap.projected_gap * 100)} points below the illustrative target at graduation{recommendation.gap.market_evidence ? `, and BuildForward maps it to ${recommendation.gap.market_evidence.occupation.name}, with ${recommendation.gap.market_evidence.occupation.online_offerings.toLocaleString()} DOSM online offerings in Q2 2026` : ""}. The future module lists this skill as a target. An educator must check the module fit and decide whether to act.</p>
                <p className="small-note">Review the current assignment before acting. A lecturer could adapt a learning activity to reuse the project or keep the existing assignment; the model does not choose between those options.</p>
              </>}
        </div>
        <p className="eyebrow">RECOMMENDED ACTION SCENARIO</p><h3 id="scenario-title">Explore a possible action</h3>
        <p className="scenario-copy">The action above is a deterministic suggestion for educator review. Set an assumed skill gain below to explore a scenario; it is not a predicted effect.</p>
        {positiveGaps.length ? <>
          <label className="field" htmlFor="scenario-skill"><span>Skill to strengthen</span><select id="scenario-skill" value={interventionSkill} onChange={e => onSkillChange(e.target.value)}>
            {positiveGaps.map(item => <option value={item.competency} key={item.competency}>{label(item.competency)}</option>)}
          </select></label>
          {linkedFocus && <p className="link-hint">This skill also appears in the current project reuse check.</p>}
          <label className="field range-field" htmlFor="scenario-gain"><span>Assumed skill-coverage gain <strong>+{Math.round(gain * 100)} percentage points</strong></span>
            <input id="scenario-gain" type="range" min="0" max="0.4" step="0.01" value={gain} onChange={e => onGainChange(Number(e.target.value))} aria-valuetext={`${Math.round(gain * 100)} percentage points`} />
            <span className="range-ends"><span>0 points</span><span>40 points</span></span>
          </label>
          <button className="primary-button" type="button" disabled={busy || !interventionSkill} onClick={onCompare} aria-busy={busy}>{busy ? "Updating forecast…" : "Update forecast scenario"}</button>
        </> : <div className="empty-state"><h4>No skill gap to explore</h4><p>This student intake has no skills below its current illustrative target.</p></div>}
        {activeIntervention ? <div className="scenario-result" aria-live="polite">
          <p className="eyebrow">{label(activeIntervention.competency)} · EXPECTED GAP AT GRADUATION</p>
          <div className="scenario-values"><div><strong><Percent value={activeIntervention.projected_gap} /></strong><span>Without this action</span></div><span className="scenario-arrow" aria-hidden="true">→</span><div><strong><Percent value={activeIntervention.with_intervention_gap} /></strong><span>With assumed action</span></div></div>
          <p className="reduction-note">Possible gap reduction: <strong>{Math.round(activeIntervention.potential_gap_reduction * 100)} points</strong> under this assumption.</p>
        </div> : positiveGaps.length > 0 ? <div className="result-placeholder compact"><strong>Scenario result will appear here</strong><span>Set an assumption and recalculate.</span></div> : null}
        <p className="small-note">{demo.cohort.provenance === "SIMULATED" ? "No real student-intake data has been supplied. Values are simulated and not institutionally validated." : "Forecast values rely on unvalidated assumptions and are not institutionally validated."}</p>
      </section>
    </div>
  </section>;
}
