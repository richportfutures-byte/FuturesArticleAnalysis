import type { ChangeEvent } from 'react';
import { IntakeMode, SourceCompleteness } from '../domain/entities';
import { ContractId, RunMode, SourceType } from '../domain/enums';

type Props = {
  contractId: ContractId;
  setContractId: (id: ContractId) => void;
  runMode: RunMode;
  setRunMode: (mode: RunMode) => void;
  intakeMode: IntakeMode;
  setIntakeMode: (mode: IntakeMode) => void;
  headline: string;
  setHeadline: (value: string) => void;
  bodyExcerpt: string;
  setBodyExcerpt: (value: string) => void;
  sourceType: SourceType;
  setSourceType: (value: SourceType) => void;
  sourceUrl: string;
  setSourceUrl: (value: string) => void;
  publisher: string;
  setPublisher: (value: string) => void;
  publishedAt: string;
  setPublishedAt: (value: string) => void;
  sourceCompleteness: SourceCompleteness;
  setSourceCompleteness: (value: SourceCompleteness) => void;
  onRun: () => void;
  onLoadSample: () => void;
  objective: string;
  focus: string;
  parsedCount: number;
  importedSelectionSummary?: string | null;
  onClearImportedSelection?: () => void;
};

export const SourceIntake = ({
  contractId,
  setContractId,
  runMode,
  setRunMode,
  intakeMode,
  setIntakeMode,
  headline,
  setHeadline,
  bodyExcerpt,
  setBodyExcerpt,
  sourceType,
  setSourceType,
  sourceUrl,
  setSourceUrl,
  publisher,
  setPublisher,
  publishedAt,
  setPublishedAt,
  sourceCompleteness,
  setSourceCompleteness,
  onRun,
  onLoadSample,
  objective,
  focus,
  parsedCount,
  importedSelectionSummary,
  onClearImportedSelection
}: Props) => (
  <section className="section-copy">
    <h2>Source Intake</h2>
    <p>{objective}</p>
    <p className="muted">
      Doctrine focus: <span className="mono">{focus}</span>
    </p>
    {importedSelectionSummary ? (
      <p className="muted">
        Imported discovery selection active: {importedSelectionSummary}. Generate bias brief will run on the imported candidate set unless you clear it.
      </p>
    ) : null}

    <div className="form-grid">
      <div className="input-row">
        <label>
          Contract
          <select value={contractId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setContractId(e.target.value as ContractId)}>
            {Object.values(ContractId).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>

        <label>
          Run mode
          <select value={runMode} onChange={(e: ChangeEvent<HTMLSelectElement>) => setRunMode(e.target.value as RunMode)}>
            <option value={RunMode.SINGLE_ARTICLE}>single_article</option>
            <option value={RunMode.MULTI_ARTICLE}>multi_article</option>
          </select>
        </label>

        <label>
          Intake mode
          <select value={intakeMode} onChange={(e: ChangeEvent<HTMLSelectElement>) => setIntakeMode(e.target.value as IntakeMode)}>
            <option value="manual_text">manual_text</option>
            <option value="manual_url">manual_url</option>
            <option value="fixture">fixture</option>
          </select>
        </label>
      </div>

      <div className="input-row">
        <label>
          Headline / title
          <input value={headline} onChange={(e: ChangeEvent<HTMLInputElement>) => setHeadline(e.target.value)} placeholder="Article headline" />
        </label>

        <label>
          Source type
          <select value={sourceType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSourceType(e.target.value as SourceType)}>
            {Object.values(SourceType).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="input-row">
        <label>
          Source URL
          <input value={sourceUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => setSourceUrl(e.target.value)} placeholder="https://..." />
        </label>

        <label>
          Publisher / source label
          <input value={publisher} onChange={(e: ChangeEvent<HTMLInputElement>) => setPublisher(e.target.value)} placeholder="Reuters, WSJ, official desk" />
        </label>

        <label>
          Published timestamp
          <input
            value={publishedAt}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPublishedAt(e.target.value)}
            placeholder="2026-03-16T08:30:00Z"
          />
        </label>
      </div>

      {intakeMode === 'manual_url' ? (
        <p className="muted">
          URL mode records metadata only in this patch. It does not fetch or extract article text, so URL-only runs fail closed with explicit unresolved provenance.
        </p>
      ) : (
        <>
          <label>
            Content completeness
            <select
              value={sourceCompleteness}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSourceCompleteness(e.target.value as SourceCompleteness)}
            >
              <option value="full_text">full_text</option>
              <option value="partial_text">partial_text</option>
            </select>
          </label>

          <textarea
            value={bodyExcerpt}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBodyExcerpt(e.target.value)}
            placeholder="Paste article text or excerpt here"
          />
        </>
      )}

      <div className="button-row">
        <button type="button" onClick={onRun}>
          Generate bias brief
        </button>
        <button type="button" className="secondary" onClick={onLoadSample}>
          Load fixture sample
        </button>
        {importedSelectionSummary && onClearImportedSelection ? (
          <button type="button" className="secondary" onClick={onClearImportedSelection}>
            Clear imported selection
          </button>
        ) : null}
      </div>

      <div className="pill-row">
        <span className="pill accent">{contractId}</span>
        <span className="pill">{runMode}</span>
        <span className="pill">{intakeMode}</span>
        {intakeMode === 'manual_url' ? <span className="pill">unresolved capture</span> : <span className="pill">{sourceCompleteness}</span>}
        <span className="pill">{parsedCount} prepared article(s)</span>
      </div>
    </div>
  </section>
);
