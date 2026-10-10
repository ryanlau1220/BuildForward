import { Fragment } from "react";
import { label, studentIntakeLabel, type Demo, type Finding, type Forecast } from "@/lib/api";

function CoverageBar({ current, projected, target }: { current: number; projected: number; target: number }) {
  return <div className="coverage-track" role="img" aria-label={`Current skill coverage ${Math.round(current * 100)} percent, expected skill coverage at graduation ${Math.round(projected * 100)} percent, illustrative target ${Math.round(target * 100)} percent`}>
    <span className="coverage-current" style={{ width: `${current * 100}%` }} />
    <span className="coverage-future" style={{ left: `${current * 100}%`, width: `${Math.max(0, projected - current) * 100}%` }} />
    <span className="coverage-target" style={{ left: `${target * 100}%` }} />
  </div>;
}

function Percent({ value }: { value: number }) { return <>{Math.round(value * 100)}%</>; }

export function CohortOutlook({
  demo, forecast, positiveGaps, interventionSkill, gain, busy, linkedFocus, activeIntervention,
  onSkillChange, onGainChange, onCompare,
}: {
  demo: Demo;
  forecast: Forecast;
  positiveGaps: Finding[];
  interventionSkill: string;
  gain: number;
  busy: boolean;
  linkedFocus?: string;
  activeIntervention?: Finding;
  onSkillChange: (skill: string) => void;
  onGainChange: (gain: number) => void;
  onCompare: () => void;
}) {
  return <section className="view-panel" aria-labelledby="forecast-title">
    <div className="view-intro"><div><p className="eyebrow">STUDENT INTAKE SKILL FORECAST</p><h2 id="forecast-title">Predicted Skill Gaps at Graduation</h2></div>
      <p>See expected skill coverage at graduation, which future modules can build each skill, and how a possible action changes the scenario.</p></div>

    <div className="forecast-meta"><div><span>STUDENT INTAKE</span><strong>{studentIntakeLabel(demo.cohort.name)}</strong></div><div><span>FORECAST HORIZON</span><strong>Graduation</strong></div><div><span>FORECAST BASIS</span><strong>Assumption-based; not validated on past intakes</strong></div></div>
    <p className="small-note">A student intake is a group of students progressing through this programme together. It is not a semester.</p>
    <div className="outlook-grid">
      <section className="surface gap-panel" aria-labelledby="gaps-title">
        <div className="surface-heading"><div><p className="eyebrow">SKILLS TO REVIEW</p><h3 id="gaps-title">Predicted Skill Gaps at Graduation</h3></div><span className="target-legend"><i />Illustrative target</span></div>
        {positiveGaps.length ? <div className="gap-list">
          {positiveGaps.map((finding, index) => <article className="gap-row" key={finding.competency}>
            <div className="gap-heading"><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><strong>{label(finding.competency)}</strong><span className={`priority ${finding.priority_score !== null ? "market" : "gap-only"}`} title="Planning score, not a probability">{finding.priority_score !== null ? `Score ${finding.priority_score.toFixed(3)}` : "Gap only"}</span></div>
            <CoverageBar current={finding.current_coverage} projected={finding.projected_graduation_coverage} target={finding.programme_target} />
            <div className="coverage-labels"><span><b><Percent value={finding.current_coverage} /></b> current</span><span><b><Percent value={finding.projected_graduation_coverage} /></b> expected skill coverage at graduation</span><span><b>{finding.future_module_opportunities}</b> future learning opportunities</span></div>
            {finding.market_evidence ? <p className="market-signal">
              <strong>{Math.round((finding.market_relevance ?? 0) * 100)}%</strong> of the selected ILMIA role profiles list a related skill
              <span>Matched: {finding.market_evidence.profiles.map((profile, index) => <Fragment key={profile.code}>{index > 0 ? ", " : ""}<a href={profile.url} target="_blank" rel="noreferrer">{profile.name}</a></Fragment>)}</span>
              <span>Mapped {label(finding.market_evidence.match_type.replaceAll("_", "-"))}: {finding.market_evidence.skill_terms}</span>
            </p> : <p className="market-signal unavailable">No mapped market signal for this skill</p>}
            <p className="priority-reason">{finding.priority_reason
              .replaceAll("projected gap", "expected skill gap at graduation")
              .replaceAll("role-profile coverage", "selected role-profile coverage")
              .replaceAll("curriculum-runway factor", "future learning opportunities factor")
              .replaceAll("remaining module opportunities", "future learning opportunities")
              .replaceAll("remaining module opportunity", "future learning opportunity")
              .replaceAll("competency", "skill")}</p>
          </article>)}
        </div> : <div className="empty-state"><h4>No predicted skill gaps in this scenario</h4><p>No skills are below the illustrative graduation target.</p></div>}
        <div className="assumption-note"><strong>How to read this</strong><p>Skills with market evidence are ordered using the expected skill gap, selected role-profile coverage, and future learning opportunities. Other skills are ordered by expected gap alone. ILMIA role-profile skills are from Q1 2024, are a small selected sample, and are not percentages of all job ads. See <a href="https://www.ilmia.gov.my/bda-myjobprofile/" target="_blank" rel="noreferrer">ILMIA MyJobProfile</a>. The graduation target and coverage gains are illustrative assumptions.</p></div>
      </section>

      <section className="surface scenario-panel" aria-labelledby="scenario-title">
        <p className="eyebrow">RECOMMENDED ACTION SCENARIO</p><h3 id="scenario-title">Explore a possible action</h3>
        <p className="scenario-copy">Set an assumed skill gain to explore a possible action. This is a planning scenario you control, not an action BuildForward recommends or an observed result.</p>
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
