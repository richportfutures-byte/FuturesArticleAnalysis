import { Article } from './entities';
import { RunMode, SourceSurvival, SourceType } from './enums';

export const validateInput = (contractId: string | undefined, articles: Article[]): string[] => {
  const errors: string[] = [];
  if (!contractId) errors.push('contract_id missing');
  if (articles.length === 0) errors.push('source payload empty');
  return errors;
};

export const classifySource = (article: Article, hasChannel: boolean): SourceSurvival => {
  if (!hasChannel) return SourceSurvival.IRRELEVANT;
  if (article.source_type === SourceType.COMMENTARY) return SourceSurvival.CONTEXT_ONLY;
  if (article.body_excerpt.length < 20) return SourceSurvival.NOISE;
  return SourceSurvival.SELECTED;
};

export const resolveRunMode = (articles: Article[]): RunMode =>
  articles.length > 1 ? RunMode.MULTI_ARTICLE : RunMode.SINGLE_ARTICLE;
