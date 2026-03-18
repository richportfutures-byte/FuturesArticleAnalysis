import { startTransition, useEffect, useMemo, useState } from 'react';
import { contractOverrides } from '../domain/contracts';
import { DeploymentUse, RunMode } from '../domain/enums';
import { buildDiscoveryArticle, buildEditedDiscoveryArticle, buildManualDraftArticle, deriveDraftFromArticle } from '../engine/discoveryImport';
import { executePipeline } from '../engine/pipeline';
import { AnalysisView } from '../ui/AnalysisView';
import { ClusterView } from '../ui/ClusterView';
import { DiscoveryPanel } from '../ui/DiscoveryPanel';
import { DeploymentView } from '../ui/DeploymentView';
import { PostReactionReview } from '../ui/PostReactionReview';
import { PreTradeReview } from '../ui/PreTradeReview';
import { ProvenanceView } from '../ui/ProvenanceView';
import { ScreeningView } from '../ui/ScreeningView';
import { SourceIntake } from '../ui/SourceIntake';
import { TranslationView } from '../ui/TranslationView';
import {
  buildPersistedRunRecord,
  buildWorkspaceSnapshot,
  loadMostRecentPersistedRunRecord,
  loadPersistedRunRecord,
  loadWorkspaceSnapshot,
  savePersistedRunRecord,
  saveWorkspaceSnapshot
} from './persistence';
import { ClientReasonerRuntimeStatus, fetchClientReasonerStatus } from './runtimeConfig';
import {
  createEmptyPostReactionReviewState,
  createEmptyPreTradeReviewState,
  sampleDrafts,
  seedPreTradeReviewState,
  type PersistedRunRecordV1
} from './workbenchState';
import { useDiscovery } from './useDiscovery';
import { useIntakeDraft } from './useIntakeDraft';
import './app.css';

export default function App() {
  const [initialWorkspace] = useState(() => {
    const snapshot = loadWorkspaceSnapshot();
    if (snapshot) {
      return snapshot;
    }

    const latestRun = loadMostRecentPersistedRunRecord();
    if (!latestRun) {
      return null;
    }

    return buildWorkspaceSnapshot({
      activeRunId: latestRun.run_id,
      contractId: latestRun.contract_id,
      runMode: latestRun.run_mode,
      intakeMode: latestRun.intake_mode,
      intakeDraft: deriveDraftFromArticle(latestRun.staged_articles[0], sampleDrafts[latestRun.contract_id]),
      discoveryMode: 'morning_coverage',
      recencyWindowHours: 72,
      updatedAt: latestRun.updated_at
    });
  });
  const [initialRunRecord] = useState(
    () =>
      loadPersistedRunRecord(initialWorkspace?.active_run_id ?? null) ??
      loadMostRecentPersistedRunRecord()
  );
  const intake = useIntakeDraft({ initialWorkspace });
  const discovery = useDiscovery({ contractId: intake.contractId, initialWorkspace });
  const [activeRunRecord, setActiveRunRecord] = useState<PersistedRunRecordV1 | null>(initialRunRecord);
  const [preTradeReview, setPreTradeReview] = useState(() =>
    seedPreTradeReviewState(initialRunRecord?.output ?? null, initialRunRecord?.pre_trade_review ?? null)
  );
  const [postReactionReview, setPostReactionReview] = useState(
    () => initialRunRecord?.post_reaction_review ?? createEmptyPostReactionReviewState()
  );
  const [runtimeStatus, setRuntimeStatus] = useState<ClientReasonerRuntimeStatus | null>(null);

  const output = activeRunRecord?.output ?? null;
  const doctrine = contractOverrides[intake.contractId];
  const contractName = doctrine.meta.name;
  const objective = doctrine.meta.primary_objective;
  const focus = doctrine.meta.core_transmission_focus.join(', ');
  const deploymentWindows = doctrine.meta.deployment_windows.slice(0, 2).join(' | ');

  const clearRunContext = () => {
    setActiveRunRecord(null);
    setPreTradeReview(createEmptyPreTradeReviewState());
    setPostReactionReview(createEmptyPostReactionReviewState());
  };

  useEffect(() => {
    let cancelled = false;

    void fetchClientReasonerStatus().then((status) => {
      if (!cancelled) {
        setRuntimeStatus(status);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveWorkspaceSnapshot(
      buildWorkspaceSnapshot({
        activeRunId: activeRunRecord?.run_id ?? null,
        contractId: intake.contractId,
        runMode: intake.runMode,
        intakeMode: intake.intakeMode,
        intakeDraft: intake.draft,
        discoveryMode: discovery.discoveryMode,
        recencyWindowHours: discovery.recencyWindowHours
      })
    );
  }, [
    activeRunRecord?.run_id,
    discovery.discoveryMode,
    discovery.recencyWindowHours,
    intake.contractId,
    intake.draft,
    intake.intakeMode,
    intake.runMode
  ]);

  useEffect(() => {
    if (!activeRunRecord) {
      return;
    }

    savePersistedRunRecord(
      buildPersistedRunRecord({
        runId: activeRunRecord.run_id,
        contractId: activeRunRecord.contract_id,
        runMode: activeRunRecord.run_mode,
        intakeMode: activeRunRecord.intake_mode,
        stagedArticles: activeRunRecord.staged_articles,
        output: activeRunRecord.output,
        preTradeReview,
        postReactionReview,
        createdAt: activeRunRecord.created_at
      })
    );
  }, [activeRunRecord, postReactionReview, preTradeReview]);

  const onContractChange = (nextContractId: typeof intake.contractId) => {
    intake.applySampleDraft(nextContractId, 'manual_text');
    discovery.resetDiscovery();
    clearRunContext();
  };

  const onLoadSample = () => {
    intake.loadFixtureSample();
    discovery.resetDiscovery();
    clearRunContext();
  };

  const onImportSelected = () => {
    if (discovery.selectedCandidates.length === 0) {
      return;
    }

    intake.stageImportedCandidates(discovery.selectedCandidates);
    clearRunContext();
  };

  const onClearImportedSelection = () => {
    intake.clearImportedSelection();
    discovery.clearSelection();
  };

  const onRun = async () => {
    const draftState = {
      ...intake.draft,
      intakeMode: intake.intakeMode
    };
    const runId = `run-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const stagedArticles =
      intake.importedCandidates.length === 0
        ? [buildManualDraftArticle(draftState, `${intake.intakeMode}-${Date.now()}`)]
        : intake.importedCandidates.length === 1
          ? [buildEditedDiscoveryArticle(intake.importedCandidates[0], draftState)]
          : intake.importedCandidates.map((candidate) => buildDiscoveryArticle(candidate));

    const effectiveRunMode = stagedArticles.length > 1 ? RunMode.MULTI_ARTICLE : intake.runMode;
    const effectiveIntakeMode =
      intake.importedCandidates.length > 0
        ? stagedArticles.every((article) => article.source_completeness === 'unresolved')
          ? 'manual_url'
          : 'manual_text'
        : intake.intakeMode;

    const nextOutput = await executePipeline({
      run_id: runId,
      contract_id: intake.contractId,
      run_mode: effectiveRunMode,
      intake_mode: effectiveIntakeMode,
      articles: stagedArticles
    });

    const nextPreTradeReview = seedPreTradeReviewState(nextOutput, createEmptyPreTradeReviewState());
    const nextPostReactionReview = createEmptyPostReactionReviewState();
    const nextRunRecord = buildPersistedRunRecord({
      runId,
      contractId: intake.contractId,
      runMode: effectiveRunMode,
      intakeMode: effectiveIntakeMode,
      stagedArticles,
      output: nextOutput,
      preTradeReview: nextPreTradeReview,
      postReactionReview: nextPostReactionReview,
      createdAt
    });

    startTransition(() => {
      setActiveRunRecord(nextRunRecord);
      setPreTradeReview(nextPreTradeReview);
      setPostReactionReview(nextPostReactionReview);
    });
  };

  const importedSelectionSummary = intake.importedSelectionSummary;

  const deferredCoverageLabel = useMemo(() => {
    if (!output) {
      return null;
    }

    return `${output.run_mode} | ${output.state} | ${output.deployment_use}`;
  }, [output]);

  return (
    <main className="workbench">
      <header className="hero">
        <div>
          <p className="eyebrow">Market-Intelligence Workbench</p>
          <h1>Doctrine-Grounded Futures Bias Briefs</h1>
        </div>
        <div className="hero-copy">
          <p>
            {intake.contractId} ({contractName}): {objective}
          </p>
          <p>
            <strong>Focus:</strong> {focus}
          </p>
          <p>
            <strong>Best windows:</strong> {deploymentWindows}
          </p>
          {runtimeStatus ? (
            <p>
              <strong>Runtime:</strong> {runtimeStatus.displayLabel}. {runtimeStatus.detail}
            </p>
          ) : null}
          {deferredCoverageLabel ? (
            <p>
              <strong>Active run:</strong> {deferredCoverageLabel}
            </p>
          ) : null}
        </div>
      </header>

      <section className="panel-grid">
        <div className="panel panel-wide">
          <DiscoveryPanel
            contractId={intake.contractId}
            discoveryMode={discovery.discoveryMode}
            setDiscoveryMode={discovery.setDiscoveryMode}
            recencyWindowHours={discovery.recencyWindowHours}
            setRecencyWindowHours={discovery.setRecencyWindowHours}
            discovery={discovery.contractDiscovery}
            morningCoverage={discovery.morningCoverage}
            loading={discovery.discoveryLoading}
            selectedCandidateIds={discovery.selectedCandidateIds}
            onToggleCandidate={discovery.toggleCandidate}
            onDiscover={discovery.discover}
            onImportSelected={onImportSelected}
            onClearSelection={onClearImportedSelection}
            importedSummary={importedSelectionSummary}
          />
        </div>

        <div className="panel panel-wide">
          <SourceIntake
            contractId={intake.contractId}
            onContractChange={onContractChange}
            runMode={intake.runMode}
            setRunMode={intake.setRunMode}
            intakeMode={intake.intakeMode}
            setIntakeMode={intake.setIntakeMode}
            draft={intake.draft}
            updateDraft={intake.updateDraft}
            onRun={onRun}
            onLoadSample={onLoadSample}
            parsedCount={intake.parsedCount}
            importedSelectionSummary={importedSelectionSummary}
            onClearImportedSelection={onClearImportedSelection}
          />
        </div>

        <div className="panel">
          <ScreeningView screening={output?.screening ?? null} />
        </div>
        <div className="panel">
          <ClusterView cluster={output?.cluster ?? null} />
        </div>
        <div className="panel panel-tall">
          <AnalysisView analysis={output?.analysis ?? null} />
        </div>
        <div className="panel">
          <TranslationView translation={output?.translation ?? null} />
        </div>
        <div className="panel panel-wide">
          <PreTradeReview review={preTradeReview} translation={output?.translation ?? null} onChange={setPreTradeReview} />
        </div>
        <div className="panel panel-wide">
          <DeploymentView
            biasBrief={output?.bias_brief ?? null}
            deploymentUse={output?.deployment_use ?? DeploymentUse.NO_TRADE}
            terminalOutcome={output?.terminal_outcome}
          />
        </div>
        <div className="panel panel-wide">
          <PostReactionReview review={postReactionReview} output={output} onChange={setPostReactionReview} />
        </div>
        <div className="panel panel-wide">
          <ProvenanceView provenance={output?.provenance ?? null} />
        </div>
      </section>
    </main>
  );
}
