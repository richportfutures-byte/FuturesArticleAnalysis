import { DeepAnalysis } from '../domain/entities';

export const AnalysisView = ({ analysis }: { analysis: DeepAnalysis | null }) => (
  <section>
    <h3>Analysis View</h3>
    {!analysis ? <p>No analysis.</p> : <>
      <p>Core claim: {analysis.core_claim}</p>
      <p>New facts: {analysis.confirmed_facts.join('; ') || 'none'}</p>
      <p>Competing interpretation: {analysis.competing_interpretation}</p>
    </>}
  </section>
);
