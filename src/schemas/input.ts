import { z } from 'zod';
import { ContractId, RunMode, SourceType } from '../domain/enums';

export const IntakeModeSchema = z.enum(['manual_text', 'manual_url', 'fixture']);
export const SourceOriginSchema = z.enum(['manual_paste', 'manual_url', 'fixture', 'live_fetched']);
export const SourceCompletenessSchema = z.enum(['full_text', 'partial_text', 'unresolved']);

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
  intake_mode: IntakeModeSchema.optional(),
  source_origin: SourceOriginSchema.optional(),
  source_completeness: SourceCompletenessSchema.optional()
});

export const RunInputSchema = z.object({
  run_id: z.string(),
  contract_id: z.nativeEnum(ContractId),
  run_mode: z.nativeEnum(RunMode),
  intake_mode: IntakeModeSchema.default('manual_text'),
  articles: z.array(ArticleInputSchema).min(1)
});

export type RunInput = z.input<typeof RunInputSchema>;
export type ParsedRunInput = z.output<typeof RunInputSchema>;
