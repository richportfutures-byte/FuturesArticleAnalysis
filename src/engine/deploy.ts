import { DeploymentUse, PricingAssessment, Verdict } from '../domain/enums';

export const runDeploy = (verdict: Verdict, pricing: PricingAssessment): DeploymentUse => {
  if (verdict === Verdict.NO_EDGE) return DeploymentUse.NO_TRADE;
  if (pricing === PricingAssessment.UNDERPRICED && verdict !== Verdict.MIXED) return DeploymentUse.CONTINUATION_BIAS;
  if (pricing === PricingAssessment.ALREADY_PRICED || pricing === PricingAssessment.CONSENSUS || pricing === PricingAssessment.STALE) {
    return DeploymentUse.FADE_CANDIDATE;
  }
  if (verdict === Verdict.MIXED) return DeploymentUse.WAIT_FOR_CONFIRMATION;
  return DeploymentUse.WAIT_FOR_CONFIRMATION;
};
