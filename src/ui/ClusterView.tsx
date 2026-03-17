import { NarrativeCluster } from '../domain/entities';

export const ClusterView = ({ cluster }: { cluster: NarrativeCluster | null }) => (
  <section className="section-copy">
    <h3>Narrative Cluster</h3>
    {!cluster ? (
      <p className="muted">No cluster available.</p>
    ) : (
      <>
        <div className="pill-row">
          <span className="pill accent">{cluster.cluster_mode}</span>
          <span className="pill">{cluster.tradability_class}</span>
          <span className="pill">Newness {cluster.newness_confidence.toFixed(2)}</span>
        </div>
        <p>
          <strong>Theme:</strong> {cluster.theme}
        </p>
        <p>{cluster.dominant_narrative}</p>
        <p>
          <strong>Strongest source:</strong> {cluster.strongest_source_article_id ?? 'n/a'}
        </p>
        <p>
          <strong>Common facts:</strong> {cluster.common_facts.join('; ') || 'none'}
        </p>
        <p>
          <strong>Disputed claims:</strong> {cluster.disputed_claims.join('; ') || 'none'}
        </p>
        <div>
          <strong>Source map</strong>
          <ul>
            {cluster.source_map.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      </>
    )}
  </section>
);
