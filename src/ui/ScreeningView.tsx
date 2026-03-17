import { ScreeningSummary } from '../domain/entities';

export const ScreeningView = ({ screening }: { screening: ScreeningSummary | null }) => (
  <section className="section-copy">
    <h3>Doctrine Screening</h3>
    {!screening ? (
      <p className="muted">No screening results yet.</p>
    ) : (
      <>
        <div className="pill-row">
          <span className="pill accent">Aggregate: {screening.aggregate_result}</span>
          <span className="pill">Selected: {screening.selected_article_ids.length}</span>
          <span className="pill">Context: {screening.context_article_ids.length}</span>
          <span className="pill">Rejected: {screening.rejected_article_ids.length}</span>
        </div>

        {screening.articles.length === 0 ? (
          <p className="muted">No articles entered.</p>
        ) : (
          screening.articles.map((article) => (
            <article key={article.article_id} className="result-block">
              <strong>{article.headline}</strong>
              <p>
                <span className="mono">{article.result}</span> | relevance {article.relevance_score} | source quality{' '}
                {article.source_quality_score.toFixed(2)}
              </p>
              <p>Matched drivers: {article.matched_drivers.join(', ') || 'none'}</p>
              <p className="muted">{article.rationale}</p>
            </article>
          ))
        )}
      </>
    )}
  </section>
);
