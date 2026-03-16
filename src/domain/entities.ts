import {
  ClusterMode,
  ContractId,
  DeploymentUse,
  HorizonBucket,
  NoveltyAssessment,
  PricingAssessment,
  RunMode,
  SourceSurvival,
  SourceType,
  Verdict,
  WorkflowState
} from './enums';

export type Contract = {
  id: ContractId;
  name: string;
  primary_objective: string;
  core_transmission_focus: string[];
  confirmation_markers: string[];
  least_valuable_use: string;
  deployment_windows: string[];
  shared_block_map: string[];
};

export type Article = {
  article_id: string;
  headline: string;
  body_excerpt: string;
  source_type: SourceType;
  published_at: string | null;
  url: string | null;
  author?: string;
  publisher?: string;
  notes?: string;
};

export type NarrativeCluster = {
  cluster_id: string;
  contract_id: ContractId;
  cluster_mode: ClusterMode;
  common_facts: string[];
  disputed_claims: string[];
  strongest_source_article_id: string | null;
  weakest_source_article_id: string | null;
  newness_confidence: number;
  tradability_class: 'tradable' | 'context_only' | 'noise';
};

export type DeepAnalysis = {
  core_claim: string;
  confirmed_facts: string[];
  plausible_inference: string[];
  speculation: string[];
  opinion: string[];
  novelty_assessment: NoveltyAssessment;
  competing_interpretation: string;
};

export type HorizonSplit = { bucket: HorizonBucket; note: string };

export type RuleTrace = {
  stage: 'pipeline' | 'screen' | 'cluster' | 'analyze' | 'translate' | 'deploy';
  rule_id: string;
  source_files: string[];
  detail: string;
  heuristic?: boolean;
};

export type TranslationResult = {
  contract_id: ContractId;
  selected_channels: string[];
  primary_driver_hierarchy: string[];
  best_expression_vehicle: string;
  pricing_assessment: PricingAssessment;
  horizon_split: HorizonSplit[];
  confirmation_markers: string[];
  invalidation_markers: string[];
  verdict: Verdict;
  confidence_score: number;
  actionability_score: number;
  trade_use_note: string;
};

export type ProvenanceRecord = {
  source_files: string[];
  rule_ids: string[];
  contract_override_ids: string[];
  notes: string[];
  rule_trace: RuleTrace[];
};

export type ActiveHoursContext = {
  structural_windows?: string[];
  event_windows?: string[];
  dominant_side?: 'euro_driver' | 'dollar_driver' | 'mixed' | 'unclear';
};

export type RunOutput = {
  run_id: string;
  contract_id: ContractId;
  run_mode: RunMode;
  state: WorkflowState;
  screen_result: SourceSurvival;
  cluster: NarrativeCluster | null;
  analysis: DeepAnalysis | null;
  translation: TranslationResult | null;
  deployment_use: DeploymentUse;
  active_hours_context: ActiveHoursContext | null;
  terminal_outcome?: 'irrelevant' | 'noise' | 'insufficient_evidence' | 'no_edge';
  provenance: ProvenanceRecord;
};
