import {
  CausalCoherenceAssessment,
  ClusterMode,
  ContractId,
  DeploymentUse,
  DoctrineFit,
  HorizonBucket,
  NoveltyAssessment,
  PricingAssessment,
  PricedInAssessment,
  ReasonerMode,
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

export type IntakeMode = 'manual_text' | 'manual_url' | 'fixture';

export type SourceOrigin = 'manual_paste' | 'manual_url' | 'fixture' | 'live_fetched';

export type SourceCompleteness = 'full_text' | 'partial_text' | 'unresolved';

export type IntakeStatus = 'ready' | 'degraded' | 'unresolved';

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
  intake_mode?: IntakeMode;
  source_origin?: SourceOrigin;
  source_completeness?: SourceCompleteness;
};

export type CandidateContractRelevance = {
  contract_id: ContractId;
  fit: 'primary' | 'secondary' | 'low';
  rationale: string;
  matched_focus: string[];
};

export type NormalizedArticle = Article & {
  intake_mode: IntakeMode;
  source_origin: SourceOrigin;
  source_completeness: SourceCompleteness;
  normalized_text: string;
  source_quality_score: number;
  rhetorical_cues: string[];
  novelty_cues: string[];
  candidate_contract_relevance: CandidateContractRelevance[];
};

export type IntakeSourceRecord = {
  article_id: string;
  headline: string;
  url: string | null;
  publisher?: string;
  published_at: string | null;
  source_type: SourceType;
  intake_mode: IntakeMode;
  source_origin: SourceOrigin;
  source_completeness: SourceCompleteness;
};

export type IntakeSummary = {
  intake_mode: IntakeMode;
  status: IntakeStatus;
  issues: string[];
  normalized_articles: NormalizedArticle[];
  source_records: IntakeSourceRecord[];
  source_completeness_summary: Record<SourceCompleteness, number>;
  source_origin_summary: Record<SourceOrigin, number>;
};

export type ScreeningDecision = {
  article_id: string;
  headline: string;
  result: SourceSurvival;
  matched_drivers: string[];
  relevance_score: number;
  source_quality_score: number;
  rationale: string;
};

export type ScreeningSummary = {
  articles: ScreeningDecision[];
  selected_article_ids: string[];
  context_article_ids: string[];
  rejected_article_ids: string[];
  aggregate_result: SourceSurvival;
};

export type NarrativeCluster = {
  cluster_id: string;
  contract_id: ContractId;
  cluster_mode: ClusterMode;
  theme: string;
  article_ids: string[];
  dominant_narrative: string;
  source_map: string[];
  common_facts: string[];
  disputed_claims: string[];
  strongest_source_article_id: string | null;
  weakest_source_article_id: string | null;
  newness_confidence: number;
  tradability_class: 'tradable' | 'context_only' | 'noise';
};

export type SourceGrounding = {
  article_id: string;
  source_type: SourceType;
  grounding_type: 'confirmed_fact' | 'inference' | 'speculation' | 'rhetoric';
  excerpt: string;
  doctrine_source_files: string[];
};

export type DeepAnalysis = {
  core_claim: string;
  confirmed_facts: string[];
  plausible_inference: string[];
  speculation: string[];
  opinion: string[];
  inferred_claims: string[];
  speculative_claims: string[];
  rhetorical_elements: string[];
  novelty_assessment: NoveltyAssessment;
  causal_chain: string[];
  causal_coherence_assessment: CausalCoherenceAssessment;
  first_order_effects: string[];
  second_order_effects: string[];
  competing_interpretation: string;
  strongest_alternative_interpretation: string;
  priced_in_assessment: PricedInAssessment;
  confirmation_markers: string[];
  invalidation_markers: string[];
  candidate_contract_relevance: CandidateContractRelevance[];
  source_grounding: SourceGrounding[];
  confidence_notes: string[];
  explicit_unknowns: string[];
  reasoner_mode: ReasonerMode;
  prompt_context: {
    system_rules: string[];
    doctrine_source_files: string[];
    doctrine_highlights: string[];
  };
};

export type HorizonSplit = { bucket: HorizonBucket; note: string };

export type RuleTrace = {
  stage: 'pipeline' | 'intake' | 'screen' | 'cluster' | 'analyze' | 'translate' | 'deploy';
  rule_id: string;
  source_files: string[];
  detail: string;
  heuristic?: boolean;
};

export type TranslationResult = {
  contract_id: ContractId;
  selected_channels: string[];
  matched_drivers: string[];
  doctrine_fit: DoctrineFit;
  doctrine_alignment_summary: string;
  primary_driver_hierarchy: string[];
  contract_implications: string[];
  best_expression_vehicle: string;
  pricing_assessment: PricingAssessment;
  priced_in_assessment: PricedInAssessment;
  horizon_split: HorizonSplit[];
  confirmation_markers: string[];
  invalidation_markers: string[];
  verdict: Verdict;
  confidence_score: number;
  actionability_score: number;
  trade_use_note: string;
  bounded_risk_statement: string;
  deployment_windows: string[];
  least_valuable_use: string;
};

export type BiasBrief = {
  title: string;
  executive_summary: string;
  contract_implications: string[];
  alternative_interpretation: string;
  confirmation_watchlist: string[];
  invalidation_watchlist: string[];
  posture: DeploymentUse;
  source_grounding_note: string;
  bounded_use: string;
  confidence_notes: string[];
  explicit_unknowns: string[];
  prose: string;
};

export type ProvenanceRecord = {
  source_files: string[];
  rule_ids: string[];
  contract_override_ids: string[];
  notes: string[];
  rule_trace: RuleTrace[];
  intake_mode?: IntakeMode;
  intake_status?: IntakeStatus;
  intake_sources?: IntakeSourceRecord[];
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
  intake: IntakeSummary;
  screening: ScreeningSummary;
  screen_result: SourceSurvival;
  cluster: NarrativeCluster | null;
  analysis: DeepAnalysis | null;
  translation: TranslationResult | null;
  bias_brief: BiasBrief | null;
  deployment_use: DeploymentUse;
  active_hours_context: ActiveHoursContext | null;
  terminal_outcome?: 'irrelevant' | 'noise' | 'insufficient_evidence' | 'no_edge';
  provenance: ProvenanceRecord;
};
