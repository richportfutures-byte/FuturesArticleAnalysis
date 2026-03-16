import React from 'react';
import { ContractId, RunMode } from '../domain/enums';

type Props = {
  contractId: ContractId;
  setContractId: (id: ContractId) => void;
  runMode: RunMode;
  setRunMode: (mode: RunMode) => void;
  articleText: string;
  setArticleText: (v: string) => void;
  onRun: () => void;
};

export const SourceIntake = ({ contractId, setContractId, runMode, setRunMode, articleText, setArticleText, onRun }: Props) => (
  <section>
    <h2>Source Intake</h2>
    <label>Contract </label>
    <select value={contractId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContractId(e.target.value as ContractId)}>
      {Object.values(ContractId).map((id) => (
        <option key={id} value={id}>{id}</option>
      ))}
    </select>
    <label> Run mode </label>
    <select value={runMode} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRunMode(e.target.value as RunMode)}>
      <option value={RunMode.SINGLE_ARTICLE}>single_article</option>
      <option value={RunMode.MULTI_ARTICLE}>multi_article</option>
    </select>
    <div>
      <textarea rows={6} cols={90} value={articleText} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setArticleText(e.target.value)} placeholder="Paste one or multiple article lines" />
    </div>
    <button onClick={onRun}>Run workflow</button>
  </section>
);
