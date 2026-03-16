import { NarrativeCluster } from '../domain/entities';

export const ClusterView = ({ cluster }: { cluster: NarrativeCluster | null }) => (
  <section>
    <h3>Cluster View</h3>
    {!cluster ? <p>No cluster.</p> : <>
      <p>Mode: {cluster.cluster_mode}</p>
      <p>Strongest source: {cluster.strongest_source_article_id ?? 'n/a'}</p>
      <p>Disputed claims: {cluster.disputed_claims.join(', ') || 'none'}</p>
    </>}
  </section>
);
