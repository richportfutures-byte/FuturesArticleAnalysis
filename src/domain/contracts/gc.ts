import { ContractId, PricingAssessment } from '../enums';
import { ContractOverride, chooseNoveltyVerdict, sharedBlocks } from './types';

export const gcOverride: ContractOverride = {
  override_id: 'GC_OVERRIDE_V1',
  meta: {
    id: ContractId.GC,
    name: 'Gold Futures',
    primary_objective: 'Rank dominant GC drivers and avoid vague safe-haven storytelling.',
    core_transmission_focus: ['real yields', 'US dollar', 'central-bank demand', 'geopolitics', 'inflation expectations', 'liquidity stress'],
    confirmation_markers: ['real yields vs nominal yields', 'DXY confirmation/contradiction', 'Treasury reaction', 'spot gold behavior'],
    least_valuable_use: 'Safe-haven storytelling without cross-asset confirmation.',
    deployment_windows: ['pre-event', 'post-headline', 'before chasing'],
    shared_block_map: sharedBlocks
  },
  channels: ['real yields', 'dollar', 'central-bank demand', 'geopolitics', 'liquidity stress'],
  channelKeywords: ['gold', 'dxy', 'yield', 'geopolitical', 'central bank', 'inflation', 'risk'],
  pricingModes: [PricingAssessment.UNDERPRICED, PricingAssessment.CONSENSUS, PricingAssessment.STALE, PricingAssessment.IMPOSSIBLE_TO_ASSESS],
  invalidation_markers: ['Cross-asset markers fail to confirm', 'GC accepts opposite direction', 'Mechanism absent and move technical'],
  activeHours: {
    structural_windows: ['3:00 AM to 8:00 AM ET Europe', '8:00 AM to 12:00 PM ET overlap', '8:20 AM ET COMEX open', '1:30 PM ET COMEX settlement'],
    event_windows: ['8:30 AM ET US data', '2:00 PM to 2:30 PM ET FOMC', 'unscheduled geopolitical/systemic shocks']
  },
  selectVerdict: chooseNoveltyVerdict,
  choosePricing: (analysis) =>
    analysis.novelty_assessment === 'recycled_background' ? PricingAssessment.STALE : PricingAssessment.MIXED,
  chooseExpressionVehicle: () => 'GC futures / XAUUSD with cross-asset confirmation',
  driverHierarchy: () => ['real yields', 'US dollar', 'central-bank demand', 'geopolitics', 'liquidity stress', 'inflation expectations']
};
