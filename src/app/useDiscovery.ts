import { startTransition, useMemo, useState } from 'react';
import type { CrossContractScanSummary, DiscoveryCandidate, DiscoverySummary } from '../domain/entities';
import { ContractId } from '../domain/enums';
import { runCrossContractMorningCoverageScan, runDiscovery } from '../engine/discover';
import type { DiscoveryMode, PersistedWorkspaceSnapshotV1 } from './workbenchState';

type UseDiscoveryOptions = {
  contractId: ContractId;
  initialWorkspace: PersistedWorkspaceSnapshotV1 | null;
};

export const useDiscovery = ({ contractId, initialWorkspace }: UseDiscoveryOptions) => {
  const [discoveryMode, setDiscoveryModeState] = useState<DiscoveryMode>(initialWorkspace?.discovery_mode ?? 'morning_coverage');
  const [recencyWindowHours, setRecencyWindowHours] = useState(initialWorkspace?.recency_window_hours ?? 72);
  const [contractDiscovery, setContractDiscovery] = useState<DiscoverySummary | null>(null);
  const [morningCoverage, setMorningCoverage] = useState<CrossContractScanSummary | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  const candidatePool = useMemo(
    () => (discoveryMode === 'morning_coverage' ? morningCoverage?.candidates ?? [] : contractDiscovery?.candidates ?? []),
    [contractDiscovery?.candidates, discoveryMode, morningCoverage?.candidates]
  );

  const selectedCandidates = useMemo(
    () => candidatePool.filter((candidate) => selectedCandidateIds.includes(candidate.id)),
    [candidatePool, selectedCandidateIds]
  );

  const setDiscoveryMode = (nextMode: DiscoveryMode) => {
    setDiscoveryModeState(nextMode);
    setSelectedCandidateIds([]);
  };

  const toggleCandidate = (candidateId: string) => {
    setSelectedCandidateIds((current) =>
      current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]
    );
  };

  const discover = async () => {
    setDiscoveryLoading(true);

    try {
      const nextDiscovery =
        discoveryMode === 'morning_coverage'
          ? await runCrossContractMorningCoverageScan({
              recency_window_hours: recencyWindowHours,
              max_results: 18
            })
          : await runDiscovery({
              contract_id: contractId,
              recency_window_hours: recencyWindowHours,
              max_results: 12
            });

      startTransition(() => {
        if (discoveryMode === 'morning_coverage') {
          setMorningCoverage(nextDiscovery as CrossContractScanSummary);
        } else {
          setContractDiscovery(nextDiscovery as DiscoverySummary);
        }
        setSelectedCandidateIds([]);
        setDiscoveryLoading(false);
      });
    } catch (error) {
      startTransition(() => {
        setDiscoveryLoading(false);
      });
      throw error;
    }
  };

  const clearSelection = () => {
    setSelectedCandidateIds([]);
  };

  const resetDiscovery = () => {
    setContractDiscovery(null);
    setMorningCoverage(null);
    setSelectedCandidateIds([]);
  };

  return {
    discoveryMode,
    recencyWindowHours,
    contractDiscovery,
    morningCoverage,
    discoveryLoading,
    selectedCandidateIds,
    selectedCandidates,
    setDiscoveryMode,
    setRecencyWindowHours,
    toggleCandidate,
    discover,
    clearSelection,
    resetDiscovery
  };
};
