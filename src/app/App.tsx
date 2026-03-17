import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { contractOverrides } from '../domain/contracts';
import { IntakeMode, RunOutput, SourceCompleteness } from '../domain/entities';
import { ContractId, DeploymentUse, RunMode, SourceType } from '../domain/enums';
import { executePipeline } from '../engine/pipeline';
import { ClientReasonerRuntimeStatus, fetchClientReasonerStatus } from './runtimeConfig';
import { AnalysisView } from '../ui/AnalysisView';
import { ClusterView } from '../ui/ClusterView';
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
    setOutput(null);
  };

  const parsedCount = useMemo(() => {
    if (intakeMode === 'manual_url') {
      return deferredSourceUrl.trim() ? 1 : 0;
    }

    return deferredHeadline.trim() || deferredBodyExcerpt.trim() ? 1 : 0;
  }, [deferredBodyExcerpt, deferredHeadline, deferredSourceUrl, intakeMode]);

  const onRun = async () => {
    const nextOutput = await executePipeline({
      run_id: `run-${Date.now()}`,
      contract_id: contractId,
      run_mode: runMode,
      intake_mode: intakeMode,
      articles: [
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
