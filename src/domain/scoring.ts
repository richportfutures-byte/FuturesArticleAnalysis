import { DeepAnalysis } from './entities';
import { CausalCoherenceAssessment, DoctrineFit, NoveltyAssessment, SourceType } from './enums';

// Coarse heuristic metadata buckets only. These are not calibrated confidence estimates.
const toHeuristicMetadataScore = (rawScore: number): number => {
  if (rawScore <= 3) return 0.2;
  if (rawScore >= 7) return 0.8;
  return 0.5;
};

export const computeConfidence = (sourceTypes: SourceType[], analysis: DeepAnalysis): number => {
  let score = 5;
  if (sourceTypes.some((s) => s === SourceType.PRIMARY_REPORTING || s === SourceType.OFFICIAL_STATEMENT)) score += 2;
  if (analysis.confirmed_facts.length > 0) score += 1;
  if (analysis.strongest_alternative_interpretation.length > 0) score += 1;
  if (analysis.causal_coherence_assessment === CausalCoherenceAssessment.COHERENT) score += 1;
  if (analysis.causal_coherence_assessment === CausalCoherenceAssessment.UNSUPPORTED) score -= 3;
  if (analysis.explicit_unknowns.length > 2) score -= 1;
  if (analysis.speculative_claims.length > analysis.confirmed_facts.length) score -= 2;
  return toHeuristicMetadataScore(score);
};

export const computeActionability = (analysis: DeepAnalysis, doctrineFit: DoctrineFit): number => {
  let score = 5;
  if (analysis.novelty_assessment === NoveltyAssessment.GENUINELY_NEW) score += 2;
  if (analysis.novelty_assessment === NoveltyAssessment.RECYCLED_BACKGROUND) score -= 2;
  if (doctrineFit === DoctrineFit.STRONG) score += 2;
  if (doctrineFit === DoctrineFit.NONE) score -= 3;
  if (analysis.confirmed_facts.length === 0) score -= 2;
  if (analysis.causal_coherence_assessment === CausalCoherenceAssessment.MIXED) score -= 1;
  return toHeuristicMetadataScore(score);
};
