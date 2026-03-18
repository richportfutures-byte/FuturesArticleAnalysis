import { useDeferredValue, useMemo, useState } from 'react';
import type { DiscoveryCandidate, IntakeMode } from '../domain/entities';
import { ContractId, RunMode } from '../domain/enums';
import type { PersistedWorkspaceSnapshotV1 } from './workbenchState';
import { sampleDrafts, type IntakeDraftState } from './workbenchState';

type UseIntakeDraftOptions = {
  initialWorkspace: PersistedWorkspaceSnapshotV1 | null;
};

export const useIntakeDraft = ({ initialWorkspace }: UseIntakeDraftOptions) => {
  const initialContractId = initialWorkspace?.contract_id ?? ContractId.NQ;
  const [contractId, setContractId] = useState<ContractId>(initialContractId);
  const [runMode, setRunMode] = useState<RunMode>(initialWorkspace?.run_mode ?? RunMode.SINGLE_ARTICLE);
  const [intakeMode, setIntakeMode] = useState<IntakeMode>(initialWorkspace?.intake_mode ?? 'manual_text');
  const [draft, setDraft] = useState<IntakeDraftState>(initialWorkspace?.intake_draft ?? sampleDrafts[initialContractId]);
  const [importedCandidates, setImportedCandidates] = useState<DiscoveryCandidate[]>([]);

  const deferredHeadline = useDeferredValue(draft.headline);
  const deferredBodyExcerpt = useDeferredValue(draft.bodyExcerpt);
  const deferredSourceUrl = useDeferredValue(draft.sourceUrl);

  const updateDraft = (patch: Partial<IntakeDraftState>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const applySampleDraft = (nextContractId: ContractId, nextMode: IntakeMode) => {
    setContractId(nextContractId);
    setIntakeMode(nextMode);
    setDraft(sampleDrafts[nextContractId]);
    setImportedCandidates([]);
  };

  const loadFixtureSample = () => {
    applySampleDraft(contractId, 'fixture');
  };

  const stageImportedCandidates = (candidates: DiscoveryCandidate[]) => {
    if (candidates.length === 0) {
      return;
    }

    setImportedCandidates(candidates);
    setRunMode(candidates.length > 1 ? RunMode.MULTI_ARTICLE : RunMode.SINGLE_ARTICLE);

    const first = candidates[0];
    setDraft({
      headline: first.title,
      bodyExcerpt: first.import_excerpt,
      sourceType: first.source_type,
      sourceUrl: first.url ?? '',
      publisher: first.source_name,
      publishedAt: first.published_at ?? '',
      sourceCompleteness: first.source_completeness
    });
    setIntakeMode(candidates.every((candidate) => candidate.source_completeness === 'unresolved') ? 'manual_url' : 'manual_text');
  };

  const clearImportedSelection = () => {
    setImportedCandidates([]);
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
    if (importedCandidates.length === 0) {
      return null;
    }

    const readinessMix = Array.from(new Set(importedCandidates.map((candidate) => candidate.source_completeness))).join(', ');
    return `${importedCandidates.length} discovery candidate(s) staged (${readinessMix})`;
  }, [importedCandidates]);

  return {
    contractId,
    runMode,
    intakeMode,
    draft,
    importedCandidates,
    parsedCount,
    importedSelectionSummary,
    setRunMode,
    setIntakeMode,
    updateDraft,
    applySampleDraft,
    loadFixtureSample,
    stageImportedCandidates,
    clearImportedSelection
  };
};
