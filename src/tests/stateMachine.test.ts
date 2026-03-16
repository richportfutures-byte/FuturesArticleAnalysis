import { describe, expect, it } from 'vitest';
import { assertTransition } from '../engine/stateMachine';
import { WorkflowState } from '../domain/enums';

describe('state machine', () => {
  it('enforces ordered transitions', () => {
    expect(() => assertTransition(WorkflowState.DRAFT, WorkflowState.INTAKE)).not.toThrow();
    expect(() => assertTransition(WorkflowState.DRAFT, WorkflowState.SCREEN)).toThrow();
  });
});
