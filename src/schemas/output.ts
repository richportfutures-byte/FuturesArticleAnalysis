import { z } from 'zod';
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
} from '../domain/enums';
import {
  DiscoveryAuthorityTierSchema,
  DiscoveryDirectnessSchema,
  DiscoveryImportContextSchema,
  IntakeModeSchema,
  SourceCompletenessSchema,
  SourceOriginSchema
} from './input';

export const CandidateContractRelevanceSchema = z.object({
  contract_id: z.nativeEnum(ContractId),
  fit: z.enum(['primary', 'secondary', 'low']),
  rationale: z.string(),
  matched_focus: z.array(z.string())
});

export const SourceGroundingSchema = z.object({
  article_id: z.string(),
  source_type: z.nativeEnum(SourceType),
  grounding_type: z.enum(['confirmed_fact', 'inference', 'speculation', 'rhetoric']),
  excerpt: z.string(),
  doctrine_source_files: z.array(z.string())
});

export const DeepAnalysisSchema = z.object({
  core_claim: z.string(),
  confirmed_facts: z.array(z.string()),
  plausible_inference: z.array(z.string()),
  speculation: z.array(z.string()),
  opinion: z.array(z.string()),
  inferred_claims: z.array(z.string()),
  speculative_claims: z.array(z.string()),
  rhetorical_elements: z.array(z.string()),
  novelty_assessment: z.nativeEnum(NoveltyAssessment),
  causal_chain: z.array(z.string()),
  causal_coherence_assessment: z.nativeEnum(CausalCoherenceAssessment),
  first_order_effects: z.array(z.string()),
  second_order_effects: z.array(z.string()),
  competing_interpretation: z.string(),
  strongest_alternative_interpretation: z.string(),
  priced_in_assessment: z.nativeEnum(PricedInAssessment),
  confirmation_markers: z.array(z.string()),
  invalidation_markers: z.array(z.string()),
  candidate_contract_relevance: z.array(CandidateContractRelevanceSchema),
  source_grounding: z.array(SourceGroundingSchema),
  confidence_notes: z.array(z.string()),
  explicit_unknowns: z.array(z.string()),
  reasoner_mode: z.nativeEnum(ReasonerMode),
  prompt_context: z.object({
    system_rules: z.array(z.string()),
    doctrine_source_files: z.array(z.string()),
    doctrine_highlights: z.array(z.string())
  })
});

export const NormalizedArticleSchema = z.object({
  article_id: z.string(),
  headline: z.string(),
  body_excerpt: z.string(),
  source_type: z.nativeEnum(SourceType),
  published_at: z.string().nullable(),
  url: z.string().nullable(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  notes: z.string().optional(),
  intake_mode: IntakeModeSchema,
  source_origin: SourceOriginSchema,
  source_completeness: SourceCompletenessSchema,
  normalized_text: z.string(),
  source_quality_score: z.number(),
  rhetorical_cues: z.array(z.string()),
  novelty_cues: z.array(z.string()),
  candidate_contract_relevance: z.array(CandidateContractRelevanceSchema)
});

export const IntakeSourceRecordSchema = z.object({
  article_id: z.string(),
  headline: z.string(),
  url: z.string().nullable(),
  publisher: z.string().optional(),
  source_domain: z.string().nullable().optional(),
  published_at: z.string().nullable(),
  source_type: z.nativeEnum(SourceType),
  intake_mode: IntakeModeSchema,
  source_origin: SourceOriginSchema,
  source_completeness: SourceCompletenessSchema,
  discovery_context: DiscoveryImportContextSchema.optional()
});

export const IntakeSummarySchema = z.object({
  intake_mode: IntakeModeSchema,
  status: z.enum(['ready', 'degraded', 'unresolved']),
  issues: z.array(z.string()),
  normalized_articles: z.array(NormalizedArticleSchema),
  source_records: z.array(IntakeSourceRecordSchema),
  source_completeness_summary: z.object({
    full_text: z.number(),
    partial_text: z.number(),
    unresolved: z.number()
  }),
  source_origin_summary: z.object({
    manual_paste: z.number(),
    manual_url: z.number(),
    fixture: z.number(),
    live_fetched: z.number()
  })
});

export const ScreeningDecisionSchema = z.object({
  article_id: z.string(),
  headline: z.string(),
  result: z.nativeEnum(SourceSurvival),
  matched_drivers: z.array(z.string()),
  relevance_score: z.number(),
  source_quality_score: z.number(),
  rationale: z.string()
});

export const ScreeningSummarySchema = z.object({
  articles: z.array(ScreeningDecisionSchema),
  selected_article_ids: z.array(z.string()),
  context_article_ids: z.array(z.string()),
  rejected_article_ids: z.array(z.string()),
  aggregate_result: z.nativeEnum(SourceSurvival)
});

export const NarrativeClusterSchema = z.object({
  cluster_id: z.string(),
  contract_id: z.nativeEnum(ContractId),
  cluster_mode: z.nativeEnum(ClusterMode),
  theme: z.string(),
  article_ids: z.array(z.string()),
  dominant_narrative: z.string(),
  source_map: z.array(z.string()),
  common_facts: z.array(z.string()),
  disputed_claims: z.array(z.string()),
  strongest_source_article_id: z.string().nullable(),
  weakest_source_article_id: z.string().nullable(),
  newness_confidence: z.number(),
  tradability_class: z.enum(['tradable', 'context_only', 'noise'])
});

export const HorizonSplitSchema = z.object({
  bucket: z.nativeEnum(HorizonBucket),
  note: z.string()
});

export const TranslationResultSchema = z.object({
  contract_id: z.nativeEnum(ContractId),
  selected_channels: z.array(z.string()),
  matched_drivers: z.array(z.string()),
  doctrine_fit: z.nativeEnum(DoctrineFit),
  doctrine_alignment_summary: z.string(),
  primary_driver_hierarchy: z.array(z.string()),
  contract_implications: z.array(z.string()),
  best_expression_vehicle: z.string(),
  pricing_assessment: z.nativeEnum(PricingAssessment),
  priced_in_assessment: z.nativeEnum(PricedInAssessment),
  horizon_split: z.array(HorizonSplitSchema),
  confirmation_markers: z.array(z.string()),
  invalidation_markers: z.array(z.string()),
  verdict: z.nativeEnum(Verdict),
  confidence_score: z.number(),
  actionability_score: z.number(),
  trade_use_note: z.string(),
  bounded_risk_statement: z.string(),
  deployment_windows: z.array(z.string()),
  least_valuable_use: z.string()
});

export const BiasBriefSchema = z.object({
  title: z.string(),
  executive_summary: z.string(),
  contract_implications: z.array(z.string()),
  alternative_interpretation: z.string(),
  confirmation_watchlist: z.array(z.string()),
  invalidation_watchlist: z.array(z.string()),
  posture: z.nativeEnum(DeploymentUse),
  source_grounding_note: z.string(),
  bounded_use: z.string(),
  confidence_notes: z.array(z.string()),
  explicit_unknowns: z.array(z.string()),
  prose: z.string()
});

export const ProvenanceRecordSchema = z.object({
  source_files: z.array(z.string()),
  rule_ids: z.array(z.string()),
  contract_override_ids: z.array(z.string()),
  notes: z.array(z.string()),
  rule_trace: z.array(
    z.object({
      stage: z.enum(['pipeline', 'discover', 'intake', 'screen', 'cluster', 'analyze', 'translate', 'deploy']),
      rule_id: z.string(),
      source_files: z.array(z.string()),
      detail: z.string(),
      heuristic: z.boolean().optional()
    })
  ),
  intake_mode: IntakeModeSchema.optional(),
  intake_status: z.enum(['ready', 'degraded', 'unresolved']).optional(),
  intake_sources: z.array(IntakeSourceRecordSchema).optional()
});

export const ActiveHoursContextSchema = z.object({
  structural_windows: z.array(z.string()).optional(),
  event_windows: z.array(z.string()).optional(),
  dominant_side: z.enum(['euro_driver', 'dollar_driver', 'mixed', 'unclear']).optional()
});

export const RunOutputSchema = z.object({
  run_id: z.string(),
  contract_id: z.nativeEnum(ContractId),
  run_mode: z.nativeEnum(RunMode),
  state: z.nativeEnum(WorkflowState),
  intake: IntakeSummarySchema,
  screening: ScreeningSummarySchema,
  screen_result: z.nativeEnum(SourceSurvival),
  cluster: NarrativeClusterSchema.nullable(),
  analysis: DeepAnalysisSchema.nullable(),
  translation: TranslationResultSchema.nullable(),
  bias_brief: BiasBriefSchema.nullable(),
  deployment_use: z.nativeEnum(DeploymentUse),
  active_hours_context: ActiveHoursContextSchema.nullable(),
  terminal_outcome: z.enum(['irrelevant', 'noise', 'insufficient_evidence', 'no_edge']).optional(),
  provenance: ProvenanceRecordSchema
});

export const DiscoveryCandidateSchema = z.object({
  id: z.string(),
  url: z.string().nullable(),
  title: z.string(),
  source_name: z.string(),
  source_domain: z.string().nullable(),
  source_type: z.nativeEnum(SourceType),
  authority_tier: DiscoveryAuthorityTierSchema,
  directness: DiscoveryDirectnessSchema,
  published_at: z.string().nullable(),
  retrieved_at: z.string(),
  snippet: z.string(),
  import_excerpt: z.string(),
  source_completeness: SourceCompletenessSchema,
  contract_relevance_candidates: z.array(CandidateContractRelevanceSchema),
  freshness_score: z.number(),
  authority_score: z.number(),
  contract_theme_score: z.number(),
  directness_score: z.number(),
  import_readiness_score: z.number(),
  total_rank_score: z.number(),
  duplication_cluster_id: z.string(),
  cluster_suggestion: z.string(),
  discovery_query: z.string(),
  review_bucket: z.enum(['high_confidence', 'secondary', 'low_authority_or_noise']),
  provenance_notes: z.array(z.string()),
  search_provider: z.string(),
  search_timestamp: z.string(),
  recency_window_hours: z.number().int().positive()
});

export const DiscoverySummarySchema = z.object({
  status: z.enum(['ready', 'empty', 'unconfigured', 'error']),
  contract_id: z.nativeEnum(ContractId),
  provider_id: z.string(),
  retrieved_at: z.string(),
  recency_window_hours: z.number().int().positive(),
  query_presets: z.array(
    z.object({
      preset_id: z.string(),
      label: z.string(),
      query: z.string(),
      focus_tags: z.array(z.string()),
      preferred_domains: z.array(z.string())
    })
  ),
  candidates: z.array(DiscoveryCandidateSchema),
  issues: z.array(z.string()),
  bucket_counts: z.object({
    high_confidence: z.number(),
    secondary: z.number(),
    low_authority_or_noise: z.number()
  }),
  trace: z.array(
    z.object({
      stage: z.enum(['pipeline', 'discover', 'intake', 'screen', 'cluster', 'analyze', 'translate', 'deploy']),
      rule_id: z.string(),
      source_files: z.array(z.string()),
      detail: z.string(),
      heuristic: z.boolean().optional()
    })
  )
});

export const EventClusterSchema = z.object({
  cluster_id: z.string(),
  label: z.string(),
  description: z.string(),
  member_candidate_ids: z.array(z.string()).min(1),
  candidate_count: z.number().int().nonnegative(),
  suppressed_duplicate_count: z.number().int().nonnegative(),
  freshness_summary: z.string(),
  source_quality_summary: z.string(),
  primary_contracts: z.array(z.nativeEnum(ContractId)),
  secondary_contracts: z.array(z.nativeEnum(ContractId)),
  refinement_status: z.enum(['deterministic_only', 'llm_refined', 'llm_refinement_failed_fallback']),
  provenance_notes: z.array(z.string())
});

export const CrossContractScanSummarySchema = z.object({
  status: z.enum(['ready', 'empty', 'unconfigured', 'error']),
  provider_id: z.string(),
  retrieved_at: z.string(),
  recency_window_hours: z.number().int().positive(),
  candidates: z.array(DiscoveryCandidateSchema),
  clusters: z.array(EventClusterSchema),
  issues: z.array(z.string()),
  scan_mode: z.literal('morning_coverage'),
  trace: z.array(
    z.object({
      stage: z.enum(['pipeline', 'discover', 'intake', 'screen', 'cluster', 'analyze', 'translate', 'deploy']),
      rule_id: z.string(),
      source_files: z.array(z.string()),
      detail: z.string(),
      heuristic: z.boolean().optional()
    })
  )
});
