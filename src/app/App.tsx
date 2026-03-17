import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { contractOverrides } from '../domain/contracts';
import { Article, DiscoveryCandidate, DiscoverySummary, IntakeMode, RunOutput, SourceCompleteness } from '../domain/entities';
import { ContractId, DeploymentUse, RunMode, SourceType } from '../domain/enums';
import { runDiscovery } from '../engine/discover';
import { executePipeline } from '../engine/pipeline';
import { ClientReasonerRuntimeStatus, fetchClientReasonerStatus } from './runtimeConfig';
import { AnalysisView } from '../ui/AnalysisView';
import { ClusterView } from '../ui/ClusterView';
import { DiscoveryPanel } from '../ui/DiscoveryPanel';
import { DeploymentView } from '../ui/DeploymentView';
import { ProvenanceView } from '../ui/ProvenanceView';
import { ScreeningView } from '../ui/ScreeningView';
import { SourceIntake } from '../ui/SourceIntake';
import { TranslationView } from '../ui/TranslationView';
import './app.css';

type IntakeDraft = {
  headline: string;
  bodyExcerpt: string;
  sourceType: SourceType;
  sourceUrl: string;
  publisher: string;
  publishedAt: string;
  sourceCompleteness: SourceCompleteness;
};

const sampleDrafts: Record<ContractId, IntakeDraft> = {
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

const sourceOriginByMode: Record<IntakeMode, 'manual_paste' | 'manual_url' | 'fixture'> = {
  manual_text: 'manual_paste',
  manual_url: 'manual_url',
  fixture: 'fixture'
};

const buildDiscoveryArticle = (candidate: DiscoveryCandidate, operatorEditsAfterImport: string[] = []): Article => ({
  article_id: `discover-${candidate.id}`,
  headline: candidate.title,
  body_excerpt: candidate.import_excerpt,
  source_type: candidate.source_type,
  published_at: candidate.published_at,
  url: candidate.url,
  publisher: candidate.source_name,
  source_domain: candidate.source_domain,
  notes: candidate.provenance_notes.join(' '),
  intake_mode: 'manual_text',
  source_origin: 'live_fetched',
  source_completeness: candidate.source_completeness,
  discovery_context: {
    search_provider: candidate.search_provider,
    search_timestamp: candidate.search_timestamp,
    search_query: candidate.discovery_query,
    recency_window_hours: candidate.recency_window_hours,
    source_domain: candidate.source_domain,
    source_name: candidate.source_name,
    authority_tier: candidate.authority_tier,
    directness: candidate.directness,
    import_readiness: candidate.source_completeness,
    operator_edits_after_import: operatorEditsAfterImport
  }
});

const collectDiscoveryOperatorEdits = (
  candidate: DiscoveryCandidate,
  draft: {
    headline: string;
    bodyExcerpt: string;
    sourceType: SourceType;
    sourceUrl: string;
    publisher: string;
    publishedAt: string;
    sourceCompleteness: SourceCompleteness;
    intakeMode: IntakeMode;
  }
): string[] => [
  ...(draft.headline !== candidate.title ? ['headline'] : []),
  ...((draft.intakeMode === 'manual_url' ? '' : draft.bodyExcerpt) !== candidate.import_excerpt ? ['body_excerpt'] : []),
  ...(draft.sourceType !== candidate.source_type ? ['source_type'] : []),
  ...((draft.sourceUrl.trim() || null) !== candidate.url ? ['url'] : []),
  ...((draft.publisher.trim() || '') !== candidate.source_name ? ['publisher'] : []),
  ...((draft.publishedAt.trim() || null) !== candidate.published_at ? ['published_at'] : []),
  ...((draft.intakeMode === 'manual_url' ? 'unresolved' : draft.sourceCompleteness) !== candidate.source_completeness ? ['source_completeness'] : [])
];

const buildEditedDiscoveryArticle = (
  candidate: DiscoveryCandidate,
  draft: {
    headline: string;
    bodyExcerpt: string;
    sourceType: SourceType;
    sourceUrl: string;
    publisher: string;
    publishedAt: string;
    sourceCompleteness: SourceCompleteness;
    intakeMode: IntakeMode;
  }
): Article => {
  const operatorEdits = collectDiscoveryOperatorEdits(candidate, draft);
  const article = buildDiscoveryArticle(candidate, operatorEdits);

  return {
    ...article,
    headline: draft.headline,
    body_excerpt: draft.intakeMode === 'manual_url' ? '' : draft.bodyExcerpt,
    source_type: draft.sourceType,
    published_at: draft.publishedAt.trim() ? draft.publishedAt : null,
    url: draft.sourceUrl.trim() ? draft.sourceUrl : null,
    publisher: draft.publisher.trim() ? draft.publisher : undefined,
    source_completeness: draft.intakeMode === 'manual_url' ? 'unresolved' : draft.sourceCompleteness,
    discovery_context: article.discovery_context
      ? {
          ...article.discovery_context,
          import_readiness: draft.intakeMode === 'manual_url' ? 'unresolved' : draft.sourceCompleteness,
          operator_edits_after_import: operatorEdits
        }
      : undefined
  };
};

export default function App() {
  const [contractId, setContractId] = useState<ContractId>(ContractId.NQ);
  const [runMode, setRunMode] = useState<RunMode>(RunMode.SINGLE_ARTICLE);
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('manual_text');
  const [headline, setHeadline] = useState(sampleDrafts[ContractId.NQ].headline);
  const [bodyExcerpt, setBodyExcerpt] = useState(sampleDrafts[ContractId.NQ].bodyExcerpt);
  const [sourceType, setSourceType] = useState<SourceType>(sampleDrafts[ContractId.NQ].sourceType);
  const [sourceUrl, setSourceUrl] = useState(sampleDrafts[ContractId.NQ].sourceUrl);
  const [publisher, setPublisher] = useState(sampleDrafts[ContractId.NQ].publisher);
  const [publishedAt, setPublishedAt] = useState(sampleDrafts[ContractId.NQ].publishedAt);
  const [sourceCompleteness, setSourceCompleteness] = useState<SourceCompleteness>(sampleDrafts[ContractId.NQ].sourceCompleteness);
  const [recencyWindowHours, setRecencyWindowHours] = useState(72);
  const [discovery, setDiscovery] = useState<DiscoverySummary | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [importedCandidates, setImportedCandidates] = useState<DiscoveryCandidate[]>([]);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<ClientReasonerRuntimeStatus | null>(null);

  const deferredHeadline = useDeferredValue(headline);
  const deferredBodyExcerpt = useDeferredValue(bodyExcerpt);
  const deferredSourceUrl = useDeferredValue(sourceUrl);

  const doctrine = contractOverrides[contractId];
  const objective = doctrine.meta.primary_objective;
  const focus = doctrine.meta.core_transmission_focus.join(', ');
  const deploymentWindows = doctrine.meta.deployment_windows.slice(0, 2).join(' | ');

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

  const applyDraft = (nextContractId: ContractId, nextMode: IntakeMode) => {
    const draft = sampleDrafts[nextContractId];
    setIntakeMode(nextMode);
    setHeadline(draft.headline);
    setBodyExcerpt(draft.bodyExcerpt);
    setSourceType(draft.sourceType);
    setSourceUrl(draft.sourceUrl);
    setPublisher(draft.publisher);
    setPublishedAt(draft.publishedAt);
    setSourceCompleteness(draft.sourceCompleteness);
    setDiscovery(null);
    setSelectedCandidateIds([]);
    setImportedCandidates([]);
    setOutput(null);
  };

  const parsedCount = useMemo(() => {
    if (importedCandidates.length > 0) {
      return importedCandidates.length;
    }

    if (intakeMode === 'manual_url') {
      return deferredSourceUrl.trim() ? 1 : 0;
    }

    return deferredHeadline.trim() || deferredBodyExcerpt.trim() ? 1 : 0;
  }, [deferredBodyExcerpt, deferredHeadline, deferredSourceUrl, importedCandidates.length, intakeMode]);

  const importedSelectionSummary = useMemo(() => {
    if (importedCandidates.length === 0) return null;
    const readinessMix = Array.from(new Set(importedCandidates.map((candidate) => candidate.source_completeness))).join(', ');
    return `${importedCandidates.length} discovery candidate(s) staged (${readinessMix})`;
  }, [importedCandidates]);

  const onToggleCandidate = (candidateId: string) => {
    setSelectedCandidateIds((current) =>
      current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]
    );
  };

  const onDiscover = async () => {
    setDiscoveryLoading(true);
    const nextDiscovery = await runDiscovery({
      contract_id: contractId,
      recency_window_hours: recencyWindowHours,
      max_results: 12
    });

    startTransition(() => {
      setDiscovery(nextDiscovery);
      setSelectedCandidateIds([]);
      setDiscoveryLoading(false);
    });
  };

  const onImportSelected = () => {
    if (!discovery) return;
    const nextImported = discovery.candidates.filter((candidate) => selectedCandidateIds.includes(candidate.id));
    if (nextImported.length === 0) return;

    setImportedCandidates(nextImported);
    setRunMode(nextImported.length > 1 ? RunMode.MULTI_ARTICLE : RunMode.SINGLE_ARTICLE);

    const first = nextImported[0];
    setHeadline(first.title);
    setBodyExcerpt(first.import_excerpt);
    setSourceType(first.source_type);
    setSourceUrl(first.url ?? '');
    setPublisher(first.source_name);
    setPublishedAt(first.published_at ?? '');
    setSourceCompleteness(first.source_completeness === 'unresolved' ? 'partial_text' : first.source_completeness);
    setIntakeMode(nextImported.every((candidate) => candidate.source_completeness === 'unresolved') ? 'manual_url' : 'manual_text');
    setOutput(null);
  };

  const clearImportedSelection = () => {
    setImportedCandidates([]);
    setSelectedCandidateIds([]);
  };

  const onRun = async () => {
    const draftState = {
      headline,
      bodyExcerpt,
      sourceType,
      sourceUrl,
      publisher,
      publishedAt,
      sourceCompleteness,
      intakeMode
    };

    const stagedArticles: Article[] =
      importedCandidates.length === 0
        ? [
            {
              article_id: `${intakeMode}-${Date.now()}`,
              headline,
              body_excerpt: intakeMode === 'manual_url' ? '' : bodyExcerpt,
              source_type: sourceType,
              published_at: publishedAt.trim() ? publishedAt : null,
              url: sourceUrl.trim() ? sourceUrl : null,
              publisher: publisher.trim() ? publisher : undefined,
              intake_mode: intakeMode,
              source_origin: sourceOriginByMode[intakeMode],
              source_completeness: intakeMode === 'manual_url' ? 'unresolved' : sourceCompleteness
            }
          ]
        : importedCandidates.length === 1
          ? [buildEditedDiscoveryArticle(importedCandidates[0], draftState)]
          : importedCandidates.map((candidate) => buildDiscoveryArticle(candidate));

    const effectiveRunMode = stagedArticles.length > 1 ? RunMode.MULTI_ARTICLE : runMode;
    const effectiveIntakeMode =
      importedCandidates.length > 0
        ? stagedArticles.every((article) => article.source_completeness === 'unresolved')
          ? 'manual_url'
          : 'manual_text'
        : intakeMode;

    const nextOutput = await executePipeline({
      run_id: `run-${Date.now()}`,
      contract_id: contractId,
      run_mode: effectiveRunMode,
      intake_mode: effectiveIntakeMode,
      articles: stagedArticles
    });

    startTransition(() => {
      setOutput(nextOutput);
    });
  };

  const onLoadSample = () => {
    applyDraft(contractId, 'fixture');
  };

  return (
    <main className="workbench">
      <header className="hero">
        <div>
          <p className="eyebrow">Market-Intelligence Workbench</p>
          <h1>Doctrine-Grounded Futures Bias Briefs</h1>
        </div>
        <div className="hero-copy">
          <p>{objective}</p>
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
        </div>
      </header>

      <section className="panel-grid">
        <div className="panel panel-wide">
          <DiscoveryPanel
            contractId={contractId}
            recencyWindowHours={recencyWindowHours}
            setRecencyWindowHours={setRecencyWindowHours}
            discovery={discovery}
            loading={discoveryLoading}
            selectedCandidateIds={selectedCandidateIds}
            onToggleCandidate={onToggleCandidate}
            onDiscover={onDiscover}
            onImportSelected={onImportSelected}
            onClearSelection={clearImportedSelection}
            importedSummary={importedSelectionSummary}
          />
        </div>

        <div className="panel panel-wide">
          <SourceIntake
            contractId={contractId}
            setContractId={(next) => {
              setContractId(next);
              applyDraft(next, 'manual_text');
            }}
            runMode={runMode}
            setRunMode={setRunMode}
            intakeMode={intakeMode}
            setIntakeMode={setIntakeMode}
            headline={headline}
            setHeadline={setHeadline}
            bodyExcerpt={bodyExcerpt}
            setBodyExcerpt={setBodyExcerpt}
            sourceType={sourceType}
            setSourceType={setSourceType}
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            publisher={publisher}
            setPublisher={setPublisher}
            publishedAt={publishedAt}
            setPublishedAt={setPublishedAt}
            sourceCompleteness={sourceCompleteness}
            setSourceCompleteness={setSourceCompleteness}
            onRun={onRun}
            onLoadSample={onLoadSample}
            objective={objective}
            focus={focus}
            parsedCount={parsedCount}
            importedSelectionSummary={importedSelectionSummary}
            onClearImportedSelection={clearImportedSelection}
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
          <DeploymentView
            biasBrief={output?.bias_brief ?? null}
            deploymentUse={output?.deployment_use ?? DeploymentUse.NO_TRADE}
            terminalOutcome={output?.terminal_outcome}
          />
        </div>
        <div className="panel panel-wide">
          <ProvenanceView provenance={output?.provenance ?? null} />
        </div>
      </section>
    </main>
  );
}
