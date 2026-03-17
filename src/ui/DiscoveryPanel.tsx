import { useState, type ChangeEvent } from 'react';
import { CrossContractScanSummary, DiscoveryCandidate, DiscoverySummary, EventCluster } from '../domain/entities';
import { ContractId } from '../domain/enums';

type DiscoveryMode = 'morning_coverage' | 'contract_specific';

type Props = {
  contractId: ContractId;
  discoveryMode: DiscoveryMode;
  setDiscoveryMode: (value: DiscoveryMode) => void;
  recencyWindowHours: number;
  setRecencyWindowHours: (value: number) => void;
  discovery: DiscoverySummary | null;
  morningCoverage: CrossContractScanSummary | null;
  loading: boolean;
  selectedCandidateIds: string[];
  onToggleCandidate: (candidateId: string) => void;
  onDiscover: () => void;
  onImportSelected: () => void;
  onClearSelection: () => void;
  importedSummary: string | null;
};

const bucketLabels: Record<NonNullable<DiscoverySummary>['candidates'][number]['review_bucket'], string> = {
  high_confidence: 'High-confidence candidates',
  secondary: 'Secondary candidates',
  low_authority_or_noise: 'Low-authority / commentary / likely noise'
};

const renderCandidateCard = (
  candidate: DiscoveryCandidate,
  selectedCandidateIds: string[],
  onToggleCandidate: (candidateId: string) => void
) => (
  <div key={candidate.id} className="candidate-card">
    <div className="candidate-header">
      <label className="candidate-check">
        <input
          type="checkbox"
          checked={selectedCandidateIds.includes(candidate.id)}
          onChange={() => onToggleCandidate(candidate.id)}
        />
        <span>{candidate.title}</span>
      </label>
      <span className="pill">{candidate.total_rank_score.toFixed(2)}</span>
    </div>
    <p className="muted">
      {candidate.source_name} | {candidate.authority_tier} | {candidate.directness} | {candidate.source_completeness}
      {candidate.published_at ? ` | ${candidate.published_at}` : ''}
    </p>
    <p>{candidate.snippet}</p>
    <div className="pill-row">
      <span className="pill">cluster: {candidate.cluster_suggestion}</span>
      <span className="pill">dup: {candidate.duplication_cluster_id}</span>
      <span className="pill">freshness {candidate.freshness_score.toFixed(2)}</span>
      <span className="pill">authority {candidate.authority_score.toFixed(2)}</span>
      <span className="pill">theme {candidate.contract_theme_score.toFixed(2)}</span>
    </div>
    {candidate.contract_relevance_candidates.length > 0 ? (
      <div className="tag-list">
        {candidate.contract_relevance_candidates.map((entry) => (
          <span key={`${candidate.id}-${entry.contract_id}`} className="tag">
            {entry.contract_id}: {entry.fit}
          </span>
        ))}
      </div>
    ) : null}
  </div>
);

const renderClusterCard = (
  cluster: EventCluster,
  candidates: DiscoveryCandidate[],
  expanded: boolean,
  onToggleExpanded: () => void,
  selectedCandidateIds: string[],
  onToggleCandidate: (candidateId: string) => void
) => {
  const clusterCandidates = cluster.member_candidate_ids
    .map((candidateId) => candidates.find((candidate) => candidate.id === candidateId))
    .filter((candidate): candidate is DiscoveryCandidate => Boolean(candidate));
  const highConfidenceCount = clusterCandidates.filter((candidate) => candidate.review_bucket === 'high_confidence').length;

  return (
    <div key={cluster.cluster_id} className="cluster-card">
      <div className="candidate-header">
        <div>
          <h3>{cluster.label}</h3>
          <p>{cluster.description}</p>
        </div>
        <span className="pill">{highConfidenceCount} high-confidence</span>
      </div>

      <div className="pill-row">
        <span className="pill accent">Primary: {cluster.primary_contracts.join(', ') || 'none'}</span>
        <span className="pill">Secondary: {cluster.secondary_contracts.join(', ') || 'none'}</span>
        <span className="pill">{cluster.refinement_status}</span>
      </div>

      <p className="muted">
        {cluster.freshness_summary} | {cluster.source_quality_summary}
      </p>

      {cluster.provenance_notes.length > 0 ? <p className="muted">{cluster.provenance_notes[0]}</p> : null}

      <div className="button-row">
        <button type="button" className="secondary" onClick={onToggleExpanded}>
          {expanded ? 'Hide members' : `Inspect members (${cluster.candidate_count})`}
        </button>
      </div>

      {expanded ? (
        <div className="cluster-members">
          {clusterCandidates.map((candidate) => renderCandidateCard(candidate, selectedCandidateIds, onToggleCandidate))}
        </div>
      ) : null}
    </div>
  );
};

export const DiscoveryPanel = ({
  contractId,
  discoveryMode,
  setDiscoveryMode,
  recencyWindowHours,
  setRecencyWindowHours,
  discovery,
  morningCoverage,
  loading,
  selectedCandidateIds,
  onToggleCandidate,
  onDiscover,
  onImportSelected,
  onClearSelection,
  importedSummary
}: Props) => {
  const [expandedClusterIds, setExpandedClusterIds] = useState<string[]>([]);
  const activeSummary = discoveryMode === 'morning_coverage' ? morningCoverage : discovery;

  return (
    <section className="section-copy">
      <h2>Recent Discovery</h2>
      <p>
        On-demand only. Discovery proposes recent source-grounded candidates for review. It does not auto-select, auto-import,
        or auto-analyze anything.
      </p>

      <div className="mode-toggle">
        <button
          type="button"
          className={discoveryMode === 'morning_coverage' ? 'mode-button active' : 'mode-button'}
          onClick={() => setDiscoveryMode('morning_coverage')}
        >
          Morning Coverage Scan
        </button>
        <button
          type="button"
          className={discoveryMode === 'contract_specific' ? 'mode-button active' : 'mode-button'}
          onClick={() => setDiscoveryMode('contract_specific')}
        >
          Contract-Specific Search
        </button>
      </div>

      <div className="form-grid">
        <div className="input-row">
          <label>
            Import target contract
            <span className="pill accent">{contractId}</span>
          </label>

          <label>
            Recency window (hours)
            <input
              type="number"
              min={6}
              max={168}
              value={recencyWindowHours}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setRecencyWindowHours(Number(event.target.value) || 72)}
            />
          </label>
        </div>

        <div className="button-row">
          <button type="button" onClick={onDiscover} disabled={loading}>
            {loading
              ? 'Discovering...'
              : discoveryMode === 'morning_coverage'
                ? 'Run morning coverage scan'
                : 'Discover recent candidates'}
          </button>
          <button type="button" className="secondary" onClick={onImportSelected} disabled={selectedCandidateIds.length === 0}>
            Import selected into intake
          </button>
          <button type="button" className="secondary" onClick={onClearSelection} disabled={selectedCandidateIds.length === 0}>
            Clear selection
          </button>
        </div>

        <div className="pill-row">
          <span className="pill">{recencyWindowHours}h window</span>
          <span className="pill">{selectedCandidateIds.length} selected</span>
          {importedSummary ? <span className="pill accent">{importedSummary}</span> : null}
          {activeSummary ? <span className="pill">{activeSummary.status}</span> : null}
          {activeSummary ? <span className="pill">{activeSummary.provider_id}</span> : null}
        </div>
      </div>

      {activeSummary?.issues.length ? (
        <ul>
          {activeSummary.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {discoveryMode === 'morning_coverage' ? (
        <>
          <p className="muted">
            Cluster-first triage across NQ, ZN, GC, 6E, and CL. Import remains explicit and still runs through the current intake
            contract you select below.
          </p>

          {!morningCoverage ? <p className="muted">No morning coverage scan yet.</p> : null}

          {morningCoverage?.clusters.length ? (
            <div className="cluster-list">
              {morningCoverage.clusters.map((cluster) =>
                renderClusterCard(
                  cluster,
                  morningCoverage.candidates,
                  expandedClusterIds.includes(cluster.cluster_id),
                  () =>
                    setExpandedClusterIds((current) =>
                      current.includes(cluster.cluster_id)
                        ? current.filter((clusterId) => clusterId !== cluster.cluster_id)
                        : [...current, cluster.cluster_id]
                    ),
                  selectedCandidateIds,
                  onToggleCandidate
                )
              )}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {discovery?.query_presets.length ? (
            <div className="tag-list">
              {discovery.query_presets.map((preset) => (
                <span key={preset.preset_id} className="tag">
                  {preset.label}
                </span>
              ))}
            </div>
          ) : null}

          {!discovery ? <p className="muted">No discovery run yet.</p> : null}

          {discovery?.candidates.length ? (
            <>
              {Object.entries(bucketLabels).map(([bucket, label]) => {
                const entries = discovery.candidates.filter((candidate) => candidate.review_bucket === bucket);
                if (entries.length === 0) return null;

                return (
                  <div key={bucket}>
                    <h3>{label}</h3>
                    {entries.map((candidate) => renderCandidateCard(candidate, selectedCandidateIds, onToggleCandidate))}
                  </div>
                );
              })}
            </>
          ) : null}
        </>
      )}
    </section>
  );
};
