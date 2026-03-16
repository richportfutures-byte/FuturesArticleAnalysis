import { z } from 'zod';
import { ContractId, RunMode, SourceType } from '../domain/enums';

export const ArticleInputSchema = z.object({
  article_id: z.string(),
  headline: z.string().min(1),
  body_excerpt: z.string().default(''),
  source_type: z.nativeEnum(SourceType),
  published_at: z.string().nullable(),
  url: z.string().nullable()
});

export const RunInputSchema = z.object({
  run_id: z.string(),
  contract_id: z.nativeEnum(ContractId),
  run_mode: z.nativeEnum(RunMode),
  articles: z.array(ArticleInputSchema).min(1)
});

export type RunInput = z.infer<typeof RunInputSchema>;
