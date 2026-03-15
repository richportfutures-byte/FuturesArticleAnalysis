import { useMemo, useState } from 'react';
import { executePipeline } from '../engine/pipeline';
import { runPreTradeChecks } from '../engine/preTrade';
import { ContractId, DeploymentUse, RunMode, SourceType } from '../domain/enums';
import { RunOutput } from '../domain/entities';
import { SourceIntake } from '../ui/SourceIntake';
import { ScreeningView } from '../ui/ScreeningView';
import { ClusterView } from '../ui/ClusterView';
import { AnalysisView } from '../ui/AnalysisView';
import { TranslationView } from '../ui/TranslationView';
import { DeploymentView } from '../ui/DeploymentView';
import { PreTradeReview } from '../ui/PreTradeReview';
import { PostReactionReview } from '../ui/PostReactionReview';
import { ProvenanceView } from '../ui/ProvenanceView';

export default function App() {
  const [contractId, setContractId] = useState<ContractId>(ContractId.NQ);
  const [runMode, setRunMode] = useState<RunMode>(RunMode.SINGLE_ARTICLE);
  const [articleText, setArticleText] = useState('Hot inflation surprise pushes yields higher as megacap tech weakens');
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [screenRows, setScreenRows] = useState<Array<{ headline: string; result: string; hasChannel: boolean }>>([]);

  const preTradeChecks = useMemo(() => (output?.translation ? runPreTradeChecks(output.translation) : []), [output]);

  const onRun = () => {
    const lines = articleText.split('\n').filter((line) => Boolean(line));
    const articles = lines.map((headline: string, i: number) => ({
      article_id: `article-${i + 1}`,
      headline,
      body_excerpt: headline,
      source_type: i === 0 ? SourceType.PRIMARY_REPORTING : SourceType.COMMENTARY,
      published_at: null,
      url: null
    }));

    const run = executePipeline({
      run_id: `run-${Date.now()}`,
      contract_id: contractId,
      run_mode: runMode,
      articles
    });
    setOutput(run);

    setScreenRows(
      articles.map((a: { headline: string }) => ({
        headline: a.headline,
        result: run.screen_result,
        hasChannel: run.translation ? run.translation.selected_channels.length > 0 : false
      }))
    );
  };

  return (
    <main style={{ fontFamily: 'Arial, sans-serif', padding: 16 }}>
      <h1>Contract Prompt Library Workbench</h1>
      <SourceIntake {...{ contractId, setContractId, runMode, setRunMode, articleText, setArticleText, onRun }} />
      <ScreeningView rows={screenRows} />
      <ClusterView cluster={output?.cluster ?? null} />
      <AnalysisView analysis={output?.analysis ?? null} />
      <TranslationView translation={output?.translation ?? null} />
      <DeploymentView deploymentUse={output?.deployment_use ?? DeploymentUse.NO_TRADE} note={output?.translation?.trade_use_note} />
      <PreTradeReview checks={preTradeChecks} />
      <PostReactionReview />
      <ProvenanceView provenance={output?.provenance ?? null} />
    </main>
  );
}
