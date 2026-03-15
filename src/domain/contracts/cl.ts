import { ContractId, PricingAssessment } from '../enums';
import { ContractOverride, chooseNoveltyVerdict, sharedBlocks } from './types';

export const clOverride: ContractOverride = {
  override_id: 'CL_OVERRIDE_V1',
  meta: {
    id: ContractId.CL,
    name: 'WTI Crude Oil Futures',
    primary_objective: 'Rank crude-specific drivers across supply, products, inventory, and macro channels.',
    core_transmission_focus: ['OPEC+ policy/compliance', 'physical disruption/restoration', 'inventory trajectory', 'refinery utilization', 'product pull-through', 'sanctions/logistics', 'global growth demand', 'USD risk sentiment'],
    confirmation_markers: ['front-month acceptance and follow-through', 'term structure response', 'Brent-WTI behavior', 'inventory subcomponents', 'crack spread behavior'],
    least_valuable_use: 'Generic commodity commentary with no crude transmission.',
    deployment_windows: ['pre-data', 'post-headline', 'before chasing'],
    shared_block_map: sharedBlocks
  },
  channels: ['OPEC+ policy', 'supply disruption', 'inventory', 'refinery/product', 'macro demand', 'USD/risk sentiment'],
  channelKeywords: ['opec', 'inventory', 'refinery', 'crack', 'shipping', 'sanctions', 'demand', 'crude', 'oil'],
  pricingModes: [PricingAssessment.UNDERPRICED, PricingAssessment.CONSENSUS, PricingAssessment.STALE, PricingAssessment.IMPOSSIBLE_TO_ASSESS],
  invalidation_markers: ['Curve fails to confirm tightness thesis', 'Products fail to confirm refinery thesis', 'Official data contradict mechanism'],
  activeHours: {
    structural_windows: ['US energy session'],
    event_windows: ['inventory releases', 'OPEC headlines', 'geopolitical shocks']
  },
  requiredBuckets: ['supply shock or disruption', 'OPEC+ policy or quota enforcement', 'inventory and storage narrative', 'refinery or product-market narrative', 'growth-demand narrative', 'dollar or macro-liquidity narrative', 'geopolitical premium narrative', 'post-hoc explanation or low-information commentary'],
  selectVerdict: chooseNoveltyVerdict,
  choosePricing: (analysis) => (analysis.novelty_assessment === 'genuinely_new' ? PricingAssessment.UNDERPRICED : PricingAssessment.MIXED),
  chooseExpressionVehicle: () => 'CL outright, calendar structure, or products-linked expression depending on driver',
  driverHierarchy: () => ['OPEC+/supply policy', 'physical balances/inventory', 'refinery & products', 'sanctions/logistics', 'global demand macro']
};
