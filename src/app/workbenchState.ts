import type { Article, IntakeMode, RunOutput, SourceCompleteness } from '../domain/entities';
import { ContractId, RunMode, SourceType } from '../domain/enums';

export type DiscoveryMode = 'morning_coverage' | 'contract_specific';

export type IntakeDraftState = {
  headline: string;
  bodyExcerpt: string;
  sourceType: SourceType;
  sourceUrl: string;
  publisher: string;
  publishedAt: string;
  sourceCompleteness: SourceCompleteness;
};

export const sampleDrafts: Record<ContractId, IntakeDraftState> = {
  [ContractId.NQ]: {
    headline: 'Hot inflation surprise pushes yields higher as megacap tech weakens',
    bodyExcerpt:
      'Primary reporting ties the move to higher rate expectations, softer semiconductor leadership, and weaker long-duration equity sentiment in the Nasdaq complex.',
    sourceType: SourceType.PRIMARY_REPORTING,
    sourceUrl: 'https://example.com/nq-sample',
    publisher: 'Fixture desk',
    publishedAt: '2026-03-16T08:30:00Z',
    sourceCompleteness: 'full_text'
  },
  [ContractId.ZN]: {
    headline: 'Fed speaker opens door to slower pace as growth softens',
    bodyExcerpt:
      'Primary reporting frames the Treasury reaction around softer growth, easier policy expectations, and a cleaner duration-supportive read.',
    sourceType: SourceType.PRIMARY_REPORTING,
    sourceUrl: 'https://example.com/zn-sample',
    publisher: 'Fixture desk',
    publishedAt: '2026-03-16T08:30:00Z',
    sourceCompleteness: 'full_text'
  },
  [ContractId.GC]: {
    headline: 'Central bank demand meets weaker dollar and lower real yields',
    bodyExcerpt:
      'The article argues gold is being supported by reserve demand, a softer dollar backdrop, and lower real yields rather than broad risk commentary alone.',
    sourceType: SourceType.PRIMARY_REPORTING,
    sourceUrl: 'https://example.com/gc-sample',
    publisher: 'Fixture desk',
    publishedAt: '2026-03-16T08:30:00Z',
    sourceCompleteness: 'full_text'
  },
  [ContractId.SIXE]: {
    headline: 'ECB maintains hawkish tone as US data softens',
    bodyExcerpt:
      'Reporting highlights front-end spread support for the euro versus the dollar and frames the move as a relative-rate divergence story.',
    sourceType: SourceType.PRIMARY_REPORTING,
    sourceUrl: 'https://example.com/6e-sample',
    publisher: 'Fixture desk',
    publishedAt: '2026-03-16T08:30:00Z',
    sourceCompleteness: 'full_text'
  },
  [ContractId.CL]: {
    headline: 'OPEC+ signals tighter compliance as inventories draw',
    bodyExcerpt:
      'Primary reporting links crude strength to tighter balances, firmer prompt spreads, and improving refinery runs rather than generic risk appetite.',
    sourceType: SourceType.PRIMARY_REPORTING,
    sourceUrl: 'https://example.com/cl-sample',
    publisher: 'Fixture desk',
    publishedAt: '2026-03-16T08:30:00Z',
    sourceCompleteness: 'full_text'
  }
};

export type PreTradeReviewState = {
  driverHierarchy: string;
  horizon: string;
  minimumConfirmation: string;
  currentMarketStateChecked: boolean;
  currentMarketStateNotes: string;
  thesisAbandonCondition: string;
  lastUpdatedAt: string | null;
};

export type PostReactionMoveDirection = 'unreviewed' | 'aligned' | 'opposed' | 'mixed';

export type PostReactionCrossMarket = 'unreviewed' | 'confirmed' | 'failed' | 'mixed';

export type PostReactionMoveClassification = 'unreviewed' | 'sustained' | 'faded' | 'reversed' | 'mixed';

export type PostReactionNarrativeRole = 'unreviewed' | 'catalyst' | 'rationalization' | 'irrelevant';

export type PostReactionLogTag = 'unreviewed' | 'continuation' | 'fade' | 'ignore';

export type PostReactionReviewState = {
  moveDirectionVsThesis: PostReactionMoveDirection;
  crossMarketConfirmation: PostReactionCrossMarket;
  moveClassification: PostReactionMoveClassification;
  narrativeRole: PostReactionNarrativeRole;
  continuationTag: PostReactionLogTag;
  notes: string;
  lastUpdatedAt: string | null;
};

export type PersistedRunRecordV1 = {
  schema_version: 1;
  run_id: string;
  contract_id: ContractId;
  run_mode: RunMode;
  intake_mode: IntakeMode;
  staged_articles: Article[];
  output: RunOutput | null;
  pre_trade_review: PreTradeReviewState | null;
  post_reaction_review: PostReactionReviewState | null;
  created_at: string;
  updated_at: string;
};

export type PersistedWorkspaceSnapshotV1 = {
  schema_version: 1;
  active_run_id: string | null;
  contract_id: ContractId;
  run_mode: RunMode;
  intake_mode: IntakeMode;
  intake_draft: IntakeDraftState;
  discovery_mode: DiscoveryMode;
  recency_window_hours: number;
  updated_at: string;
};

export const createEmptyPreTradeReviewState = (): PreTradeReviewState => ({
  driverHierarchy: '',
  horizon: '',
  minimumConfirmation: '',
  currentMarketStateChecked: false,
  currentMarketStateNotes: '',
  thesisAbandonCondition: '',
  lastUpdatedAt: null
});

export const createEmptyPostReactionReviewState = (): PostReactionReviewState => ({
  moveDirectionVsThesis: 'unreviewed',
  crossMarketConfirmation: 'unreviewed',
  moveClassification: 'unreviewed',
  narrativeRole: 'unreviewed',
  continuationTag: 'unreviewed',
  notes: '',
  lastUpdatedAt: null
});

const joinLines = (values: string[]) => values.filter((value) => value.trim().length > 0).join('\n');

export const seedPreTradeReviewState = (
  output: RunOutput | null,
  existing: PreTradeReviewState | null = null
): PreTradeReviewState => {
  const seeded = existing ?? createEmptyPreTradeReviewState();
  const translation = output?.translation;

  if (!translation) {
    return seeded;
  }

  return {
    driverHierarchy: seeded.driverHierarchy || joinLines(translation.primary_driver_hierarchy),
    horizon:
      seeded.horizon ||
      joinLines(translation.horizon_split.map((entry) => `${entry.bucket}: ${entry.note}`)),
    minimumConfirmation: seeded.minimumConfirmation || joinLines(translation.confirmation_markers),
    currentMarketStateChecked: seeded.currentMarketStateChecked,
    currentMarketStateNotes: seeded.currentMarketStateNotes,
    thesisAbandonCondition: seeded.thesisAbandonCondition || joinLines(translation.invalidation_markers),
    lastUpdatedAt: seeded.lastUpdatedAt
  };
};
