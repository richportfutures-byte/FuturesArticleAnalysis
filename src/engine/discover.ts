import { contractOverrides } from '../domain/contracts';
import { buildTrace, matchChannels } from '../domain/contracts/types';
import {
  CrossContractScanSummary,
  CandidateContractRelevance,
  DiscoveryCandidate,
  DiscoveryDirectness,
  DiscoveryQueryPreset,
  DiscoveryReviewBucket,
  DiscoveryStatus,
  DiscoverySummary,
  EventCluster,
  RuleTrace,
  SourceCompleteness
} from '../domain/entities';
import { ContractId, SourceType } from '../domain/enums';
import { CrossContractScanRequest, CrossContractScanRequestSchema, DiscoveryRequest, DiscoveryRequestSchema } from '../schemas/input';
import { CrossContractScanSummarySchema, DiscoverySummarySchema, EventClusterSchema } from '../schemas/output';

export const DEFAULT_DISCOVERY_RECENCY_HOURS = 72;
export const MIN_DISCOVERY_RECENCY_HOURS = 6;
export const MAX_DISCOVERY_RECENCY_HOURS = 168;
export const DEFAULT_DISCOVERY_MAX_RESULTS = 12;
export const MAX_DISCOVERY_RESULTS = 18;
export const DEFAULT_CROSS_CONTRACT_MAX_RESULTS = 18;
export const MAX_CROSS_CONTRACT_RESULTS = 30;

type SourceRegistryEntry = {
  name: string;
  domains: string[];
  authority_tier: DiscoveryCandidate['authority_tier'];
  directness: DiscoveryDirectness;
  source_type: SourceType;
};

type DiscoveryProviderQuery = DiscoveryQueryPreset & {
  contract_id: ContractId;
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

type DuplicateCluster = {
  id: string;
  tokens: string[];
  members: DiscoveryCandidate[];
};

type DiscoveryDedupeResult = {
  candidates: DiscoveryCandidate[];
  duplicateGroups: DuplicateCluster[];
  duplicateCountByCandidateId: Record<string, number>;
};

type CandidateProfile = {
  candidate: DiscoveryCandidate;
  tokens: string[];
  anchorPhrases: string[];
  eventTokens: string[];
  exposureContracts: ContractId[];
  recencyTime: number;
};

type ExposureMap = {
  primary_contracts: ContractId[];
  secondary_contracts: ContractId[];
  contract_scores: Record<ContractId, number>;
};

type PreClusterSummary = {
  cluster_id: string;
  label: string;
  description: string;
  member_candidate_ids: string[];
  candidate_count: number;
  suppressed_duplicate_count: number;
  freshness_summary: string;
  source_quality_summary: string;
  primary_contracts: ContractId[];
  secondary_contracts: ContractId[];
  provenance_notes: string[];
};

type RefinementCandidateMetadata = Pick<
  DiscoveryCandidate,
  | 'id'
  | 'title'
  | 'snippet'
  | 'source_name'
  | 'source_domain'
  | 'authority_tier'
  | 'directness'
  | 'published_at'
  | 'retrieved_at'
  | 'duplication_cluster_id'
  | 'discovery_query'
  | 'review_bucket'
  | 'contract_relevance_candidates'
> & {
  duplicate_suppressed_count: number;
};

type RefinedClusterTransport = Omit<EventCluster, 'refinement_status'> & {
  refinement_status?: EventCluster['refinement_status'];
};

type ClusterRefinementSuccess = {
  status: 'refined';
  clusters: RefinedClusterTransport[];
  provider_id?: string;
};

type ClusterRefinementUnavailable = {
  status: 'refinement_unavailable';
  pre_clusters: PreClusterSummary[];
  issue?: string;
  provider_id?: string;
};

type ClusterRefinementResponse = ClusterRefinementSuccess | ClusterRefinementUnavailable;

export interface EventClusterRefinementProvider {
  providerId: string;
  configured: boolean;
  refine: (request: {
    pre_clusters: PreClusterSummary[];
    candidates_metadata: RefinementCandidateMetadata[];
  }) => Promise<ClusterRefinementResponse>;
}

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

const titleStopwords = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'amid',
  'after',
  'before',
  'over',
  'under',
  'about',
  'that',
  'this',
  'while',
  'says',
  'said'
]);

const CROSS_CONTRACT_EVENT_VOCABULARY = Array.from(
  new Set(
    [
      ...Object.values(QUERY_PRESETS).flatMap((presets) =>
        presets.flatMap((preset) => [preset.label, ...preset.focus_tags, preset.query].join(' ').toLowerCase().split(/[^a-z0-9]+/))
      ),
      ...Object.values(contractOverrides).flatMap((override) =>
        override.channelRules.flatMap((rule) => rule.keywords.join(' ').toLowerCase().split(/[^a-z0-9]+/))
      )
    ]
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !titleStopwords.has(token))
  )
);

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

const readServerRuntimeEnv = (name: string): string | undefined => {
  const processEnv =
    typeof globalThis !== 'undefined' && 'process' in globalThis
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      : undefined;

  return processEnv?.[name];
};

const resolveTavilyConfig = (): TavilyConfig | null => {
  const apiKey = readServerRuntimeEnv('TAVILY_API_KEY');
  const baseUrl = readRuntimeEnv('TAVILY_BASE_URL') ?? 'https://api.tavily.com';
  return apiKey ? { apiKey, baseUrl } : null;
};

const resolveFunctionProviderConfig = (): FunctionProviderConfig => ({
  endpoint: readRuntimeEnv('DISCOVERY_ENDPOINT') ?? '/.netlify/functions/discover'
});

const resolveSearchMode = (): 'live' | 'simulated' => (readRuntimeEnv('VITE_SEARCH_MODE') === 'simulated' ? 'simulated' : 'live');

const normalizeRecencyWindowHours = (requestedHours: number) =>
  Math.min(MAX_DISCOVERY_RECENCY_HOURS, Math.max(MIN_DISCOVERY_RECENCY_HOURS, Math.round(requestedHours)));

const normalizeMaxResults = (requestedResults: number) =>
  Math.min(MAX_DISCOVERY_RESULTS, Math.max(4, Math.round(requestedResults)));

const normalizeCrossContractMaxResults = (requestedResults: number) =>
  Math.min(MAX_CROSS_CONTRACT_RESULTS, Math.max(8, Math.round(requestedResults)));

export const getDiscoveryQueryPresets = (contractId: ContractId): DiscoveryQueryPreset[] => QUERY_PRESETS[contractId];

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
    .filter((token) => token.length > 2 && !titleStopwords.has(token));

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

const dedupeDiscoveryCandidates = (candidates: DiscoveryCandidate[]): DiscoveryDedupeResult => {
  const duplicateGroups: DuplicateCluster[] = [];
  const duplicateCountByCandidateId: Record<string, number> = {};

  candidates
    .sort((left, right) => right.total_rank_score - left.total_rank_score)
    .forEach((candidate) => {
      const tokens = tokenizeTitle(candidate.title);
      const existingCluster = duplicateGroups.find((cluster) => jaccardSimilarity(cluster.tokens, tokens) >= 0.68);

      if (existingCluster) {
        existingCluster.members.push(candidate);
        return;
      }

      duplicateGroups.push({ id: `dup-${duplicateGroups.length + 1}`, tokens, members: [candidate] });
    });

  const dedupedCandidates = duplicateGroups.map((cluster) => {
    const [primary, ...duplicates] = cluster.members.sort((left, right) => right.total_rank_score - left.total_rank_score);
    duplicateCountByCandidateId[primary.id] = duplicates.length;

    const mergedQueries = Array.from(new Set(cluster.members.map((member) => member.discovery_query)));
    const mergedProvenanceNotes = Array.from(new Set(cluster.members.flatMap((member) => member.provenance_notes)));

    return {
      ...primary,
      duplication_cluster_id: cluster.id,
      provenance_notes: [
        ...mergedProvenanceNotes,
        ...(mergedQueries.length > 1 ? [`Candidate matched ${mergedQueries.length} query families during discovery dedupe.`] : []),
        ...(duplicates.length > 0 ? [`Suppressed ${duplicates.length} near-duplicate coverage item(s) in ${cluster.id}.`] : [])
      ]
    };
  });

  return { candidates: dedupedCandidates, duplicateGroups, duplicateCountByCandidateId };
};

const clusterDuplicateCandidates = (candidates: DiscoveryCandidate[]): DiscoveryCandidate[] => dedupeDiscoveryCandidates(candidates).candidates;

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

const overlapCount = <T,>(left: T[], right: T[]): number => {
  const rightSet = new Set(right);
  return left.reduce((count, value) => count + (rightSet.has(value) ? 1 : 0), 0);
};

const buildAnchorPhrases = (title: string): string[] => {
  const tokens = tokenizeTitle(title);
  const phrases: string[] = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    phrases.push(`${tokens[index]} ${tokens[index + 1]}`);
    if (index < tokens.length - 2) {
      phrases.push(`${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`);
    }
  }

  return Array.from(new Set(phrases)).slice(0, 8);
};

const buildCandidateProfile = (candidate: DiscoveryCandidate): CandidateProfile => {
  const tokens = tokenizeTitle(candidate.title);
  const eventTokens = tokens.filter((token) => CROSS_CONTRACT_EVENT_VOCABULARY.includes(token));
  const exposureContracts = candidate.contract_relevance_candidates.map((entry) => entry.contract_id);
  const recencyTime = new Date(candidate.published_at ?? candidate.retrieved_at).getTime();

  return {
    candidate,
    tokens,
    anchorPhrases: buildAnchorPhrases(candidate.title),
    eventTokens,
    exposureContracts,
    recencyTime
  };
};

const buildClusterSeedLabel = (profiles: CandidateProfile[]): string => {
  const anchorCounts = new Map<string, number>();
  profiles.forEach((profile) => {
    profile.anchorPhrases.forEach((phrase) => {
      anchorCounts.set(phrase, (anchorCounts.get(phrase) ?? 0) + 1);
    });
  });

  const anchors = Array.from(anchorCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([phrase]) => phrase);

  if (anchors.length > 0) {
    return anchors
      .slice(0, 2)
      .join(' / ')
      .replace(/\b\w/g, (value) => value.toUpperCase());
  }

  return profiles[0]?.candidate.title ?? 'Cross-contract event';
};

const buildClusterSeedDescription = (profiles: CandidateProfile[]): string => {
  const leadCandidate = [...profiles]
    .sort((left, right) => right.candidate.total_rank_score - left.candidate.total_rank_score)[0]
    ?.candidate;

  if (!leadCandidate) return 'No candidate detail is available for this event cluster.';

  const exposureNote =
    leadCandidate.contract_relevance_candidates.length > 0
      ? `Cross-contract relevance surfaces through ${leadCandidate.contract_relevance_candidates
          .map((entry) => `${entry.contract_id} ${entry.fit}`)
          .join(', ')}.`
      : 'Cross-contract relevance is limited and should be reviewed manually.';

  return `${truncate(leadCandidate.snippet, 180)} ${exposureNote}`;
};

const summarizeFreshness = (members: DiscoveryCandidate[], referenceTime: string): string => {
  if (members.length === 0) return 'No freshness detail available.';

  const ages = members.map((member) => {
    const timestamp = new Date(member.published_at ?? member.retrieved_at).getTime();
    return Math.max(0, (new Date(referenceTime).getTime() - timestamp) / 36e5);
  });

  const youngestAge = Math.min(...ages);
  const oldestAge = Math.max(...ages);
  const latestCount = ages.filter((age) => age <= 12).length;

  if (oldestAge <= 6) return `All coverage is within ${Math.ceil(oldestAge)}h of retrieval.`;
  if (latestCount === members.length) return `All ${members.length} member(s) are within 12h; latest item is ${youngestAge.toFixed(1)}h old.`;
  return `${latestCount} member(s) are within 12h; cluster spans ${oldestAge.toFixed(1)}h of coverage.`;
};

const summarizeSourceQuality = (members: DiscoveryCandidate[]): string => {
  const authorityCounts = members.reduce(
    (counts, member) => {
      counts[member.authority_tier] += 1;
      return counts;
    },
    { tier_1: 0, tier_2: 0, unlisted: 0 }
  );

  const directnessCounts = members.reduce(
    (counts, member) => {
      counts[member.directness] += 1;
      return counts;
    },
    { primary_release: 0, reported_summary: 0, commentary: 0 }
  );

  return `${authorityCounts.tier_1} tier-1, ${authorityCounts.tier_2} tier-2, ${authorityCounts.unlisted} unlisted | ${directnessCounts.primary_release} primary, ${directnessCounts.reported_summary} reported, ${directnessCounts.commentary} commentary`;
};

const buildExposureMap = (members: DiscoveryCandidate[]): ExposureMap => {
  const contractScores = Object.values(ContractId).reduce<Record<ContractId, number>>(
    (scores, contractId) => ({ ...scores, [contractId]: 0 }),
    {} as Record<ContractId, number>
  );
  const fitWeight: Record<CandidateContractRelevance['fit'], number> = {
    primary: 1,
    secondary: 0.58,
    low: 0.25
  };
  const nonLowFitCounts = Object.values(ContractId).reduce<Record<ContractId, number>>(
    (counts, contractId) => ({ ...counts, [contractId]: 0 }),
    {} as Record<ContractId, number>
  );

  members.forEach((member) => {
    member.contract_relevance_candidates.forEach((entry) => {
      const focusBreadthWeight = 1 + Math.min(2, Math.max(0, entry.matched_focus.length - 1)) * 0.2;
      contractScores[entry.contract_id] += Number((member.total_rank_score * fitWeight[entry.fit] * focusBreadthWeight).toFixed(4));
      if (entry.fit !== 'low') {
        nonLowFitCounts[entry.contract_id] += 1;
      }
    });
  });

  const sortedContracts = Object.values(ContractId).sort((left, right) => contractScores[right] - contractScores[left]);
  const maxScore = contractScores[sortedContracts[0]] ?? 0;
  const primaryContracts = sortedContracts.filter(
    (contractId) =>
      contractScores[contractId] > 0 &&
      nonLowFitCounts[contractId] > 0 &&
      (contractScores[contractId] >= maxScore * 0.72 || contractId === sortedContracts[0])
  );
  const secondaryContracts = sortedContracts.filter(
    (contractId) =>
      !primaryContracts.includes(contractId) &&
      contractScores[contractId] >= Math.max(0.24, maxScore * 0.28) &&
      nonLowFitCounts[contractId] > 0
  );

  return {
    primary_contracts: primaryContracts,
    secondary_contracts: secondaryContracts,
    contract_scores: contractScores
  };
};

const calculateProfileSimilarity = (
  left: CandidateProfile,
  right: CandidateProfile
): { score: number; titleSimilarity: number; anchorOverlap: number; eventOverlap: number; exposureOverlap: number } => {
  const titleSimilarity = jaccardSimilarity(left.tokens, right.tokens);
  const anchorOverlap = overlapCount(left.anchorPhrases, right.anchorPhrases);
  const eventOverlap = overlapCount(left.eventTokens, right.eventTokens);
  const exposureOverlap = overlapCount(left.exposureContracts, right.exposureContracts);
  const score = Number(
    (
      (titleSimilarity * 0.45) +
      (Math.min(1, anchorOverlap / 2) * 0.25) +
      (Math.min(1, eventOverlap / 2) * 0.2) +
      (Math.min(1, exposureOverlap / 2) * 0.1)
    ).toFixed(3)
  );

  return { score, titleSimilarity, anchorOverlap, eventOverlap, exposureOverlap };
};

const simpleChecksum = (value: string): string => {
  let checksum = 0;
  for (let index = 0; index < value.length; index += 1) {
    checksum = (checksum * 31 + value.charCodeAt(index)) >>> 0;
  }
  return checksum.toString(36);
};

const createStableClusterId = (prefix: 'pre' | 'event', memberCandidateIds: string[]): string =>
  `${prefix}-${simpleChecksum(memberCandidateIds.slice().sort().join('|'))}`;

const buildPreClusterSummaries = (
  candidates: DiscoveryCandidate[],
  duplicateCountByCandidateId: Record<string, number>,
  referenceTime: string
): PreClusterSummary[] => {
  const profiles = candidates.map(buildCandidateProfile);
  const clusters: Array<{ profiles: CandidateProfile[]; rationale: string[] }> = [];

  profiles
    .sort((left, right) => right.candidate.total_rank_score - left.candidate.total_rank_score)
    .forEach((profile) => {
      let bestClusterIndex = -1;
      let bestScore = 0;

      clusters.forEach((cluster, index) => {
        const leadProfile = cluster.profiles[0];
        const similarity = calculateProfileSimilarity(profile, leadProfile);
        const hoursApart = Math.abs(profile.recencyTime - leadProfile.recencyTime) / 36e5;
        const mergeable =
          hoursApart <= 36 &&
          (similarity.titleSimilarity >= 0.42 ||
            similarity.anchorOverlap >= 1 ||
            (similarity.eventOverlap >= 2 && similarity.exposureOverlap >= 1) ||
            similarity.score >= 0.58);

        if (mergeable && similarity.score > bestScore) {
          bestScore = similarity.score;
          bestClusterIndex = index;
        }
      });

      if (bestClusterIndex >= 0) {
        clusters[bestClusterIndex].profiles.push(profile);
        clusters[bestClusterIndex].rationale.push(
          `Merged ${profile.candidate.id} into ${clusters[bestClusterIndex].profiles[0].candidate.id} using semantic score ${bestScore.toFixed(2)}.`
        );
        return;
      }

      clusters.push({
        profiles: [profile],
        rationale: [`Started a new pre-cluster from ${profile.candidate.id} using title/event anchors.`]
      });
    });

  return clusters
    .map((cluster) => {
      const members = cluster.profiles
        .map((profile) => profile.candidate)
        .sort((left, right) => right.total_rank_score - left.total_rank_score);
      const memberCandidateIds = members.map((member) => member.id);
      const exposureMap = buildExposureMap(members);
      const label = buildClusterSeedLabel(cluster.profiles);
      const description = buildClusterSeedDescription(cluster.profiles);
      const suppressedDuplicateCount = members.reduce(
        (count, member) => count + (duplicateCountByCandidateId[member.id] ?? 0),
        0
      );

      return {
        cluster_id: createStableClusterId('pre', memberCandidateIds),
        label,
        description,
        member_candidate_ids: memberCandidateIds,
        candidate_count: memberCandidateIds.length,
        suppressed_duplicate_count: suppressedDuplicateCount,
        freshness_summary: summarizeFreshness(members, referenceTime),
        source_quality_summary: summarizeSourceQuality(members),
        primary_contracts: exposureMap.primary_contracts,
        secondary_contracts: exposureMap.secondary_contracts,
        provenance_notes: [
          ...cluster.rationale,
          `Seed label derived from title anchors: ${label}.`,
          ...(suppressedDuplicateCount > 0 ? [`Suppressed duplicate roll-up preserved ${suppressedDuplicateCount} additional coverage item(s).`] : [])
        ]
      };
    })
    .sort((left, right) => right.candidate_count - left.candidate_count || left.label.localeCompare(right.label));
};

const convertPreClusterToEventCluster = (
  preCluster: PreClusterSummary,
  refinementStatus: EventCluster['refinement_status']
): EventCluster =>
  EventClusterSchema.parse({
    ...preCluster,
    cluster_id: createStableClusterId('event', preCluster.member_candidate_ids),
    refinement_status: refinementStatus
  });

const createRefinementCandidateMetadata = (
  candidate: DiscoveryCandidate,
  duplicateCountByCandidateId: Record<string, number>
): RefinementCandidateMetadata => ({
  id: candidate.id,
  title: candidate.title,
  snippet: candidate.snippet,
  source_name: candidate.source_name,
  source_domain: candidate.source_domain,
  authority_tier: candidate.authority_tier,
  directness: candidate.directness,
  published_at: candidate.published_at,
  retrieved_at: candidate.retrieved_at,
  duplication_cluster_id: candidate.duplication_cluster_id,
  discovery_query: candidate.discovery_query,
  review_bucket: candidate.review_bucket,
  contract_relevance_candidates: candidate.contract_relevance_candidates,
  duplicate_suppressed_count: duplicateCountByCandidateId[candidate.id] ?? 0
});

const validateAndFinalizeRefinedClusters = (
  clusters: RefinedClusterTransport[],
  candidates: DiscoveryCandidate[],
  duplicateCountByCandidateId: Record<string, number>,
  retrievedAt: string
): EventCluster[] => {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate] as const));
  const allowedContracts = new Set(Object.values(ContractId));
  const assignedCandidates = new Set<string>();

  const finalizedClusters = clusters.map((cluster) => {
    const memberCandidates = cluster.member_candidate_ids.map((candidateId) => candidateMap.get(candidateId) ?? null);
    if (memberCandidates.some((candidate) => !candidate)) {
      throw new Error('Refinement returned unknown candidate ids.');
    }

    cluster.member_candidate_ids.forEach((candidateId) => {
      if (assignedCandidates.has(candidateId)) {
        throw new Error('Refinement assigned a candidate to multiple clusters.');
      }
      assignedCandidates.add(candidateId);
    });

    const members = memberCandidates.filter((candidate): candidate is DiscoveryCandidate => Boolean(candidate));
    const deterministicExposure = buildExposureMap(members);
    const primaryContracts = Array.from(
      new Set(cluster.primary_contracts.filter((contractId) => allowedContracts.has(contractId)))
    ).filter((contractId) => deterministicExposure.contract_scores[contractId] > 0);
    const secondaryContracts = Array.from(
      new Set(cluster.secondary_contracts.filter((contractId) => allowedContracts.has(contractId)))
    ).filter((contractId) => !primaryContracts.includes(contractId) && deterministicExposure.contract_scores[contractId] > 0);
    const finalPrimaryContracts = primaryContracts.length > 0 ? primaryContracts : deterministicExposure.primary_contracts;
    const finalSecondaryContracts =
      secondaryContracts.length > 0
        ? secondaryContracts.filter((contractId) => !finalPrimaryContracts.includes(contractId))
        : deterministicExposure.secondary_contracts.filter((contractId) => !finalPrimaryContracts.includes(contractId));

    return EventClusterSchema.parse({
      cluster_id: createStableClusterId('event', cluster.member_candidate_ids),
      label: truncate(cluster.label, 120),
      description: truncate(cluster.description, 240),
      member_candidate_ids: cluster.member_candidate_ids,
      candidate_count: cluster.member_candidate_ids.length,
      suppressed_duplicate_count: members.reduce((count, member) => count + (duplicateCountByCandidateId[member.id] ?? 0), 0),
      freshness_summary: summarizeFreshness(members, retrievedAt),
      source_quality_summary: summarizeSourceQuality(members),
      primary_contracts: finalPrimaryContracts,
      secondary_contracts: finalSecondaryContracts,
      refinement_status: 'llm_refined',
      provenance_notes: Array.from(new Set(cluster.provenance_notes)).slice(0, 8)
    });
  });

  if (assignedCandidates.size !== candidates.length) {
    throw new Error('Refinement did not preserve a complete candidate partition.');
  }

  return finalizedClusters.sort((left, right) => {
    const leftTopScore = Math.max(...left.member_candidate_ids.map((candidateId) => candidateMap.get(candidateId)?.total_rank_score ?? 0));
    const rightTopScore = Math.max(...right.member_candidate_ids.map((candidateId) => candidateMap.get(candidateId)?.total_rank_score ?? 0));
    return rightTopScore - leftTopScore;
  });
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
    contract_id: input.contract_id,
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
  if (resolveSearchMode() === 'simulated') {
    return createUnconfiguredProvider();
  }

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

const buildCrossContractTrace = (
  detail: string,
  recencyWindowHours: number,
  maxResults: number,
  stage: RuleTrace['stage'] = 'discover',
  heuristic = false
): RuleTrace => ({
  stage,
  rule_id: stage === 'cluster' ? 'DISCOVER_MORNING_COVERAGE_CLUSTERING' : 'DISCOVER_MORNING_COVERAGE',
  source_files: [
    'docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx',
    'docs/source_of_truth/contract_prompt_library/README.md',
    ...Array.from(new Set(Object.values(contractOverrides).flatMap((override) => override.source_files)))
  ],
  detail: `Morning coverage scan with recency ${recencyWindowHours}h and max ${maxResults}. ${detail}`,
  heuristic
});

type ClusterRefinementFunctionConfig = {
  endpoint: string;
};

const resolveClusterRefinementFunctionConfig = (): ClusterRefinementFunctionConfig => ({
  endpoint: readRuntimeEnv('REFINE_CLUSTERS_ENDPOINT') ?? '/.netlify/functions/refine-clusters'
});

export const createNetlifyFunctionEventClusterRefinementProvider = (
  config: ClusterRefinementFunctionConfig
): EventClusterRefinementProvider => ({
  providerId: `netlify-function:${config.endpoint}`,
  configured: true,
  refine: async (request) => {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const payload = (await response.json()) as {
      status?: ClusterRefinementResponse['status'];
      clusters?: RefinedClusterTransport[];
      pre_clusters?: PreClusterSummary[];
      issue?: string;
      providerId?: string;
    };

    if (!response.ok) {
      return {
        status: 'refinement_unavailable',
        pre_clusters: request.pre_clusters,
        issue: payload.issue ?? `${response.status} ${response.statusText}`,
        provider_id: payload.providerId
      };
    }

    if (payload.status === 'refined' && Array.isArray(payload.clusters)) {
      return {
        status: 'refined',
        clusters: payload.clusters,
        provider_id: payload.providerId
      };
    }

    return {
      status: 'refinement_unavailable',
      pre_clusters: request.pre_clusters,
      issue: payload.issue,
      provider_id: payload.providerId
    };
  }
});

const createUnconfiguredEventClusterRefinementProvider = (): EventClusterRefinementProvider => ({
  providerId: 'unconfigured-cluster-refiner',
  configured: false,
  refine: async (request) => ({
    status: 'refinement_unavailable',
    pre_clusters: request.pre_clusters,
    issue: 'Cluster refinement is unavailable because no server-side refinement provider is configured.'
  })
});

const resolveEventClusterRefinementProvider = (): EventClusterRefinementProvider => {
  if (typeof window === 'undefined') {
    return createUnconfiguredEventClusterRefinementProvider();
  }

  return createNetlifyFunctionEventClusterRefinementProvider(resolveClusterRefinementFunctionConfig());
};

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

const normalizeCrossContractProviderRequest = (input: CrossContractScanRequest): DiscoveryProviderRequest => {
  const recencyWindowHours = normalizeRecencyWindowHours(input.recency_window_hours);
  const maxResults = normalizeCrossContractMaxResults(input.max_results);
  const queryPresets = Object.values(ContractId).flatMap((contractId) =>
    QUERY_PRESETS[contractId].map((preset) => ({
      ...preset,
      contract_id: contractId,
      max_results: 2
    }))
  );

  return {
    contract_id: ContractId.NQ,
    recency_window_hours: recencyWindowHours,
    max_results: maxResults,
    query_presets: queryPresets
  };
};

const sortEventClusters = (clusters: EventCluster[], candidates: DiscoveryCandidate[]): EventCluster[] => {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate] as const));

  return [...clusters].sort((left, right) => {
    const leftMembers = left.member_candidate_ids.map((candidateId) => candidateMap.get(candidateId)).filter(Boolean) as DiscoveryCandidate[];
    const rightMembers = right.member_candidate_ids.map((candidateId) => candidateMap.get(candidateId)).filter(Boolean) as DiscoveryCandidate[];
    const leftPriority =
      Math.max(...leftMembers.map((candidate) => candidate.total_rank_score), 0) +
      Math.max(...leftMembers.map((candidate) => candidate.authority_score), 0) * 0.25 +
      Math.max(...leftMembers.map((candidate) => candidate.freshness_score), 0) * 0.15;
    const rightPriority =
      Math.max(...rightMembers.map((candidate) => candidate.total_rank_score), 0) +
      Math.max(...rightMembers.map((candidate) => candidate.authority_score), 0) * 0.25 +
      Math.max(...rightMembers.map((candidate) => candidate.freshness_score), 0) * 0.15;

    return rightPriority - leftPriority;
  });
};

export const runCrossContractMorningCoverageScan = async (
  input: CrossContractScanRequest,
  provider: DiscoveryProvider = resolveDiscoveryProvider(),
  refiner: EventClusterRefinementProvider = resolveEventClusterRefinementProvider()
): Promise<CrossContractScanSummary> => {
  const parsedInput = CrossContractScanRequestSchema.safeParse(input);
  const trace: RuleTrace[] = [];

  if (!parsedInput.success) {
    return CrossContractScanSummarySchema.parse({
      status: 'error',
      provider_id: provider.providerId,
      retrieved_at: new Date().toISOString(),
      recency_window_hours: DEFAULT_DISCOVERY_RECENCY_HOURS,
      candidates: [],
      clusters: [],
      issues: parsedInput.error.issues.map((issue) => `${issue.path.join('.') || 'discovery'} ${issue.message}`),
      scan_mode: 'morning_coverage',
      trace
    });
  }

  const request = normalizeCrossContractProviderRequest(parsedInput.data);
  trace.push(
    buildCrossContractTrace(
      `Candidate pool normalized across ${request.query_presets.length} presets for ${Object.values(ContractId).join(', ')}.`,
      request.recency_window_hours,
      request.max_results
    )
  );

  if (!provider.configured) {
    trace.push(
      buildCrossContractTrace(
        `Discovery provider ${provider.providerId} is unconfigured.`,
        request.recency_window_hours,
        request.max_results
      )
    );

    return CrossContractScanSummarySchema.parse({
      status: 'unconfigured',
      provider_id: provider.providerId,
      retrieved_at: new Date().toISOString(),
      recency_window_hours: request.recency_window_hours,
      candidates: [],
      clusters: [],
      issues: ['Live discovery is unavailable because no discovery provider is configured.'],
      scan_mode: 'morning_coverage',
      trace
    });
  }

  let invocation: DiscoveryProviderInvocation;
  try {
    invocation = await provider.search(request);
  } catch (error) {
    const issue = error instanceof Error ? error.message : 'unknown discovery provider error';
    trace.push(
      buildCrossContractTrace(
        `Discovery provider ${provider.providerId} threw an error: ${issue}`,
        request.recency_window_hours,
        request.max_results,
        'discover',
        true
      )
    );

    return CrossContractScanSummarySchema.parse({
      status: 'error',
      provider_id: provider.providerId,
      retrieved_at: new Date().toISOString(),
      recency_window_hours: request.recency_window_hours,
      candidates: [],
      clusters: [],
      issues: [issue],
      scan_mode: 'morning_coverage',
      trace
    });
  }

  if (invocation.issue) {
    trace.push(
      buildCrossContractTrace(
        `Discovery provider ${provider.providerId} failed: ${invocation.issue}`,
        request.recency_window_hours,
        request.max_results,
        'discover',
        true
      )
    );

    return CrossContractScanSummarySchema.parse({
      status: 'error',
      provider_id: provider.providerId,
      retrieved_at: invocation.retrieved_at,
      recency_window_hours: request.recency_window_hours,
      candidates: [],
      clusters: [],
      issues: [invocation.issue],
      scan_mode: 'morning_coverage',
      trace
    });
  }

  const retrievedAt = invocation.retrieved_at;
  const dedupeResult = dedupeDiscoveryCandidates(
    invocation.items.map((item) => {
      const preset = request.query_presets.find((entry) => entry.preset_id === item.query_preset_id) ?? request.query_presets[0];
      return {
        ...createDiscoveryCandidate(preset.contract_id, preset, item, provider.providerId, retrievedAt),
        recency_window_hours: request.recency_window_hours
      };
    })
  );
  const candidates = dedupeResult.candidates
    .sort((left, right) => right.total_rank_score - left.total_rank_score)
    .slice(0, request.max_results);

  trace.push(
    buildCrossContractTrace(
      `Discovery provider ${provider.providerId} returned ${invocation.items.length} raw item(s); ${candidates.length} deduplicated candidate(s) survived normalization for the morning pool.`,
      request.recency_window_hours,
      request.max_results,
      'discover',
      true
    )
  );

  if (candidates.length === 0) {
    return CrossContractScanSummarySchema.parse({
      status: 'empty',
      provider_id: provider.providerId,
      retrieved_at: retrievedAt,
      recency_window_hours: request.recency_window_hours,
      candidates: [],
      clusters: [],
      issues: ['Morning coverage scan completed but returned no candidate items within the active recency window.'],
      scan_mode: 'morning_coverage',
      trace
    });
  }

  const preClusters = buildPreClusterSummaries(candidates, dedupeResult.duplicateCountByCandidateId, retrievedAt);
  trace.push(
    buildCrossContractTrace(
      `Deterministic pre-clustering produced ${preClusters.length} coarse group(s) from ${candidates.length} deduplicated candidate(s).`,
      request.recency_window_hours,
      request.max_results,
      'cluster',
      true
    )
  );

  let clusters = sortEventClusters(
    preClusters.map((preCluster) => convertPreClusterToEventCluster(preCluster, 'deterministic_only')),
    candidates
  );
  const issues: string[] = [];

  if (!refiner.configured) {
    trace.push(
      buildCrossContractTrace(
        `Cluster refiner ${refiner.providerId} is unavailable; deterministic pre-clusters are returned directly.`,
        request.recency_window_hours,
        request.max_results,
        'cluster'
      )
    );
  } else {
    const refinementResponse = await refiner.refine({
      pre_clusters: preClusters,
      candidates_metadata: candidates.map((candidate) =>
        createRefinementCandidateMetadata(candidate, dedupeResult.duplicateCountByCandidateId)
      )
    });

    if (refinementResponse.status === 'refined') {
      try {
        clusters = sortEventClusters(
          validateAndFinalizeRefinedClusters(
            refinementResponse.clusters,
            candidates,
            dedupeResult.duplicateCountByCandidateId,
            retrievedAt
          ),
          candidates
        );
        trace.push(
          buildCrossContractTrace(
            `Cluster refiner ${refinementResponse.provider_id ?? refiner.providerId} merged pre-clusters into ${clusters.length} validated event cluster(s).`,
            request.recency_window_hours,
            request.max_results,
            'cluster',
            true
          )
        );
      } catch (error) {
        const issue = error instanceof Error ? error.message : 'cluster refinement validation failed';
        issues.push(`Cluster refinement failed validation; falling back to deterministic pre-clusters. ${issue}`);
        clusters = sortEventClusters(
          preClusters.map((preCluster) => convertPreClusterToEventCluster(preCluster, 'llm_refinement_failed_fallback')),
          candidates
        );
        trace.push(
          buildCrossContractTrace(
            `Cluster refiner ${refinementResponse.provider_id ?? refiner.providerId} returned invalid output: ${issue}`,
            request.recency_window_hours,
            request.max_results,
            'cluster',
            true
          )
        );
      }
    } else {
      const issue = refinementResponse.issue?.trim();
      if (issue) {
        issues.push(`Cluster refinement unavailable; falling back to deterministic pre-clusters. ${issue}`);
      }
      clusters = sortEventClusters(
        preClusters.map((preCluster) =>
          convertPreClusterToEventCluster(preCluster, issue ? 'llm_refinement_failed_fallback' : 'deterministic_only')
        ),
        candidates
      );
      trace.push(
        buildCrossContractTrace(
          `Cluster refiner ${refinementResponse.provider_id ?? refiner.providerId} was unavailable${issue ? `: ${issue}` : ''}`,
          request.recency_window_hours,
          request.max_results,
          'cluster',
          Boolean(issue)
        )
      );
    }
  }

  return CrossContractScanSummarySchema.parse({
    status: 'ready',
    provider_id: provider.providerId,
    retrieved_at: retrievedAt,
    recency_window_hours: request.recency_window_hours,
    candidates,
    clusters,
    issues,
    scan_mode: 'morning_coverage',
    trace
  });
};
