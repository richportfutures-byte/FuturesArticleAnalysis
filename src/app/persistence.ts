import { z } from 'zod';
import { ContractId, RunMode, SourceType } from '../domain/enums';
import { ArticleInputSchema, IntakeModeSchema, SourceCompletenessSchema } from '../schemas/input';
import { RunOutputSchema } from '../schemas/output';
import type { PersistedRunRecordV1, PersistedWorkspaceSnapshotV1 } from './workbenchState';
import {
  createEmptyPostReactionReviewState,
  createEmptyPreTradeReviewState,
  sampleDrafts,
  type DiscoveryMode,
  type IntakeDraftState
} from './workbenchState';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const STORAGE_NAMESPACE_V1 = 'futures-article-analysis:v1';
export const PERSISTED_RUNS_STORAGE_KEY = `${STORAGE_NAMESPACE_V1}:runs`;
export const WORKSPACE_SNAPSHOT_STORAGE_KEY = `${STORAGE_NAMESPACE_V1}:workspace`;

const MAX_PERSISTED_RUNS = 12;

const DiscoveryModeSchema = z.enum(['morning_coverage', 'contract_specific']);

const IntakeDraftStateSchema = z.object({
  headline: z.string().optional(),
  bodyExcerpt: z.string().optional(),
  sourceType: z.nativeEnum(SourceType).optional(),
  sourceUrl: z.string().optional(),
  publisher: z.string().optional(),
  publishedAt: z.string().optional(),
  sourceCompleteness: SourceCompletenessSchema.optional()
});

const PreTradeReviewStateSchema = z
  .object({
    driverHierarchy: z.string().optional(),
    horizon: z.string().optional(),
    minimumConfirmation: z.string().optional(),
    currentMarketStateChecked: z.boolean().optional(),
    currentMarketStateNotes: z.string().optional(),
    thesisAbandonCondition: z.string().optional(),
    lastUpdatedAt: z.string().nullable().optional()
  })
  .transform((value) => ({
    ...createEmptyPreTradeReviewState(),
    ...value,
    lastUpdatedAt: value.lastUpdatedAt ?? null
  }));

const PostReactionReviewStateSchema = z
  .object({
    moveDirectionVsThesis: z.enum(['unreviewed', 'aligned', 'opposed', 'mixed']).optional(),
    crossMarketConfirmation: z.enum(['unreviewed', 'confirmed', 'failed', 'mixed']).optional(),
    moveClassification: z.enum(['unreviewed', 'sustained', 'faded', 'reversed', 'mixed']).optional(),
    narrativeRole: z.enum(['unreviewed', 'catalyst', 'rationalization', 'irrelevant']).optional(),
    continuationTag: z.enum(['unreviewed', 'continuation', 'fade', 'ignore']).optional(),
    notes: z.string().optional(),
    lastUpdatedAt: z.string().nullable().optional()
  })
  .transform((value) => ({
    ...createEmptyPostReactionReviewState(),
    ...value,
    lastUpdatedAt: value.lastUpdatedAt ?? null
  }));

const PersistedRunRecordSchema = z
  .object({
    schema_version: z.literal(1),
    run_id: z.string(),
    contract_id: z.nativeEnum(ContractId),
    run_mode: z.nativeEnum(RunMode),
    intake_mode: IntakeModeSchema,
    staged_articles: z.array(ArticleInputSchema),
    output: RunOutputSchema.nullable(),
    pre_trade_review: PreTradeReviewStateSchema.nullable().optional(),
    post_reaction_review: PostReactionReviewStateSchema.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
  })
  .transform((value): PersistedRunRecordV1 => ({
    ...value,
    pre_trade_review: value.pre_trade_review ?? null,
    post_reaction_review: value.post_reaction_review ?? null
  }));

const PersistedWorkspaceSnapshotSchema = z
  .object({
    schema_version: z.literal(1),
    active_run_id: z.string().nullable().optional(),
    contract_id: z.nativeEnum(ContractId).optional(),
    run_mode: z.nativeEnum(RunMode).optional(),
    intake_mode: IntakeModeSchema.optional(),
    intake_draft: IntakeDraftStateSchema.optional(),
    discovery_mode: DiscoveryModeSchema.optional(),
    recency_window_hours: z.number().int().positive().optional(),
    updated_at: z.string().optional()
  })
  .transform((value): PersistedWorkspaceSnapshotV1 => {
    const contractId = value.contract_id ?? ContractId.NQ;
    const sampleDraft = sampleDrafts[contractId];
    const intakeDraft = value.intake_draft ?? {};

    return {
      schema_version: 1,
      active_run_id: value.active_run_id ?? null,
      contract_id: contractId,
      run_mode: value.run_mode ?? RunMode.SINGLE_ARTICLE,
      intake_mode: value.intake_mode ?? 'manual_text',
      intake_draft: {
        headline: intakeDraft.headline ?? sampleDraft.headline,
        bodyExcerpt: intakeDraft.bodyExcerpt ?? sampleDraft.bodyExcerpt,
        sourceType: intakeDraft.sourceType ?? sampleDraft.sourceType,
        sourceUrl: intakeDraft.sourceUrl ?? sampleDraft.sourceUrl,
        publisher: intakeDraft.publisher ?? sampleDraft.publisher,
        publishedAt: intakeDraft.publishedAt ?? sampleDraft.publishedAt,
        sourceCompleteness: intakeDraft.sourceCompleteness ?? sampleDraft.sourceCompleteness
      },
      discovery_mode: (value.discovery_mode ?? 'morning_coverage') as DiscoveryMode,
      recency_window_hours: value.recency_window_hours ?? 72,
      updated_at: value.updated_at ?? new Date(0).toISOString()
    };
  });

const resolveStorage = (storage?: StorageLike | null): StorageLike | null => {
  if (storage !== undefined) {
    return storage;
  }

  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null;
    }

    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const readJson = (key: string, storage?: StorageLike | null): unknown => {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return null;
  }

  try {
    const raw = resolvedStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown, storage?: StorageLike | null): boolean => {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return false;
  }

  try {
    resolvedStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const compactRunRecords = (records: Record<string, PersistedRunRecordV1>) =>
  Object.fromEntries(
    Object.values(records)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .slice(0, MAX_PERSISTED_RUNS)
      .map((record) => [record.run_id, record])
  );

export const loadPersistedRunRecords = (storage?: StorageLike | null): Record<string, PersistedRunRecordV1> => {
  const raw = readJson(PERSISTED_RUNS_STORAGE_KEY, storage);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const records: Record<string, PersistedRunRecordV1> = {};

  for (const [runId, value] of Object.entries(raw)) {
    const parsed = PersistedRunRecordSchema.safeParse(value);
    if (parsed.success) {
      records[runId] = parsed.data;
    }
  }

  return compactRunRecords(records);
};

export const loadPersistedRunRecord = (
  runId: string | null | undefined,
  storage?: StorageLike | null
): PersistedRunRecordV1 | null => {
  if (!runId) {
    return null;
  }

  return loadPersistedRunRecords(storage)[runId] ?? null;
};

export const loadMostRecentPersistedRunRecord = (storage?: StorageLike | null): PersistedRunRecordV1 | null =>
  Object.values(loadPersistedRunRecords(storage)).sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0] ?? null;

export const savePersistedRunRecord = (record: PersistedRunRecordV1, storage?: StorageLike | null): boolean => {
  const parsed = PersistedRunRecordSchema.safeParse(record);
  if (!parsed.success) {
    return false;
  }

  const nextRecords = compactRunRecords({
    ...loadPersistedRunRecords(storage),
    [record.run_id]: parsed.data
  });

  return writeJson(PERSISTED_RUNS_STORAGE_KEY, nextRecords, storage);
};

export const loadWorkspaceSnapshot = (storage?: StorageLike | null): PersistedWorkspaceSnapshotV1 | null => {
  const raw = readJson(WORKSPACE_SNAPSHOT_STORAGE_KEY, storage);
  const parsed = PersistedWorkspaceSnapshotSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

export const saveWorkspaceSnapshot = (
  snapshot: PersistedWorkspaceSnapshotV1,
  storage?: StorageLike | null
): boolean => {
  const parsed = PersistedWorkspaceSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    return false;
  }

  return writeJson(WORKSPACE_SNAPSHOT_STORAGE_KEY, parsed.data, storage);
};

export const buildWorkspaceSnapshot = (input: {
  activeRunId: string | null;
  contractId: ContractId;
  runMode: RunMode;
  intakeMode: PersistedWorkspaceSnapshotV1['intake_mode'];
  intakeDraft: IntakeDraftState;
  discoveryMode: DiscoveryMode;
  recencyWindowHours: number;
  updatedAt?: string;
}): PersistedWorkspaceSnapshotV1 => ({
  schema_version: 1,
  active_run_id: input.activeRunId,
  contract_id: input.contractId,
  run_mode: input.runMode,
  intake_mode: input.intakeMode,
  intake_draft: input.intakeDraft,
  discovery_mode: input.discoveryMode,
  recency_window_hours: input.recencyWindowHours,
  updated_at: input.updatedAt ?? new Date().toISOString()
});

export const buildPersistedRunRecord = (input: {
  runId: string;
  contractId: ContractId;
  runMode: RunMode;
  intakeMode: PersistedRunRecordV1['intake_mode'];
  stagedArticles: PersistedRunRecordV1['staged_articles'];
  output: PersistedRunRecordV1['output'];
  preTradeReview: PersistedRunRecordV1['pre_trade_review'];
  postReactionReview: PersistedRunRecordV1['post_reaction_review'];
  createdAt?: string;
  updatedAt?: string;
}): PersistedRunRecordV1 => ({
  schema_version: 1,
  run_id: input.runId,
  contract_id: input.contractId,
  run_mode: input.runMode,
  intake_mode: input.intakeMode,
  staged_articles: input.stagedArticles,
  output: input.output,
  pre_trade_review: input.preTradeReview ?? null,
  post_reaction_review: input.postReactionReview ?? null,
  created_at: input.createdAt ?? new Date().toISOString(),
  updated_at: input.updatedAt ?? new Date().toISOString()
});
