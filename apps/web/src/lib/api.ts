export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Evidence = { competency: string; source: string; detail: string };
export type Module = {
  id: string; name: string; semester: number; prerequisites: string[];
  required_competencies: string[]; target_competencies: string[]; reuse_signals: string[];
  outcomes: string[]; assignment: string; provenance: string;
};
export type Project = {
  id: string; name: string; source_label: string; provenance: string;
  originating_module_id: string | null; competencies: string[]; evidence: Evidence[];
  languages: string[]; files_scanned: number; limitations?: string[];
};
export type Continuity = {
  project_id: string; module_id: string; decision: string; method: string;
  prediction_source: "trained_model";
  model: {
    name: string; training_data_source: string; training_dataset: string;
    training_rows: number; anchor_groups: number; dataset_sha256: string;
    held_out_macro_f1: number; baseline_macro_f1: number; claim_limit: string;
  };
  heuristic_baseline_decision: string;
  prerequisite_coverage: number; matched_prerequisites: string[];
  missing_prerequisites: string[]; reuse_signals: string[];
  target_already_met: string[]; target_to_develop: string[];
  reason: string; evidence: Evidence[]; provenance: string; human_decision_required: boolean;
};
export type Finding = {
  competency: string; current_coverage: number; projected_graduation_coverage: number;
  programme_target: number; projected_gap: number; future_module_opportunities: number;
  priority_score: number | null; market_relevance: number | null;
  market_evidence: {
    skill_terms: string; profiles: {code: string; name: string; url: string}[];
    matched_profiles: number; profile_sample_size: number; match_type: string;
  } | null;
  runway_factor: number; priority_reason: string; with_intervention_coverage: number;
  with_intervention_gap: number; potential_gap_reduction: number;
};
export type Forecast = {
  cohort_id: string; provenance: string; method: string;
  assumptions: Record<string, string | number | Record<string, unknown> | null>;
  intervention: {competency: string; assumed_gain: number; description: string} | null;
  ranked_findings: Finding[]; human_decision_required: boolean;
};
export type Demo = {
  notice: string;
  programme: { id: string; name: string; provenance: string };
  modules: Module[];
  project: Project;
  cohort: { id: string; name: string; coverage: Record<string, number>; current_semester: number; provenance: string };
  continuity: Continuity | null;
  forecast: Forecast;
};

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function label(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase());
}
