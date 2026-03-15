import { WorkflowState } from '../domain/enums';

const transitions: Record<WorkflowState, WorkflowState[]> = {
  [WorkflowState.DRAFT]: [WorkflowState.INTAKE],
  [WorkflowState.INTAKE]: [WorkflowState.SCREEN, WorkflowState.ERROR],
  [WorkflowState.SCREEN]: [WorkflowState.CLUSTER, WorkflowState.COMPLETED, WorkflowState.ERROR],
  [WorkflowState.CLUSTER]: [WorkflowState.ANALYZE, WorkflowState.COMPLETED, WorkflowState.ERROR],
  [WorkflowState.ANALYZE]: [WorkflowState.TRANSLATE, WorkflowState.COMPLETED, WorkflowState.ERROR],
  [WorkflowState.TRANSLATE]: [WorkflowState.DEPLOY, WorkflowState.COMPLETED, WorkflowState.ERROR],
  [WorkflowState.DEPLOY]: [WorkflowState.PRE_TRADE_REVIEW, WorkflowState.COMPLETED, WorkflowState.ERROR],
  [WorkflowState.PRE_TRADE_REVIEW]: [WorkflowState.COMPLETED, WorkflowState.ERROR],
  [WorkflowState.POST_REACTION_REVIEW]: [WorkflowState.COMPLETED, WorkflowState.ERROR],
  [WorkflowState.COMPLETED]: [],
  [WorkflowState.ERROR]: []
};

export const assertTransition = (from: WorkflowState, to: WorkflowState): void => {
  if (!transitions[from].includes(to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
};
