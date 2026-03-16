import { ContractOverride, buildTrace } from '../domain/contracts/types';
import { Article, DeepAnalysis, NarrativeCluster } from '../domain/entities';
import { NoveltyAssessment, SourceType } from '../domain/enums';

export const runAnalyze = (articles: Article[], override: ContractOverride, cluster: NarrativeCluster) => {
  const strongestArticle =
    articles.find((article) => article.source_type === SourceType.OFFICIAL_STATEMENT) ??
    articles.find((article) => article.source_type === SourceType.PRIMARY_REPORTING) ??
    articles[0];

  const text = `${strongestArticle?.headline ?? ''} ${strongestArticle?.body_excerpt ?? ''}`.trim();
  const confirmed = articles
    .filter((article) => article.source_type === SourceType.PRIMARY_REPORTING || article.source_type === SourceType.OFFICIAL_STATEMENT)
    .map((article) => article.headline);

  const novelty =
    confirmed.length > 0
      ? NoveltyAssessment.GENUINELY_NEW
      : articles.some((article) => article.source_type === SourceType.SYNTHESIS || article.source_type === SourceType.COMMENTARY)
        ? NoveltyAssessment.RECYCLED_BACKGROUND
        : NoveltyAssessment.UNCLEAR;

  const analysis: DeepAnalysis = {
    core_claim: text || 'No durable claim extracted',
    confirmed_facts: confirmed,
    plausible_inference: cluster.common_facts,
    speculation: articles.filter((article) => article.source_type === SourceType.COMMENTARY).map((article) => article.headline),
    opinion: articles.filter((article) => article.source_type === SourceType.SYNTHESIS).map((article) => article.headline),
    novelty_assessment: novelty,
    competing_interpretation: 'Move may be positioning or microstructure rather than article catalyst.'
  };

  const trace = [
    buildTrace(
      'analyze',
      override.ruleRefs.analysis,
      `Deep analysis anchored to ${strongestArticle?.article_id ?? 'no_article'} with ${confirmed.length} confirmed source(s).`,
      true
    )
  ];

  return { analysis, trace };
};
