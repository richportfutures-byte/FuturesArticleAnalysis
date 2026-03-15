import { ContractId, PricingAssessment, SourceType, Verdict } from '../enums';
import { ContractOverride, choosePricingFromNovelty, sharedBlocks } from './types';

export const znOverride: ContractOverride = {
  override_id: 'ZN_OVERRIDE_V1',
  meta: {
    id: ContractId.ZN,
    name: '10Y Treasury Note Futures',
    primary_objective: 'Translate articles into Treasury-price implications with price-vs-yield discipline.',
    core_transmission_focus: ['Fed-path repricing', 'inflation-growth decomposition', 'curve context', 'auctions', 'issuance', 'fiscal credibility', 'term premium', 'risk-off demand'],
    confirmation_markers: ['cash yields and futures move consistently', '2s/10s or 5s/10s curve response', 'Fed-funds path repricing', 'auction tone and dealer absorption'],
    least_valuable_use: 'Generic equity/business commentary without Treasury transmission.',
    deployment_windows: ['pre-data', 'post-data', 'post-auction', 'post Fed/fiscal shift'],
    shared_block_map: sharedBlocks
  },
  channels: ['Fed-path repricing', 'inflation-growth decomposition', 'curve context', 'auctions'],
  channelKeywords: ['fed', 'yield', 'auction', 'inflation', 'curve', 'issuance', 'treasury'],
  pricingModes: [PricingAssessment.UNDERPRICED, PricingAssessment.ALREADY_PRICED, PricingAssessment.MIXED, PricingAssessment.STALE],
  invalidation_markers: ['Yield rejection contradicts narrative', 'Curve behavior implies different mechanism', 'Auction failure contradicts thesis'],
  activeHours: {
    structural_windows: ['US cash session'],
    event_windows: ['8:30 AM ET data', '10:00 AM ET data', 'auction windows']
  },
  selectVerdict: (analysis) => (analysis.core_claim.toLowerCase().includes('slower pace') ? Verdict.BULLISH : Verdict.MIXED),
  choosePricing: choosePricingFromNovelty,
  chooseExpressionVehicle: () => 'ZN outright or curve expression where applicable',
  driverHierarchy: () => ['Fed-path repricing', 'inflation-growth decomposition', 'term premium', 'curve/supply context']
};
