import { ContractOverride } from '../domain/contracts/types';
import { Article } from '../domain/entities';
import { SourceSurvival } from '../domain/enums';
import { classifySource } from '../domain/rules';

export const runScreen = (articles: Article[], override: ContractOverride) => {
  const results = articles.map((article) => {
    const hay = `${article.headline} ${article.body_excerpt}`;
    const hasChannel = override.channelKeywords.some((k) => hay.toLowerCase().includes(k));
    const result = classifySource(article, hasChannel);
    return { article, result, hasChannel };
  });

  const surviving = results.filter((r) => r.result === SourceSurvival.SELECTED || r.result === SourceSurvival.CONTEXT_ONLY);
  return { results, surviving };
};
