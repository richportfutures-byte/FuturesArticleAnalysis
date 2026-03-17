import { z } from 'zod';
import { ContractId, RunMode, SourceType } from '../domain/enums';

export const IntakeModeSchema = z.enum(['manual_text', 'manual_url', 'fixture']);
export const SourceOriginSchema = z.enum(['manual_paste', 'manual_url', 'fixture', 'live_fetched']);
export const SourceCompletenessSchema = z.enum(['full_text', 'partial_text', 'unresolved']);
export const DiscoveryAuthorityTierSchema = z.enum(['tier_1', 'tier_2', 'unlisted']);
export const DiscoveryDirectnessSchema = z.enum(['primary_release', 'reported_summary', 'commentary']);

export const DiscoveryImportContextSchema = z.object({
  search_provider: z.string(),
  search_timestamp: z.string(),
  search_query: z.string(),
  recency_window_hours: z.number().int().positive(),
  source_domain: z.string().nullable(),
  source_name: z.string(),
  authority_tier: DiscoveryAuthorityTierSchema,
  directness: DiscoveryDirectnessSchema,
  import_readiness: SourceCompletenessSchema,
  operator_edits_after_import: z.array(z.string())
});

export const ArticleInputSchema = z.object({
  article_id: z.string(),
  headline: z.string().default(''),
  body_excerpt: z.string().default(''),
  source_type: z.nativeEnum(SourceType).default(SourceType.UNKNOWN),
  published_at: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  author: z.string().optional(),
  publisher: z.string().optional(),
  notes: z.string().optional(),
  source_domain: z.string().nullable().optional(),
  intake_mode: IntakeModeSchema.optional(),
  source_origin: SourceOriginSchema.optional(),
  source_completeness: SourceCompletenessSchema.optional(),
  discovery_context: DiscoveryImportContextSchema.optional()
});

export const RunInputSchema = z.object({
  run_id: z.string(),
  contract_id: z.nativeEnum(ContractId),
  run_mode: z.nativeEnum(RunMode),
  intake_mode: IntakeModeSchema.default('manual_text'),
  articles: z.array(ArticleInputSchema).min(1)
});

export const DiscoveryRequestSchema = z.object({
  contract_id: z.nativeEnum(ContractId),
  recency_window_hours: z.number().int().positive().default(72),
  max_results: z.number().int().positive().default(12)
});

export const CrossContractScanRequestSchema = z.object({
  recency_window_hours: z.number().int().positive().default(72),
  max_results: z.number().int().positive().default(18)
});

export type RunInput = z.input<typeof RunInputSchema>;
export type ParsedRunInput = z.output<typeof RunInputSchema>;
export type DiscoveryRequestInput = z.input<typeof DiscoveryRequestSchema>;
export type DiscoveryRequest = z.output<typeof DiscoveryRequestSchema>;
export type CrossContractScanRequestInput = z.input<typeof CrossContractScanRequestSchema>;
export type CrossContractScanRequest = z.output<typeof CrossContractScanRequestSchema>;
