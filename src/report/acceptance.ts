export const acceptanceReport = {
  design_complete: [
    'Deterministic stage-based workflow and state machine designed from Codex spec pack',
    'Typed domain model with explicit enums/entities and bounded deployment outputs',
    'Contract override separation planned for NQ, ZN, GC, 6E, and CL',
    'Provenance-aware outputs and fixture/test strategy defined'
  ],
  implementation_complete: [
    'State machine and staged pipeline implemented with fail-closed transitions',
    'Contract override modules implemented for all five contracts',
    'UI scaffold implemented for intake, screening, cluster, analysis, translation, deployment, pre-trade, post-reaction, and provenance',
    'Tests implemented for state machine, overrides, terminal outcomes, translation shape, and fixture acceptance coverage',
    'Install/build/test configuration hardened (Vite, Vitest, TypeScript, CI workflow)'
  ],
  runtime_verified: {
    local_sandbox: {
      status: 'blocked_by_environment',
      reason: 'Sandbox registry restrictions prevented successful dependency installation, so runtime verification could not complete in-sandbox.'
    },
    ci_ready: {
      status: 'ready',
      reason: 'Repository now includes complete npm/Vite/Vitest/TypeScript configuration and GitHub Actions CI steps for install, test, and build.'
    }
  }
};
