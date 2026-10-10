import { Fragment } from "react";
import { label, type Demo, type Finding, type Forecast } from "@/lib/api";

function CoverageBar({ current, projected, target }: { current: number; projected: number; target: number }) {
  return <div className="coverage-track" role="img" aria-label={`Current coverage ${Math.round(current * 100)} percent, projected graduation coverage ${Math.round(projected * 100)} percent, illustrative target ${Math.round(target * 100)} percent`}>
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
  return <section className="view-panel" aria-labelledby="cohort-title">
    <div className="view-intro"><div><p className="eyebrow">COHORT COMPETENCY FORECAST</p><h2 id="cohort-title">Review skills that may remain under-covered</h2></div>
      <p>See projected coverage by graduation, the modules that can reinforce each skill and a scenario under stated assumptions.</p></div>

    <div className="forecast-meta"><div><span>CURRENT INTAKE</span><strong>{demo.cohort.name}</strong></div><div><span>PROJECTION HORIZON</span><strong>Graduation</strong></div><div><span>METHOD</span><strong>{forecast.method.replaceAll("_", " ").toLowerCase()}</strong></div></div>
    <div className="outlook-grid">
      <section className="surface gap-panel" aria-labelledby="gaps-title">
        <div className="surface-heading"><div><p className="eyebrow">RANKED FINDINGS</p><h3 id="gaps-title">Projected competency gaps</h3></div><span className="target-legend"><i />Illustrative target</span></div>
        {positiveGaps.length ? <div className="gap-list">
          {positiveGaps.map((finding, index) => <article className="gap-row" key={finding.competency}>
            <div className="gap-heading"><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><strong>{label(finding.competency)}</strong><span className={`priority ${finding.priority_score !== null ? "market" : "gap-only"}`} title="Planning score, not a probability">{finding.priority_score !== null ? `Score ${finding.priority_score.toFixed(3)}` : "Gap only"}</span></div>
            <CoverageBar current={finding.current_coverage} projected={finding.projected_graduation_coverage} target={finding.programme_target} />
            <div className="coverage-labels"><span><b><Percent value={finding.current_coverage} /></b> current</span><span><b><Percent value={finding.projected_graduation_coverage} /></b> projected</span><span><b>{finding.future_module_opportunities}</b> future opportunities</span></div>
            {finding.market_evidence ? <p className="market-signal">
              <strong>{Math.round((finding.market_relevance ?? 0) * 100)}%</strong> of the selected ILMIA role profiles list a mapped skill
              <span>Matched: {finding.market_evidence.profiles.map((profile, index) => <Fragment key={profile.code}>{index > 0 ? ", " : ""}<a href={profile.url} target="_blank" rel="noreferrer">{profile.name}</a></Fragment>)}</span>
              <span>Mapped {label(finding.market_evidence.match_type)}: {finding.market_evidence.skill_terms}</span>
            </p> : <p className="market-signal unavailable">No mapped market signal for this competency</p>}
            <p className="priority-reason">{finding.priority_reason}</p>
          </article>)}
        </div> : <div className="empty-state"><h4>No projected gaps in this scenario</h4><p>There are no competencies below the current illustrative target.</p></div>}
        <div className="assumption-note"><strong>How to read this</strong><p>Market-supported priorities use projected gap × role-profile coverage × curriculum-runway factor (1 ÷ (1 + remaining module opportunities)). Competencies without mapped evidence fall back to gap-only order. ILMIA role-profile skills are from Q1 2024, are a small selected sample, and are not percentages of all job ads. See <a href="https://www.ilmia.gov.my/bda-myjobprofile/" target="_blank" rel="noreferrer">ILMIA MyJobProfile</a>. The graduation target and coverage gains remain illustrative assumptions.</p></div>
      </section>

      <section className="surface scenario-panel" aria-labelledby="scenario-title">
        <p className="eyebrow">SCENARIO ANALYSIS</p><h3 id="scenario-title">Model an intervention</h3>
        <p className="scenario-copy">Explore an assumed coverage gain for a competency with a projected gap. This is a planning scenario, not observed impact.</p>
        {positiveGaps.length ? <>
          <label className="field" htmlFor="scenario-skill"><span>Competency</span><select id="scenario-skill" value={interventionSkill} onChange={e => onSkillChange(e.target.value)}>
            {positiveGaps.map(item => <option value={item.competency} key={item.competency}>{label(item.competency)}</option>)}
          </select></label>
          {linkedFocus && <p className="link-hint">Also appears in the current project-to-module comparison.</p>}
          <label className="field range-field" htmlFor="scenario-gain"><span>Assumed coverage gain <strong>+{Math.round(gain * 100)} percentage points</strong></span>
            <input id="scenario-gain" type="range" min="0" max="0.4" step="0.01" value={gain} onChange={e => onGainChange(Number(e.target.value))} aria-valuetext={`${Math.round(gain * 100)} percentage points`} />
            <span className="range-ends"><span>0 points</span><span>40 points</span></span>
          </label>
          <button className="primary-button" type="button" disabled={busy || !interventionSkill} onClick={onCompare} aria-busy={busy}>{busy ? "Recalculating…" : "Recalculate scenario"}</button>
        </> : <div className="empty-state"><h4>No gap to model</h4><p>This cohort scenario has no competencies below its current illustrative target.</p></div>}
        {activeIntervention ? <div className="scenario-result" aria-live="polite">
          <p className="eyebrow">{label(activeIntervention.competency)} · PROJECTED GAP</p>
          <div className="scenario-values"><div><strong><Percent value={activeIntervention.projected_gap} /></strong><span>Without intervention</span></div><span className="scenario-arrow" aria-hidden="true">→</span><div><strong><Percent value={activeIntervention.with_intervention_gap} /></strong><span>With assumed gain</span></div></div>
          <p className="reduction-note">Potential gap reduction: <strong>{Math.round(activeIntervention.potential_gap_reduction * 100)} points</strong> under this assumption.</p>
        </div> : positiveGaps.length > 0 ? <div className="result-placeholder compact"><strong>Scenario result will appear here</strong><span>Set an assumption and recalculate.</span></div> : null}
        <p className="small-note">{demo.cohort.provenance === "SIMULATED" ? "No real cohort data has been supplied. Values are simulated and not institutionally validated." : "Forecast values rely on unvalidated assumptions and are not institutionally validated."}</p>
      </section>
    </div>
  </section>;
}
