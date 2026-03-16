import { ContractOverride, buildTrace } from '../domain/contracts/types';
import { DeploymentUse, PricingAssessment, Verdict } from '../domain/enums';

export const runDeploy = (override: ContractOverride, verdict: Verdict, pricing: PricingAssessment) => {
  let deploymentUse = DeploymentUse.WAIT_FOR_CONFIRMATION;

  if (verdict === Verdict.NO_EDGE) {
    deploymentUse = DeploymentUse.NO_TRADE;
  } else if (pricing === PricingAssessment.UNDERPRICED && verdict !== Verdict.MIXED) {
    deploymentUse = DeploymentUse.CONTINUATION_BIAS;
  } else if (
    pricing === PricingAssessment.ALREADY_PRICED ||
    pricing === PricingAssessment.CONSENSUS ||
    pricing === PricingAssessment.STALE
  ) {
    deploymentUse = DeploymentUse.FADE_CANDIDATE;
  } else if (pricing === PricingAssessment.IMPOSSIBLE_TO_ASSESS) {
    deploymentUse = DeploymentUse.NO_TRADE;
  }

  const trace = [
    buildTrace(
      'deploy',
      override.ruleRefs.deployment,
      `Deployment use ${deploymentUse} derived from verdict ${verdict} and pricing ${pricing}.`,
      true
    )
  ];

  return { deploymentUse, trace };
};
