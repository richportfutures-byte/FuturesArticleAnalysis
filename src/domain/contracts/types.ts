import { Contract, DeepAnalysis, HorizonSplit, NarrativeCluster, RuleTrace, TranslationResult } from '../entities';
import { PricingAssessment, SourceType } from '../enums';

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
  // Pre-reasoning contract scope hints only. These are for intake/screening, not for post-reasoning meaning inference.
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
  chooseExpressionVehicle: (cluster: NarrativeCluster | null, sourceType: SourceType, matchedChannels: string[]) => string;
  // Presentation-only ordering for already validated drivers. This must not infer new meaning.
  formatDriverDisplayOrder: (matchedChannels: string[]) => string[];
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
