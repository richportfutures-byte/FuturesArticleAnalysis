import { describe, expect, it, vi } from 'vitest';
import { ContractId, RunMode, SourceType } from '../domain/enums';
import {
  runCrossContractMorningCoverageScan,
  runDiscovery,
  type DiscoveryProvider,
  type EventClusterRefinementProvider
} from '../engine/discover';
import { executePipeline } from '../engine/pipeline';
// @ts-expect-error Vitest imports the plain JS Vercel function directly for boundary coverage.
import discoverHandler from '../../api/discover.js';
// @ts-expect-error Vitest imports the plain JS Vercel function directly for boundary coverage.
import refineClustersHandler from '../../api/refine-clusters.js';


const invokeVercelHandler = async (handler: (req: any, res: any) => Promise<unknown> | unknown, req: { method?: string; body?: unknown }) => {
  let statusCode = 200;
  let body: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    }
  };

  await handler({ method: req.method, body: req.body }, res);
  return {
    statusCode,
    body: JSON.stringify(body)
  };
};

const buildCrossContractProvider = (): DiscoveryProvider => ({
  providerId: 'mock-cross-contract-provider',
  configured: true,
  search: async (request) => {
    const nqFedPreset = request.query_presets.find((preset) => preset.preset_id === 'nq-fed-inflation') ?? request.query_presets[0];
    const znInflationPreset = request.query_presets.find((preset) => preset.preset_id === 'zn-inflation-labor') ?? request.query_presets[1];
    const clOpecPreset = request.query_presets.find((preset) => preset.preset_id === 'cl-opec-supply') ?? request.query_presets[2];

    return {
      retrieved_at: '2026-03-16T12:00:00Z',
      items: [
        {
          url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260316a.htm',
          title: 'Federal Reserve signals inflation persistence and tighter financial conditions',
          snippet: 'Official release highlights inflation persistence, labor firmness, and higher Treasury yields.',
          raw_text:
            'The Federal Reserve said inflation remains elevated, labor data remains firm, Treasury yields repriced higher, and duration-sensitive equities faced pressure.',
          published_at: '2026-03-16T11:00:00Z',
          source_name: 'Federal Reserve',
          source_domain: 'federalreserve.gov',
          discovery_query: nqFedPreset.query,
          query_preset_id: nqFedPreset.preset_id
        },
        {
          url: 'https://www.reuters.com/markets/us/fed-signals-inflation-persistence-2026-03-16/',
          title: 'Fed signals inflation persistence as financial conditions tighten',
          snippet: 'Reuters says Treasury futures, Nasdaq, gold, and the euro all reacted to Fed-path repricing.',
          raw_text:
            'Reuters reports the statement pushed Treasury yields higher, hit Treasury futures through Fed-path repricing, pressured Nasdaq and gold through real yields, and only modestly firmed the dollar against the euro.',
          published_at: '2026-03-16T11:20:00Z',
          source_name: 'Reuters',
          source_domain: 'reuters.com',
          discovery_query: znInflationPreset.query,
          query_preset_id: znInflationPreset.preset_id
        },
        {
          url: 'https://www.opec.org/opec_web/en/press_room/1234.htm',
          title: 'OPEC+ signals tighter compliance as crude supply restraint continues',
          snippet: 'OPEC points to quota discipline and tighter crude balances.',
          raw_text:
            'OPEC said tighter compliance and supply restraint should keep crude balances firm while macro demand remains mixed.',
          published_at: '2026-03-16T10:30:00Z',
          source_name: 'OPEC',
          source_domain: 'opec.org',
          discovery_query: clOpecPreset.query,
          query_preset_id: clOpecPreset.preset_id
        }
      ]
    };
  }
});

const buildDiscoveryImportArticle = (candidate: {
  id: string;
  headline: string;
  body_excerpt: string;
  source_type: SourceType;
  published_at: string | null;
  url: string | null;
  publisher?: string;
  source_domain?: string | null;
  source_completeness: 'full_text' | 'partial_text' | 'unresolved';
}) => ({
  article_id: `discover-${candidate.id}`,
  headline: candidate.headline,
  body_excerpt: candidate.body_excerpt,
  source_type: candidate.source_type,
  published_at: candidate.published_at,
  url: candidate.url,
  publisher: candidate.publisher,
  source_domain: candidate.source_domain,
  source_origin: 'live_fetched' as const,
  source_completeness: candidate.source_completeness,
  discovery_context: {
    search_provider: 'mock-cross-contract-provider',
    search_timestamp: '2026-03-16T12:00:00Z',
    search_query: 'cross-contract morning coverage',
    recency_window_hours: 72,
    source_domain: candidate.source_domain ?? null,
    source_name: candidate.publisher ?? 'Unknown source',
    authority_tier: 'tier_2' as const,
    directness: 'reported_summary' as const,
    import_readiness: candidate.source_completeness,
    operator_edits_after_import: []
  }
});

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

  it('scores 72-hour items above 73-hour items at the freshness boundary', async () => {
    const retrievedAt = '2026-03-16T12:00:00Z';
    const provider: DiscoveryProvider = {
      providerId: 'mock-freshness-provider',
      configured: true,
      search: async (request) => ({
        retrieved_at: retrievedAt,
        items: [
          {
            url: 'https://www.reuters.com/markets/us/cpi-window-72h',
            title: 'CPI release inside the 72-hour freshness boundary',
            snippet: 'Primary reporting on inflation and yields.',
            raw_text: 'Inflation surprise and Treasury yields matter for NQ.',
            published_at: '2026-03-13T12:00:00Z',
            source_name: 'Reuters',
            source_domain: 'reuters.com',
            discovery_query: request.query_presets[0].query,
            query_preset_id: request.query_presets[0].preset_id
          },
          {
            url: 'https://www.reuters.com/markets/us/cpi-window-73h',
            title: 'Semiconductor leadership story outside the 73-hour freshness boundary',
            snippet: 'Primary reporting on inflation and yields.',
            raw_text: 'Inflation surprise and Treasury yields matter for NQ.',
            published_at: '2026-03-13T11:00:00Z',
            source_name: 'Reuters',
            source_domain: 'reuters.com',
            discovery_query: request.query_presets[0].query,
            query_preset_id: request.query_presets[0].preset_id
          }
        ]
      })
    };

    const summary = await runDiscovery(
      {
        contract_id: ContractId.NQ,
        recency_window_hours: 72,
        max_results: 12
      },
      provider
    );

    expect(summary.candidates).toHaveLength(2);

    const seventyTwoHourItem = summary.candidates.find((candidate) => /72-hour/.test(candidate.title));
    const seventyThreeHourItem = summary.candidates.find((candidate) => /73-hour/.test(candidate.title));

    expect(seventyTwoHourItem).toBeDefined();
    expect(seventyThreeHourItem).toBeDefined();
    expect(seventyTwoHourItem!.freshness_score).toBeGreaterThan(seventyThreeHourItem!.freshness_score);
  });

  it('returns a fail-closed payload when TAVILY_API_KEY is missing at the Vercel boundary', async () => {
    const originalApiKey = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;

    try {
      const response = await invokeVercelHandler(discoverHandler, {
        method: 'POST',
        body: JSON.stringify({
          recency_window_hours: 72,
          max_results: 12,
          query_presets: [
            {
              preset_id: 'test-preset',
              query: 'Federal Reserve CPI PCE payroll labor data yields megacap tech Nasdaq',
              preferred_domains: ['federalreserve.gov'],
              max_results: 2
            }
          ]
        })
      });

      expect(response.statusCode).toBe(503);
      const payload = JSON.parse(response.body) as { issue?: string; items?: unknown[] };
      expect(payload.issue).toMatch(/discovery provider is unavailable/i);
      expect(payload.items === undefined || payload.items.length === 0).toBe(true);
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.TAVILY_API_KEY;
      } else {
        process.env.TAVILY_API_KEY = originalApiKey;
      }
    }
  });

  it('builds deterministic pre-clusters for a cross-contract morning scan', async () => {
    const summary = await runCrossContractMorningCoverageScan(
      {
        recency_window_hours: 72,
        max_results: 18
      },
      buildCrossContractProvider(),
      {
        providerId: 'unconfigured-cluster-refiner',
        configured: false,
        refine: async (request) => ({
          status: 'refinement_unavailable',
          pre_clusters: request.pre_clusters
        })
      }
    );

    expect(summary.status).toBe('ready');
    expect(summary.scan_mode).toBe('morning_coverage');
    expect(summary.clusters).toHaveLength(2);
    const fedCluster = summary.clusters.find((cluster) => cluster.candidate_count === 2);
    expect(fedCluster).toBeDefined();
    expect(fedCluster?.refinement_status).toBe('deterministic_only');
    expect([...(fedCluster?.primary_contracts ?? []), ...(fedCluster?.secondary_contracts ?? [])]).toContain(ContractId.ZN);
    expect(fedCluster?.secondary_contracts.some((contractId) => [ContractId.NQ, ContractId.GC, ContractId.SIXE].includes(contractId))).toBe(true);
  });

  it('uses validated refined clusters when the refiner returns a supported partition', async () => {
    const provider = buildCrossContractProvider();
    const refiner: EventClusterRefinementProvider = {
      providerId: 'mock-cluster-refiner',
      configured: true,
      refine: async (request) => {
        const fedMembers = request.candidates_metadata.filter((candidate) => /fed|federal reserve/i.test(candidate.title)).map((candidate) => candidate.id);
        const oilMembers = request.candidates_metadata.filter((candidate) => /opec|crude/i.test(candidate.title)).map((candidate) => candidate.id);

        return {
          status: 'refined',
          provider_id: 'mock-cluster-refiner',
          clusters: [
            {
              cluster_id: 'fed-repricing',
              label: 'Fed repricing / yields firm',
              description: 'Rates-sensitive coverage is converging on a Fed-path and real-yields repricing theme.',
              member_candidate_ids: fedMembers,
              candidate_count: 99,
              suppressed_duplicate_count: 0,
              freshness_summary: 'placeholder',
              source_quality_summary: 'placeholder',
              primary_contracts: [ContractId.ZN],
              secondary_contracts: [ContractId.NQ, ContractId.GC, ContractId.SIXE],
              provenance_notes: ['Merged the official statement with Reuters coverage.']
            },
            {
              cluster_id: 'opec-supply',
              label: 'OPEC supply restraint',
              description: 'Supply-discipline coverage remains centered on crude balances.',
              member_candidate_ids: oilMembers,
              candidate_count: 1,
              suppressed_duplicate_count: 0,
              freshness_summary: 'placeholder',
              source_quality_summary: 'placeholder',
              primary_contracts: [ContractId.CL],
              secondary_contracts: [ContractId.GC, ContractId.NQ],
              provenance_notes: ['Left OPEC coverage separate from the Fed cluster.']
            }
          ]
        };
      }
    };

    const summary = await runCrossContractMorningCoverageScan(
      {
        recency_window_hours: 72,
        max_results: 18
      },
      provider,
      refiner
    );

    expect(summary.clusters).toHaveLength(2);
    expect(summary.clusters[0].refinement_status).toBe('llm_refined');
    expect(summary.clusters.some((cluster) => cluster.label === 'Fed repricing / yields firm')).toBe(true);
    expect(summary.clusters.find((cluster) => cluster.label === 'Fed repricing / yields firm')?.candidate_count).toBe(2);
  });

  it('rejects invalid refinement output and falls back to deterministic pre-clusters', async () => {
    const provider = buildCrossContractProvider();
    const refiner: EventClusterRefinementProvider = {
      providerId: 'invalid-cluster-refiner',
      configured: true,
      refine: async () => ({
        status: 'refined',
        clusters: [
          {
            cluster_id: 'invalid-cluster',
            label: 'Invalid cluster',
            description: 'This cluster uses an unsupported candidate id.',
            member_candidate_ids: ['unknown-candidate'],
            candidate_count: 1,
            suppressed_duplicate_count: 0,
            freshness_summary: 'placeholder',
            source_quality_summary: 'placeholder',
            primary_contracts: [ContractId.ZN],
            secondary_contracts: [],
            provenance_notes: ['invalid']
          }
        ]
      })
    };

    const summary = await runCrossContractMorningCoverageScan(
      {
        recency_window_hours: 72,
        max_results: 18
      },
      provider,
      refiner
    );

    expect(summary.issues.some((issue) => /failed validation/i.test(issue))).toBe(true);
    expect(summary.clusters.every((cluster) => cluster.refinement_status === 'llm_refinement_failed_fallback')).toBe(true);
  });

  it('preserves only supported contracts in refined exposure maps', async () => {
    const provider = buildCrossContractProvider();
    const refiner: EventClusterRefinementProvider = {
      providerId: 'supported-contract-filter',
      configured: true,
      refine: async (request) => {
        const fedMembers = request.candidates_metadata.filter((candidate) => /fed|federal reserve/i.test(candidate.title)).map((candidate) => candidate.id);
        const oilMembers = request.candidates_metadata.filter((candidate) => /opec|crude/i.test(candidate.title)).map((candidate) => candidate.id);

        return {
          status: 'refined',
          clusters: [
            {
              cluster_id: 'fed-repricing',
              label: 'Fed repricing / yields firm',
              description: 'Rates-sensitive coverage is converging on a Fed-path and real-yields repricing theme.',
              member_candidate_ids: fedMembers,
              candidate_count: 2,
              suppressed_duplicate_count: 0,
              freshness_summary: 'placeholder',
              source_quality_summary: 'placeholder',
              primary_contracts: [ContractId.ZN, 'ES' as unknown as ContractId],
              secondary_contracts: ['BTC' as unknown as ContractId, ContractId.NQ],
              provenance_notes: ['unsupported contracts should be stripped']
            },
            {
              cluster_id: 'opec-supply',
              label: 'OPEC supply restraint',
              description: 'Supply-discipline coverage remains centered on crude balances.',
              member_candidate_ids: oilMembers,
              candidate_count: 1,
              suppressed_duplicate_count: 0,
              freshness_summary: 'placeholder',
              source_quality_summary: 'placeholder',
              primary_contracts: [ContractId.CL],
              secondary_contracts: [],
              provenance_notes: ['valid crude cluster']
            }
          ]
        };
      }
    };

    const summary = await runCrossContractMorningCoverageScan(
      {
        recency_window_hours: 72,
        max_results: 18
      },
      provider,
      refiner
    );

    const supportedContracts = Object.values(ContractId);
    expect(
      summary.clusters.every((cluster) =>
        [...cluster.primary_contracts, ...cluster.secondary_contracts].every((contractId) => supportedContracts.includes(contractId))
      )
    ).toBe(true);
  });

  it('supports explicit import from cross-contract cluster members through the existing pipeline path', async () => {
    const summary = await runCrossContractMorningCoverageScan(
      {
        recency_window_hours: 72,
        max_results: 18
      },
      buildCrossContractProvider(),
      {
        providerId: 'unconfigured-cluster-refiner',
        configured: false,
        refine: async (request) => ({
          status: 'refinement_unavailable',
          pre_clusters: request.pre_clusters
        })
      }
    );

    const selectedCluster = summary.clusters.find((cluster) => cluster.primary_contracts.includes(ContractId.ZN)) ?? summary.clusters[0];
    const selectedCandidateId = selectedCluster.member_candidate_ids[0];
    const selectedCandidate = summary.candidates.find((candidate) => candidate.id === selectedCandidateId);

    expect(selectedCandidate).toBeDefined();

    const output = await executePipeline(
      {
        run_id: 'cross-contract-import-1',
        contract_id: ContractId.ZN,
        run_mode: RunMode.SINGLE_ARTICLE,
        intake_mode: 'manual_text',
        articles: [
          buildDiscoveryImportArticle({
            id: selectedCandidate!.id,
            headline: selectedCandidate!.title,
            body_excerpt: selectedCandidate!.import_excerpt,
            source_type: selectedCandidate!.source_type,
            published_at: selectedCandidate!.published_at,
            url: selectedCandidate!.url,
            publisher: selectedCandidate!.source_name,
            source_domain: selectedCandidate!.source_domain,
            source_completeness: selectedCandidate!.source_completeness
          })
        ]
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.state).toBe('completed');
    expect(output.provenance.intake_sources?.[0].discovery_context?.search_provider).toBe('mock-cross-contract-provider');
  });


  const buildRefinementBoundaryRequestBody = () => ({
    pre_clusters: [
      {
        cluster_id: 'pre-1',
        label: 'Fed repricing / yields firm',
        description: 'Deterministic pre-cluster',
        member_candidate_ids: ['candidate-1'],
        candidate_count: 1,
        suppressed_duplicate_count: 0,
        freshness_summary: 'latest item within 2h',
        source_quality_summary: '1 tier-1',
        primary_contracts: ['ZN'],
        secondary_contracts: ['NQ'],
        provenance_notes: ['seeded by deterministic rules']
      }
    ],
    candidates_metadata: [
      {
        id: 'candidate-1',
        title: 'Fed signals inflation persistence as financial conditions tighten',
        snippet: 'Reuters says investors repriced yields after the statement.',
        source_name: 'Reuters',
        source_domain: 'reuters.com',
        authority_tier: 'tier_2',
        directness: 'reported_summary',
        published_at: '2026-03-16T11:20:00Z',
        retrieved_at: '2026-03-16T12:00:00Z',
        duplication_cluster_id: 'dup-1',
        discovery_query: 'Fed rates yields',
        review_bucket: 'high_confidence',
        contract_relevance_candidates: [
          {
            contract_id: 'ZN',
            fit: 'primary',
            rationale: 'Treasury yields repriced.',
            matched_focus: ['Fed-path repricing']
          }
        ],
        duplicate_suppressed_count: 0
      }
    ]
  });

  const buildRefinedClusterPayload = () => ({
    clusters: [
      {
        cluster_id: 'refined-1',
        label: 'Fed repricing / yields firm',
        description: 'Refined output',
        member_candidate_ids: ['candidate-1'],
        candidate_count: 1,
        suppressed_duplicate_count: 0,
        freshness_summary: 'latest item within 2h',
        source_quality_summary: '1 tier-1',
        primary_contracts: ['ZN'],
        secondary_contracts: ['NQ'],
        provenance_notes: ['refined by gemini']
      }
    ]
  });

  it('falls back honestly when Gemini promptFeedback blocks refinement output at the Vercel boundary', async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    const originalFetch = globalThis.fetch;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-3-pro-preview';

    globalThis.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          promptFeedback: {
            blockReason: 'SAFETY'
          }
        })
      }) as Response
    );

    try {
      const response = await invokeVercelHandler(refineClustersHandler, {
        method: 'POST',
        body: JSON.stringify(buildRefinementBoundaryRequestBody())
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body) as { status?: string; pre_clusters?: unknown[]; issue?: string };
      expect(payload.status).toBe('refinement_unavailable');
      expect(payload.pre_clusters).toHaveLength(1);
      expect(payload.issue).toMatch(/blocked refinement output/i);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalApiKey;
      }

      if (originalModel === undefined) {
        delete process.env.GEMINI_MODEL;
      } else {
        process.env.GEMINI_MODEL = originalModel;
      }
    }
  });

  it('falls back honestly when Gemini candidate finishReason is SAFETY at the Vercel boundary', async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    const originalFetch = globalThis.fetch;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-3-pro-preview';

    globalThis.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: 'SAFETY',
              content: {
                parts: [{ text: JSON.stringify(buildRefinedClusterPayload()) }]
              }
            }
          ]
        })
      }) as Response
    );

    try {
      const response = await invokeVercelHandler(refineClustersHandler, {
        method: 'POST',
        body: JSON.stringify(buildRefinementBoundaryRequestBody())
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body) as { status?: string; pre_clusters?: unknown[]; issue?: string };
      expect(payload.status).toBe('refinement_unavailable');
      expect(payload.pre_clusters).toHaveLength(1);
      expect(payload.issue).toMatch(/candidate level: SAFETY/i);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalApiKey;
      }

      if (originalModel === undefined) {
        delete process.env.GEMINI_MODEL;
      } else {
        process.env.GEMINI_MODEL = originalModel;
      }
    }
  });

  it('falls back honestly when Gemini candidate finishReason is non-STOP at the Vercel boundary', async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    const originalFetch = globalThis.fetch;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-3-pro-preview';

    globalThis.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: 'MAX_TOKENS',
              content: {
                parts: [{ text: JSON.stringify(buildRefinedClusterPayload()) }]
              }
            }
          ]
        })
      }) as Response
    );

    try {
      const response = await invokeVercelHandler(refineClustersHandler, {
        method: 'POST',
        body: JSON.stringify(buildRefinementBoundaryRequestBody())
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body) as { status?: string; pre_clusters?: unknown[]; issue?: string };
      expect(payload.status).toBe('refinement_unavailable');
      expect(payload.pre_clusters).toHaveLength(1);
      expect(payload.issue).toMatch(/non-successful: MAX_TOKENS/i);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalApiKey;
      }

      if (originalModel === undefined) {
        delete process.env.GEMINI_MODEL;
      } else {
        process.env.GEMINI_MODEL = originalModel;
      }
    }
  });


  it('falls back honestly when Gemini returns malformed refinement JSON at the Vercel boundary', async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    const originalFetch = globalThis.fetch;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-3-pro-preview';

    globalThis.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '{"clusters":[{"cluster_id":"bad"}]}' }]
              }
            }
          ]
        })
      }) as Response
    );

    try {
      const response = await invokeVercelHandler(refineClustersHandler, {
        method: 'POST',
        body: JSON.stringify({
          pre_clusters: [
            {
              cluster_id: 'pre-1',
              label: 'Fed repricing / yields firm',
              description: 'Deterministic pre-cluster',
              member_candidate_ids: ['candidate-1'],
              candidate_count: 1,
              suppressed_duplicate_count: 0,
              freshness_summary: 'latest item within 2h',
              source_quality_summary: '1 tier-1',
              primary_contracts: ['ZN'],
              secondary_contracts: ['NQ'],
              provenance_notes: ['seeded by deterministic rules']
            }
          ],
          candidates_metadata: [
            {
              id: 'candidate-1',
              title: 'Fed signals inflation persistence as financial conditions tighten',
              snippet: 'Reuters says investors repriced yields after the statement.',
              source_name: 'Reuters',
              source_domain: 'reuters.com',
              authority_tier: 'tier_2',
              directness: 'reported_summary',
              published_at: '2026-03-16T11:20:00Z',
              retrieved_at: '2026-03-16T12:00:00Z',
              duplication_cluster_id: 'dup-1',
              discovery_query: 'Fed rates yields',
              review_bucket: 'high_confidence',
              contract_relevance_candidates: [
                {
                  contract_id: 'ZN',
                  fit: 'primary',
                  rationale: 'Treasury yields repriced.',
                  matched_focus: ['Fed-path repricing']
                }
              ],
              duplicate_suppressed_count: 0
            }
          ]
        })
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body) as { status?: string; pre_clusters?: unknown[]; issue?: string };
      expect(payload.status).toBe('refinement_unavailable');
      expect(payload.pre_clusters).toHaveLength(1);
      expect(payload.issue).toBeTruthy();
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalApiKey;
      }

      if (originalModel === undefined) {
        delete process.env.GEMINI_MODEL;
      } else {
        process.env.GEMINI_MODEL = originalModel;
      }
    }
  });

  it('accepts validated refined clusters from Gemini at the Vercel boundary', async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    const originalFetch = globalThis.fetch;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-3.1-pro-preview';

    globalThis.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      clusters: [
                        {
                          cluster_id: 'refined-1',
                          label: 'Fed repricing / yields firm',
                          description: 'Refined output',
                          member_candidate_ids: ['candidate-1'],
                          candidate_count: 1,
                          suppressed_duplicate_count: 0,
                          freshness_summary: 'latest item within 2h',
                          source_quality_summary: '1 tier-1',
                          primary_contracts: ['ZN'],
                          secondary_contracts: ['NQ'],
                          provenance_notes: ['refined by gemini']
                        }
                      ]
                    })
                  }
                ]
              }
            }
          ]
        })
      }) as Response
    );

    try {
      const response = await invokeVercelHandler(refineClustersHandler, {
        method: 'POST',
        body: JSON.stringify({
          pre_clusters: [
            {
              cluster_id: 'pre-1',
              label: 'Fed repricing / yields firm',
              description: 'Deterministic pre-cluster',
              member_candidate_ids: ['candidate-1'],
              candidate_count: 1,
              suppressed_duplicate_count: 0,
              freshness_summary: 'latest item within 2h',
              source_quality_summary: '1 tier-1',
              primary_contracts: ['ZN'],
              secondary_contracts: ['NQ'],
              provenance_notes: ['seeded by deterministic rules']
            }
          ],
          candidates_metadata: [
            {
              id: 'candidate-1',
              title: 'Fed signals inflation persistence as financial conditions tighten',
              snippet: 'Reuters says investors repriced yields after the statement.',
              source_name: 'Reuters',
              source_domain: 'reuters.com',
              authority_tier: 'tier_2',
              directness: 'reported_summary',
              published_at: '2026-03-16T11:20:00Z',
              retrieved_at: '2026-03-16T12:00:00Z',
              duplication_cluster_id: 'dup-1',
              discovery_query: 'Fed rates yields',
              review_bucket: 'high_confidence',
              contract_relevance_candidates: [
                {
                  contract_id: 'ZN',
                  fit: 'primary',
                  rationale: 'Treasury yields repriced.',
                  matched_focus: ['Fed-path repricing']
                }
              ],
              duplicate_suppressed_count: 0
            }
          ]
        })
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body) as { status?: string; clusters?: unknown[]; providerId?: string };
      expect(payload.status).toBe('refined');
      expect(payload.clusters).toHaveLength(1);
      expect(payload.providerId).toBe('gemini:gemini-3.1-pro-preview');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/models/gemini-3.1-pro-preview:generateContent'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-goog-api-key': 'test-gemini-key'
          })
        })
      );
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalApiKey;
      }

      if (originalModel === undefined) {
        delete process.env.GEMINI_MODEL;
      } else {
        process.env.GEMINI_MODEL = originalModel;
      }
    }
  });

  it('returns deterministic fallback payload from the refinement Vercel boundary when GEMINI_API_KEY is missing', async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;

    try {
      const response = await invokeVercelHandler(refineClustersHandler, {
        method: 'POST',
        body: JSON.stringify({
          pre_clusters: [
            {
              cluster_id: 'pre-1',
              label: 'Fed repricing / yields firm',
              description: 'Deterministic pre-cluster',
              member_candidate_ids: ['candidate-1'],
              candidate_count: 1,
              suppressed_duplicate_count: 0,
              freshness_summary: 'latest item within 2h',
              source_quality_summary: '1 tier-1',
              primary_contracts: ['ZN'],
              secondary_contracts: ['NQ'],
              provenance_notes: ['seeded by deterministic rules']
            }
          ],
          candidates_metadata: [
            {
              id: 'candidate-1',
              title: 'Fed signals inflation persistence as financial conditions tighten',
              snippet: 'Reuters says investors repriced yields after the statement.',
              source_name: 'Reuters',
              source_domain: 'reuters.com',
              authority_tier: 'tier_2',
              directness: 'reported_summary',
              published_at: '2026-03-16T11:20:00Z',
              retrieved_at: '2026-03-16T12:00:00Z',
              duplication_cluster_id: 'dup-1',
              discovery_query: 'Fed rates yields',
              review_bucket: 'high_confidence',
              contract_relevance_candidates: [
                {
                  contract_id: 'ZN',
                  fit: 'primary',
                  rationale: 'Treasury yields repriced.',
                  matched_focus: ['Fed-path repricing']
                }
              ],
              duplicate_suppressed_count: 0
            }
          ]
        })
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body) as { status?: string; pre_clusters?: unknown[] };
      expect(payload.status).toBe('refinement_unavailable');
      expect(payload.pre_clusters).toHaveLength(1);
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalApiKey;
      }

      if (originalModel === undefined) {
        delete process.env.GEMINI_MODEL;
      } else {
        process.env.GEMINI_MODEL = originalModel;
      }
    }
  });
});
