import { DeepAnalysis } from './entities';
import { NoveltyAssessment, SourceType } from './enums';

export const computeConfidence = (sourceTypes: SourceType[], analysis: DeepAnalysis): number => {
  let score = 5;
  if (sourceTypes.some((s) => s === SourceType.PRIMARY_REPORTING || s === SourceType.OFFICIAL_STATEMENT)) score += 2;
  if (analysis.confirmed_facts.length > 0) score += 1;
  if (analysis.competing_interpretation.length > 0) score += 1;
  if (analysis.speculation.length > analysis.confirmed_facts.length) score -= 2;
  return Math.max(1, Math.min(10, Math.round(score)));
};

export const computeActionability = (analysis: DeepAnalysis, hasChannels: boolean): number => {
  let score = 5;
  if (analysis.novelty_assessment === NoveltyAssessment.GENUINELY_NEW) score += 2;
  if (analysis.novelty_assessment === NoveltyAssessment.RECYCLED_BACKGROUND) score -= 2;
  if (!hasChannels) score -= 3;
  if (analysis.confirmed_facts.length === 0) score -= 2;
  return Math.max(1, Math.min(10, Math.round(score)));
};
