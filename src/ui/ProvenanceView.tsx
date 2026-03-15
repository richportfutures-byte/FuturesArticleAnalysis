import { ProvenanceRecord } from '../domain/entities';

export const ProvenanceView = ({ provenance }: { provenance: ProvenanceRecord | null }) => (
  <section>
    <h3>Provenance View</h3>
    {!provenance ? <p>No provenance.</p> : <>
      <p>Source files: {provenance.source_files.join(', ')}</p>
      <p>Rule IDs: {provenance.rule_ids.join(', ')}</p>
      <p>Override IDs: {provenance.contract_override_ids.join(', ')}</p>
    </>}
  </section>
);
