import { ProvenanceRecord } from './entities';

export const baseProvenance = (): ProvenanceRecord => ({
  source_files: [
    '00_SOURCE_INVENTORY.md',
    '01_PRODUCT_SPEC.md',
    '02_STATE_MACHINE_SPEC.md',
    '03_RULES_SCHEMA.md',
    '04_CONTRACT_MODULES.md',
    '05_UI_AND_FILE_TREE.md',
    '06_SEED_FIXTURES.json',
    '07_ACCEPTANCE_CHECKLIST.md'
  ],
  rule_ids: [],
  contract_override_ids: [],
  notes: ['All five contracts treated as implementation-grade in this pack; CL is dedicated package, others block-level.']
});
