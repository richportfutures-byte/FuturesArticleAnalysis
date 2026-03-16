import { ProvenanceRecord, RuleTrace } from './entities';

export const baseProvenance = (): ProvenanceRecord => ({
  source_files: [
    'master_deployment_guide_by_contract.docx',
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
  notes: ['All five contracts treated as implementation-grade in this pack; CL is dedicated package, others block-level.'],
  rule_trace: []
});

export const appendRuleTrace = (provenance: ProvenanceRecord, entries: RuleTrace[]): ProvenanceRecord => {
  entries.forEach((entry) => {
    provenance.rule_trace.push(entry);
    if (!provenance.rule_ids.includes(entry.rule_id)) {
      provenance.rule_ids.push(entry.rule_id);
    }
    entry.source_files.forEach((sourceFile) => {
      if (!provenance.source_files.includes(sourceFile)) {
        provenance.source_files.push(sourceFile);
      }
    });
  });

  return provenance;
};
