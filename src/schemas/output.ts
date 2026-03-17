import { z } from 'zod';
import {
  CausalCoherenceAssessment,
  ContractId,
  DeploymentUse,
  NoveltyAssessment,
  PricedInAssessment,
  ReasonerMode,
  SourceSurvival,
  SourceType,
  WorkflowState
} from '../domain/enums';
import { IntakeModeSchema, SourceCompletenessSchema, SourceOriginSchema } from './input';

const CandidateContractRelevanceSchema = z.object({
  contract_id: z.nativeEnum(ContractId),
  fit: z.enum(['primary', 'secondary', 'low']),
  rationale: z.string(),
  matched_focus: z.array(z.string())
});

const SourceGroundingSchema = z.object({
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

const NormalizedArticleSchema = z.object({
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

const IntakeSourceRecordSchema = z.object({
  article_id: z.string(),
  headline: z.string(),
  url: z.string().nullable(),
  publisher: z.string().optional(),
  published_at: z.string().nullable(),
  source_type: z.nativeEnum(SourceType),
  intake_mode: IntakeModeSchema,
  source_origin: SourceOriginSchema,
  source_completeness: SourceCompletenessSchema
});

const IntakeSummarySchema = z.object({
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

export const RunOutputSchema = z.object({
  run_id: z.string(),
  contract_id: z.string(),
  state: z.nativeEnum(WorkflowState),
  screen_result: z.nativeEnum(SourceSurvival),
  deployment_use: z.nativeEnum(DeploymentUse),
  intake: IntakeSummarySchema,
  analysis: DeepAnalysisSchema.nullable().optional(),
  bias_brief: z
    .object({
      title: z.string(),
      executive_summary: z.string(),
      prose: z.string()
    })
    .nullable(),
  provenance: z.object({
    source_files: z.array(z.string()),
    rule_ids: z.array(z.string()),
    contract_override_ids: z.array(z.string()),
    notes: z.array(z.string())
  }).extend({
    intake_mode: IntakeModeSchema.optional(),
    intake_status: z.enum(['ready', 'degraded', 'unresolved']).optional(),
    intake_sources: z.array(IntakeSourceRecordSchema).optional()
  })
});
