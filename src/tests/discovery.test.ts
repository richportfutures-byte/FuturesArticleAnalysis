import { describe, expect, it } from 'vitest';
import { ContractId, RunMode, SourceType } from '../domain/enums';
import { runDiscovery, type DiscoveryProvider } from '../engine/discover';
import { executePipeline } from '../engine/pipeline';

describe('recent discovery', () => {
  it('normalizes, ranks, and deduplicates contract-aware discovery candidates', async () => {
    const provider: DiscoveryProvider = {
      providerId: 'mock-discovery-provider',
      configured: true,
      search: async (request) => ({
        retrieved_at: '2026-03-16T12:00:00Z',
        items: [
          {
            url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260316a.htm',
            title: 'Federal Reserve statement highlights inflation persistence and tighter financial conditions',
            snippet: 'Official release points to inflation persistence and restrictive conditions.',
            raw_text: 'The Federal Reserve said inflation remains elevated and financial conditions are tighter.',
            published_at: '2026-03-16T11:00:00Z',
            source_name: 'Federal Reserve',
            source_domain: 'federalreserve.gov',
            discovery_query: request.query_presets[0].query,
            query_preset_id: request.query_presets[0].preset_id
          },
          {
            url: 'https://www.reuters.com/markets/us/fed-statement-inflation-persistence-2026-03-16/',
            title: 'Fed statement highlights inflation persistence and tighter financial conditions',
            snippet: 'Reuters summarizes the latest Fed statement and rates implications.',
            raw_text: 'Reuters reports the Fed statement reinforced higher-for-longer expectations.',
            published_at: '2026-03-16T11:20:00Z',
            source_name: 'Reuters',
            source_domain: 'reuters.com',
            discovery_query: request.query_presets[0].query,
            query_preset_id: request.query_presets[0].preset_id
          },
          {
            url: 'https://www.wsj.com/markets/markets-analysis-opinion-123',
            title: 'Opinion: why traders are overreacting to rates',
            snippet: 'Commentary-driven framing.',
            raw_text: '',
            published_at: '2026-03-16T10:00:00Z',
            source_name: 'Wall Street Journal',
            source_domain: 'wsj.com',
            discovery_query: request.query_presets[1].query,
            query_preset_id: request.query_presets[1].preset_id
          }
        ]
      })
    };

    const summary = await runDiscovery(
      {
        contract_id: ContractId.NQ,
        recency_window_hours: 240,
        max_results: 12
      },
      provider
    );

    expect(summary.status).toBe('ready');
    expect(summary.recency_window_hours).toBe(168);
    expect(summary.candidates).toHaveLength(2);
    expect(summary.candidates[0].authority_tier).toBe('tier_1');
    expect(summary.candidates[0].review_bucket).toBe('high_confidence');
    expect(summary.candidates[0].duplication_cluster_id).toBe('dup-1');
    expect(summary.candidates[0].provenance_notes.some((note) => /suppressed 1 near-duplicate/i.test(note))).toBe(true);
    expect(summary.candidates[1].review_bucket).toBe('low_authority_or_noise');
  });

  it('preserves discovery provenance when imported candidates are analyzed', async () => {
    const output = await executePipeline(
      {
        run_id: 'discovery-import-1',
        contract_id: ContractId.CL,
        run_mode: RunMode.SINGLE_ARTICLE,
        intake_mode: 'manual_text',
        articles: [
          {
            article_id: 'discover-1',
            headline: 'EIA reports crude draw while refinery runs improve',
            body_excerpt: 'Extracted page text says inventories fell and refinery utilization rose.',
            source_type: SourceType.OFFICIAL_STATEMENT,
            published_at: '2026-03-16T10:30:00Z',
            url: 'https://www.eia.gov/petroleum/supply/weekly/',
            publisher: 'EIA',
            source_domain: 'eia.gov',
            source_origin: 'live_fetched',
            source_completeness: 'partial_text',
            discovery_context: {
              search_provider: 'tavily:news-search',
              search_timestamp: '2026-03-16T12:00:00Z',
              search_query: 'EIA DOE crude inventories refinery utilization gasoline distillate oil market',
              recency_window_hours: 72,
              source_domain: 'eia.gov',
              source_name: 'EIA',
              authority_tier: 'tier_1',
              directness: 'primary_release',
              import_readiness: 'partial_text',
              operator_edits_after_import: ['headline']
            }
          }
        ]
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.state).toBe('completed');
    expect(output.provenance.intake_sources?.[0].source_origin).toBe('live_fetched');
    expect(output.provenance.intake_sources?.[0].discovery_context?.search_provider).toBe('tavily:news-search');
    expect(output.provenance.notes.some((note) => /discovery import/i.test(note))).toBe(true);
    expect(output.provenance.notes.some((note) => /operator edits after import/i.test(note))).toBe(true);
  });

  it('fails closed for unresolved discovery imports with no article text', async () => {
    const output = await executePipeline({
      run_id: 'discovery-import-2',
      contract_id: ContractId.GC,
      run_mode: RunMode.SINGLE_ARTICLE,
      intake_mode: 'manual_url',
      articles: [
        {
          article_id: 'discover-2',
          headline: 'Gold headline only',
          body_excerpt: '',
          source_type: SourceType.PRIMARY_REPORTING,
          published_at: '2026-03-16T11:00:00Z',
          url: 'https://www.reuters.com/markets/gold-headline-only',
          publisher: 'Reuters',
          source_domain: 'reuters.com',
          source_origin: 'live_fetched',
          source_completeness: 'unresolved',
          discovery_context: {
            search_provider: 'tavily:news-search',
            search_timestamp: '2026-03-16T12:00:00Z',
            search_query: 'gold real yields inflation shock dollar central bank demand Reuters Bloomberg',
            recency_window_hours: 72,
            source_domain: 'reuters.com',
            source_name: 'Reuters',
            authority_tier: 'tier_2',
            directness: 'reported_summary',
            import_readiness: 'unresolved',
            operator_edits_after_import: []
          }
        }
      ]
    });

    expect(output.state).toBe('error');
    expect(output.translation).toBeNull();
    expect(output.bias_brief).toBeNull();
    expect(output.deployment_use).toBe('no_trade');
    expect(output.provenance.notes.some((note) => /discovery import/i.test(note))).toBe(true);
  });
});
