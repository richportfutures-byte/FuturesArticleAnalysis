import { Article, DeepAnalysis } from '../domain/entities';
import { NoveltyAssessment, SourceType } from '../domain/enums';

export const runAnalyze = (articles: Article[]): DeepAnalysis => {
  const first = articles[0];
  const text = `${first?.headline ?? ''} ${first?.body_excerpt ?? ''}`;
  const confirmed = articles
    .filter((a) => a.source_type === SourceType.PRIMARY_REPORTING || a.source_type === SourceType.OFFICIAL_STATEMENT)
    .map((a) => a.headline);

  const novelty = confirmed.length > 0 ? NoveltyAssessment.GENUINELY_NEW : NoveltyAssessment.RECYCLED_BACKGROUND;

  return {
    core_claim: text.trim() || 'No durable claim extracted',
    confirmed_facts: confirmed,
    plausible_inference: ['Mechanism likely transmits via contract-specific channels'],
    speculation: articles.filter((a) => a.source_type === SourceType.COMMENTARY).map((a) => a.headline),
    opinion: articles.filter((a) => a.source_type === SourceType.SYNTHESIS).map((a) => a.headline),
    novelty_assessment: novelty,
    competing_interpretation: 'Move may be positioning/microstructure rather than article catalyst.'
  };
};
