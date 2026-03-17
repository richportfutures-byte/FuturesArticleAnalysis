import { DeepAnalysis } from '../domain/entities';

const renderList = (label: string, items: string[], empty = 'none') => (
  <div>
    <strong>{label}</strong>
    <ul>
      {(items.length > 0 ? items : [empty]).map((item) => (
        <li key={`${label}-${item}`}>{item}</li>
      ))}
    </ul>
  </div>
);

export const AnalysisView = ({ analysis }: { analysis: DeepAnalysis | null }) => (
  <section className="section-copy">
    <h3>Structured Reasoning</h3>
    {!analysis ? (
      <p className="muted">No reasoning packet generated.</p>
    ) : (
      <>
        <div className="pill-row">
          <span className="pill accent">{analysis.reasoner_mode}</span>
          <span className="pill">Novelty: {analysis.novelty_assessment}</span>
          <span className="pill">Coherence: {analysis.causal_coherence_assessment}</span>
          <span className="pill">Priced-in: {analysis.priced_in_assessment}</span>
        </div>
        <p>
          <strong>Core claim:</strong> {analysis.core_claim}
        </p>
        <p>
          <strong>Alternative interpretation:</strong> {analysis.strongest_alternative_interpretation}
        </p>
        {renderList('Confirmed facts', analysis.confirmed_facts)}
        {renderList('Inferred claims', analysis.inferred_claims)}
        {renderList('Speculative claims', analysis.speculative_claims)}
        {renderList('Rhetorical elements', analysis.rhetorical_elements)}
        {renderList('Causal chain', analysis.causal_chain)}
        {renderList('First-order effects', analysis.first_order_effects)}
        {renderList('Second-order effects', analysis.second_order_effects)}
        {renderList('Confirmation markers', analysis.confirmation_markers)}
        {renderList('Invalidation markers', analysis.invalidation_markers)}
        {renderList('Confidence notes', analysis.confidence_notes)}
        {renderList('Explicit unknowns', analysis.explicit_unknowns)}
      </>
    )}
  </section>
);
