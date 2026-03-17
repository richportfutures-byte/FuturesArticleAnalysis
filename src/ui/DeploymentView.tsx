import { BiasBrief } from '../domain/entities';
import { DeploymentUse } from '../domain/enums';

export const DeploymentView = ({
  biasBrief,
  deploymentUse,
  terminalOutcome
}: {
  biasBrief: BiasBrief | null;
  deploymentUse: DeploymentUse;
  terminalOutcome?: 'irrelevant' | 'noise' | 'insufficient_evidence' | 'no_edge';
}) => (
  <section className="section-copy">
    <h3>Bias Brief</h3>
    <div className="pill-row">
      <span className="pill accent">Posture: {deploymentUse}</span>
      {terminalOutcome ? <span className="pill">Terminal outcome: {terminalOutcome}</span> : null}
    </div>
    {!biasBrief ? (
      <p className="muted">No bounded brief generated.</p>
    ) : (
      <>
        <p>
          <strong>{biasBrief.title}</strong>
        </p>
        <p>{biasBrief.executive_summary}</p>
        <p className="prose">{biasBrief.prose}</p>
        <p>
          <strong>Contract implications:</strong> {biasBrief.contract_implications.join(' ')}
        </p>
        <p>
          <strong>Alternative interpretation:</strong> {biasBrief.alternative_interpretation}
        </p>
        <p>
          <strong>Confirmation watchlist:</strong> {biasBrief.confirmation_watchlist.join(', ') || 'none'}
        </p>
        <p>
          <strong>Invalidation watchlist:</strong> {biasBrief.invalidation_watchlist.join(', ') || 'none'}
        </p>
        <p>
          <strong>Bounded use:</strong> {biasBrief.bounded_use}
        </p>
        <p>
          <strong>Source grounding:</strong> {biasBrief.source_grounding_note}
        </p>
      </>
    )}
  </section>
);
