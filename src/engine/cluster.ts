import { ContractId, ClusterMode, SourceType } from '../domain/enums';
import { NarrativeCluster } from '../domain/entities';

export const runCluster = (contractId: ContractId, selectedIds: string[], sourceTypes: SourceType[]): NarrativeCluster => {
  const mode = sourceTypes.includes(SourceType.COMMENTARY)
    ? sourceTypes.some((s) => s === SourceType.PRIMARY_REPORTING || s === SourceType.OFFICIAL_STATEMENT)
      ? ClusterMode.MIXED
      : ClusterMode.POST_HOC
    : selectedIds.length > 1
      ? ClusterMode.DISCOVERY
      : ClusterMode.NONE;

  return {
    cluster_id: `cluster-${Date.now()}`,
    contract_id: contractId,
    cluster_mode: mode,
    common_facts: selectedIds.length ? ['Primary catalyst thread identified'] : [],
    disputed_claims: sourceTypes.includes(SourceType.COMMENTARY) ? ['Commentary attribution differs from primary reporting'] : [],
    strongest_source_article_id: selectedIds[0] ?? null,
    weakest_source_article_id: selectedIds[selectedIds.length - 1] ?? null,
    newness_confidence: selectedIds.length ? 0.7 : 0.1,
    tradability_class: selectedIds.length ? 'tradable' : 'noise'
  };
};
