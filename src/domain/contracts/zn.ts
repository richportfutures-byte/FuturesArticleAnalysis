import { ContractId, HorizonBucket, PricingAssessment } from '../enums';
import { ContractOverride, rankDrivers, sharedBlocks } from './types';

const sourceFiles = [
  'docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx',
  'docs/source_of_truth/contract_prompt_library/ZN/README.md',
  'docs/source_of_truth/contract_prompt_library/ZN/02_narrative_clustering_and_screening.md',
  'docs/source_of_truth/contract_prompt_library/ZN/05_deployment_and_trade_use_doctrine.md',
  'docs/source_of_truth/contract_prompt_library/ZN/07_pre_trade_sop.md',
  'docs/source_of_truth/contract_prompt_library/ZN/08_post_article_reaction_sop.md',
  'docs/source_of_truth/contract_prompt_library/ZN/09_single_article_one_shot_prompt.txt',
  'docs/source_of_truth/contract_prompt_library/ZN/10_multi_article_one_shot_prompt.txt',
  'docs/source_of_truth/contract_prompt_library/ZN/12_domain_appendix.md'
];

const driverOrder = [
  'Fed-path repricing',
  'inflation-growth decomposition',
  'curve context',
  'auctions',
  'issuance',
  'fiscal credibility',
  'term premium',
  'risk-off demand'
];

export const znOverride: ContractOverride = {
  override_id: 'ZN_OVERRIDE_V2_SOURCE_FAITHFUL',
  source_files: sourceFiles,
  meta: {
    id: ContractId.ZN,
    name: '10Y Treasury Note Futures',
    primary_objective:
      'Translate articles into Treasury-price implications with strict price-versus-yield discipline and explicit separation of outright direction from curve and supply effects.',
    core_transmission_focus: driverOrder,
    confirmation_markers: [
      'cash yields and futures price moving consistently',
      '2s/10s or 5s/10s curve response',
      'Fed-funds path repricing',
      'auction tone and dealer absorption',
      'equity risk-off versus inflation-selloff distinction'
    ],
    least_valuable_use: 'Generic equity/business commentary without Treasury transmission.',
    deployment_windows: [
      'pre-data',
      'post-data',
      'post-auction',
      'after fiscal/Fed narrative shifts',
      'after a large move to decide continuation vs fade vs no trade'
    ],
    shared_block_map: sharedBlocks
  },
  channels: driverOrder,
  pricingModes: [
    PricingAssessment.UNDERPRICED,
    PricingAssessment.ALREADY_PRICED,
    PricingAssessment.MIXED,
    PricingAssessment.STALE,
    PricingAssessment.IMPOSSIBLE_TO_ASSESS
  ],
  channelRules: [
    {
      channel: 'Fed-path repricing',
      keywords: ['fed', 'fed speaker', 'pace', 'cuts', 'higher for longer', 'dovish', 'hawkish'],
      bullish: ['slower pace', 'dovish', 'cuts', 'cooling inflation', 'weaker growth'],
      bearish: ['hawkish', 'higher for longer', 'hot inflation']
    },
    {
      channel: 'inflation-growth decomposition',
      keywords: ['inflation', 'growth', 'labor', 'cpi', 'pce', 'jobs'],
      bullish: ['cooling inflation', 'slower growth', 'softens'],
      bearish: ['hot inflation', 'strong growth', 'reaccelerates']
    },
    {
      channel: 'curve context',
      keywords: ['curve', '2s10s', '5s10s', 'steepener', 'flattener'],
      bullish: ['bull flattening', 'curve bull'],
      bearish: ['bear steepening', 'curve bear']
    },
    {
      channel: 'auctions',
      keywords: ['auction', 'bid-to-cover', 'dealer absorption'],
      bullish: ['strong auction', 'solid demand'],
      bearish: ['weak auction', 'tail']
    },
    {
      channel: 'issuance',
      keywords: ['issuance', 'supply', 'refund', 'treasury sale'],
      bullish: ['issuance relief', 'lighter supply'],
      bearish: ['heavy issuance', 'supply pressure']
    },
    {
      channel: 'fiscal credibility',
      keywords: ['fiscal', 'deficit', 'credibility'],
      bearish: ['fiscal credibility concern', 'deficit pressure']
    },
    {
      channel: 'term premium',
      keywords: ['term premium'],
      bullish: ['term premium eases'],
      bearish: ['term premium higher']
    },
    {
      channel: 'risk-off demand',
      keywords: ['risk-off', 'flight to quality', 'safe haven'],
      bullish: ['risk-off', 'flight to quality']
    }
  ],
  invalidation_markers: [
    'yield rejection contradicts the narrative',
    'curve behavior implies a different mechanism',
    'auction failure contradicts the thesis'
  ],
  activeHours: {
    structural_windows: [],
    event_windows: ['pre-data', 'post-data', 'post-auction', 'after fiscal/Fed narrative shifts']
  },
  horizonTemplate: [
    { bucket: HorizonBucket.PRE_OPEN, note: 'Use pre-data and pre-auction windows to frame outright versus curve exposure.' },
    { bucket: HorizonBucket.SAME_SESSION_CONTINUATION, note: 'Retain only if cash yields, futures, and the curve move coherently.' },
    { bucket: HorizonBucket.ONE_TO_THREE_DAY_SWING, note: 'Carry only when Fed-path or term-premium repricing persists beyond the initial reaction.' }
  ],
  tradeUseNote:
    'Shape outright-versus-curve bias, continuation-versus-fade preference, and operator discipline; do not override yield rejection, auction failure, or curve behavior.',
  ruleRefs: {
    screening: {
      rule_id: 'ZN_SCREEN_TREASURY_TRANSMISSION',
      source_files: sourceFiles,
      detail: 'Reject generic equity or business commentary without Treasury transmission.'
    },
    clustering: {
      rule_id: 'ZN_CLUSTER_SOURCE_MAP',
      source_files: sourceFiles,
      detail: 'Build article-by-article source maps, identify common versus disputed claims, and classify discovery, consensus, or post-hoc storytelling.'
    },
    analysis: {
      rule_id: 'ZN_ANALYSIS_DRIVER_RANK',
      source_files: sourceFiles,
      detail: 'Rank the top drivers, mark claim support strength, and steelman the alternative interpretation.'
    },
    translation: {
      rule_id: 'ZN_TRANSLATION_PRICE_YIELD_DISCIPLINE',
      source_files: sourceFiles,
      detail: 'Translate through Treasury price discipline with explicit separation of outright direction from curve and supply effects.'
    },
    pricing: {
      rule_id: 'ZN_PRICING_EARLY_CONSENSUS_STALE',
      source_files: sourceFiles,
      detail: 'Assess whether the narrative is early, consensus, or stale before assigning deployment posture.'
    },
    deployment: {
      rule_id: 'ZN_DEPLOYMENT_OPERATOR_BOUNDARY',
      source_files: sourceFiles,
      detail: 'Use the deployment doctrine timing windows and disallowed uses from the ZN package.'
    },
    activeHours: {
      rule_id: 'ZN_EVENT_WINDOWS_ONLY',
      source_files: sourceFiles,
      detail: 'Carry only deployment timing windows explicitly described in the ZN deployment doctrine.'
    }
  },
  chooseExpressionVehicle: (_cluster, _sourceType, matchedChannels) =>
    matchedChannels.includes('curve context') || matchedChannels.includes('issuance')
      ? 'ZN outright or curve expression where applicable'
      : 'ZN outright',
  formatDriverDisplayOrder: (matchedChannels) => rankDrivers(driverOrder, matchedChannels)
};
