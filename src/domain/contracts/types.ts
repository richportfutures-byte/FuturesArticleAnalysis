import { Contract, DeepAnalysis, HorizonSplit, NarrativeCluster, RuleTrace, TranslationResult } from '../entities';
import { NoveltyAssessment, PricingAssessment, SourceType, Verdict } from '../enums';

type DominantSide = 'euro_driver' | 'dollar_driver' | 'mixed' | 'unclear';

export type ContractRuleRef = {
  rule_id: string;
  source_files: string[];
  detail: string;
  heuristic?: boolean;
};

export type ContractChannelRule = {
  channel: string;
  keywords: string[];
  bullish?: string[];
  bearish?: string[];
  dominantSide?: DominantSide;
};

export type ContractOverride = {
  meta: Contract;
  override_id: string;
  source_files: string[];
  channels: string[];
  pricingModes: PricingAssessment[];
  channelRules: ContractChannelRule[];
  invalidation_markers: string[];
  activeHours: {
    structural_windows: string[];
    event_windows: string[];
  };
  horizonTemplate: HorizonSplit[];
  tradeUseNote: TranslationResult['trade_use_note'];
  ruleRefs: {
    screening: ContractRuleRef;
    clustering: ContractRuleRef;
    analysis: ContractRuleRef;
    translation: ContractRuleRef;
    pricing: ContractRuleRef;
    deployment: ContractRuleRef;
    activeHours: ContractRuleRef;
  };
  classifySide?: (analysis: DeepAnalysis, matchedChannels: string[]) => DominantSide;
  selectVerdict: (analysis: DeepAnalysis, matchedChannels: string[]) => Verdict;
  choosePricing: (analysis: DeepAnalysis, matchedChannels: string[], verdict: Verdict) => PricingAssessment;
  chooseExpressionVehicle: (cluster: NarrativeCluster | null, sourceType: SourceType, matchedChannels: string[]) => string;
  driverHierarchy: (analysis: DeepAnalysis, matchedChannels: string[]) => string[];
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

export const matchChannels = (input: string, channelRules: ContractChannelRule[]): string[] =>
  Array.from(new Set(channelRules.filter((rule) => includesAny(input, rule.keywords)).map((rule) => rule.channel)));

const matchedRules = (input: string, channelRules: ContractChannelRule[]): ContractChannelRule[] =>
  channelRules.filter((rule) => includesAny(input, rule.keywords));

export const choosePolarityVerdict = (
  analysis: DeepAnalysis,
  channelRules: ContractChannelRule[],
  matchedChannels: string[]
): Verdict => {
  if (analysis.novelty_assessment === 'post_hoc_attachment' || analysis.confirmed_facts.length === 0 || matchedChannels.length === 0) {
    return Verdict.NO_EDGE;
  }

  const claim = analysis.core_claim.toLowerCase();
  let bullishMatches = 0;
  let bearishMatches = 0;

  matchedRules(claim, channelRules)
    .filter((rule) => matchedChannels.includes(rule.channel))
    .forEach((rule) => {
      if (rule.bullish && includesAny(claim, rule.bullish)) bullishMatches += 1;
      if (rule.bearish && includesAny(claim, rule.bearish)) bearishMatches += 1;
    });

  if (bullishMatches > 0 && bearishMatches === 0) return Verdict.BULLISH;
  if (bearishMatches > 0 && bullishMatches === 0) return Verdict.BEARISH;
  if (bullishMatches === 0 && bearishMatches === 0) return Verdict.MIXED;
  return Verdict.MIXED;
};

export const choosePricingFromNovelty = (
  analysis: DeepAnalysis,
  pricingMap: Partial<Record<NoveltyAssessment, PricingAssessment>>
): PricingAssessment => {
  const mapped = pricingMap[analysis.novelty_assessment];
  if (mapped) {
    return mapped;
  }
  return PricingAssessment.IMPOSSIBLE_TO_ASSESS;
};

export const defaultTradeNote: TranslationResult['trade_use_note'] =
  'Use this output to shape bias and confirmation plan only; do not derive exact entry, stop, or size from this workflow.';

export const rankDrivers = (orderedDrivers: string[], matchedChannels: string[]): string[] => {
  const matchedSet = new Set(matchedChannels);
  const rankedMatches = orderedDrivers.filter((driver) => matchedSet.has(driver));
  const remaining = orderedDrivers.filter((driver) => !matchedSet.has(driver));
  return [...rankedMatches, ...remaining];
};

export const buildTrace = (
  stage: RuleTrace['stage'],
  ruleRef: ContractRuleRef,
  detail?: string,
  heuristic?: boolean
): RuleTrace => ({
  stage,
  rule_id: ruleRef.rule_id,
  source_files: ruleRef.source_files,
  detail: detail ?? ruleRef.detail,
  heuristic: heuristic ?? ruleRef.heuristic
});
