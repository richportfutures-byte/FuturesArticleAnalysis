import { ContractId, HorizonBucket, NoveltyAssessment, PricingAssessment, Verdict } from '../enums';
import {
  ContractOverride,
  choosePolarityVerdict,
  choosePricingFromNovelty,
  rankDrivers,
  sharedBlocks
} from './types';

const sourceFiles = [
  'master_deployment_guide_by_contract.docx',
  '6E Contract Prompt Library / readme.md',
  '6E / 01_article_selection_protocol.md',
  '6E / 02_narrative_clustering_and_screening.md',
  '6E / 03_deep_analysis_protocol.md',
  '6E / 04_contract_translation_layer.md',
  '6E / 05_deployment_and_trade_use_doctrine.md',
  '6E / 06_confirmation_and_invalidation_playbook.md',
  '6E / 07_pre_trade_sop.md',
  '6E / 08_post_article_reaction_sop.md',
  '6E / 09_single_article_one_shot_prompt.txt',
  '6E / 10_multi_article_one_shot_prompt.txt',
  '6E / 11_quick_intraday_filter_prompt.txt',
  '6E / 12_domain_appendix.md',
  '6E / 13_active_hours_reference.md'
];

const driverOrder = [
  'ECB-Fed divergence',
  'Europe-versus-US growth differential',
  'inflation differential and policy credibility',
  'energy and trade-balance sensitivity',
  'political risk',
  'broad dollar regime versus euro-specific repricing'
];

export const sixeOverride: ContractOverride = {
  override_id: 'SIXE_OVERRIDE_V2_SOURCE_FAITHFUL',
  source_files: sourceFiles,
  meta: {
    id: ContractId.SIXE,
    name: 'Euro FX Futures',
    primary_objective:
      'Translate articles through a relative-value lens so the workflow asks whether the article changes EUR-versus-USD expectations rather than merely whether it sounds bullish or bearish in isolation.',
    core_transmission_focus: driverOrder,
    confirmation_markers: [
      'front-end spread behavior',
      'DXY context',
      'Bund versus Treasury rate moves',
      'European equities and banks',
      'US-session follow-through after Europe trades'
    ],
    least_valuable_use: 'Generic risk-on/risk-off writing with no relative-value mechanism.',
    deployment_windows: [
      'pre-event or pre-session before major ECB, Fed, or macro releases',
      'immediately after a meaningful article or headline cluster',
      'before acting on a narrative already believed',
      'after a large move, before chasing'
    ],
    shared_block_map: sharedBlocks
  },
  channels: driverOrder,
  pricingModes: [
    PricingAssessment.UNDERPRICED,
    PricingAssessment.CONSENSUS,
    PricingAssessment.STALE,
    PricingAssessment.MIXED,
    PricingAssessment.IMPOSSIBLE_TO_ASSESS
  ],
  channelRules: [
    {
      channel: 'ECB-Fed divergence',
      keywords: ['ecb', 'fed', 'divergence', 'policy divergence'],
      bullish: ['ecb hawkish', 'fed softens', 'relative policy divergence'],
      bearish: ['fed hawkish', 'ecb softens'],
      dominantSide: 'mixed'
    },
    {
      channel: 'Europe-versus-US growth differential',
      keywords: ['eurozone growth', 'us growth', 'growth differential', 'relative growth'],
      bullish: ['europe outperforms', 'us data softens'],
      bearish: ['eurozone slows', 'us data strong'],
      dominantSide: 'mixed'
    },
    {
      channel: 'inflation differential and policy credibility',
      keywords: ['inflation differential', 'policy credibility', 'inflation', 'credibility'],
      bullish: ['ecb credibility', 'euro inflation supports'],
      bearish: ['fed credibility', 'us inflation surprise'],
      dominantSide: 'mixed'
    },
    {
      channel: 'energy and trade-balance sensitivity',
      keywords: ['energy', 'trade balance', 'gas', 'terms of trade'],
      bullish: ['energy relief', 'trade balance improves'],
      bearish: ['energy shock', 'trade balance deteriorates'],
      dominantSide: 'euro_driver'
    },
    {
      channel: 'political risk',
      keywords: ['political risk', 'election', 'coalition', 'fiscal dispute'],
      bearish: ['political risk rises', 'instability'],
      dominantSide: 'euro_driver'
    },
    {
      channel: 'broad dollar regime versus euro-specific repricing',
      keywords: ['dollar', 'usd', 'dxy', 'euro repricing'],
      bullish: ['dollar softens', 'usd weakens'],
      bearish: ['dollar strengthens', 'usd bid'],
      dominantSide: 'dollar_driver'
    }
  ],
  invalidation_markers: [
    'the supposed transmission channel fails to appear in the relevant cross-market markers',
    'the contract reacts the opposite way and gains acceptance there',
    'the move looks technical while the macro mechanism remains absent',
    'later information weakens the article novelty or factual basis'
  ],
  activeHours: {
    structural_windows: [
      '3:00 AM to 8:00 AM ET: core European session',
      '8:00 AM to 11:30 AM ET: London / New York overlap',
      '11:30 AM to 4:00 PM ET: US afternoon fade unless a major USD catalyst dominates'
    ],
    event_windows: [
      '2:00 AM to 5:00 AM ET: Eurozone macro releases',
      '8:15 AM ET Thursdays: ECB rate decision',
      '8:45 AM ET Thursdays: ECB press conference',
      '8:30 AM ET: major US macro releases',
      '2:00 PM to 2:30 PM ET Wednesdays: FOMC decision and press conference'
    ]
  },
  horizonTemplate: [
    { bucket: HorizonBucket.OVERNIGHT, note: 'Respect the core European session and early Eurozone data windows before the US session takes control.' },
    { bucket: HorizonBucket.SAME_SESSION_CONTINUATION, note: 'Retain only if front-end spreads, rates, and DXY confirm the relative-value read.' },
    { bucket: HorizonBucket.ONE_TO_THREE_DAY_SWING, note: 'Carry only when the policy or growth differential persists beyond the initial catalyst.' }
  ],
  tradeUseNote:
    'Shape relative policy and growth bias, whether euro side or dollar side is dominant, continuation-versus-fade preference, and what must confirm before a setup deserves attention; do not dictate trades.',
  ruleRefs: {
    screening: {
      rule_id: 'SIXE_SCREEN_RELATIVE_VALUE_GATE',
      source_files: sourceFiles,
      detail: 'Reject generic risk-on/risk-off commentary that does not alter relative policy or growth expectations.'
    },
    clustering: {
      rule_id: 'SIXE_CLUSTER_RELATIVE_DRIVER_MAP',
      source_files: sourceFiles,
      detail: 'Group by catalyst, isolate what is new, and reject clusters that do not route through at least one core 6E channel.'
    },
    analysis: {
      rule_id: 'SIXE_ANALYSIS_RELATIVE_VALUE',
      source_files: sourceFiles,
      detail: 'Separate facts, inference, speculation, and rhetoric and decide whether the article changes EUR-versus-USD expectations.'
    },
    translation: {
      rule_id: 'SIXE_TRANSLATION_DRIVER_HIERARCHY',
      source_files: sourceFiles,
      detail: 'Translate through ECB-Fed divergence, growth/inflation differentials, energy sensitivity, political risk, and the broad dollar regime.'
    },
    pricing: {
      rule_id: 'SIXE_PRICING_UNDERPRICED_CONSENSUS_STALE',
      source_files: sourceFiles,
      detail: 'Use underpriced / consensus / stale and fail closed when the mechanism is internally inconsistent.'
    },
    deployment: {
      rule_id: 'SIXE_DEPLOYMENT_BOUNDED_USE',
      source_files: sourceFiles,
      detail: 'Output should shape relative-value bias and continuation-versus-fade preference rather than autonomous trade directives.'
    },
    activeHours: {
      rule_id: 'SIXE_ACTIVE_HOURS_CONTEXT',
      source_files: sourceFiles,
      detail: 'Carry the 6E structural and event windows directly from the uploaded active-hours guide.'
    }
  },
  classifySide: (_analysis, matchedChannels) => {
    const sideMatches = sixeOverride.channelRules
      .filter((rule) => matchedChannels.includes(rule.channel))
      .map((rule) => rule.dominantSide)
      .filter((side): side is 'euro_driver' | 'dollar_driver' | 'mixed' | 'unclear' => Boolean(side));

    if (sideMatches.includes('mixed')) return 'mixed';
    if (sideMatches.includes('euro_driver') && sideMatches.includes('dollar_driver')) return 'mixed';
    if (sideMatches.includes('euro_driver')) return 'euro_driver';
    if (sideMatches.includes('dollar_driver')) return 'dollar_driver';
    return 'unclear';
  },
  selectVerdict: (analysis, matchedChannels) => {
    const verdict = choosePolarityVerdict(analysis, sixeOverride.channelRules, matchedChannels);
    return verdict === Verdict.MIXED && matchedChannels.includes('broad dollar regime versus euro-specific repricing')
      ? Verdict.BEARISH
      : verdict;
  },
  choosePricing: (analysis) =>
    choosePricingFromNovelty(analysis, {
      [NoveltyAssessment.GENUINELY_NEW]: PricingAssessment.UNDERPRICED,
      [NoveltyAssessment.PARTLY_NEW]: PricingAssessment.CONSENSUS,
      [NoveltyAssessment.RECYCLED_BACKGROUND]: PricingAssessment.STALE,
      [NoveltyAssessment.POST_HOC_ATTACHMENT]: PricingAssessment.IMPOSSIBLE_TO_ASSESS,
      [NoveltyAssessment.UNCLEAR]: PricingAssessment.MIXED
    }),
  chooseExpressionVehicle: () => '6E futures with EUR/USD relative-rate context',
  driverHierarchy: (_analysis, matchedChannels) => rankDrivers(driverOrder, matchedChannels)
};
