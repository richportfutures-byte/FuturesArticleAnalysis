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
  'GC Contract Prompt Library / readme.md',
  'GC / 01_article_selection_protocol.md',
  'GC / 02_narrative_clustering_and_screening.md',
  'GC / 03_deep_analysis_protocol.md',
  'GC / 04_contract_translation_layer.md',
  'GC / 05_deployment_and_trade_use_doctrine.md',
  'GC / 06_confirmation_and_invalidation_playbook.md',
  'GC / 07_pre_trade_sop.md',
  'GC / 08_post_article_reaction_sop.md',
  'GC / 09_single_article_one_shot_prompt.txt',
  'GC / 10_multi_article_one_shot_prompt.txt',
  'GC / 11_quick_intraday_filter_prompt.txt',
  'GC / 12_domain_appendix.md',
  'GC / 13_active_hours_reference.md'
];

const driverOrder = [
  'real yields',
  'US dollar',
  'central-bank demand',
  'geopolitics',
  'inflation expectations',
  'liquidity stress'
];

export const gcOverride: ContractOverride = {
  override_id: 'GC_OVERRIDE_V2_SOURCE_FAITHFUL',
  source_files: sourceFiles,
  meta: {
    id: ContractId.GC,
    name: 'Gold Futures',
    primary_objective:
      'Force a ranked driver hierarchy for gold so that articles do not collapse into vague safe-haven storytelling and instead resolve which variable is actually dominant.',
    core_transmission_focus: driverOrder,
    confirmation_markers: [
      'real yields versus nominal yields',
      'DXY confirmation or contradiction',
      'Treasury reaction',
      'oil and commodity spillover',
      'spot gold behavior across the US session'
    ],
    least_valuable_use:
      'Lazy safe-haven storytelling without cross-asset confirmation or with no clarity on whether gold is responding to yields, dollar, or risk-off panic.',
    deployment_windows: [
      'pre-event or pre-session before major data, policy communication, or overnight narrative shifts',
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
      channel: 'real yields',
      keywords: ['real yield', 'real yields', 'yield', 'yields'],
      bullish: ['lower real yields', 'real yields soften'],
      bearish: ['higher real yields', 'real yields rise']
    },
    {
      channel: 'US dollar',
      keywords: ['dollar', 'dxy', 'usd'],
      bullish: ['weaker dollar', 'dollar softens'],
      bearish: ['stronger dollar', 'dollar rises']
    },
    {
      channel: 'central-bank demand',
      keywords: ['central bank', 'reserve', 'purchase', 'buying'],
      bullish: ['central-bank demand', 'reserve diversification', 'purchase'],
      bearish: ['selling reserves']
    },
    {
      channel: 'geopolitics',
      keywords: ['geopolitical', 'war', 'strike', 'conflict', 'sanction'],
      bullish: ['geopolitical premium', 'safe-haven demand'],
      bearish: ['de-escalation']
    },
    {
      channel: 'inflation expectations',
      keywords: ['inflation', 'inflation expectations', 'hedge'],
      bullish: ['inflation hedge demand'],
      bearish: ['disinflation']
    },
    {
      channel: 'liquidity stress',
      keywords: ['liquidity', 'stress', 'liquidation', 'margin'],
      bullish: ['systemic risk-off'],
      bearish: ['liquidation pressure', 'forced selling']
    }
  ],
  invalidation_markers: [
    'the supposed transmission channel fails to appear in cross-market markers',
    'GC reacts in the opposite direction and gains acceptance there',
    'the move looks technical while the macro mechanism is absent',
    'later information weakens the article core novelty or factual basis'
  ],
  activeHours: {
    structural_windows: [
      '3:00 AM to 8:00 AM ET: European session build',
      '8:00 AM to 12:00 PM ET: London / New York overlap',
      '8:20 AM ET: COMEX open outcry',
      '1:30 PM ET: COMEX settlement pulse'
    ],
    event_windows: [
      '8:30 AM ET: US inflation and labor data',
      '2:00 PM to 2:30 PM ET Wednesdays: FOMC decision and press conference',
      'unscheduled geopolitical shocks or systemic risk-off events',
      'surprise central-bank purchase or intervention headlines'
    ]
  },
  horizonTemplate: [
    { bucket: HorizonBucket.OVERNIGHT, note: 'Respect overnight geopolitical or reserve-demand extensions before the US session opens.' },
    { bucket: HorizonBucket.SAME_SESSION_CONTINUATION, note: 'Retain only if real yields, the dollar, and Treasury reaction confirm the dominant driver.' },
    { bucket: HorizonBucket.ONE_TO_THREE_DAY_SWING, note: 'Carry only when the move persists beyond a one-off safe-haven headline.' }
  ],
  tradeUseNote:
    'Shape bias strength, ranked driver hierarchy, horizon split, continuation-versus-fade preference, and whether gold is acting as hedge, inflation trade, reserve-diversification bid, or liquidation victim; do not dictate trades.',
  ruleRefs: {
    screening: {
      rule_id: 'GC_SCREEN_DRIVER_DISCIPLINE',
      source_files: sourceFiles,
      detail: 'Reject vague safe-haven storytelling that does not resolve through a dominant GC driver.'
    },
    clustering: {
      rule_id: 'GC_CLUSTER_CAUSAL_CONFLICTS',
      source_files: sourceFiles,
      detail: 'Group by catalyst, isolate what is new, and flag conflicting causal stories on the same move.'
    },
    analysis: {
      rule_id: 'GC_ANALYSIS_DRIVER_DOMINANCE',
      source_files: sourceFiles,
      detail: 'Force separation of facts, inference, speculation, and rhetoric and decide which GC driver actually dominates.'
    },
    translation: {
      rule_id: 'GC_TRANSLATION_DRIVER_HIERARCHY',
      source_files: sourceFiles,
      detail: 'Translate through real yields, the dollar, reserve demand, geopolitics, inflation expectations, and liquidity stress.'
    },
    pricing: {
      rule_id: 'GC_PRICING_UNDERPRICED_CONSENSUS_STALE',
      source_files: sourceFiles,
      detail: 'Use underpriced / consensus / stale / impossible_to_assess and fail closed when the mechanism is internally inconsistent.'
    },
    deployment: {
      rule_id: 'GC_DEPLOYMENT_BOUNDED_USE',
      source_files: sourceFiles,
      detail: 'Output should shape bias strength, driver ranking, and continuation-versus-fade preference rather than autonomous trade directives.'
    },
    activeHours: {
      rule_id: 'GC_ACTIVE_HOURS_CONTEXT',
      source_files: sourceFiles,
      detail: 'Carry the GC structural and event windows directly from the uploaded active-hours guide.'
    }
  },
  selectVerdict: (analysis, matchedChannels) => choosePolarityVerdict(analysis, gcOverride.channelRules, matchedChannels),
  choosePricing: (analysis) =>
    choosePricingFromNovelty(analysis, {
      [NoveltyAssessment.GENUINELY_NEW]: PricingAssessment.UNDERPRICED,
      [NoveltyAssessment.PARTLY_NEW]: PricingAssessment.MIXED,
      [NoveltyAssessment.RECYCLED_BACKGROUND]: PricingAssessment.STALE,
      [NoveltyAssessment.POST_HOC_ATTACHMENT]: PricingAssessment.IMPOSSIBLE_TO_ASSESS,
      [NoveltyAssessment.UNCLEAR]: PricingAssessment.IMPOSSIBLE_TO_ASSESS
    }),
  chooseExpressionVehicle: (_cluster, _sourceType, matchedChannels) =>
    matchedChannels.includes('US dollar') || matchedChannels.includes('real yields')
      ? 'GC futures / XAUUSD with cross-asset confirmation'
      : 'GC futures',
  driverHierarchy: (_analysis, matchedChannels) => rankDrivers(driverOrder, matchedChannels)
};
