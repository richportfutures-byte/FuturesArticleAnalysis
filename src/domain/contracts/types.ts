import { Contract, DeepAnalysis, NarrativeCluster, TranslationResult } from '../entities';
import { PricingAssessment, SourceType, Verdict } from '../enums';

export type ContractOverride = {
  meta: Contract;
  override_id: string;
  channels: string[];
  channelKeywords: string[];
  pricingModes: PricingAssessment[];
  invalidation_markers: string[];
  activeHours: {
    structural_windows: string[];
    event_windows: string[];
  };
  classifySide?: (analysis: DeepAnalysis) => 'euro_driver' | 'dollar_driver' | 'mixed' | 'unclear';
  selectVerdict: (analysis: DeepAnalysis) => Verdict;
  choosePricing: (analysis: DeepAnalysis) => PricingAssessment;
  chooseExpressionVehicle: (cluster: NarrativeCluster | null, sourceType: SourceType) => string;
  driverHierarchy: (analysis: DeepAnalysis) => string[];
  requiredBuckets?: string[];
};

export const sharedBlocks = [
  'article_selection',
  'narrative_clustering',
  'deep_analysis',
  'contract_translation',
  'deployment_doctrine',
  'confirmation_invalidation',
  'pre_trade_sop',
  'post_article_reaction_sop',
  'single_article_output',
  'multi_article_output',
  'quick_filter',
  'domain_appendix'
];

export const includesAny = (input: string, terms: string[]): boolean =>
  terms.some((term) => input.toLowerCase().includes(term.toLowerCase()));

export const chooseNoveltyVerdict = (analysis: DeepAnalysis): Verdict => {
  if (analysis.novelty_assessment === 'post_hoc_attachment' || analysis.confirmed_facts.length === 0) {
    return Verdict.NO_EDGE;
  }
  if (includesAny(analysis.core_claim, ['weakens', 'higher yields', 'hawkish', 'build sharply', 'slow'])) {
    return Verdict.BEARISH;
  }
  if (includesAny(analysis.core_claim, ['softens', 'dovish', 'supportive', 'tight compliance'])) {
    return Verdict.BULLISH;
  }
  return Verdict.MIXED;
};

export const choosePricingFromNovelty = (analysis: DeepAnalysis): PricingAssessment => {
  if (analysis.novelty_assessment === 'genuinely_new') return PricingAssessment.UNDERPRICED;
  if (analysis.novelty_assessment === 'partly_new') return PricingAssessment.MIXED;
  if (analysis.novelty_assessment === 'recycled_background') return PricingAssessment.STALE;
  return PricingAssessment.IMPOSSIBLE_TO_ASSESS;
};

export const defaultTradeNote: TranslationResult['trade_use_note'] =
  'Use this output to shape bias and confirmation plan only; do not derive exact entry, stop, or size from this workflow.';
