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
  const selected = screenedArticles.filter((entry) => entry.result === SourceSurvival.SELECTED || entry.result === SourceSurvival.CONTEXT_ONLY);
  const matchedChannels = Array.from(new Set(selected.flatMap((entry) => entry.matchedChannels)));
  const frequency = new Map<string, number>();
  matchedChannels.forEach((channel) => frequency.set(channel, 0));
  selected.forEach((entry) => entry.matchedChannels.forEach((channel) => frequency.set(channel, (frequency.get(channel) ?? 0) + 1)));
  const dominantDrivers = Array.from(frequency.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([driver]) => driver)
    .slice(0, 3);

  const primaryCount = selected.filter(
    (entry) => entry.article.source_type === SourceType.PRIMARY_REPORTING || entry.article.source_type === SourceType.OFFICIAL_STATEMENT
  ).length;
  const commentaryCount = selected.filter((entry) => entry.article.source_type === SourceType.COMMENTARY).length;

  let mode = ClusterMode.NONE;
  if (selected.length === 0 || matchedChannels.length === 0) {
    mode = ClusterMode.NONE;
  } else if (commentaryCount > 0 && primaryCount === 0) {
    mode = ClusterMode.POST_HOC;
  } else if (primaryCount > 1 && commentaryCount > 0) {
    mode = ClusterMode.MIXED;
  } else if (selected.length > 1 && dominantDrivers.length === 1) {
    mode = ClusterMode.CONSENSUS;
  } else if (selected.length > 1) {
    mode = ClusterMode.DISCOVERY;
  }

  const ranked = [...selected].sort((left, right) => sourceRank(right.article.source_type) - sourceRank(left.article.source_type));
  const cluster: NarrativeCluster = {
    cluster_id: `cluster-${override.meta.id.toLowerCase()}-${selected.map((entry) => entry.article.article_id).join('-') || 'none'}`,
    contract_id: override.meta.id,
    cluster_mode: mode,
    theme: dominantDrivers.join(' / ') || 'no durable doctrine-backed theme',
    article_ids: selected.map((entry) => entry.article.article_id),
    dominant_narrative:
      dominantDrivers.length > 0
        ? `The surviving source set centers on ${dominantDrivers.join(', ')} as the dominant contract transmission map.`
        : 'No durable doctrine-backed narrative survived screening.',
    source_map: selected.map(
      (entry) => `${entry.article.article_id} [${entry.article.source_type}] -> ${entry.matchedChannels.join(', ') || 'no matched driver'}`
    ),
    common_facts:
      primaryCount > 0
        ? selected
            .filter((entry) => entry.article.source_type === SourceType.PRIMARY_REPORTING || entry.article.source_type === SourceType.OFFICIAL_STATEMENT)
            .map((entry) => entry.article.headline)
            .slice(0, 3)
        : matchedChannels.map((channel) => `${channel} appears across the surviving source set.`),
    disputed_claims:
      commentaryCount > 0 || dominantDrivers.length > 1
        ? ['Competing narratives or lower-quality framing remain in the surviving cluster and need doctrine validation.']
        : [],
    strongest_source_article_id: ranked[0]?.article.article_id ?? null,
    weakest_source_article_id: ranked[ranked.length - 1]?.article.article_id ?? null,
    newness_confidence: primaryCount > 1 ? 0.9 : primaryCount === 1 ? 0.7 : matchedChannels.length > 0 ? 0.45 : 0.1,
    tradability_class:
      matchedChannels.length === 0 ? 'noise' : selected.some((entry) => entry.result === SourceSurvival.SELECTED) ? 'tradable' : 'context_only'
  };

  const trace = [
    buildTrace(
      'cluster',
      override.ruleRefs.clustering,
      `Clustered ${selected.length} surviving article(s) as ${mode} around theme: ${cluster.theme}.`,
      true
    )
  ];

  return { cluster, trace };
};
