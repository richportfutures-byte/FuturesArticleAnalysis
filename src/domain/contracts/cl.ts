import { ContractId, HorizonBucket, PricingAssessment } from '../enums';
import { ContractOverride, rankDrivers, sharedBlocks } from './types';

const sourceFiles = [
  'docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx',
  'docs/source_of_truth/contract_prompt_library/CL/01_article_selection_protocol.md',
  'docs/source_of_truth/contract_prompt_library/CL/02_narrative_clustering_and_screening.md',
  'docs/source_of_truth/contract_prompt_library/CL/03_deep_analysis_protocol.md',
  'docs/source_of_truth/contract_prompt_library/CL/04_contract_translation_layer.md',
  'docs/source_of_truth/contract_prompt_library/CL/05_deployment_and_trade_use_doctrine.md',
  'docs/source_of_truth/contract_prompt_library/CL/06_confirmation_and_invalidation_playbook.md',
  'docs/source_of_truth/contract_prompt_library/CL/07_pre_trade_sop.md',
  'docs/source_of_truth/contract_prompt_library/CL/08_post_article_reaction_sop.md',
  'docs/source_of_truth/contract_prompt_library/CL/09_single_article_one_shot_prompt.txt',
  'docs/source_of_truth/contract_prompt_library/CL/10_multi_article_one_shot_prompt.txt',
  'docs/source_of_truth/contract_prompt_library/CL/11_quick_intraday_filter_prompt.txt',
  'docs/source_of_truth/contract_prompt_library/CL/12_domain_appendix.md'
];

const driverOrder = [
  'OPEC+ policy, cohesion, and compliance',
  'physical supply disruption or restoration',
  'inventories, storage, and balance trajectory',
  'refinery utilization, outages, and maintenance',
  'product pull-through and crack-spread behavior',
  'sanctions, shipping, and chokepoint logistics',
  'global growth demand and macro regime',
  'US dollar and broad risk sentiment'
];

export const clOverride: ContractOverride = {
  override_id: 'CL_OVERRIDE_V2_SOURCE_FAITHFUL',
  source_files: sourceFiles,
  meta: {
    id: ContractId.CL,
    name: 'WTI Crude Oil Futures',
    primary_objective:
      'Convert energy and macro articles into disciplined, contract-specific relevance for crude oil so that supply, demand, geopolitics, inventory, refinery, and product-market effects are ranked instead of blurred into generic oil-up or oil-down commentary.',
    core_transmission_focus: driverOrder,
    confirmation_markers: [
      'front-month crude price acceptance and follow-through',
      'term-structure response: prompt strength vs deferreds',
      'Brent-WTI behavior when relevant',
      'inventories and subcomponents when thesis is inventory-led',
      'refinery utilization / runs / outages when thesis is refinery-led',
      'crack-spread behavior when product pull-through is central',
      'tanker / shipping / sanctions follow-through when logistics-led',
      'dollar behavior and broad risk sentiment when macro-linked'
    ],
    least_valuable_use: 'Generic commodity roundups or broad macro commentary without explicit crude transmission.',
    deployment_windows: ['before OPEC, inventory, refinery, sanctions, or macro-demand decisions', 'immediately after a meaningful article or conflicting cluster'],
    shared_block_map: sharedBlocks
  },
  channels: driverOrder,
  pricingModes: [
    PricingAssessment.UNDERPRICED,
    PricingAssessment.ALREADY_PRICED,
    PricingAssessment.MIXED,
    PricingAssessment.CONSENSUS,
    PricingAssessment.STALE,
    PricingAssessment.IMPOSSIBLE_TO_ASSESS
  ],
  channelRules: [
    {
      channel: 'OPEC+ policy, cohesion, and compliance',
      keywords: ['opec', 'quota', 'compliance', 'cut'],
      bullish: ['tighter compliance', 'cuts', 'quota discipline'],
      bearish: ['output increase', 'cheating', 'easing cuts']
    },
    {
      channel: 'physical supply disruption or restoration',
      keywords: ['disruption', 'outage', 'restoration', 'supply shock'],
      bullish: ['supply disruption', 'outage'],
      bearish: ['restoration', 'supply returns']
    },
    {
      channel: 'inventories, storage, and balance trajectory',
      keywords: ['inventory', 'inventories', 'storage', 'draw', 'build'],
      bullish: ['draw', 'tight balance'],
      bearish: ['build sharply', 'inventory build', 'storage pressure']
    },
    {
      channel: 'refinery utilization, outages, and maintenance',
      keywords: ['refinery', 'runs', 'maintenance', 'utilization'],
      bullish: ['utilization improves', 'runs rise'],
      bearish: ['runs slow', 'utilization falls']
    },
    {
      channel: 'product pull-through and crack-spread behavior',
      keywords: ['product', 'crack', 'gasoline', 'diesel'],
      bullish: ['crack spread strengthens', 'product pull-through'],
      bearish: ['crack spread weakens']
    },
    {
      channel: 'sanctions, shipping, and chokepoint logistics',
      keywords: ['sanction', 'shipping', 'tanker', 'chokepoint', 'logistics'],
      bullish: ['shipping disruption', 'sanctions tighten'],
      bearish: ['sanctions ease', 'shipping normalizes']
    },
    {
      channel: 'global growth demand and macro regime',
      keywords: ['demand', 'growth', 'macro'],
      bullish: ['demand improves', 'growth supports'],
      bearish: ['demand weakens', 'growth slows']
    },
    {
      channel: 'US dollar and broad risk sentiment',
      keywords: ['dollar', 'risk sentiment', 'usd'],
      bullish: ['dollar softens', 'risk appetite'],
      bearish: ['dollar strengthens', 'risk-off']
    }
  ],
  invalidation_markers: [
    'price rejects the narrative quickly and cannot hold the headline zone',
    'the curve does not confirm a supposedly tight physical story',
    'products fail to confirm a refinery or demand thesis',
    'official data contradicts the stated mechanism',
    'the move looks large but breadth of energy confirmation is poor'
  ],
  activeHours: {
    structural_windows: [],
    event_windows: ['inventory releases', 'OPEC headlines', 'refinery outage headlines', 'sanctions / shipping shocks']
  },
  horizonTemplate: [
    { bucket: HorizonBucket.OVERNIGHT, note: 'Respect overnight geopolitical or OPEC-driven shifts before the US inventory and refinery windows.' },
    { bucket: HorizonBucket.SAME_SESSION_CONTINUATION, note: 'Retain only if front-month price, curve, and products confirm the mechanism.' },
    { bucket: HorizonBucket.ONE_TO_THREE_DAY_SWING, note: 'Carry only when official data continues to support the physical-balance narrative.' }
  ],
  tradeUseNote:
    'Shape relevance, directional bias, horizon, setup preference, and what must confirm. If the mechanism is not internally consistent or the facts are not new, output no edge rather than a trading directive.',
  ruleRefs: {
    screening: {
      rule_id: 'CL_SCREEN_CRUDE_TRANSMISSION',
      source_files: sourceFiles,
      detail: 'De-prioritize generic commodity roundups, opinion pieces, and price recaps without explicit crude transmission.'
    },
    clustering: {
      rule_id: 'CL_CLUSTER_NARRATIVE_BUCKETS',
      source_files: sourceFiles,
      detail: 'Map each article into the CL narrative buckets and keep conflicting supply, inventory, refinery, or product narratives explicit.'
    },
    analysis: {
      rule_id: 'CL_ANALYSIS_FIRST_NEW_FACT',
      source_files: sourceFiles,
      detail: 'Identify the first actual new fact, separate confirmed facts from inference and opinion, and explain the mechanism step by step.'
    },
    translation: {
      rule_id: 'CL_TRANSLATION_DRIVER_HIERARCHY',
      source_files: sourceFiles,
      detail: 'Translate through OPEC, physical balances, refinery/product dynamics, sanctions/logistics, and macro demand without generic oil-up or oil-down shortcuts.'
    },
    pricing: {
      rule_id: 'CL_PRICING_UNDERPRICED_ALREADY_PRICED',
      source_files: sourceFiles,
      detail: 'Choose underpriced / already_priced / mixed / impossible_to_assess and downgrade to no_edge when the mechanism is not internally consistent.'
    },
    deployment: {
      rule_id: 'CL_DEPLOYMENT_BOUNDED_USE',
      source_files: sourceFiles,
      detail: 'Output should shape relevance, directional bias, horizon, setup preference, and confirmation requirements rather than autonomous trade directives.'
    },
    activeHours: {
      rule_id: 'CL_EVENT_WINDOWS_ONLY',
      source_files: sourceFiles,
      detail: 'Carry only event windows that are explicit in the CL package rather than inventing unsupported active-hours structure.'
    }
  },
  requiredBuckets: [
    'supply shock or disruption',
    'OPEC+ policy or quota enforcement',
    'inventory and storage narrative',
    'refinery or product-market narrative',
    'growth-demand narrative',
    'dollar or macro-liquidity narrative',
    'geopolitical premium narrative',
    'post-hoc explanation or low-information commentary'
  ],
  chooseExpressionVehicle: (_cluster, _sourceType, matchedChannels) =>
    matchedChannels.includes('product pull-through and crack-spread behavior')
      ? 'CL futures or products-linked expression depending on driver confirmation'
      : 'CL outright or calendar structure depending on driver',
  formatDriverDisplayOrder: (matchedChannels) => rankDrivers(driverOrder, matchedChannels)
};
