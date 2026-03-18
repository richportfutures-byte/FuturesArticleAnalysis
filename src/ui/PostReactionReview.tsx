import type { PostReactionReviewState } from '../app/workbenchState';
import type { RunOutput } from '../domain/entities';

type Props = {
  review: PostReactionReviewState;
  output: RunOutput | null;
  onChange: (next: PostReactionReviewState) => void;
};

const reviewChecklist = (review: PostReactionReviewState) => [
  { label: 'move direction vs thesis', complete: review.moveDirectionVsThesis !== 'unreviewed' },
  { label: 'cross-market confirmation result', complete: review.crossMarketConfirmation !== 'unreviewed' },
  { label: 'sustained / faded / reversed / mixed', complete: review.moveClassification !== 'unreviewed' },
  { label: 'catalyst / rationalization / irrelevant', complete: review.narrativeRole !== 'unreviewed' },
  { label: 'continuation / fade / ignore log tag', complete: review.continuationTag !== 'unreviewed' }
];

export const PostReactionReview = ({ review, output, onChange }: Props) => {
  const checklist = reviewChecklist(review);

  const patchReview = (patch: Partial<PostReactionReviewState>) => {
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
          <h2>Post-Reaction Review</h2>
          <p className="muted">Tag what the first meaningful reaction actually did so continuation, fade, and ignore logs stay explicit.</p>
        </div>
        <div className="pill-row">
          {checklist.map((item) => (
            <span key={item.label} className={`pill ${item.complete ? 'accent' : ''}`}>
              {item.complete ? 'Logged' : 'Open'}: {item.label}
            </span>
          ))}
        </div>
      </div>

      {output?.translation ? (
        <p className="muted">
          Active thesis: <span className="mono">{output.translation.verdict}</span>. Deployment posture: <span className="mono">{output.deployment_use}</span>.
        </p>
      ) : (
        <p className="muted">Complete a run first, then classify whether the reaction validated the thesis or just narrated noise after the fact.</p>
      )}

      <div className="input-row">
        <label>
          Move direction vs thesis
          <select
            value={review.moveDirectionVsThesis}
            onChange={(event) =>
              patchReview({
                moveDirectionVsThesis: event.target.value as PostReactionReviewState['moveDirectionVsThesis']
              })
            }
          >
            <option value="unreviewed">select one</option>
            <option value="aligned">aligned</option>
            <option value="opposed">opposed</option>
            <option value="mixed">mixed</option>
          </select>
        </label>

        <label>
          Cross-market confirmation
          <select
            value={review.crossMarketConfirmation}
            onChange={(event) =>
              patchReview({
                crossMarketConfirmation: event.target.value as PostReactionReviewState['crossMarketConfirmation']
              })
            }
          >
            <option value="unreviewed">select one</option>
            <option value="confirmed">confirmed</option>
            <option value="failed">failed</option>
            <option value="mixed">mixed</option>
          </select>
        </label>
      </div>

      <div className="input-row">
        <label>
          Move classification
          <select
            value={review.moveClassification}
            onChange={(event) =>
              patchReview({
                moveClassification: event.target.value as PostReactionReviewState['moveClassification']
              })
            }
          >
            <option value="unreviewed">select one</option>
            <option value="sustained">sustained</option>
            <option value="faded">faded</option>
            <option value="reversed">reversed</option>
            <option value="mixed">mixed</option>
          </select>
        </label>

        <label>
          Narrative role
          <select
            value={review.narrativeRole}
            onChange={(event) =>
              patchReview({
                narrativeRole: event.target.value as PostReactionReviewState['narrativeRole']
              })
            }
          >
            <option value="unreviewed">select one</option>
            <option value="catalyst">catalyst</option>
            <option value="rationalization">rationalization</option>
            <option value="irrelevant">irrelevant</option>
          </select>
        </label>

        <label>
          Log tag
          <select
            value={review.continuationTag}
            onChange={(event) =>
              patchReview({
                continuationTag: event.target.value as PostReactionReviewState['continuationTag']
              })
            }
          >
            <option value="unreviewed">select one</option>
            <option value="continuation">continuation</option>
            <option value="fade">fade</option>
            <option value="ignore">ignore</option>
          </select>
        </label>
      </div>

      <label>
        Review notes
        <textarea
          className="review-textarea"
          value={review.notes}
          onChange={(event) => patchReview({ notes: event.target.value })}
          placeholder="Capture what actually confirmed, what faded, and what should be ignored next time."
        />
      </label>
    </section>
  );
};
