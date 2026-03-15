import { ContractId, PricingAssessment, SourceType, Verdict } from '../enums';
import { ContractOverride, chooseNoveltyVerdict, choosePricingFromNovelty, sharedBlocks } from './types';

export const nqOverride: ContractOverride = {
  override_id: 'NQ_OVERRIDE_V1',
  meta: {
    id: ContractId.NQ,
    name: 'E-mini Nasdaq-100',
    primary_objective: 'Translate articles into NQ-relevant directional bias and leadership implications.',
    core_transmission_focus: ['US rates and real yields', 'megacap tech leadership', 'semiconductors and AI capex', 'risk sentiment', 'earnings and growth expectations'],
    confirmation_markers: ['10Y yields and real-yield direction', 'QQQ and SOX relative strength', 'NVDA/MSFT/AAPL leadership quality', 'breadth and equal-weight behavior', 'cash-open acceptance versus rejection'],
    least_valuable_use: 'Single-article trading in microstructure chop.',
    deployment_windows: ['pre-event', 'post-headline cluster', 'before chasing a large move'],
    shared_block_map: sharedBlocks
  },
  channels: ['yields', 'megacap tech', 'semis', 'risk appetite', 'earnings'],
  channelKeywords: ['yield', 'tech', 'semi', 'ai', 'risk', 'earnings', 'inflation', 'fomc'],
  pricingModes: [PricingAssessment.UNDERPRICED, PricingAssessment.ALREADY_PRICED, PricingAssessment.MIXED, PricingAssessment.IMPOSSIBLE_TO_ASSESS, PricingAssessment.STALE],
  invalidation_markers: ['NQ gains acceptance opposite the narrative', 'Leadership and breadth fail to confirm', 'Move remains technical with no macro transmission'],
  activeHours: {
    structural_windows: ['9:30 AM to 11:00 AM ET cash open', '3:00 PM to 4:00 PM ET close', '3:00 AM to 6:00 AM ET European open'],
    event_windows: ['8:30 AM ET primary US macro', '10:00 AM ET secondary macro', '2:00 PM to 2:30 PM ET FOMC', '4:00 PM to 4:15 PM ET megacap earnings']
  },
  selectVerdict: chooseNoveltyVerdict,
  choosePricing: choosePricingFromNovelty,
  chooseExpressionVehicle: () => 'NQ futures / QQQ leadership proxy',
  driverHierarchy: () => ['US rates and real yields', 'megacap leadership', 'semiconductors and AI capex', 'broad risk sentiment', 'earnings and growth expectations']
};
