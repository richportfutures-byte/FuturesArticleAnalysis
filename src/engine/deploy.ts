import { ContractOverride, buildTrace } from '../domain/contracts/types';
import { BiasBrief, DeepAnalysis, TranslationResult } from '../domain/entities';
import { DeploymentUse, DoctrineFit, PricedInAssessment, SourceSurvival, Verdict } from '../domain/enums';

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

const deriveDeploymentUse = (
  screenResult: SourceSurvival,
  translation: TranslationResult,
  analysis: DeepAnalysis
): DeploymentUse => {
  if (screenResult === SourceSurvival.IRRELEVANT) return DeploymentUse.IGNORE;
  if (translation.verdict === Verdict.NO_EDGE || translation.doctrine_fit === DoctrineFit.NONE) return DeploymentUse.NO_TRADE;
  if (translation.priced_in_assessment === PricedInAssessment.UNDERAPPRECIATED && translation.verdict !== Verdict.MIXED) {
    return DeploymentUse.CONTINUATION_BIAS;
  }
  if (translation.priced_in_assessment === PricedInAssessment.STALE) {
    return DeploymentUse.FADE_CANDIDATE;
  }
  if (analysis.causal_coherence_assessment === 'mixed' || analysis.explicit_unknowns.length > 0) {
    return DeploymentUse.WAIT_FOR_CONFIRMATION;
  }
  return translation.doctrine_fit === DoctrineFit.STRONG ? DeploymentUse.WAIT_FOR_CONFIRMATION : DeploymentUse.NO_TRADE;
};

export const runDeploy = (
  override: ContractOverride,
  translation: TranslationResult,
  analysis: DeepAnalysis,
  screenResult: SourceSurvival
) => {
  const deploymentUse = deriveDeploymentUse(screenResult, translation, analysis);
  const driverSummary = translation.matched_drivers.slice(0, 3).join(', ') || 'no durable driver';
  const executiveSummary = sanitizeBoundedText(
    translation.verdict === Verdict.NO_EDGE
      ? `${override.meta.id} does not yet have a durable doctrine-backed edge. The article set can inform context, but it should not change setup preference until a cleaner transmission path appears.`
      : `${override.meta.id} leans ${translation.verdict} through ${driverSummary}. The read is ${translation.priced_in_assessment.replace(/_/g, ' ')} and belongs in the bias-and-confirmation bucket, not the execution bucket.`
  );
  const boundedUse = sanitizeBoundedText(`${translation.trade_use_note} ${translation.bounded_risk_statement}`);
  const sourceGroundingNote = sanitizeBoundedText(
    `Grounded in ${analysis.source_grounding.length} source-grounding item(s) and ${analysis.prompt_context.doctrine_source_files.length} doctrine file reference(s).`
  );
  const prose = sanitizeBoundedText(
    `${executiveSummary} Confirmation should come from ${translation.confirmation_markers.slice(0, 3).join(', ') || 'the contract-native confirmation stack'}. ` +
      `The main alternative interpretation is ${analysis.strongest_alternative_interpretation.toLowerCase()}. ` +
      `${boundedUse}`
  );

  const biasBrief: BiasBrief = {
    title: `${override.meta.id} Bias Brief`,
    executive_summary: executiveSummary,
    contract_implications: translation.contract_implications,
    alternative_interpretation: sanitizeBoundedText(analysis.strongest_alternative_interpretation),
    confirmation_watchlist: translation.confirmation_markers,
    invalidation_watchlist: translation.invalidation_markers,
    posture: deploymentUse,
    source_grounding_note: sourceGroundingNote,
    bounded_use: boundedUse,
    confidence_notes: analysis.confidence_notes,
    explicit_unknowns: analysis.explicit_unknowns,
    prose
  };

  const trace = [
    buildTrace(
      'deploy',
      override.ruleRefs.deployment,
      `Bias brief posture ${deploymentUse} derived from verdict ${translation.verdict}, doctrine fit ${translation.doctrine_fit}, and priced-in assessment ${translation.priced_in_assessment}.`,
      true
    )
  ];

  return { deploymentUse, biasBrief, trace };
};
