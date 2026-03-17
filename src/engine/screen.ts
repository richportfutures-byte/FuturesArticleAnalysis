import { buildTrace, ContractOverride, matchChannels } from '../domain/contracts/types';
import { NormalizedArticle, RuleTrace, ScreeningSummary } from '../domain/entities';
import { SourceSurvival, SourceType } from '../domain/enums';

export type ScreenedArticle = {
  article: NormalizedArticle;
  result: SourceSurvival;
  matchedChannels: string[];
  relevance_score: number;
  rationale: string;
};

const aggregateResult = (results: ScreenedArticle[]): SourceSurvival => {
  if (results.some((entry) => entry.result === SourceSurvival.SELECTED)) return SourceSurvival.SELECTED;
  if (results.some((entry) => entry.result === SourceSurvival.CONTEXT_ONLY)) return SourceSurvival.CONTEXT_ONLY;
  if (results.some((entry) => entry.result === SourceSurvival.NOISE)) return SourceSurvival.NOISE;
  return SourceSurvival.IRRELEVANT;
};

export const runScreen = (articles: NormalizedArticle[], override: ContractOverride) => {
  const results: ScreenedArticle[] = [];
  const trace: RuleTrace[] = [];

  articles.forEach((article) => {
    const matchedChannels = matchChannels(article.normalized_text, override.channelRules);
    const relevanceScore = matchedChannels.length * 22 + Math.round(article.source_quality_score * 60) - article.rhetorical_cues.length * 8;

    let result = SourceSurvival.SELECTED;
    let detail = `Selected article ${article.article_id} through doctrine drivers: ${matchedChannels.join(', ')}.`;
    let heuristic = false;

    if (matchedChannels.length === 0) {
      result = SourceSurvival.IRRELEVANT;
      detail = `Article ${article.article_id} rejected because no ${override.meta.id} doctrine driver matched its intake-normalized text.`;
    } else if (article.source_type === SourceType.COMMENTARY) {
      result = SourceSurvival.CONTEXT_ONLY;
      detail = `Article ${article.article_id} downgraded to context_only because commentary may inform framing but cannot independently support the brief.`;
    } else if (article.body_excerpt.trim().length < 20 && article.source_type !== SourceType.OFFICIAL_STATEMENT) {
      result = SourceSurvival.NOISE;
      detail = `Article ${article.article_id} downgraded to noise because the excerpt is too thin to support a source-grounded reasoning packet.`;
      heuristic = true;
    } else if (article.rhetorical_cues.length >= 2 && article.source_quality_score < 0.7) {
      result = SourceSurvival.CONTEXT_ONLY;
      detail = `Article ${article.article_id} remains context_only because rhetorical framing dominates source quality.`;
      heuristic = true;
    }

    results.push({ article, result, matchedChannels, relevance_score: relevanceScore, rationale: detail });
    trace.push(buildTrace('screen', override.ruleRefs.screening, detail, heuristic));
  });

  const surviving = results.filter((entry) => entry.result === SourceSurvival.SELECTED || entry.result === SourceSurvival.CONTEXT_ONLY);
  const screening: ScreeningSummary = {
    articles: results.map((entry) => ({
      article_id: entry.article.article_id,
      headline: entry.article.headline,
      result: entry.result,
      matched_drivers: entry.matchedChannels,
      relevance_score: entry.relevance_score,
      source_quality_score: entry.article.source_quality_score,
      rationale: entry.rationale
    })),
    selected_article_ids: results.filter((entry) => entry.result === SourceSurvival.SELECTED).map((entry) => entry.article.article_id),
    context_article_ids: results.filter((entry) => entry.result === SourceSurvival.CONTEXT_ONLY).map((entry) => entry.article.article_id),
    rejected_article_ids: results
      .filter((entry) => entry.result === SourceSurvival.IRRELEVANT || entry.result === SourceSurvival.NOISE)
      .map((entry) => entry.article.article_id),
    aggregate_result: aggregateResult(results)
  };

  return { results, surviving, screening, trace };
};
