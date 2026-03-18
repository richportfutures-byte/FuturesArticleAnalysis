import { describe, expect, it } from 'vitest';
import { buildEditedDiscoveryArticle, buildManualDraftArticle, collectDiscoveryOperatorEdits } from '../engine/discoveryImport';
import { ContractId, SourceType } from '../domain/enums';
import type { DiscoveryCandidate } from '../domain/entities';

const candidate: DiscoveryCandidate = {
  id: 'candidate-1',
  url: 'https://example.com/fed',
  title: 'Fed repricing headline',
  source_name: 'Reuters',
  source_domain: 'reuters.com',
  source_type: SourceType.PRIMARY_REPORTING,
  authority_tier: 'tier_2',
  directness: 'reported_summary',
  published_at: '2026-03-18T08:30:00Z',
  retrieved_at: '2026-03-18T08:45:00Z',
  snippet: 'snippet',
  import_excerpt: 'full imported excerpt',
  source_completeness: 'partial_text',
  contract_relevance_candidates: [
    {
      contract_id: ContractId.ZN,
      fit: 'primary',
      rationale: 'Rates repricing',
      matched_focus: ['Fed-path repricing']
    }
  ],
  freshness_score: 0.9,
  authority_score: 0.8,
  contract_theme_score: 0.85,
  directness_score: 0.7,
  import_readiness_score: 0.8,
  total_rank_score: 0.81,
  duplication_cluster_id: 'dup-1',
  cluster_suggestion: 'fed repricing',
  discovery_query: 'fed rates yields',
  review_bucket: 'high_confidence',
  provenance_notes: ['note'],
  search_provider: 'mock-provider',
  search_timestamp: '2026-03-18T08:45:00Z',
  recency_window_hours: 72
};

describe('discovery import builders', () => {
  it('keeps unresolved manual_url imports honest when editing a discovery candidate', () => {
    const article = buildEditedDiscoveryArticle(candidate, {
      headline: 'Edited Fed headline',
      bodyExcerpt: 'ignored body',
      sourceType: SourceType.PRIMARY_REPORTING,
      sourceUrl: candidate.url ?? '',
      publisher: candidate.source_name,
      publishedAt: candidate.published_at ?? '',
      sourceCompleteness: 'partial_text',
      intakeMode: 'manual_url'
    });

    expect(article.body_excerpt).toBe('');
    expect(article.source_completeness).toBe('unresolved');
    expect(article.discovery_context?.import_readiness).toBe('unresolved');
  });

  it('tracks explicit operator edits against the imported discovery baseline', () => {
    const edits = collectDiscoveryOperatorEdits(candidate, {
      headline: 'Edited Fed headline',
      bodyExcerpt: candidate.import_excerpt,
      sourceType: SourceType.OFFICIAL_STATEMENT,
      sourceUrl: 'https://example.com/fed-edited',
      publisher: 'Reuters',
      publishedAt: candidate.published_at ?? '',
      sourceCompleteness: 'partial_text',
      intakeMode: 'manual_text'
    });

    expect(edits).toEqual(expect.arrayContaining(['headline', 'source_type', 'url']));
  });

  it('builds manual draft articles without bypassing manual_url fail-closed semantics', () => {
    const article = buildManualDraftArticle(
      {
        headline: 'URL only',
        bodyExcerpt: 'should not persist as extracted text',
        sourceType: SourceType.PRIMARY_REPORTING,
        sourceUrl: 'https://example.com/url-only',
        publisher: 'Reuters',
        publishedAt: '2026-03-18T08:30:00Z',
        sourceCompleteness: 'full_text',
        intakeMode: 'manual_url'
      },
      'manual_url-1'
    );

    expect(article.body_excerpt).toBe('');
    expect(article.source_completeness).toBe('unresolved');
    expect(article.source_origin).toBe('manual_url');
  });
});
