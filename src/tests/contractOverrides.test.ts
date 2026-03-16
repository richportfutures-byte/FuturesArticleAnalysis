import { describe, expect, it } from 'vitest';
import { contractOverrides } from '../domain/contracts';
import { ContractId } from '../domain/enums';

describe('contract overrides', () => {
  it('has explicit modules for all five contracts', () => {
    expect(Object.keys(contractOverrides).sort()).toEqual(Object.values(ContractId).sort());
  });

  it('carries canonical source references and rule refs for each contract', () => {
    Object.values(contractOverrides).forEach((override) => {
      expect(override.source_files.length).toBeGreaterThan(0);
      expect(override.ruleRefs.translation.rule_id).toBeTruthy();
      expect(override.ruleRefs.deployment.rule_id).toBeTruthy();
      expect(override.channelRules.length).toBeGreaterThan(0);
    });
  });
});
