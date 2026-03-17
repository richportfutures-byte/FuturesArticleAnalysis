import { TranslationResult } from '../domain/entities';

export const TranslationView = ({ translation }: { translation: TranslationResult | null }) => (
  <section className="section-copy">
    <h3>Doctrine Evaluation</h3>
    {!translation ? (
      <p className="muted">No doctrine evaluation yet.</p>
    ) : (
      <>
        <div className="pill-row">
          <span className="pill accent">Fit: {translation.doctrine_fit}</span>
          <span className="pill">Verdict: {translation.verdict}</span>
          <span className="pill">Pricing: {translation.pricing_assessment}</span>
          <span className="pill">Actionability: {translation.actionability_score.toFixed(2)}</span>
        </div>
        <p>{translation.doctrine_alignment_summary}</p>
        <p>
          <strong>Matched drivers:</strong> {translation.matched_drivers.join(', ') || 'none'}
        </p>
        <p>
          <strong>Driver hierarchy:</strong> {translation.primary_driver_hierarchy.join(' > ') || 'none'}
        </p>
        <p>
          <strong>Contract implications:</strong> {translation.contract_implications.join(' ')}
        </p>
        <p>
          <strong>Expression lens:</strong> {translation.best_expression_vehicle}
        </p>
        <p>
          <strong>Deployment windows:</strong> {translation.deployment_windows.join(' | ')}
        </p>
        <p>
          <strong>Least valuable use:</strong> {translation.least_valuable_use}
        </p>
      </>
    )}
  </section>
);
