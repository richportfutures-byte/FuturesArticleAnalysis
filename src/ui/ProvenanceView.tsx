import { ProvenanceRecord } from '../domain/entities';

export const ProvenanceView = ({ provenance }: { provenance: ProvenanceRecord | null }) => (
  <section>
    <h3>Provenance View</h3>
    {!provenance ? <p>No provenance.</p> : <>
      <p>Source files: {provenance.source_files.join(', ')}</p>
      <p>Rule IDs: {provenance.rule_ids.join(', ')}</p>
      <p>Override IDs: {provenance.contract_override_ids.join(', ')}</p>
      <ul>
        {provenance.rule_trace.map((entry, index) => (
          <li key={`${entry.rule_id}-${index}`}>
            {entry.stage}: {entry.rule_id} - {entry.detail}
          </li>
        ))}
      </ul>
    </>}
  </section>
);
