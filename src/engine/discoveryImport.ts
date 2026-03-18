import type { Article, DiscoveryCandidate, IntakeMode, SourceCompleteness, SourceOrigin } from '../domain/entities';
import { SourceType } from '../domain/enums';

export type ArticleDraftInputs = {
  headline: string;
  bodyExcerpt: string;
  sourceType: SourceType;
  sourceUrl: string;
  publisher: string;
  publishedAt: string;
  sourceCompleteness: SourceCompleteness;
};

export type DiscoveryImportDraft = ArticleDraftInputs & {
  intakeMode: IntakeMode;
};

export const sourceOriginByMode: Record<IntakeMode, SourceOrigin> = {
  manual_text: 'manual_paste',
  manual_url: 'manual_url',
  fixture: 'fixture'
};

export const buildManualDraftArticle = (draft: DiscoveryImportDraft, articleId: string): Article => ({
  article_id: articleId,
  headline: draft.headline,
  body_excerpt: draft.intakeMode === 'manual_url' ? '' : draft.bodyExcerpt,
  source_type: draft.sourceType,
  published_at: draft.publishedAt.trim() ? draft.publishedAt : null,
  url: draft.sourceUrl.trim() ? draft.sourceUrl : null,
  publisher: draft.publisher.trim() ? draft.publisher : undefined,
  intake_mode: draft.intakeMode,
  source_origin: sourceOriginByMode[draft.intakeMode],
  source_completeness: draft.intakeMode === 'manual_url' ? 'unresolved' : draft.sourceCompleteness
});

export const buildDiscoveryArticle = (
  candidate: DiscoveryCandidate,
  operatorEditsAfterImport: string[] = []
): Article => ({
  article_id: `discover-${candidate.id}`,
  headline: candidate.title,
  body_excerpt: candidate.import_excerpt,
  source_type: candidate.source_type,
  published_at: candidate.published_at,
  url: candidate.url,
  publisher: candidate.source_name,
  source_domain: candidate.source_domain,
  notes: candidate.provenance_notes.join(' '),
  intake_mode: 'manual_text',
  source_origin: 'live_fetched',
  source_completeness: candidate.source_completeness,
  discovery_context: {
    search_provider: candidate.search_provider,
    search_timestamp: candidate.search_timestamp,
    search_query: candidate.discovery_query,
    recency_window_hours: candidate.recency_window_hours,
    source_domain: candidate.source_domain,
    source_name: candidate.source_name,
    authority_tier: candidate.authority_tier,
    directness: candidate.directness,
    import_readiness: candidate.source_completeness,
    operator_edits_after_import: operatorEditsAfterImport
  }
});

export const collectDiscoveryOperatorEdits = (candidate: DiscoveryCandidate, draft: DiscoveryImportDraft): string[] => [
  ...(draft.headline !== candidate.title ? ['headline'] : []),
  ...((draft.intakeMode === 'manual_url' ? '' : draft.bodyExcerpt) !== candidate.import_excerpt ? ['body_excerpt'] : []),
  ...(draft.sourceType !== candidate.source_type ? ['source_type'] : []),
  ...((draft.sourceUrl.trim() || null) !== candidate.url ? ['url'] : []),
  ...((draft.publisher.trim() || '') !== candidate.source_name ? ['publisher'] : []),
  ...((draft.publishedAt.trim() || null) !== candidate.published_at ? ['published_at'] : []),
  ...((draft.intakeMode === 'manual_url' ? 'unresolved' : draft.sourceCompleteness) !== candidate.source_completeness
    ? ['source_completeness']
    : [])
];

export const buildEditedDiscoveryArticle = (candidate: DiscoveryCandidate, draft: DiscoveryImportDraft): Article => {
  const operatorEdits = collectDiscoveryOperatorEdits(candidate, draft);
  const article = buildDiscoveryArticle(candidate, operatorEdits);

  return {
    ...article,
    headline: draft.headline,
    body_excerpt: draft.intakeMode === 'manual_url' ? '' : draft.bodyExcerpt,
    source_type: draft.sourceType,
    published_at: draft.publishedAt.trim() ? draft.publishedAt : null,
    url: draft.sourceUrl.trim() ? draft.sourceUrl : null,
    publisher: draft.publisher.trim() ? draft.publisher : undefined,
    source_completeness: draft.intakeMode === 'manual_url' ? 'unresolved' : draft.sourceCompleteness,
    discovery_context: article.discovery_context
      ? {
          ...article.discovery_context,
          import_readiness: draft.intakeMode === 'manual_url' ? 'unresolved' : draft.sourceCompleteness,
          operator_edits_after_import: operatorEdits
        }
      : undefined
  };
};

export const deriveDraftFromArticle = (
  article: Article | undefined | null,
  fallback: ArticleDraftInputs
): ArticleDraftInputs => {
  if (!article) {
    return fallback;
  }

  return {
    headline: article.headline,
    bodyExcerpt: article.body_excerpt,
    sourceType: article.source_type ?? SourceType.UNKNOWN,
    sourceUrl: article.url ?? '',
    publisher: article.publisher ?? '',
    publishedAt: article.published_at ?? '',
    sourceCompleteness: (article.source_completeness ?? 'full_text') as SourceCompleteness
  };
};
