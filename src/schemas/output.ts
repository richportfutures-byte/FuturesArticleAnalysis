import { z } from 'zod';
import { DeploymentUse, SourceSurvival, WorkflowState } from '../domain/enums';

export const RunOutputSchema = z.object({
  run_id: z.string(),
  state: z.nativeEnum(WorkflowState),
  screen_result: z.nativeEnum(SourceSurvival),
  deployment_use: z.nativeEnum(DeploymentUse)
});
