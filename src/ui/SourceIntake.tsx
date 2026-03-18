import type { ChangeEvent } from 'react';
import type { IntakeMode } from '../domain/entities';
import { ContractId, RunMode, SourceType } from '../domain/enums';
import type { IntakeDraftState } from '../app/workbenchState';

type Props = {
  contractId: ContractId;
  onContractChange: (id: ContractId) => void;
  runMode: RunMode;
  setRunMode: (mode: RunMode) => void;
  intakeMode: IntakeMode;
  setIntakeMode: (mode: IntakeMode) => void;
  draft: IntakeDraftState;
  updateDraft: (patch: Partial<IntakeDraftState>) => void;
  onRun: () => void;
  onLoadSample: () => void;
  parsedCount: number;
  importedSelectionSummary?: string | null;
  onClearImportedSelection?: () => void;
};

export const SourceIntake = ({
  contractId,
  onContractChange,
  runMode,
  setRunMode,
  intakeMode,
  setIntakeMode,
  draft,
  updateDraft,
  onRun,
  onLoadSample,
  parsedCount,
  importedSelectionSummary,
  onClearImportedSelection
}: Props) => (
  <section className="section-copy">
    <h2>Source Intake</h2>
    {importedSelectionSummary ? (
      <p className="muted">
        Imported discovery selection active: {importedSelectionSummary}. Generate bias brief will run on the imported candidate set unless you clear it.
      </p>
    ) : null}

    <div className="form-grid">
      <div className="input-row">
        <label>
          Contract
          <select value={contractId} onChange={(e: ChangeEvent<HTMLSelectElement>) => onContractChange(e.target.value as ContractId)}>
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
          <input
            value={draft.headline}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateDraft({ headline: e.target.value })}
            placeholder="Article headline"
          />
        </label>

        <label>
          Source type
          <select
            value={draft.sourceType}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => updateDraft({ sourceType: e.target.value as SourceType })}
          >
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
          <input
            value={draft.sourceUrl}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateDraft({ sourceUrl: e.target.value })}
            placeholder="https://..."
          />
        </label>

        <label>
          Publisher / source label
          <input
            value={draft.publisher}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateDraft({ publisher: e.target.value })}
            placeholder="Reuters, WSJ, official desk"
          />
        </label>

        <label>
          Published timestamp
          <input
            value={draft.publishedAt}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateDraft({ publishedAt: e.target.value })}
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
              value={draft.sourceCompleteness}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                updateDraft({ sourceCompleteness: e.target.value as IntakeDraftState['sourceCompleteness'] })
              }
            >
              <option value="full_text">full_text</option>
              <option value="partial_text">partial_text</option>
            </select>
          </label>

          <textarea
            value={draft.bodyExcerpt}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateDraft({ bodyExcerpt: e.target.value })}
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
        {intakeMode === 'manual_url' ? <span className="pill">unresolved capture</span> : <span className="pill">{draft.sourceCompleteness}</span>}
        <span className="pill">{parsedCount} prepared article(s)</span>
      </div>
    </div>
  </section>
);
