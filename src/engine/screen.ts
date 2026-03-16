import { buildTrace, ContractOverride, matchChannels } from '../domain/contracts/types';
import { Article, RuleTrace } from '../domain/entities';
import { SourceSurvival, SourceType } from '../domain/enums';

export type ScreenedArticle = {
  article: Article;
  result: SourceSurvival;
  matchedChannels: string[];
};

export const runScreen = (articles: Article[], override: ContractOverride) => {
  const results: ScreenedArticle[] = [];
  const trace: RuleTrace[] = [];

  articles.forEach((article) => {
    const haystack = `${article.headline} ${article.body_excerpt}`;
    const matchedChannels = matchChannels(haystack, override.channelRules);

    let result = SourceSurvival.SELECTED;
    let detail = `Selected article ${article.article_id} through channels: ${matchedChannels.join(', ')}.`;
    let heuristic = false;

    if (matchedChannels.length === 0) {
      result = SourceSurvival.IRRELEVANT;
      detail = `Article ${article.article_id} rejected because no source-backed ${override.meta.id} channel matched.`;
    } else if (article.source_type === SourceType.COMMENTARY) {
      result = SourceSurvival.CONTEXT_ONLY;
      detail = `Article ${article.article_id} downgraded to context_only because commentary is not enough to drive deployment on its own.`;
    } else if (article.body_excerpt.trim().length < 20 && article.source_type !== SourceType.OFFICIAL_STATEMENT) {
      result = SourceSurvival.NOISE;
      detail = `Article ${article.article_id} downgraded to noise because the excerpt is too thin to establish a new fact.`;
      heuristic = true;
    }

    results.push({ article, result, matchedChannels });
    trace.push(buildTrace('screen', override.ruleRefs.screening, detail, heuristic));
  });

  const surviving = results.filter((entry) => entry.result === SourceSurvival.SELECTED || entry.result === SourceSurvival.CONTEXT_ONLY);
  return { results, surviving, trace };
};
