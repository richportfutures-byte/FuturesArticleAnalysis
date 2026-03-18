import { ContractOverride } from '../domain/contracts/types';
import { ContractDoctrineBundle, SOURCE_OF_TRUTH_RULES } from '../domain/doctrine';
import {
  CandidateContractRelevance,
  DeepAnalysis,
  NarrativeCluster,
  NormalizedArticle,
  SourceGrounding
} from '../domain/entities';
import {
  CausalCoherenceAssessment,
  ClusterMode,
  ContractId,
  NoveltyAssessment,
  PricedInAssessment,
  ReasonerMode,
  SourceType
} from '../domain/enums';
import { ScreenedArticle } from './screen';

export type ReasonerSelectionMode = 'auto' | 'simulated' | 'live';

export type ReasoningRequest = {
  override: ContractOverride;
  doctrineBundle: ContractDoctrineBundle;
  normalizedArticles: NormalizedArticle[];
  screenedArticles: ScreenedArticle[];
  cluster: NarrativeCluster;
};

export type ReasonerInvocation = {
  analysis: unknown;
  issue?: string;
};

export interface MarketIntelligenceReasoner {
  mode: ReasonerMode;
  providerId: string;
  configured: boolean;
  generate: (request: ReasoningRequest) => Promise<ReasonerInvocation>;
}

export interface LiveReasoningProvider {
  providerId: string;
  generateAnalysis: (request: ReasoningRequest) => Promise<unknown>;
}

type OpenAIProviderConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

type FunctionProviderConfig = {
  endpoint: string;
};

const hasSourceType = (article: ScreenedArticle, types: SourceType[]) => types.includes(article.article.source_type);

const buildContractEffect = (contractId: ContractId, driver: string, order: 'first' | 'second'): string => {
  switch (contractId) {
    case ContractId.NQ:
      return order === 'first'
        ? `${driver} can immediately alter duration pressure, megacap leadership, and same-session breadth in NQ.`
        : `${driver} can change whether the move persists beyond the open or decays into a narrative-only explanation.`;
    case ContractId.ZN:
      return order === 'first'
        ? `${driver} can reprice Treasury yields, outright duration, or curve context in ZN.`
        : `${driver} can reshape Fed-path expectations, term premium, or auction sensitivity over the next few sessions.`;
    case ContractId.GC:
      return order === 'first'
        ? `${driver} can change gold through real yields, dollar pressure, or hedge demand.`
        : `${driver} can determine whether gold behaves like reserve demand, inflation hedge, or liquidation victim.`;
    case ContractId.SIXE:
      return order === 'first'
        ? `${driver} can shift the EUR-versus-USD relative-value read that matters for 6E.`
        : `${driver} can alter whether the move becomes euro-specific, dollar-specific, or spread-driven follow-through.`;
    case ContractId.CL:
      return order === 'first'
        ? `${driver} can change prompt crude relevance through balances, curve shape, products, or refinery flow.`
        : `${driver} can determine whether the move matures into a physical-balance story or fades as macro noise.`;
  }
};

const determineNovelty = (screenedArticles: ScreenedArticle[], cluster: NarrativeCluster): NoveltyAssessment => {
  const officialCount = screenedArticles.filter((article) => hasSourceType(article, [SourceType.OFFICIAL_STATEMENT])).length;
  const confirmedCount = screenedArticles.filter((article) =>
    hasSourceType(article, [SourceType.PRIMARY_REPORTING, SourceType.OFFICIAL_STATEMENT])
  ).length;
  const commentaryHeavy = screenedArticles.every((article) => hasSourceType(article, [SourceType.COMMENTARY, SourceType.SYNTHESIS]));

  if (officialCount > 0 || confirmedCount > 1) return NoveltyAssessment.GENUINELY_NEW;
  if (confirmedCount === 1) return NoveltyAssessment.PARTLY_NEW;
  if (cluster.cluster_mode === ClusterMode.POST_HOC || commentaryHeavy) return NoveltyAssessment.POST_HOC_ATTACHMENT;
  if (screenedArticles.some((article) => hasSourceType(article, [SourceType.SYNTHESIS, SourceType.COMMENTARY]))) {
    return NoveltyAssessment.RECYCLED_BACKGROUND;
  }
  return NoveltyAssessment.UNCLEAR;
};

const determineCoherence = (
  matchedDrivers: string[],
  screenedArticles: ScreenedArticle[],
  cluster: NarrativeCluster
): CausalCoherenceAssessment => {
  if (matchedDrivers.length === 0) return CausalCoherenceAssessment.UNSUPPORTED;
  if (cluster.disputed_claims.length > 0) return CausalCoherenceAssessment.MIXED;
  if (!screenedArticles.some((article) => hasSourceType(article, [SourceType.PRIMARY_REPORTING, SourceType.OFFICIAL_STATEMENT]))) {
    return CausalCoherenceAssessment.FRAGILE;
  }
  return CausalCoherenceAssessment.COHERENT;
};

const mapPricedInAssessment = (
  noveltyAssessment: NoveltyAssessment,
  coherence: CausalCoherenceAssessment,
  cluster: NarrativeCluster
): PricedInAssessment => {
  if (coherence === CausalCoherenceAssessment.UNSUPPORTED) return PricedInAssessment.UNCLEAR;
  if (noveltyAssessment === NoveltyAssessment.GENUINELY_NEW) return PricedInAssessment.UNDERAPPRECIATED;
  if (noveltyAssessment === NoveltyAssessment.PARTLY_NEW) {
    return cluster.cluster_mode === ClusterMode.CONSENSUS ? PricedInAssessment.PRICED_IN : PricedInAssessment.PARTIALLY_PRICED;
  }
  if (noveltyAssessment === NoveltyAssessment.RECYCLED_BACKGROUND) return PricedInAssessment.STALE;
  if (noveltyAssessment === NoveltyAssessment.POST_HOC_ATTACHMENT) return PricedInAssessment.UNCLEAR;
  return PricedInAssessment.UNCLEAR;
};

const aggregateCandidateRelevance = (articles: NormalizedArticle[]): CandidateContractRelevance[] => {
  const aggregate = new Map<ContractId, CandidateContractRelevance>();

  articles.forEach((article) => {
    article.candidate_contract_relevance.forEach((candidate) => {
      const existing = aggregate.get(candidate.contract_id);
      if (!existing) {
        aggregate.set(candidate.contract_id, { ...candidate });
        return;
      }

      const mergedFocus = Array.from(new Set([...existing.matched_focus, ...candidate.matched_focus]));
      aggregate.set(candidate.contract_id, {
        contract_id: candidate.contract_id,
        fit:
          mergedFocus.length >= 2 ? 'primary' : mergedFocus.length === 1 ? 'secondary' : existing.fit === 'primary' ? 'primary' : 'low',
        rationale: existing.rationale,
        matched_focus: mergedFocus
      });
    });
  });

  return Array.from(aggregate.values()).sort((left, right) => right.matched_focus.length - left.matched_focus.length);
};

const buildSourceGrounding = (screenedArticles: ScreenedArticle[], sourceFiles: string[]): SourceGrounding[] =>
  screenedArticles.flatMap((entry) => {
    const excerpt = entry.article.body_excerpt || entry.article.headline;
    const doctrineSourceFiles = sourceFiles.slice(0, 4);
    const grounding: SourceGrounding[] = [];

    if (hasSourceType(entry, [SourceType.PRIMARY_REPORTING, SourceType.OFFICIAL_STATEMENT])) {
      grounding.push({
        article_id: entry.article.article_id,
        source_type: entry.article.source_type,
        grounding_type: 'confirmed_fact',
        excerpt,
        doctrine_source_files: doctrineSourceFiles
      });
    } else if (hasSourceType(entry, [SourceType.SYNTHESIS])) {
      grounding.push({
        article_id: entry.article.article_id,
        source_type: entry.article.source_type,
        grounding_type: 'inference',
        excerpt,
        doctrine_source_files: doctrineSourceFiles
      });
    } else {
      grounding.push({
        article_id: entry.article.article_id,
        source_type: entry.article.source_type,
        grounding_type: 'speculation',
        excerpt,
        doctrine_source_files: doctrineSourceFiles
      });
    }

    if (entry.article.rhetorical_cues.length > 0) {
      grounding.push({
        article_id: entry.article.article_id,
        source_type: entry.article.source_type,
        grounding_type: 'rhetoric',
        excerpt: entry.article.rhetorical_cues.join(', '),
        doctrine_source_files: doctrineSourceFiles
      });
    }

    return grounding;
  });

const buildAlternativeInterpretation = (
  cluster: NarrativeCluster,
  coherence: CausalCoherenceAssessment,
  matchedDrivers: string[]
): string => {
  if (coherence === CausalCoherenceAssessment.UNSUPPORTED) {
    return 'The article may be post hoc storytelling or generalized market color without a clean contract transmission path.';
  }
  if (cluster.disputed_claims.length > 0) {
    return `A competing read is that the move is better explained by ${cluster.disputed_claims[0].toLowerCase()}.`;
  }
  if (matchedDrivers.length === 0) {
    return 'The market move may be positioning-driven rather than genuinely article-led.';
  }
  return 'A competing read is that positioning, microstructure, or an adjacent contract may be driving more of the move than the article claims.';
};

const buildUnknowns = (articles: NormalizedArticle[], cluster: NarrativeCluster, matchedDrivers: string[]): string[] => {
  const unknowns: string[] = [];
  if (articles.every((article) => !article.published_at)) unknowns.push('Published timestamps are absent, so recency confidence is limited.');
  if (articles.every((article) => !article.url)) unknowns.push('Direct source URLs are absent, so article-by-article verification remains manual.');
  if (matchedDrivers.length === 0) unknowns.push('No contract-specific transmission driver was strong enough to survive doctrine screening.');
  if (cluster.tradability_class !== 'tradable') unknowns.push('The surviving source set does not yet establish a tradable-quality catalyst cluster.');
  return unknowns;
};

const buildConfidenceNotes = (
  screenedArticles: ScreenedArticle[],
  coherence: CausalCoherenceAssessment,
  noveltyAssessment: NoveltyAssessment
): string[] => {
  const notes = [
    `Source mix: ${screenedArticles.map((entry) => entry.article.source_type).join(', ') || 'none'}.`,
    `Causal coherence is ${coherence}.`,
    `Novelty is assessed as ${noveltyAssessment}.`
  ];

  if (!screenedArticles.some((entry) => hasSourceType(entry, [SourceType.OFFICIAL_STATEMENT, SourceType.PRIMARY_REPORTING]))) {
    notes.push('Confidence is capped by the lack of strong primary or official sourcing.');
  }

  return notes;
};

export const simulatedReasoner: MarketIntelligenceReasoner = {
  mode: ReasonerMode.SIMULATED_LLM,
  providerId: 'simulated-reasoner',
  configured: true,
  generate: async ({ override, doctrineBundle, normalizedArticles, screenedArticles, cluster }: ReasoningRequest) => {
    const strongestArticle = [...normalizedArticles].sort((left, right) => right.source_quality_score - left.source_quality_score)[0];
    const matchedDrivers = Array.from(new Set(screenedArticles.flatMap((entry) => entry.matchedChannels)));
    const noveltyAssessment = determineNovelty(screenedArticles, cluster);
    const causalCoherence = determineCoherence(matchedDrivers, screenedArticles, cluster);
    const pricedInAssessment = mapPricedInAssessment(noveltyAssessment, causalCoherence, cluster);
    const confirmedFacts = screenedArticles
      .filter((entry) => hasSourceType(entry, [SourceType.PRIMARY_REPORTING, SourceType.OFFICIAL_STATEMENT]))
      .map((entry) => entry.article.headline);
    const inferredClaims = matchedDrivers.map((driver) => `${override.meta.id} relevance is most plausibly routed through ${driver}.`);
    const speculativeClaims = screenedArticles
      .filter((entry) => hasSourceType(entry, [SourceType.SYNTHESIS, SourceType.COMMENTARY]))
      .map((entry) => entry.article.headline);
    const rhetoricalElements = Array.from(
      new Set(screenedArticles.flatMap((entry) => entry.article.rhetorical_cues).concat(speculativeClaims.length > 0 ? ['commentary-heavy framing'] : []))
    );
    const alternativeInterpretation = buildAlternativeInterpretation(cluster, causalCoherence, matchedDrivers);
    const candidateContractRelevance = aggregateCandidateRelevance(normalizedArticles);
    const explicitUnknowns = buildUnknowns(normalizedArticles, cluster, matchedDrivers);

    return {
      analysis: {
        core_claim:
          strongestArticle?.body_excerpt?.trim() || strongestArticle?.headline?.trim() || 'No durable contract-relevant claim survived intake.',
        confirmed_facts: confirmedFacts,
        plausible_inference: inferredClaims,
        speculation: speculativeClaims,
        opinion: rhetoricalElements,
        inferred_claims: inferredClaims,
        speculative_claims: speculativeClaims,
        rhetorical_elements: rhetoricalElements,
        novelty_assessment: noveltyAssessment,
        causal_chain:
          matchedDrivers.length > 0
            ? matchedDrivers.map((driver) => `Article signal -> ${driver} -> ${override.meta.id} doctrine transmission`)
            : ['No clean article-to-contract causal chain is established.'],
        causal_coherence_assessment: causalCoherence,
        first_order_effects:
          matchedDrivers.length > 0
            ? matchedDrivers.map((driver) => buildContractEffect(override.meta.id, driver, 'first'))
            : ['No first-order contract effect is reliable enough to elevate above no_edge.'],
        second_order_effects:
          matchedDrivers.length > 0
            ? matchedDrivers.map((driver) => buildContractEffect(override.meta.id, driver, 'second'))
            : ['Without a clean first-order mechanism, second-order effects remain speculative.'],
        competing_interpretation: alternativeInterpretation,
        strongest_alternative_interpretation: alternativeInterpretation,
        priced_in_assessment: pricedInAssessment,
        confirmation_markers: override.meta.confirmation_markers,
        invalidation_markers: override.invalidation_markers,
        candidate_contract_relevance: candidateContractRelevance,
        source_grounding: buildSourceGrounding(screenedArticles, override.source_files),
        confidence_notes: buildConfidenceNotes(screenedArticles, causalCoherence, noveltyAssessment),
        explicit_unknowns: explicitUnknowns,
        reasoner_mode: ReasonerMode.SIMULATED_LLM,
        prompt_context: {
          system_rules: SOURCE_OF_TRUTH_RULES,
          doctrine_source_files: doctrineBundle.source_documents.map((entry) => entry.path),
          doctrine_highlights: doctrineBundle.doctrine_highlights
        }
      }
    };
  }
};

const unconfiguredLiveReasoner: MarketIntelligenceReasoner = {
  mode: ReasonerMode.UNCONFIGURED_LIVE_LLM,
  providerId: 'unconfigured-live-provider',
  configured: false,
  generate: async () => ({
    analysis: null,
    issue:
      'Live provider mode is active, but no model provider is configured. Wire a provider-backed reasoner or set REASONER_MODE=simulated for explicit local simulation.'
  })
};

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

const resolveAutoMode = (): Extract<ReasonerSelectionMode, 'simulated' | 'live'> => 'live';

export const resolveReasonerSelectionMode = (requestedMode?: ReasonerSelectionMode): Extract<ReasonerSelectionMode, 'simulated' | 'live'> => {
  if (requestedMode === 'simulated' || requestedMode === 'live') return requestedMode;

  const envMode = readRuntimeEnv('REASONER_MODE');
  if (envMode === 'simulated' || envMode === 'live') return envMode;

  return resolveAutoMode();
};

const resolveOpenAIProviderConfig = (): OpenAIProviderConfig | null => {
  const apiKey = readRuntimeEnv('OPENAI_API_KEY');
  const model = readRuntimeEnv('OPENAI_MODEL');
  const baseUrl = readRuntimeEnv('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1';

  if (!apiKey || !model) return null;

  return { apiKey, model, baseUrl };
};

const resolveFunctionProviderConfig = (): FunctionProviderConfig => ({
  endpoint: readRuntimeEnv('REASONER_ENDPOINT') ?? '/api/reasoner'
});

const buildProviderSystemPrompt = (request: ReasoningRequest): string =>
  [
    'You are a futures market-intelligence reasoning engine.',
    'Reason only from the supplied doctrine bundle and article materials.',
    'Do not invent doctrine that is not present in the provided files.',
    'Separate facts, inference, speculation, and rhetoric.',
    'Return JSON only.',
    'Return a single JSON object that matches the requested schema exactly.',
    'Do not include trading instructions, exact entry, stop, size, or order language.',
    `Target contract: ${request.override.meta.id}.`
  ].join('\n');

const buildProviderOutputContract = () => ({
  required_top_level_fields: {
    core_claim: 'string',
    confirmed_facts: 'string[]',
    plausible_inference: 'string[]',
    speculation: 'string[]',
    opinion: 'string[]',
    inferred_claims: 'string[]',
    speculative_claims: 'string[]',
    rhetorical_elements: 'string[]',
    novelty_assessment: Object.values(NoveltyAssessment),
    causal_chain: 'string[]',
    causal_coherence_assessment: Object.values(CausalCoherenceAssessment),
    first_order_effects: 'string[]',
    second_order_effects: 'string[]',
    competing_interpretation: 'string',
    strongest_alternative_interpretation: 'string',
    priced_in_assessment: Object.values(PricedInAssessment),
    confirmation_markers: 'string[]',
    invalidation_markers: 'string[]',
    candidate_contract_relevance: [
      {
        contract_id: Object.values(ContractId),
        fit: ['primary', 'secondary', 'low'],
        rationale: 'string',
        matched_focus: 'string[]'
      }
    ],
    source_grounding: [
      {
        article_id: 'string',
        source_type: Object.values(SourceType),
        grounding_type: ['confirmed_fact', 'inference', 'speculation', 'rhetoric'],
        excerpt: 'string',
        doctrine_source_files: 'string[]'
      }
    ],
    confidence_notes: 'string[]',
    explicit_unknowns: 'string[]',
    reasoner_mode: [ReasonerMode.LIVE_PROVIDER_LLM],
    prompt_context: {
      system_rules: 'string[]',
      doctrine_source_files: 'string[]',
      doctrine_highlights: 'string[]'
    }
  }
});

const buildProviderUserPrompt = (request: ReasoningRequest): string =>
  JSON.stringify(
    {
      doctrine_rules: SOURCE_OF_TRUTH_RULES,
      contract_id: request.override.meta.id,
      doctrine_source_files: request.doctrineBundle.source_documents.map((entry) => entry.path),
      doctrine_highlights: request.doctrineBundle.doctrine_highlights,
      contract_metadata: request.override.meta,
      cluster: request.cluster,
      screened_articles: request.screenedArticles.map((entry) => ({
        article_id: entry.article.article_id,
        headline: entry.article.headline,
        body_excerpt: entry.article.body_excerpt,
        source_type: entry.article.source_type,
        matched_channels: entry.matchedChannels,
        result: entry.result,
        rationale: entry.rationale
      })),
      normalized_articles: request.normalizedArticles.map((article) => ({
        article_id: article.article_id,
        headline: article.headline,
        body_excerpt: article.body_excerpt,
        source_type: article.source_type,
        candidate_contract_relevance: article.candidate_contract_relevance,
        rhetorical_cues: article.rhetorical_cues,
        novelty_cues: article.novelty_cues
      })),
      output_schema: buildProviderOutputContract(),
      output_contracts: Object.values(ContractId),
      required_reasoner_mode: ReasonerMode.LIVE_PROVIDER_LLM
    },
    null,
    2
  );

const extractJsonFromCompletion = (responsePayload: unknown): unknown => {
  if (!responsePayload || typeof responsePayload !== 'object') {
    throw new Error('Provider returned a non-object response.');
  }

  const payload = responsePayload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return JSON.parse(content);
  }

  if (Array.isArray(content)) {
    const text = content
      .map((entry) => (entry.type === 'text' ? entry.text ?? '' : ''))
      .join('')
      .trim();

    if (!text) {
      throw new Error('Provider returned an empty text payload.');
    }

    return JSON.parse(text);
  }

  throw new Error('Provider response did not contain a JSON text payload.');
};

export const createOpenAIReasoningProvider = (config: OpenAIProviderConfig): LiveReasoningProvider => ({
  providerId: `openai:${config.model}`,
  generateAnalysis: async (request: ReasoningRequest) => {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildProviderSystemPrompt(request) },
          { role: 'user', content: buildProviderUserPrompt(request) }
        ]
      })
    });

    if (!response.ok) {
      let issue = `${response.status} ${response.statusText}`;
      try {
        const errorPayload = (await response.json()) as { error?: { message?: string } };
        if (errorPayload.error?.message) {
          issue = errorPayload.error.message;
        }
      } catch {
        // Keep the HTTP status fallback.
      }
      throw new Error(issue);
    }

    const responsePayload = (await response.json()) as unknown;
    return extractJsonFromCompletion(responsePayload);
  }
});

export const createVercelFunctionReasoningProvider = (config: FunctionProviderConfig): LiveReasoningProvider => ({
  providerId: `vercel-function:${config.endpoint}`,
  generateAnalysis: async (request: ReasoningRequest) => {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildProviderSystemPrompt(request) },
          { role: 'user', content: buildProviderUserPrompt(request) }
        ]
      })
    });

    const payload = (await response.json()) as { analysis?: unknown; issue?: string; providerId?: string };
    if (!response.ok) {
      throw new Error(payload.issue ?? `${response.status} ${response.statusText}`);
    }

    return payload.analysis;
  }
});

const resolveLiveProvider = (): LiveReasoningProvider | null => {
  if (typeof window !== 'undefined') {
    return createVercelFunctionReasoningProvider(resolveFunctionProviderConfig());
  }

  const openAIConfig = resolveOpenAIProviderConfig();
  return openAIConfig ? createOpenAIReasoningProvider(openAIConfig) : null;
};

export const createProviderBackedReasoner = (provider: LiveReasoningProvider | null): MarketIntelligenceReasoner =>
  provider
    ? {
        mode: ReasonerMode.LIVE_PROVIDER_LLM,
        providerId: provider.providerId,
        configured: true,
        generate: async (request) => {
          try {
            const analysis = await provider.generateAnalysis(request);
            return { analysis };
          } catch (error) {
            return {
              analysis: null,
              issue: `Live provider ${provider.providerId} failed: ${error instanceof Error ? error.message : 'unknown provider error'}.`
            };
          }
        }
      }
    : unconfiguredLiveReasoner;

export const createDefaultReasoner = (
  requestedMode?: ReasonerSelectionMode,
  liveProvider: LiveReasoningProvider | null = resolveLiveProvider()
): MarketIntelligenceReasoner => {
  const selectedMode = resolveReasonerSelectionMode(requestedMode);
  return selectedMode === 'simulated' ? simulatedReasoner : createProviderBackedReasoner(liveProvider);
};
