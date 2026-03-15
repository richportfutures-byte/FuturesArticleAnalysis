import { describe, expect, it } from 'vitest';
import { contractOverrides } from '../domain/contracts';
import { ContractId } from '../domain/enums';

describe('contract overrides', () => {
  it('has explicit modules for all five contracts', () => {
    expect(Object.keys(contractOverrides).sort()).toEqual(Object.values(ContractId).sort());
  });
});
