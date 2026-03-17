import { ProvenanceRecord, RuleTrace } from './entities';

export const baseProvenance = (): ProvenanceRecord => ({
  source_files: [
    'docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx',
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
  notes: ['All five contracts are treated as implementation-grade sources under docs/source_of_truth; CL uses the current block-level folder.'],
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
