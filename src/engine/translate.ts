import { ContractOverride, buildTrace } from '../domain/contracts/types';
import { DeepAnalysis, NarrativeCluster, TranslationResult } from '../domain/entities';
import {
  CausalCoherenceAssessment,
  DoctrineFit,
  PricingAssessment,
  PricedInAssessment,
  SourceType,
  Verdict
} from '../domain/enums';
import { computeActionability, computeConfidence } from '../domain/scoring';

const bannedExecutionPatterns = [
  /\bexact entry\b/gi,
  /\bexact stop\b/gi,
  /\bexact size\b/gi,
  /\bplace order\b/gi,
  /\bexecute automatically\b/gi,
  /\bautonomous execution\b/gi
];

const sanitizeBoundedText = (input: string): string => {
  let output = input;
  bannedExecutionPatterns.forEach((pattern) => {
    output = output.replace(pattern, 'bounded use');
  });
  return output;
};

const mapDoctrineAssessmentToPricing = (pricedInAssessment: PricedInAssessment): PricingAssessment => {
  switch (pricedInAssessment) {
    case PricedInAssessment.UNDERAPPRECIATED:
      return PricingAssessment.UNDERPRICED;
    case PricedInAssessment.PRICED_IN:
      return PricingAssessment.ALREADY_PRICED;
    case PricedInAssessment.PARTIALLY_PRICED:
      return PricingAssessment.MIXED;
    case PricedInAssessment.STALE:
      return PricingAssessment.STALE;
    default:
      return PricingAssessment.IMPOSSIBLE_TO_ASSESS;
  }
};

const mapPricingToDoctrineAssessment = (pricingAssessment: PricingAssessment): PricedInAssessment => {
  switch (pricingAssessment) {
    case PricingAssessment.UNDERPRICED:
      return PricedInAssessment.UNDERAPPRECIATED;
    case PricingAssessment.ALREADY_PRICED:
    case PricingAssessment.CONSENSUS:
      return PricedInAssessment.PRICED_IN;
    case PricingAssessment.MIXED:
      return PricedInAssessment.PARTIALLY_PRICED;
    case PricingAssessment.STALE:
      return PricedInAssessment.STALE;
    default:
      return PricedInAssessment.UNCLEAR;
  }
};

const extractContractRelevance = (override: ContractOverride, analysis: DeepAnalysis) =>
  analysis.candidate_contract_relevance.find((candidate) => candidate.contract_id === override.meta.id);

const deriveDoctrineFit = (
  analysis: DeepAnalysis,
  matchedDrivers: string[],
  relevanceFit?: 'primary' | 'secondary' | 'low'
): DoctrineFit => {
  if (matchedDrivers.length === 0) return DoctrineFit.NONE;

  if (
    relevanceFit === 'primary' &&
    analysis.causal_coherence_assessment === CausalCoherenceAssessment.COHERENT &&
    analysis.confirmed_facts.length > 0
  ) {
    return DoctrineFit.STRONG;
  }

  if (
    relevanceFit === 'primary' ||
    relevanceFit === 'secondary' ||
    analysis.causal_coherence_assessment === CausalCoherenceAssessment.MIXED ||
    analysis.causal_coherence_assessment === CausalCoherenceAssessment.FRAGILE
  ) {
    return DoctrineFit.PARTIAL;
  }

  return DoctrineFit.WEAK;
};

const deriveVerdict = (analysis: DeepAnalysis, doctrineFit: DoctrineFit, matchedDrivers: string[]): Verdict => {
  if (
    matchedDrivers.length === 0 ||
    doctrineFit === DoctrineFit.NONE ||
    analysis.confirmed_facts.length === 0 ||
    analysis.causal_coherence_assessment === CausalCoherenceAssessment.UNSUPPORTED
  ) {
    return Verdict.NO_EDGE;
  }

  // Translation should not fabricate directional conviction.
  return Verdict.MIXED;
};

const derivePricingAssessment = (
  analysis: DeepAnalysis,
  matchedDrivers: string[]
): PricingAssessment => {
  if (analysis.priced_in_assessment !== PricedInAssessment.UNCLEAR) {
    return mapDoctrineAssessmentToPricing(analysis.priced_in_assessment);
  }

  return matchedDrivers.length === 0 ? PricingAssessment.IMPOSSIBLE_TO_ASSESS : PricingAssessment.IMPOSSIBLE_TO_ASSESS;
};

const derivePricedInAssessment = (
  analysis: DeepAnalysis,
  pricingAssessment: PricingAssessment
): PricedInAssessment =>
  analysis.priced_in_assessment !== PricedInAssessment.UNCLEAR
    ? analysis.priced_in_assessment
    : mapPricingToDoctrineAssessment(pricingAssessment);

const buildContractImplications = (
  override: ContractOverride,
  verdict: Verdict,
  matchedDrivers: string[],
  bestExpressionVehicle: string
): string[] => {
  const driverSummary = matchedDrivers.length > 0 ? matchedDrivers.join(', ') : 'no durable driver';

  return [
    sanitizeBoundedText(`${override.meta.id} doctrine maps the article through ${driverSummary}.`),
    sanitizeBoundedText(`Current posture is ${verdict}, subject to confirmation and price acceptance.`),
    sanitizeBoundedText(`The cleanest expression remains ${bestExpressionVehicle}.`)
  ];
};

export const runTranslate = (
  override: ContractOverride,
  analysis: DeepAnalysis | null,
  cluster: NarrativeCluster | null,
  sourceTypes: SourceType[]
) => {
  if (!analysis) {
    return {
      translation: null,
      trace: [
        buildTrace(
          'translate',
          override.ruleRefs.translation,
          `Doctrine evaluation skipped because no validated reasoning payload is available for ${override.meta.id}.`,
          false
        )
      ]
    };
  }

  const contractRelevance = extractContractRelevance(override, analysis);
  const matchedDrivers = Array.from(
    new Set((contractRelevance?.matched_focus ?? []).filter((channel) => override.channels.includes(channel)))
  );
  const doctrineFit = deriveDoctrineFit(analysis, matchedDrivers, contractRelevance?.fit);
  const verdict = deriveVerdict(analysis, doctrineFit, matchedDrivers);
  const bestExpressionVehicle = sanitizeBoundedText(
    override.chooseExpressionVehicle(cluster, sourceTypes[0] ?? SourceType.UNKNOWN, matchedDrivers)
  );
  const pricingAssessment = derivePricingAssessment(analysis, matchedDrivers);
  const pricedInAssessment = derivePricedInAssessment(analysis, pricingAssessment);

  const trace = [
    buildTrace(
      'translate',
      override.ruleRefs.translation,
      `Doctrine evaluation matched drivers: ${matchedDrivers.join(', ') || 'none'} with verdict ${verdict} and fit ${doctrineFit}.`
    ),
    buildTrace(
      'translate',
      override.ruleRefs.pricing,
      `Pricing assessment ${pricingAssessment} mapped to ${pricedInAssessment} from validated reasoning output.`
    )
  ];

  const translation: TranslationResult = {
    contract_id: override.meta.id,
    selected_channels: matchedDrivers,
    matched_drivers: matchedDrivers,
    doctrine_fit: doctrineFit,
    doctrine_alignment_summary: sanitizeBoundedText(
      matchedDrivers.length > 0
        ? `${override.meta.id} doctrine fit is ${doctrineFit} because validated reasoning preserved ${matchedDrivers.join(', ')} as contract-relevant drivers.`
        : `${override.meta.id} doctrine fit is ${doctrineFit} because no clean contract transmission survived the validated reasoning packet.`
    ),
    primary_driver_hierarchy: override.formatDriverDisplayOrder(matchedDrivers),
    contract_implications: buildContractImplications(override, verdict, matchedDrivers, bestExpressionVehicle),
    best_expression_vehicle: bestExpressionVehicle,
    pricing_assessment: pricingAssessment,
    priced_in_assessment: pricedInAssessment,
    horizon_split: override.horizonTemplate,
    confirmation_markers: override.meta.confirmation_markers,
    invalidation_markers: override.invalidation_markers,
    verdict,
    confidence_score: computeConfidence(sourceTypes, analysis),
    actionability_score: computeActionability(analysis, doctrineFit),
    trade_use_note: sanitizeBoundedText(override.tradeUseNote),
    bounded_risk_statement: sanitizeBoundedText(
      'Use this evaluation to shape bias, scenario framing, and confirmation discipline only. Do not convert it into exact entry, stop, or size.'
    ),
    deployment_windows: override.meta.deployment_windows,
    least_valuable_use: override.meta.least_valuable_use
  };

  return { translation, trace };
};
