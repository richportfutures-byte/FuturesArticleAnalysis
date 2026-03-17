import type { ChangeEvent } from 'react';
import { DiscoverySummary } from '../domain/entities';
import { ContractId } from '../domain/enums';

type Props = {
  contractId: ContractId;
  recencyWindowHours: number;
  setRecencyWindowHours: (value: number) => void;
  discovery: DiscoverySummary | null;
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

export const DiscoveryPanel = ({
  contractId,
  recencyWindowHours,
  setRecencyWindowHours,
  discovery,
  loading,
  selectedCandidateIds,
  onToggleCandidate,
  onDiscover,
  onImportSelected,
  onClearSelection,
  importedSummary
}: Props) => (
  <section className="section-copy">
    <h2>Recent Discovery</h2>
    <p>On-demand only. Discovery proposes recent source-grounded candidates for review. It does not auto-select or auto-analyze them.</p>

    <div className="form-grid">
      <div className="input-row">
        <label>
          Contract
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
          {loading ? 'Discovering...' : 'Discover recent candidates'}
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
        {discovery ? <span className="pill">{discovery.status}</span> : null}
        {discovery ? <span className="pill">{discovery.provider_id}</span> : null}
      </div>
    </div>

    {discovery?.issues.length ? (
      <ul>
        {discovery.issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    ) : null}

    {discovery?.query_presets.length ? (
      <div className="tag-list">
        {discovery.query_presets.map((preset) => (
          <span key={preset.preset_id} className="tag">
            {preset.label}
          </span>
        ))}
      </div>
    ) : null}

    {!discovery ? (
      <p className="muted">No discovery run yet.</p>
    ) : null}

    {discovery?.candidates.length ? (
      <>
        {Object.entries(bucketLabels).map(([bucket, label]) => {
          const entries = discovery.candidates.filter((candidate) => candidate.review_bucket === bucket);
          if (entries.length === 0) return null;

          return (
            <div key={bucket}>
              <h3>{label}</h3>
              {entries.map((candidate) => (
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
              ))}
            </div>
          );
        })}
      </>
    ) : null}
  </section>
);
