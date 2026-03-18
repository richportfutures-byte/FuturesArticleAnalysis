import type { PreTradeReviewState } from '../app/workbenchState';
import type { TranslationResult } from '../domain/entities';

type Props = {
  review: PreTradeReviewState;
  translation: TranslationResult | null;
  onChange: (next: PreTradeReviewState) => void;
};

const buildChecklist = (review: PreTradeReviewState) => [
  { label: 'driver hierarchy recorded', complete: review.driverHierarchy.trim().length > 0 },
  { label: 'horizon recorded', complete: review.horizon.trim().length > 0 },
  { label: 'minimum confirmation recorded', complete: review.minimumConfirmation.trim().length > 0 },
  { label: 'current market state checked', complete: review.currentMarketStateChecked },
  { label: 'thesis-abandon condition written', complete: review.thesisAbandonCondition.trim().length > 0 }
];

export const PreTradeReview = ({ review, translation, onChange }: Props) => {
  const checklist = buildChecklist(review);

  const patchReview = (patch: Partial<PreTradeReviewState>) => {
    onChange({
      ...review,
      ...patch,
      lastUpdatedAt: new Date().toISOString()
    });
  };

  return (
    <section className="section-copy review-section">
      <div className="review-header">
        <div>
          <h2>Pre-Trade Review</h2>
          <p className="muted">Record the thesis hierarchy, horizon, confirmation threshold, live tape check, and explicit abandon condition before acting.</p>
        </div>
        <div className="pill-row">
          {checklist.map((item) => (
            <span key={item.label} className={`pill ${item.complete ? 'accent' : ''}`}>
              {item.complete ? 'Ready' : 'Open'}: {item.label}
            </span>
          ))}
        </div>
      </div>

      {translation ? (
        <p className="muted">
          Translation anchor: <span className="mono">{translation.primary_driver_hierarchy.join(' -> ') || 'no driver hierarchy available'}</span>
        </p>
      ) : (
        <p className="muted">Run translation first to seed doctrine-backed driver, horizon, and invalidation suggestions.</p>
      )}

      <div className="form-grid">
        <label>
          Driver hierarchy
          <textarea
            className="review-textarea"
            value={review.driverHierarchy}
            onChange={(event) => patchReview({ driverHierarchy: event.target.value })}
            placeholder="List the driver stack in order of importance."
          />
        </label>

        <label>
          Horizon
          <textarea
            className="review-textarea"
            value={review.horizon}
            onChange={(event) => patchReview({ horizon: event.target.value })}
            placeholder="Record the time horizon that must do the work."
          />
        </label>

        <label>
          Minimum confirmation
          <textarea
            className="review-textarea"
            value={review.minimumConfirmation}
            onChange={(event) => patchReview({ minimumConfirmation: event.target.value })}
            placeholder="What specific confirmation is required before continuation is trusted?"
          />
        </label>

        <label className="review-checkbox">
          <input
            type="checkbox"
            checked={review.currentMarketStateChecked}
            onChange={(event) => patchReview({ currentMarketStateChecked: event.target.checked })}
          />
          <span>Current market state checked</span>
        </label>

        <label>
          Current market state notes
          <textarea
            className="review-textarea"
            value={review.currentMarketStateNotes}
            onChange={(event) => patchReview({ currentMarketStateNotes: event.target.value })}
            placeholder="Note whether price action, rates, dollar, breadth, or crude are confirming or contradicting the thesis."
          />
        </label>

        <label>
          Thesis-abandon condition
          <textarea
            className="review-textarea"
            value={review.thesisAbandonCondition}
            onChange={(event) => patchReview({ thesisAbandonCondition: event.target.value })}
            placeholder="Write the condition that invalidates the thesis without negotiation."
          />
        </label>
      </div>
    </section>
  );
};
