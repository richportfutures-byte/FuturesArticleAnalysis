import { ContractId, PricingAssessment, Verdict } from '../enums';
import { ContractOverride, sharedBlocks } from './types';

export const sixeOverride: ContractOverride = {
  override_id: 'SIXE_OVERRIDE_V1',
  meta: {
    id: ContractId.SIXE,
    name: 'Euro FX Futures',
    primary_objective: 'Translate articles through EUR-vs-USD relative-value framing.',
    core_transmission_focus: ['ECB-Fed divergence', 'growth differential', 'inflation differential', 'energy/trade-balance sensitivity', 'political risk', 'broad dollar regime'],
    confirmation_markers: ['front-end spread behavior', 'DXY context', 'Bund vs Treasury rate moves', 'US-session follow-through'],
    least_valuable_use: 'Generic risk-on/risk-off writing with no relative-value mechanism.',
    deployment_windows: ['pre-ECB/Fed data', 'post meaningful cluster', 'before chasing'],
    shared_block_map: sharedBlocks
  },
  channels: ['ECB-Fed divergence', 'growth differential', 'dollar-side decomposition', 'policy credibility'],
  channelKeywords: ['ecb', 'fed', 'euro', 'dollar', 'bund', 'treasury', 'spread'],
  pricingModes: [PricingAssessment.UNDERPRICED, PricingAssessment.CONSENSUS, PricingAssessment.STALE],
  invalidation_markers: ['Spread behavior fails to confirm', '6E accepts opposite direction', 'Move is technical with no macro mechanism'],
  activeHours: {
    structural_windows: ['3:00 AM to 8:00 AM ET Europe', '8:00 AM to 11:30 AM ET overlap', '11:30 AM to 4:00 PM ET US afternoon fade'],
    event_windows: ['2:00 AM to 5:00 AM ET EZ data', '8:15 AM ET ECB decision', '8:45 AM ET ECB press conference', '8:30 AM ET US data', '2:00 PM to 2:30 PM ET FOMC']
  },
  classifySide: (analysis) => {
    const claim = analysis.core_claim.toLowerCase();
    if (claim.includes('ecb') || claim.includes('euro')) return 'euro_driver';
    if (claim.includes('dollar') || claim.includes('fed')) return 'dollar_driver';
    return 'mixed';
  },
  selectVerdict: (analysis) => (analysis.core_claim.toLowerCase().includes('hawkish') ? Verdict.BULLISH : Verdict.MIXED),
  choosePricing: (analysis) => (analysis.novelty_assessment === 'genuinely_new' ? PricingAssessment.UNDERPRICED : PricingAssessment.CONSENSUS),
  chooseExpressionVehicle: () => '6E futures with EUR/USD relative-rate context',
  driverHierarchy: () => ['ECB-Fed divergence', 'growth differential', 'inflation-policy credibility', 'dollar regime', 'energy/trade sensitivity']
};
