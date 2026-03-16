import { ContractOverride } from '../domain/contracts/types';
import { DeepAnalysis, NarrativeCluster, TranslationResult } from '../domain/entities';
import { HorizonBucket, Verdict } from '../domain/enums';
import { computeActionability, computeConfidence } from '../domain/scoring';

export const runTranslate = (
  override: ContractOverride,
  analysis: DeepAnalysis,
  cluster: NarrativeCluster | null,
  sourceTypes: Array<any>
): TranslationResult => {
  const claim = analysis.core_claim.toLowerCase();
  const matchingChannels = override.channels.filter((channel) =>
    channel
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((fragment) => fragment.length > 2)
      .some((fragment) => claim.includes(fragment))
  );
  const selected_channels =
    matchingChannels.length > 0
      ? matchingChannels
      : override.channelKeywords.filter((keyword) => claim.includes(keyword.toLowerCase()));
  const verdict = override.selectVerdict(analysis);
  if (selected_channels.length === 0 || verdict === Verdict.NO_EDGE) {
    throw new Error('no_edge_translation');
  }

  return {
    contract_id: override.meta.id,
    selected_channels,
    primary_driver_hierarchy: override.driverHierarchy(analysis),
    best_expression_vehicle: override.chooseExpressionVehicle(cluster, sourceTypes[0]),
    pricing_assessment: override.choosePricing(analysis),
    horizon_split: [
      { bucket: HorizonBucket.SAME_SESSION_CONTINUATION, note: 'Monitor immediate confirmation windows.' },
      { bucket: HorizonBucket.ONE_TO_THREE_DAY_SWING, note: 'Retain only if confirmations persist.' }
    ],
    confirmation_markers: override.meta.confirmation_markers,
    invalidation_markers: override.invalidation_markers,
    verdict,
    confidence_score: computeConfidence(sourceTypes, analysis),
    actionability_score: computeActionability(analysis, true),
    trade_use_note:
      'Bounded output: shape bias and setup preference only (continuation/fade/wait/ignore/no trade); never exact entry, stop, or sizing.'
  };
};
