import { contractOverrides } from '../domain/contracts';
import { matchChannels } from '../domain/contracts/types';
import {
  Article,
  CandidateContractRelevance,
  IntakeMode,
  IntakeSourceRecord,
  IntakeStatus,
  NormalizedArticle,
  RuleTrace,
  SourceCompleteness,
  SourceOrigin
} from '../domain/entities';
import { ContractId } from '../domain/enums';

const rhetoricalLexicon = [
  'panic',
  'fear',
  'optimism',
  'traders say',
  'market hopes',
  'dramatic',
  'sentiment alone',
  'feels optimistic'
];

const noveltyLexicon = ['surprise', 'unexpected', 'opens door', 'signals', 'hints', 'announces', 'maintains', 'sharply'];

const sourceQualityByType = {
  official_statement: 1,
  primary_reporting: 0.88,
  synthesis: 0.62,
  commentary: 0.38,
  unknown: 0.25
} as const;

const completenessWeight: Record<SourceCompleteness, number> = {
  full_text: 1,
  partial_text: 0.78,
  unresolved: 0
};

const emptyCompletenessSummary = (): Record<SourceCompleteness, number> => ({
  full_text: 0,
  partial_text: 0,
  unresolved: 0
});

const emptyOriginSummary = (): Record<SourceOrigin, number> => ({
  manual_paste: 0,
  manual_url: 0,
  fixture: 0,
  live_fetched: 0
});

const defaultOriginByMode: Record<IntakeMode, SourceOrigin> = {
  manual_text: 'manual_paste',
  manual_url: 'manual_url',
  fixture: 'fixture'
};

const inferSourceCompleteness = (article: Article, intakeMode: IntakeMode): SourceCompleteness => {
  if (article.source_completeness) return article.source_completeness;
  if (intakeMode === 'manual_url' && !article.body_excerpt.trim()) return 'unresolved';
  if (!article.body_excerpt.trim()) return 'unresolved';
  return intakeMode === 'manual_text' || intakeMode === 'fixture' ? 'full_text' : 'partial_text';
};

const rankContractCandidates = (input: string): CandidateContractRelevance[] =>
  Object.values(contractOverrides)
    .map((override) => {
      const matchedFocus = matchChannels(input, override.channelRules);
      const score = matchedFocus.length;
      const fit: CandidateContractRelevance['fit'] = score >= 2 ? 'primary' : score === 1 ? 'secondary' : 'low';
      return {
        contract_id: override.meta.id,
        fit,
        rationale:
          score > 0
            ? `${override.meta.id} maps through ${matchedFocus.join(', ')}.`
            : `${override.meta.id} has no clean doctrine-backed transmission from the current article text.`,
        matched_focus: matchedFocus
      };
    })
    .filter((candidate) => candidate.fit !== 'low' || candidate.matched_focus.length > 0)
    .sort((left, right) => right.matched_focus.length - left.matched_focus.length)
    .slice(0, 3);

export const runIntake = (articles: Article[], contractId: ContractId, intakeMode: IntakeMode = 'manual_text') => {
  const sourceFiles = contractOverrides[contractId].source_files;
  const sourceCompletenessSummary = emptyCompletenessSummary();
  const sourceOriginSummary = emptyOriginSummary();
  const issues = new Set<string>();

  if (intakeMode === 'manual_url') {
    issues.add('Manual URL intake currently records metadata only. Remote fetch and extraction are not wired in this patch.');
  }

  const normalizedArticles: NormalizedArticle[] = articles.map((article) => {
    const resolvedIntakeMode = article.intake_mode ?? intakeMode;
    const sourceOrigin = article.source_origin ?? defaultOriginByMode[resolvedIntakeMode];
    const sourceCompleteness = inferSourceCompleteness(article, resolvedIntakeMode);
    const normalizedText =
      sourceCompleteness === 'unresolved'
        ? ''
        : [article.headline, article.body_excerpt, article.notes].filter(Boolean).join(' ').trim();
    const lower = normalizedText.toLowerCase();
    const rhetoricalCues = rhetoricalLexicon.filter((cue) => lower.includes(cue));
    const noveltyCues = noveltyLexicon.filter((cue) => lower.includes(cue));

    sourceCompletenessSummary[sourceCompleteness] += 1;
    sourceOriginSummary[sourceOrigin] += 1;

    if (sourceCompleteness === 'partial_text') {
      issues.add(
        `Partial source text was provided for ${article.headline || article.article_id}; downstream analysis is bounded to the pasted excerpt.`
      );
    }

    if (sourceCompleteness === 'unresolved') {
      issues.add(
        `Source ${article.url || article.article_id} is unresolved; no article text was ingested, so it cannot support article-level reasoning.`
      );
    }

    if (article.discovery_context) {
      issues.add(
        `Discovery-derived source ${article.article_id} came from ${article.discovery_context.search_provider} with ${article.discovery_context.import_readiness} import readiness.`
      );
    }

    return {
      ...article,
      intake_mode: resolvedIntakeMode,
      source_origin: sourceOrigin,
      source_completeness: sourceCompleteness,
      normalized_text: normalizedText,
      source_quality_score: (sourceQualityByType[article.source_type] ?? 0.25) * completenessWeight[sourceCompleteness],
      rhetorical_cues: rhetoricalCues,
      novelty_cues: noveltyCues,
      candidate_contract_relevance: normalizedText ? rankContractCandidates(normalizedText) : []
    };
  });

  const status: IntakeStatus =
    sourceCompletenessSummary.unresolved === normalizedArticles.length
      ? 'unresolved'
      : sourceCompletenessSummary.partial_text > 0 || sourceCompletenessSummary.unresolved > 0
        ? 'degraded'
        : 'ready';

  const sourceRecords: IntakeSourceRecord[] = normalizedArticles.map((article) => ({
    article_id: article.article_id,
    headline: article.headline,
    url: article.url,
    publisher: article.publisher,
    source_domain: article.source_domain,
    published_at: article.published_at,
    source_type: article.source_type,
    intake_mode: article.intake_mode,
    source_origin: article.source_origin,
    source_completeness: article.source_completeness,
    discovery_context: article.discovery_context
  }));

  const candidateSummary = normalizedArticles
    .flatMap((article) => article.candidate_contract_relevance)
    .map((candidate) => `${candidate.contract_id}:${candidate.matched_focus.length}`)
    .join(', ');

  const trace: RuleTrace[] = [
    {
      stage: 'intake',
      rule_id: 'INTAKE_NORMALIZATION',
      source_files: sourceFiles,
      detail: `Intake mode ${intakeMode} produced ${normalizedArticles.length} article(s) with status ${status}. Completeness full=${sourceCompletenessSummary.full_text}, partial=${sourceCompletenessSummary.partial_text}, unresolved=${sourceCompletenessSummary.unresolved}. Candidate relevance snapshot: ${candidateSummary || 'none'}.`,
      heuristic: true
    }
  ];

  return {
    intake_mode: intakeMode,
    status,
    issues: Array.from(issues),
    normalized_articles: normalizedArticles,
    source_records: sourceRecords,
    source_completeness_summary: sourceCompletenessSummary,
    source_origin_summary: sourceOriginSummary,
    trace
  };
};
