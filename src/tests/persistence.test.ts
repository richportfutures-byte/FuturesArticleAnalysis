import { describe, expect, it } from 'vitest';
import { loadPersistedRunRecord, loadPersistedRunRecords, loadWorkspaceSnapshot, savePersistedRunRecord } from '../app/persistence';
import { buildPersistedRunRecord, buildWorkspaceSnapshot, PERSISTED_RUNS_STORAGE_KEY, WORKSPACE_SNAPSHOT_STORAGE_KEY } from '../app/persistence';
import { sampleDrafts } from '../app/workbenchState';
import { ContractId, DeploymentUse, RunMode, SourceSurvival, SourceType, WorkflowState } from '../domain/enums';

class MemoryStorage {
  private readonly map = new Map<string, string>();

  getItem(key: string) {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.map.set(key, value);
  }

  removeItem(key: string) {
    this.map.delete(key);
  }
}

const buildOutput = () => ({
  run_id: 'run-1',
  contract_id: ContractId.NQ,
  run_mode: RunMode.SINGLE_ARTICLE,
  state: WorkflowState.COMPLETED,
  intake: {
    intake_mode: 'manual_text' as const,
    status: 'ready' as const,
    issues: [],
    normalized_articles: [],
    source_records: [],
    source_completeness_summary: {
      full_text: 1,
      partial_text: 0,
      unresolved: 0
    },
    source_origin_summary: {
      manual_paste: 1,
      manual_url: 0,
      fixture: 0,
      live_fetched: 0
    }
  },
  screening: {
    articles: [],
    selected_article_ids: [],
    context_article_ids: [],
    rejected_article_ids: [],
    aggregate_result: SourceSurvival.SELECTED
  },
  screen_result: SourceSurvival.SELECTED,
  cluster: null,
  analysis: null,
  translation: null,
  bias_brief: null,
  deployment_use: DeploymentUse.NO_TRADE,
  active_hours_context: null,
  provenance: {
    source_files: [],
    rule_ids: [],
    contract_override_ids: [],
    notes: [],
    rule_trace: []
  }
});

describe('workbench persistence', () => {
  it('persists run records by run_id and restores them safely', () => {
    const storage = new MemoryStorage();
    const record = buildPersistedRunRecord({
      runId: 'run-1',
      contractId: ContractId.NQ,
      runMode: RunMode.SINGLE_ARTICLE,
      intakeMode: 'manual_text',
      stagedArticles: [
        {
          article_id: 'manual_text-1',
          headline: 'Fed headline',
          body_excerpt: 'Article body',
          source_type: SourceType.PRIMARY_REPORTING,
          published_at: '2026-03-18T08:30:00Z',
          url: 'https://example.com/fed',
          source_completeness: 'full_text'
        }
      ],
      output: buildOutput(),
      preTradeReview: null,
      postReactionReview: null,
      createdAt: '2026-03-18T09:00:00Z',
      updatedAt: '2026-03-18T09:00:00Z'
    });

    expect(savePersistedRunRecord(record, storage)).toBe(true);

    const restored = loadPersistedRunRecord('run-1', storage);
    expect(restored?.run_id).toBe('run-1');
    expect(restored?.staged_articles).toHaveLength(1);
    expect(restored?.output?.state).toBe(WorkflowState.COMPLETED);
  });

  it('hydrates older records and workspace snapshots when newer fields are missing', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PERSISTED_RUNS_STORAGE_KEY,
      JSON.stringify({
        legacy: {
          schema_version: 1,
          run_id: 'legacy',
          contract_id: ContractId.GC,
          run_mode: RunMode.SINGLE_ARTICLE,
          intake_mode: 'manual_text',
          staged_articles: [
            {
              article_id: 'legacy-1',
              headline: 'Gold legacy',
              body_excerpt: 'body',
              source_type: SourceType.PRIMARY_REPORTING,
              published_at: null,
              url: null
            }
          ],
          output: buildOutput(),
          created_at: '2026-03-18T09:00:00Z',
          updated_at: '2026-03-18T09:05:00Z'
        }
      })
    );
    storage.setItem(
      WORKSPACE_SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        schema_version: 1,
        contract_id: ContractId.GC
      })
    );

    const restoredRecord = loadPersistedRunRecord('legacy', storage);
    const restoredWorkspace = loadWorkspaceSnapshot(storage);

    expect(restoredRecord?.pre_trade_review).toBeNull();
    expect(restoredRecord?.post_reaction_review).toBeNull();
    expect(restoredWorkspace?.contract_id).toBe(ContractId.GC);
    expect(restoredWorkspace?.intake_draft.headline).toBe(sampleDrafts[ContractId.GC].headline);
    expect(restoredWorkspace?.run_mode).toBe(RunMode.SINGLE_ARTICLE);
  });

  it('fails safely on malformed localStorage payloads', () => {
    const storage = new MemoryStorage();
    storage.setItem(PERSISTED_RUNS_STORAGE_KEY, '{bad-json');
    storage.setItem(WORKSPACE_SNAPSHOT_STORAGE_KEY, '{bad-json');

    expect(loadPersistedRunRecords(storage)).toEqual({});
    expect(loadWorkspaceSnapshot(storage)).toBeNull();
  });

  it('builds a workspace snapshot with the versioned namespace shape', () => {
    const snapshot = buildWorkspaceSnapshot({
      activeRunId: 'run-2',
      contractId: ContractId.CL,
      runMode: RunMode.MULTI_ARTICLE,
      intakeMode: 'manual_text',
      intakeDraft: sampleDrafts[ContractId.CL],
      discoveryMode: 'morning_coverage',
      recencyWindowHours: 72,
      updatedAt: '2026-03-18T09:00:00Z'
    });

    expect(snapshot.schema_version).toBe(1);
    expect(snapshot.active_run_id).toBe('run-2');
    expect(snapshot.contract_id).toBe(ContractId.CL);
  });
});
