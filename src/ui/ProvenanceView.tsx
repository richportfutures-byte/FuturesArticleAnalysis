import { ProvenanceRecord } from '../domain/entities';

export const ProvenanceView = ({ provenance }: { provenance: ProvenanceRecord | null }) => (
  <section className="section-copy">
    <h3>Provenance</h3>
    {!provenance ? (
      <p className="muted">No provenance available.</p>
    ) : (
      <>
        <div className="pill-row">
          <span className="pill accent">{provenance.contract_override_ids.join(', ')}</span>
          <span className="pill">{provenance.rule_ids.length} rule refs</span>
          <span className="pill">{provenance.source_files.length} source files</span>
          {provenance.intake_mode ? <span className="pill">intake: {provenance.intake_mode}</span> : null}
          {provenance.intake_status ? <span className="pill">status: {provenance.intake_status}</span> : null}
        </div>
        {provenance.intake_sources && provenance.intake_sources.length > 0 ? (
          <div>
            <strong>Intake sources</strong>
            <ul>
              {provenance.intake_sources.map((entry) => (
                <li key={entry.article_id}>
                  <span className="mono">{entry.article_id}</span> | {entry.headline || 'untitled'} | {entry.source_origin} |{' '}
                  {entry.source_completeness}
                  {entry.url ? ` | ${entry.url}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <strong>Source files</strong>
          <ul>
            {provenance.source_files.map((sourceFile) => (
              <li key={sourceFile} className="mono">
                {sourceFile}
              </li>
            ))}
          </ul>
        </div>
        {provenance.notes.length > 0 ? (
          <div>
            <strong>Notes</strong>
            <ul>
              {provenance.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <strong>Rule trace</strong>
          <ul>
            {provenance.rule_trace.map((entry, index) => (
              <li key={`${entry.rule_id}-${index}`}>
                <span className="mono">{entry.stage}</span> | <span className="mono">{entry.rule_id}</span> | {entry.detail}
              </li>
            ))}
          </ul>
        </div>
      </>
    )}
  </section>
);
