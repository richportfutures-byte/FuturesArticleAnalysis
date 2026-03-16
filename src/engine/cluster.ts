import { buildTrace, ContractOverride } from '../domain/contracts/types';
import { NarrativeCluster } from '../domain/entities';
import { ClusterMode, SourceSurvival, SourceType } from '../domain/enums';
import { ScreenedArticle } from './screen';

const sourceRank = (sourceType: SourceType): number => {
  switch (sourceType) {
    case SourceType.OFFICIAL_STATEMENT:
      return 4;
    case SourceType.PRIMARY_REPORTING:
      return 3;
    case SourceType.SYNTHESIS:
      return 2;
    case SourceType.COMMENTARY:
      return 1;
    default:
      return 0;
  }
};

export const runCluster = (override: ContractOverride, screenedArticles: ScreenedArticle[]) => {
  const matchedChannels = Array.from(new Set(screenedArticles.flatMap((entry) => entry.matchedChannels)));
  const selected = screenedArticles.filter((entry) => entry.result === SourceSurvival.SELECTED || entry.result === SourceSurvival.CONTEXT_ONLY);
  const primaryCount = selected.filter(
    (entry) => entry.article.source_type === SourceType.PRIMARY_REPORTING || entry.article.source_type === SourceType.OFFICIAL_STATEMENT
  ).length;
  const commentaryCount = selected.filter((entry) => entry.article.source_type === SourceType.COMMENTARY).length;

  let mode = ClusterMode.NONE;
  if (matchedChannels.length === 0) {
    mode = ClusterMode.NONE;
  } else if (commentaryCount > 0 && primaryCount === 0) {
    mode = ClusterMode.POST_HOC;
  } else if (primaryCount > 1 && commentaryCount > 0) {
    mode = ClusterMode.MIXED;
  } else if (selected.length > 1) {
    mode = ClusterMode.DISCOVERY;
  }

  const ranked = [...selected].sort((left, right) => sourceRank(right.article.source_type) - sourceRank(left.article.source_type));
  const cluster: NarrativeCluster = {
    cluster_id: `cluster-${Date.now()}`,
    contract_id: override.meta.id,
    cluster_mode: mode,
    common_facts: matchedChannels.map((channel) => `${channel} appears across the surviving source set.`),
    disputed_claims:
      commentaryCount > 0 ? ['Lower-quality commentary diverges from the stronger source map on the same catalyst.'] : [],
    strongest_source_article_id: ranked[0]?.article.article_id ?? null,
    weakest_source_article_id: ranked[ranked.length - 1]?.article.article_id ?? null,
    newness_confidence: primaryCount > 0 ? 0.8 : matchedChannels.length > 0 ? 0.4 : 0.1,
    tradability_class:
      matchedChannels.length === 0 ? 'noise' : selected.some((entry) => entry.result === SourceSurvival.SELECTED) ? 'tradable' : 'context_only'
  };

  const trace = [
    buildTrace(
      'cluster',
      override.ruleRefs.clustering,
      `Clustered ${selected.length} surviving article(s) as ${mode} across channels: ${matchedChannels.join(', ') || 'none'}.`,
      true
    )
  ];

  return { cluster, trace };
};
