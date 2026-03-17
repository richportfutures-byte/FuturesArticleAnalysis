import { contractOverrides } from '../domain/contracts';
import { buildTrace, matchChannels } from '../domain/contracts/types';
import {
  CandidateContractRelevance,
  DiscoveryCandidate,
  DiscoveryDirectness,
  DiscoveryQueryPreset,
  DiscoveryReviewBucket,
  DiscoveryStatus,
  DiscoverySummary,
  RuleTrace,
  SourceCompleteness
} from '../domain/entities';
import { ContractId, SourceType } from '../domain/enums';
import { DiscoveryRequest, DiscoveryRequestSchema } from '../schemas/input';
import { DiscoverySummarySchema } from '../schemas/output';

export const DEFAULT_DISCOVERY_RECENCY_HOURS = 72;
export const MIN_DISCOVERY_RECENCY_HOURS = 6;
export const MAX_DISCOVERY_RECENCY_HOURS = 168;
export const DEFAULT_DISCOVERY_MAX_RESULTS = 12;
export const MAX_DISCOVERY_RESULTS = 18;

type SourceRegistryEntry = {
  name: string;
  domains: string[];
  authority_tier: DiscoveryCandidate['authority_tier'];
  directness: DiscoveryDirectness;
  source_type: SourceType;
};

type DiscoveryProviderQuery = DiscoveryQueryPreset & {
  max_results: number;
};

type DiscoveryProviderRequest = {
  contract_id: ContractId;
  recency_window_hours: number;
  max_results: number;
  query_presets: DiscoveryProviderQuery[];
};

type RawDiscoveryItem = {
  url: string | null;
  title: string;
  snippet: string;
  raw_text: string;
  published_at: string | null;
  source_name?: string;
  source_domain?: string | null;
  discovery_query: string;
  query_preset_id: string;
  provenance_notes?: string[];
};

type DiscoveryProviderInvocation = {
  items: RawDiscoveryItem[];
  issue?: string;
  retrieved_at: string;
};

export interface DiscoveryProvider {
  providerId: string;
  configured: boolean;
  search: (request: DiscoveryProviderRequest) => Promise<DiscoveryProviderInvocation>;
}

type TavilyConfig = {
  apiKey: string;
  baseUrl: string;
};

type FunctionProviderConfig = {
  endpoint: string;
};

const SOURCE_REGISTRY: SourceRegistryEntry[] = [
  { name: 'Federal Reserve', domains: ['federalreserve.gov'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'US Treasury', domains: ['treasury.gov'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'BLS', domains: ['bls.gov'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'BEA', domains: ['bea.gov'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'Census Bureau', domains: ['census.gov'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'EIA', domains: ['eia.gov'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'DOE', domains: ['energy.gov'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'ECB', domains: ['ecb.europa.eu'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'Eurostat', domains: ['ec.europa.eu', 'europa.eu'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'OPEC', domains: ['opec.org'], authority_tier: 'tier_1', directness: 'primary_release', source_type: SourceType.OFFICIAL_STATEMENT },
  { name: 'Reuters', domains: ['reuters.com'], authority_tier: 'tier_2', directness: 'reported_summary', source_type: SourceType.PRIMARY_REPORTING },
  { name: 'Bloomberg', domains: ['bloomberg.com'], authority_tier: 'tier_2', directness: 'reported_summary', source_type: SourceType.PRIMARY_REPORTING },
  { name: 'Financial Times', domains: ['ft.com'], authority_tier: 'tier_2', directness: 'reported_summary', source_type: SourceType.PRIMARY_REPORTING },
  { name: 'Wall Street Journal', domains: ['wsj.com'], authority_tier: 'tier_2', directness: 'reported_summary', source_type: SourceType.PRIMARY_REPORTING },
  { name: 'Associated Press', domains: ['apnews.com'], authority_tier: 'tier_2', directness: 'reported_summary', source_type: SourceType.PRIMARY_REPORTING }
];

const QUERY_PRESETS: Record<ContractId, DiscoveryQueryPreset[]> = {
  [ContractId.NQ]: [
    { preset_id: 'nq-fed-inflation', label: 'Fed, inflation, and labor', query: 'Federal Reserve CPI PCE payroll labor data yields megacap tech Nasdaq', focus_tags: ['fed path', 'inflation', 'labor data', 'yields'], preferred_domains: ['federalreserve.gov', 'bls.gov', 'bea.gov', 'census.gov', 'reuters.com', 'bloomberg.com'] },
    { preset_id: 'nq-ai-megacap', label: 'AI and megacap leadership', query: 'AI megacap semiconductor cloud demand guidance Nasdaq Reuters Bloomberg', focus_tags: ['ai', 'megacap tech', 'semiconductors'], preferred_domains: ['reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com'] },
    { preset_id: 'nq-yields-risk', label: 'Rates and risk appetite', query: 'Treasury yields real yields duration pressure Nasdaq Reuters Wall Street Journal', focus_tags: ['real yields', 'duration pressure', 'risk appetite'], preferred_domains: ['treasury.gov', 'reuters.com', 'ft.com', 'wsj.com'] }
  ],
  [ContractId.ZN]: [
    { preset_id: 'zn-fed-auctions', label: 'Fed, Treasury, and auctions', query: 'Treasury auction refunding issuance Federal Reserve duration yields Treasury futures', focus_tags: ['treasury auctions', 'fiscal issuance', 'fed path', 'duration'], preferred_domains: ['treasury.gov', 'federalreserve.gov', 'reuters.com', 'bloomberg.com'] },
    { preset_id: 'zn-inflation-labor', label: 'Inflation and labor data', query: 'CPI PCE payroll labor data Treasury yields growth shock Reuters Bloomberg', focus_tags: ['cpi', 'pce', 'labor data', 'growth shock'], preferred_domains: ['bls.gov', 'bea.gov', 'census.gov', 'reuters.com', 'bloomberg.com'] },
    { preset_id: 'zn-risk-off', label: 'Risk-off macro', query: 'risk-off macro safe haven Treasury demand recession Reuters Financial Times', focus_tags: ['risk-off macro', 'safe-haven demand', 'growth slowdown'], preferred_domains: ['reuters.com', 'ft.com', 'wsj.com', 'apnews.com'] }
  ],
  [ContractId.GC]: [
    { preset_id: 'gc-real-yields', label: 'Real yields, inflation, and USD', query: 'gold real yields inflation shock dollar central bank demand Reuters Bloomberg', focus_tags: ['real yields', 'usd regime', 'inflation shock', 'central bank demand'], preferred_domains: ['federalreserve.gov', 'reuters.com', 'bloomberg.com', 'ft.com'] },
    { preset_id: 'gc-central-banks', label: 'Reserve demand', query: 'central bank gold demand reserve accumulation official release Reuters', focus_tags: ['central bank demand', 'reserve demand'], preferred_domains: ['reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com'] },
    { preset_id: 'gc-geopolitics', label: 'Geopolitical stress', query: 'geopolitical stress gold hedge demand Reuters Associated Press Financial Times', focus_tags: ['geopolitical stress', 'hedge demand'], preferred_domains: ['reuters.com', 'apnews.com', 'ft.com', 'wsj.com'] }
  ],
  [ContractId.SIXE]: [
    { preset_id: '6e-ecb-eurozone', label: 'ECB and Eurozone macro', query: 'ECB Eurozone inflation growth labor PMI euro Reuters Bloomberg', focus_tags: ['ecb', 'eurozone macro', 'growth divergence'], preferred_domains: ['ecb.europa.eu', 'ec.europa.eu', 'europa.eu', 'reuters.com', 'bloomberg.com'] },
    { preset_id: '6e-usd-rates', label: 'USD regime and rate differentials', query: 'dollar regime rate differential euro dollar spread Reuters Financial Times', focus_tags: ['usd regime', 'rate differentials', 'relative growth'], preferred_domains: ['reuters.com', 'ft.com', 'wsj.com', 'bloomberg.com'] },
    { preset_id: '6e-divergence', label: 'Policy divergence', query: 'policy divergence euro area US growth divergence Reuters Wall Street Journal', focus_tags: ['policy divergence', 'growth divergence'], preferred_domains: ['reuters.com', 'wsj.com', 'ft.com', 'apnews.com'] }
  ],
  [ContractId.CL]: [
    { preset_id: 'cl-eia-doe', label: 'EIA and DOE releases', query: 'EIA DOE crude inventories refinery utilization gasoline distillate oil market', focus_tags: ['inventories', 'refinery issues', 'product balances'], preferred_domains: ['eia.gov', 'energy.gov', 'reuters.com', 'bloomberg.com'] },
    { preset_id: 'cl-opec-supply', label: 'OPEC and supply discipline', query: 'OPEC production compliance oil supply disruption crude Reuters Financial Times', focus_tags: ['opec', 'supply disruptions', 'shipping disruptions'], preferred_domains: ['opec.org', 'reuters.com', 'ft.com', 'wsj.com'] },
    { preset_id: 'cl-geopolitics-shipping', label: 'Geopolitics and shipping', query: 'oil shipping disruption geopolitics refinery outage Reuters Associated Press', focus_tags: ['geopolitics', 'shipping disruptions', 'refinery issues'], preferred_domains: ['reuters.com', 'apnews.com', 'ft.com', 'wsj.com'] }
  ]
};

const commentaryLexicon = ['opinion', 'column', 'analysis', 'commentary', 'editorial'];

const authorityScoreByTier: Record<DiscoveryCandidate['authority_tier'], number> = {
  tier_1: 1,
  tier_2: 0.82,
  unlisted: 0.35
};

const directnessScoreByKind: Record<DiscoveryDirectness, number> = {
  primary_release: 1,
  reported_summary: 0.78,
  commentary: 0.32
};

const readinessScoreByCompleteness: Record<SourceCompleteness, number> = {
  full_text: 1,
  partial_text: 0.72,
  unresolved: 0.2
};

const emptyBucketCounts = (): Record<DiscoveryReviewBucket, number> => ({
  high_confidence: 0,
  secondary: 0,
  low_authority_or_noise: 0
});

const readRuntimeEnv = (name: string): string | undefined => {
  const viteEnv = (import.meta.env as Record<string, string | undefined>)[name];
  if (viteEnv) return viteEnv;

  const prefixedViteEnv = (import.meta.env as Record<string, string | undefined>)[`VITE_${name}`];
  if (prefixedViteEnv) return prefixedViteEnv;

  const processEnv =
    typeof globalThis !== 'undefined' && 'process' in globalThis
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      : undefined;

  return processEnv?.[name] ?? processEnv?.[`VITE_${name}`];
};

const resolveTavilyConfig = (): TavilyConfig | null => {
  const apiKey = readRuntimeEnv('TAVILY_API_KEY');
  const baseUrl = readRuntimeEnv('TAVILY_BASE_URL') ?? 'https://api.tavily.com';
  return apiKey ? { apiKey, baseUrl } : null;
};

const resolveFunctionProviderConfig = (): FunctionProviderConfig => ({
  endpoint: readRuntimeEnv('DISCOVERY_ENDPOINT') ?? '/.netlify/functions/discover'
});

const normalizeRecencyWindowHours = (requestedHours: number) =>
  Math.min(MAX_DISCOVERY_RECENCY_HOURS, Math.max(MIN_DISCOVERY_RECENCY_HOURS, Math.round(requestedHours)));

const normalizeMaxResults = (requestedResults: number) =>
  Math.min(MAX_DISCOVERY_RESULTS, Math.max(4, Math.round(requestedResults)));

const extractDomain = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
};

const normalizeIsoTimestamp = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
};

const truncate = (value: string, maxLength: number): string => {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3).trim()}...`;
};

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

const tokenizeTitle = (title: string): string[] =>
  normalizeText(title)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !['the', 'and', 'for', 'with', 'from', 'into', 'amid'].includes(token));

const jaccardSimilarity = (left: string[], right: string[]): number => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);
  if (union.size === 0) return 0;

  let overlap = 0;
  leftSet.forEach((value) => {
    if (rightSet.has(value)) overlap += 1;
  });

  return overlap / union.size;
};

const lookupSourceRegistry = (domain: string | null): SourceRegistryEntry | null => {
  if (!domain) return null;
  return SOURCE_REGISTRY.find((entry) => entry.domains.some((candidate) => domain === candidate || domain.endsWith(`.${candidate}`))) ?? null;
};

const inferDirectness = (title: string, registryEntry: SourceRegistryEntry | null): DiscoveryDirectness => {
  const normalizedTitle = title.toLowerCase();
  if (commentaryLexicon.some((term) => normalizedTitle.includes(term))) return 'commentary';
  return registryEntry?.directness ?? 'commentary';
};

const inferSourceType = (directness: DiscoveryDirectness, registryEntry: SourceRegistryEntry | null): SourceType => {
  if (registryEntry) return registryEntry.source_type;
  if (directness === 'primary_release') return SourceType.OFFICIAL_STATEMENT;
  if (directness === 'reported_summary') return SourceType.PRIMARY_REPORTING;
  return SourceType.COMMENTARY;
};

const scoreFreshness = (publishedAt: string | null, retrievedAt: string): number => {
  const comparisonTime = normalizeIsoTimestamp(publishedAt) ?? retrievedAt;
  const ageHours = Math.max(0, (new Date(retrievedAt).getTime() - new Date(comparisonTime).getTime()) / 36e5);
  if (ageHours <= 12) return 1;
  if (ageHours <= 24) return 0.9;
  if (ageHours <= 48) return 0.74;
  if (ageHours <= 72) return 0.58;
  if (ageHours <= 120) return 0.4;
  return 0.22;
};

const rankCandidateContracts = (input: string): CandidateContractRelevance[] =>
  Object.values(contractOverrides)
    .map((override) => {
      const matchedFocus = matchChannels(input, override.channelRules);
      const fit: CandidateContractRelevance['fit'] = matchedFocus.length >= 2 ? 'primary' : matchedFocus.length === 1 ? 'secondary' : 'low';
      return {
        contract_id: override.meta.id,
        fit,
        rationale:
          matchedFocus.length > 0
            ? `${override.meta.id} discovery relevance maps through ${matchedFocus.join(', ')}.`
            : `${override.meta.id} has no clear discovery-theme match in the current title and extracted text.`,
        matched_focus: matchedFocus
      };
    })
    .filter((candidate) => candidate.matched_focus.length > 0)
    .sort((left, right) => right.matched_focus.length - left.matched_focus.length)
    .slice(0, 3);

const scoreThemeMatch = (contractId: ContractId, preset: DiscoveryProviderQuery, searchText: string): number => {
  const matchedChannels = matchChannels(searchText, contractOverrides[contractId].channelRules);
  const matchedFocusTags = preset.focus_tags.filter((tag) => {
    const tokens = normalizeText(tag).split(/\s+/).filter(Boolean);
    return tokens.every((token) => searchText.includes(token));
  });
  const channelComponent = Math.min(1, matchedChannels.length / 3);
  const focusComponent = Math.min(1, matchedFocusTags.length / Math.max(1, preset.focus_tags.length));
  return Number(((channelComponent * 0.7) + (focusComponent * 0.3)).toFixed(3));
};

const pickReviewBucket = (
  authorityTier: DiscoveryCandidate['authority_tier'],
  directness: DiscoveryDirectness,
  totalRankScore: number
): DiscoveryReviewBucket => {
  if (directness === 'commentary') return 'low_authority_or_noise';
  if (totalRankScore >= 0.72 && authorityTier !== 'unlisted') return 'high_confidence';
  if (totalRankScore >= 0.48) return 'secondary';
  return 'low_authority_or_noise';
};

const buildClusterSuggestion = (
  contractId: ContractId,
  preset: DiscoveryProviderQuery,
  contractRelevance: CandidateContractRelevance[]
): string => {
  const selected = contractRelevance.find((candidate) => candidate.contract_id === contractId);
  return selected?.matched_focus.length ? selected.matched_focus.slice(0, 2).join(' + ') : preset.label;
};

const clusterDuplicateCandidates = (candidates: DiscoveryCandidate[]): DiscoveryCandidate[] => {
  const clusters: Array<{ id: string; tokens: string[]; members: DiscoveryCandidate[] }> = [];

  candidates
    .sort((left, right) => right.total_rank_score - left.total_rank_score)
    .forEach((candidate) => {
      const tokens = tokenizeTitle(candidate.title);
      const existingCluster = clusters.find((cluster) => jaccardSimilarity(cluster.tokens, tokens) >= 0.68);

      if (existingCluster) {
        existingCluster.members.push(candidate);
        return;
      }

      clusters.push({ id: `dup-${clusters.length + 1}`, tokens, members: [candidate] });
    });

  return clusters.map((cluster) => {
    const [primary, ...duplicates] = cluster.members.sort((left, right) => right.total_rank_score - left.total_rank_score);
    return {
      ...primary,
      duplication_cluster_id: cluster.id,
      provenance_notes:
        duplicates.length > 0
          ? [...primary.provenance_notes, `Suppressed ${duplicates.length} near-duplicate coverage item(s) in ${cluster.id}.`]
          : primary.provenance_notes
    };
  });
};

const createDiscoveryCandidate = (
  contractId: ContractId,
  preset: DiscoveryProviderQuery,
  item: RawDiscoveryItem,
  providerId: string,
  retrievedAt: string
): DiscoveryCandidate => {
  const sourceDomain = item.source_domain ?? extractDomain(item.url);
  const registryEntry = lookupSourceRegistry(sourceDomain);
  const directness = inferDirectness(item.title, registryEntry);
  const sourceType = inferSourceType(directness, registryEntry);
  const authorityTier = registryEntry?.authority_tier ?? 'unlisted';
  const importExcerpt = truncate(item.raw_text.trim(), 4200);
  const sourceCompleteness: SourceCompleteness = importExcerpt ? 'partial_text' : 'unresolved';
  const searchText = normalizeText([item.title, item.snippet, item.raw_text].filter(Boolean).join(' '));
  const contractRelevance = rankCandidateContracts(searchText);
  const freshnessScore = scoreFreshness(item.published_at, retrievedAt);
  const authorityScore = authorityScoreByTier[authorityTier];
  const contractThemeScore = scoreThemeMatch(contractId, preset, searchText);
  const directnessScore = directnessScoreByKind[directness];
  const importReadinessScore = readinessScoreByCompleteness[sourceCompleteness];
  const totalRankScore = Number(
    (
      (authorityScore * 0.34) +
      (freshnessScore * 0.24) +
      (contractThemeScore * 0.24) +
      (directnessScore * 0.1) +
      (importReadinessScore * 0.08)
    ).toFixed(3)
  );

  return {
    id: `${preset.preset_id}:${item.title}:${item.url ?? 'no-url'}`.replace(/\s+/g, '-').slice(0, 160),
    url: item.url,
    title: truncate(item.title || 'untitled', 220),
    source_name: registryEntry?.name ?? item.source_name ?? sourceDomain ?? 'Unlisted source',
    source_domain: sourceDomain,
    source_type: sourceType,
    authority_tier: authorityTier,
    directness,
    published_at: item.published_at,
    retrieved_at: retrievedAt,
    snippet: truncate(item.snippet || 'No snippet available from the discovery provider.', 320),
    import_excerpt: importExcerpt,
    source_completeness: sourceCompleteness,
    contract_relevance_candidates: contractRelevance,
    freshness_score: freshnessScore,
    authority_score: authorityScore,
    contract_theme_score: contractThemeScore,
    directness_score: directnessScore,
    import_readiness_score: importReadinessScore,
    total_rank_score: totalRankScore,
    duplication_cluster_id: 'dup-pending',
    cluster_suggestion: buildClusterSuggestion(contractId, preset, contractRelevance),
    discovery_query: item.discovery_query,
    review_bucket: pickReviewBucket(authorityTier, directness, totalRankScore),
    provenance_notes: [
      ...(item.provenance_notes ?? []),
      sourceCompleteness === 'partial_text'
        ? 'Import readiness is partial_text because discovery returned extracted page text, not a verified full-article body.'
        : 'Import readiness is unresolved because discovery returned metadata only and no extractable body text.'
    ],
    search_provider: providerId,
    search_timestamp: retrievedAt,
    recency_window_hours: 0
  };
};

const buildEmptySummary = (
  contractId: ContractId,
  queryPresets: DiscoveryQueryPreset[],
  recencyWindowHours: number,
  providerId: string,
  status: DiscoveryStatus,
  issues: string[],
  trace: RuleTrace[]
): DiscoverySummary =>
  DiscoverySummarySchema.parse({
    status,
    contract_id: contractId,
    provider_id: providerId,
    retrieved_at: new Date().toISOString(),
    recency_window_hours: recencyWindowHours,
    query_presets: queryPresets,
    candidates: [],
    issues,
    bucket_counts: emptyBucketCounts(),
    trace
  });

const normalizeProviderRequest = (input: DiscoveryRequest): DiscoveryProviderRequest => {
  const recencyWindowHours = normalizeRecencyWindowHours(input.recency_window_hours);
  const maxResults = normalizeMaxResults(input.max_results);
  const queryPresets = QUERY_PRESETS[input.contract_id].map((preset) => ({
    ...preset,
    max_results: Math.max(2, Math.min(4, Math.ceil(maxResults / QUERY_PRESETS[input.contract_id].length)))
  }));

  return {
    contract_id: input.contract_id,
    recency_window_hours: recencyWindowHours,
    max_results: maxResults,
    query_presets: queryPresets
  };
};

const mapTavilyResults = (result: unknown, preset: DiscoveryProviderQuery): RawDiscoveryItem[] => {
  const payload = result as {
    results?: Array<{
      url?: string;
      title?: string;
      content?: string;
      raw_content?: string;
      published_date?: string;
      published_at?: string;
      source?: string;
    }>;
  };

  return (payload.results ?? [])
    .filter((entry) => entry.title || entry.url)
    .map((entry) => ({
      url: entry.url ?? null,
      title: entry.title ?? 'untitled',
      snippet: entry.content ?? '',
      raw_text: entry.raw_content ?? '',
      published_at: normalizeIsoTimestamp(entry.published_date ?? entry.published_at ?? null),
      source_name: entry.source,
      source_domain: extractDomain(entry.url ?? null),
      discovery_query: preset.query,
      query_preset_id: preset.preset_id,
      provenance_notes: [`Discovery preset ${preset.preset_id} retrieved this candidate.`]
    }));
};

export const createTavilyDiscoveryProvider = (config: TavilyConfig): DiscoveryProvider => ({
  providerId: 'tavily:news-search',
  configured: true,
  search: async (request) => {
    const retrievedAt = new Date().toISOString();
    const days = Math.max(1, Math.ceil(request.recency_window_hours / 24));
    const items: RawDiscoveryItem[] = [];

    for (const preset of request.query_presets) {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: config.apiKey,
          topic: 'news',
          search_depth: 'advanced',
          max_results: preset.max_results,
          include_answer: false,
          include_images: false,
          include_raw_content: true,
          include_domains: preset.preferred_domains,
          days,
          query: preset.query
        })
      });

      if (!response.ok) {
        let issue = `${response.status} ${response.statusText}`;
        try {
          const payload = (await response.json()) as { detail?: string; error?: string };
          if (payload.detail || payload.error) {
            issue = payload.detail ?? payload.error ?? issue;
          }
        } catch {
          // Keep HTTP fallback.
        }
        return { items: [], issue: `Discovery provider tavily:news-search failed: ${issue}.`, retrieved_at: retrievedAt };
      }

      items.push(...mapTavilyResults((await response.json()) as unknown, preset));
    }

    return { items, retrieved_at: retrievedAt };
  }
});

export const createNetlifyFunctionDiscoveryProvider = (config: FunctionProviderConfig): DiscoveryProvider => ({
  providerId: `netlify-function:${config.endpoint}`,
  configured: true,
  search: async (request) => {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const payload = (await response.json()) as {
      items?: RawDiscoveryItem[];
      issue?: string;
      retrieved_at?: string;
    };

    if (!response.ok) {
      return {
        items: [],
        issue: payload.issue ?? `${response.status} ${response.statusText}`,
        retrieved_at: payload.retrieved_at ?? new Date().toISOString()
      };
    }

    return {
      items: payload.items ?? [],
      retrieved_at: payload.retrieved_at ?? new Date().toISOString()
    };
  }
});

const createUnconfiguredProvider = (): DiscoveryProvider => ({
  providerId: 'unconfigured-discovery-provider',
  configured: false,
  search: async () => ({
    items: [],
    issue:
      'Discovery provider is unavailable. Configure TAVILY_API_KEY server-side or use a deployed Netlify discovery function endpoint.',
    retrieved_at: new Date().toISOString()
  })
});

const resolveDiscoveryProvider = (): DiscoveryProvider => {
  if (typeof window !== 'undefined') {
    return createNetlifyFunctionDiscoveryProvider(resolveFunctionProviderConfig());
  }

  const tavilyConfig = resolveTavilyConfig();
  return tavilyConfig ? createTavilyDiscoveryProvider(tavilyConfig) : createUnconfiguredProvider();
};

const buildDiscoveryTrace = (
  contractId: ContractId,
  queryPresets: DiscoveryQueryPreset[],
  recencyWindowHours: number,
  maxResults: number,
  detail: string,
  heuristic = false
): RuleTrace =>
  buildTrace(
    'discover',
    {
      rule_id: `DISCOVER_${contractId}`,
      source_files: [
        'docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx',
        'docs/source_of_truth/contract_prompt_library/README.md',
        ...contractOverrides[contractId].source_files
      ],
      detail: `Discovery request for ${contractId} using ${queryPresets.length} preset(s), recency ${recencyWindowHours}h, max ${maxResults}.`
    },
    detail,
    heuristic
  );

export const runDiscovery = async (
  input: DiscoveryRequest,
  provider: DiscoveryProvider = resolveDiscoveryProvider()
): Promise<DiscoverySummary> => {
  const parsedInput = DiscoveryRequestSchema.safeParse(input);
  const fallbackContractId = input.contract_id ?? ContractId.NQ;
  const fallbackPresets = QUERY_PRESETS[fallbackContractId] ?? QUERY_PRESETS[ContractId.NQ];
  const trace: RuleTrace[] = [];

  if (!parsedInput.success) {
    return buildEmptySummary(
      fallbackContractId,
      fallbackPresets,
      DEFAULT_DISCOVERY_RECENCY_HOURS,
      provider.providerId,
      'error',
      parsedInput.error.issues.map((issue) => `${issue.path.join('.') || 'discovery'} ${issue.message}`),
      trace
    );
  }

  const request = normalizeProviderRequest(parsedInput.data);
  trace.push(
    buildDiscoveryTrace(
      request.contract_id,
      request.query_presets,
      request.recency_window_hours,
      request.max_results,
      `Discovery request normalized to recency ${request.recency_window_hours}h and max ${request.max_results} candidates.`
    )
  );

  if (!provider.configured) {
    trace.push(
      buildDiscoveryTrace(
        request.contract_id,
        request.query_presets,
        request.recency_window_hours,
        request.max_results,
        `Discovery provider ${provider.providerId} is unconfigured.`
      )
    );
    return buildEmptySummary(
      request.contract_id,
      request.query_presets,
      request.recency_window_hours,
      provider.providerId,
      'unconfigured',
      ['Live discovery is unavailable because no discovery provider is configured.'],
      trace
    );
  }

  let invocation: DiscoveryProviderInvocation;
  try {
    invocation = await provider.search(request);
  } catch (error) {
    const issue = error instanceof Error ? error.message : 'unknown discovery provider error';
    trace.push(
      buildDiscoveryTrace(
        request.contract_id,
        request.query_presets,
        request.recency_window_hours,
        request.max_results,
        `Discovery provider ${provider.providerId} threw an error: ${issue}`,
        true
      )
    );
    return buildEmptySummary(
      request.contract_id,
      request.query_presets,
      request.recency_window_hours,
      provider.providerId,
      'error',
      [issue],
      trace
    );
  }

  if (invocation.issue) {
    trace.push(
      buildDiscoveryTrace(
        request.contract_id,
        request.query_presets,
        request.recency_window_hours,
        request.max_results,
        `Discovery provider ${provider.providerId} failed: ${invocation.issue}`,
        true
      )
    );
    return buildEmptySummary(
      request.contract_id,
      request.query_presets,
      request.recency_window_hours,
      provider.providerId,
      'error',
      [invocation.issue],
      trace
    );
  }

  const retrievedAt = invocation.retrieved_at;
  const candidates = clusterDuplicateCandidates(
    invocation.items.map((item) => {
      const preset = request.query_presets.find((entry) => entry.preset_id === item.query_preset_id) ?? request.query_presets[0];
      return {
        ...createDiscoveryCandidate(request.contract_id, preset, item, provider.providerId, retrievedAt),
        recency_window_hours: request.recency_window_hours
      };
    })
  )
    .sort((left, right) => right.total_rank_score - left.total_rank_score)
    .slice(0, request.max_results);

  const bucketCounts = emptyBucketCounts();
  candidates.forEach((candidate) => {
    bucketCounts[candidate.review_bucket] += 1;
  });

  trace.push(
    buildDiscoveryTrace(
      request.contract_id,
      request.query_presets,
      request.recency_window_hours,
      request.max_results,
      `Discovery provider ${provider.providerId} returned ${invocation.items.length} raw item(s); ${candidates.length} candidate(s) survived normalization and dedupe.`,
      true
    )
  );

  return DiscoverySummarySchema.parse({
    status: candidates.length > 0 ? 'ready' : 'empty',
    contract_id: request.contract_id,
    provider_id: provider.providerId,
    retrieved_at: retrievedAt,
    recency_window_hours: request.recency_window_hours,
    query_presets: request.query_presets,
    candidates,
    issues:
      candidates.length > 0
        ? []
        : ['Discovery completed but returned no candidate items within the curated source set and active recency window.'],
    bucket_counts: bucketCounts,
    trace
  });
};
