import { ContractOverride, buildTrace, matchChannels } from '../domain/contracts/types';
import { DeepAnalysis, NarrativeCluster, TranslationResult } from '../domain/entities';
import { SourceType, Verdict } from '../domain/enums';
import { computeActionability, computeConfidence } from '../domain/scoring';

export const runTranslate = (
  override: ContractOverride,
  analysis: DeepAnalysis,
  cluster: NarrativeCluster | null,
  sourceTypes: SourceType[]
) => {
  const selectedChannels = matchChannels(analysis.core_claim, override.channelRules);
  const verdict = override.selectVerdict(analysis, selectedChannels);
  const trace = [
    buildTrace(
      'translate',
      override.ruleRefs.translation,
      `Matched translation channels: ${selectedChannels.join(', ') || 'none'} with verdict ${verdict}.`
    )
  ];

  if (selectedChannels.length === 0 || verdict === Verdict.NO_EDGE) {
    trace.push(
      buildTrace(
        'translate',
        override.ruleRefs.translation,
        `Translation failed closed because channel matching or verdict discipline produced no actionable ${override.meta.id} translation.`,
        true
      )
    );
    return { translation: null, trace };
  }

  const pricingAssessment = override.choosePricing(analysis, selectedChannels, verdict);
  trace.push(
    buildTrace(
      'translate',
      override.ruleRefs.pricing,
      `Pricing assessment ${pricingAssessment} assigned from novelty ${analysis.novelty_assessment}.`
    )
  );

  const translation: TranslationResult = {
    contract_id: override.meta.id,
    selected_channels: selectedChannels,
    primary_driver_hierarchy: override.driverHierarchy(analysis, selectedChannels),
    best_expression_vehicle: override.chooseExpressionVehicle(cluster, sourceTypes[0] ?? SourceType.UNKNOWN, selectedChannels),
    pricing_assessment: pricingAssessment,
    horizon_split: override.horizonTemplate,
    confirmation_markers: override.meta.confirmation_markers,
    invalidation_markers: override.invalidation_markers,
    verdict,
    confidence_score: computeConfidence(sourceTypes, analysis),
    actionability_score: computeActionability(analysis, selectedChannels.length > 0),
    trade_use_note: override.tradeUseNote
  };

  return { translation, trace };
};
