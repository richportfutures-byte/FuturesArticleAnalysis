import { ContractId, HorizonBucket, NoveltyAssessment, PricingAssessment } from '../enums';
import {
  ContractOverride,
  choosePolarityVerdict,
  choosePricingFromNovelty,
  rankDrivers,
  sharedBlocks
} from './types';

const sourceFiles = [
  'master_deployment_guide_by_contract.docx',
  'NQ Contract Prompt Library / readme.md',
  'NQ / 01_article_selection_protocol.md',
  'NQ / 02_narrative_clustering_and_screening.md',
  'NQ / 03_deep_analysis_protocol.md',
  'NQ / 04_contract_translation_layer.md',
  'NQ / 05_deployment_and_trade_use_doctrine.md',
  'NQ / 06_confirmation_and_invalidation_playbook.md',
  'NQ / 07_pre_trade_sop.md',
  'NQ / 08_post_article_reaction_sop.md',
  'NQ / 09_single_article_one_shot_prompt.txt',
  'NQ / 10_multi_article_one_shot_prompt.txt',
  'NQ / 11_quick_intraday_filter_prompt.txt',
  'NQ / 12_domain_appendix.md',
  'NQ / 13_active_hours_reference.md'
];

const driverOrder = [
  'US rates and real yields',
  'megacap tech leadership',
  'semiconductors and AI capex',
  'broad risk sentiment and liquidity',
  'earnings and growth expectations'
];

export const nqOverride: ContractOverride = {
  override_id: 'NQ_OVERRIDE_V2_SOURCE_FAITHFUL',
  source_files: sourceFiles,
  meta: {
    id: ContractId.NQ,
    name: 'E-mini Nasdaq-100',
    primary_objective:
      'Translate articles into NQ-relevant directional bias, leadership implications, and time-horizon-aware setup preference without letting narrative override price and structure.',
    core_transmission_focus: driverOrder,
    confirmation_markers: [
      '10Y yields and real-yield direction',
      'QQQ and SOX relative strength',
      'NVDA / MSFT / AAPL leadership quality',
      'breadth and equal-weight behavior',
      'cash-open acceptance versus rejection'
    ],
    least_valuable_use:
      'Single-article trading during microstructure-driven chop, dealer-gamma pinning, or when article logic conflicts with clear breadth and leadership deterioration.',
    deployment_windows: [
      'pre-event or pre-session before major data, policy communication, or significant overnight narrative shifts',
      'immediately after a meaningful article or headline cluster',
      'before acting on a narrative already believed',
      'after a large move, before chasing'
    ],
    shared_block_map: sharedBlocks
  },
  channels: driverOrder,
  pricingModes: [
    PricingAssessment.UNDERPRICED,
    PricingAssessment.ALREADY_PRICED,
    PricingAssessment.MIXED,
    PricingAssessment.IMPOSSIBLE_TO_ASSESS,
    PricingAssessment.STALE
  ],
  channelRules: [
    {
      channel: 'US rates and real yields',
      keywords: ['yield', 'yields', 'real yield', 'real yields', 'rates', 'rate expectations', 'fomc', 'inflation'],
      bullish: ['lower yields', 'stable yields', 'dovish', 'softens'],
      bearish: ['higher yields', 'rising yield', 'hawkish', 'hot inflation', 'inflation surprise']
    },
    {
      channel: 'megacap tech leadership',
      keywords: ['megacap', 'tech', 'qqq', 'leadership', 'nvda', 'msft', 'aapl'],
      bullish: ['tech leadership improves', 'supportive tech', 'tech leads'],
      bearish: ['megacap tech weakens', 'leadership weakens', 'breadth deteriorates']
    },
    {
      channel: 'semiconductors and AI capex',
      keywords: ['semi', 'semis', 'semiconductor', 'ai', 'capex'],
      bullish: ['semis confirm', 'ai capex support', 'ai demand holds'],
      bearish: ['semis underperform', 'pressure on semis', 'ai spending slows']
    },
    {
      channel: 'broad risk sentiment and liquidity',
      keywords: ['risk appetite', 'risk sentiment', 'liquidity', 'breadth', 'cash open'],
      bullish: ['risk appetite', 'supportive liquidity', 'cash-open acceptance'],
      bearish: ['risk-off', 'liquidity deteriorates', 'cash-open rejection']
    },
    {
      channel: 'earnings and growth expectations',
      keywords: ['earnings', 'growth', 'guidance', 'multiples'],
      bullish: ['earnings support', 'growth improves'],
      bearish: ['growth slows', 'earnings miss', 'compresses long-duration equity multiples']
    }
  ],
  invalidation_markers: [
    'the supposed transmission channel fails to appear in the relevant cross-market markers',
    'NQ reacts in the opposite direction and gains acceptance there',
    'the move looks technical while the supposed macro mechanism remains absent',
    'later information weakens the article novelty or factual basis'
  ],
  activeHours: {
    structural_windows: [
      '9:30 AM to 11:00 AM ET: cash open and index-component pricing',
      '11:00 AM to 2:00 PM ET: midday lull',
      '3:00 PM to 4:00 PM ET: close and settlement',
      '3:00 AM to 6:00 AM ET: European open'
    ],
    event_windows: [
      '8:30 AM ET: primary US macro releases',
      '10:00 AM ET: secondary US macro releases',
      '2:00 PM to 2:30 PM ET Wednesdays: FOMC decision and press conference',
      '4:00 PM to 4:15 PM ET during earnings season: megacap tech earnings'
    ]
  },
  horizonTemplate: [
    { bucket: HorizonBucket.RTH_OPEN, note: 'Confirm the read through the cash-open acceptance versus rejection window.' },
    { bucket: HorizonBucket.SAME_SESSION_CONTINUATION, note: 'Retain only if yields, leadership, and breadth continue to confirm.' },
    { bucket: HorizonBucket.ONE_TO_THREE_DAY_SWING, note: 'Carry only when the article changes path expectations rather than narrative framing alone.' }
  ],
  tradeUseNote:
    'Shape directional bias, leadership watchlist, continuation-versus-fade preference, and what must confirm before a setup deserves attention; do not dictate trades.',
  ruleRefs: {
    screening: {
      rule_id: 'NQ_SCREEN_CHANNEL_DISCIPLINE',
      source_files: sourceFiles,
      detail: 'Reject narratives that cannot be traced to a clean NQ transmission mechanism.'
    },
    clustering: {
      rule_id: 'NQ_CLUSTER_CHANNEL_GATE',
      source_files: sourceFiles,
      detail: 'Clusters must route through at least one core NQ channel and separate dominant narrative from article-specific additions.'
    },
    analysis: {
      rule_id: 'NQ_ANALYSIS_FACTS_VS_INFERENCE',
      source_files: sourceFiles,
      detail: 'Separate facts, inference, speculation, and rhetoric and decide whether the article changes price expectations, path expectations, or narrative framing.'
    },
    translation: {
      rule_id: 'NQ_TRANSLATION_DRIVER_STACK',
      source_files: sourceFiles,
      detail: 'Translate through rates, leadership, semis/AI, liquidity, and earnings without letting narrative override price and structure.'
    },
    pricing: {
      rule_id: 'NQ_PRICING_FAIL_CLOSED',
      source_files: sourceFiles,
      detail: 'Use underpriced / already_priced / mixed / impossible_to_assess / stale and fail closed when the mechanism is internally inconsistent.'
    },
    deployment: {
      rule_id: 'NQ_DEPLOYMENT_BOUNDED_USE',
      source_files: sourceFiles,
      detail: 'Output should shape bias and continuation-versus-fade preference rather than autonomous trade directives.'
    },
    activeHours: {
      rule_id: 'NQ_ACTIVE_HOURS_CONTEXT',
      source_files: sourceFiles,
      detail: 'Carry the NQ structural and event windows directly from the uploaded active-hours guide.'
    }
  },
  selectVerdict: (analysis, matchedChannels) => choosePolarityVerdict(analysis, nqOverride.channelRules, matchedChannels),
  choosePricing: (analysis) =>
    choosePricingFromNovelty(analysis, {
      [NoveltyAssessment.GENUINELY_NEW]: PricingAssessment.UNDERPRICED,
      [NoveltyAssessment.PARTLY_NEW]: PricingAssessment.MIXED,
      [NoveltyAssessment.RECYCLED_BACKGROUND]: PricingAssessment.STALE,
      [NoveltyAssessment.POST_HOC_ATTACHMENT]: PricingAssessment.IMPOSSIBLE_TO_ASSESS,
      [NoveltyAssessment.UNCLEAR]: PricingAssessment.IMPOSSIBLE_TO_ASSESS
    }),
  chooseExpressionVehicle: (_cluster, _sourceType, matchedChannels) =>
    matchedChannels.includes('megacap tech leadership') || matchedChannels.includes('semiconductors and AI capex')
      ? 'NQ futures / QQQ leadership proxy'
      : 'NQ futures',
  driverHierarchy: (_analysis, matchedChannels) => rankDrivers(driverOrder, matchedChannels)
};
