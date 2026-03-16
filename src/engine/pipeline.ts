import { contractOverrides } from '../domain/contracts';
import { buildTrace } from '../domain/contracts/types';
import { RunOutput } from '../domain/entities';
import { appendRuleTrace, baseProvenance } from '../domain/provenance';
import { resolveRunMode, validateInput } from '../domain/rules';
import { ContractId, DeploymentUse, SourceSurvival, WorkflowState } from '../domain/enums';
import { runAnalyze } from './analyze';
import { runCluster } from './cluster';
import { runDeploy } from './deploy';
import { runScreen } from './screen';
import { assertTransition } from './stateMachine';
import { runTranslate } from './translate';
import { RunInput } from '../schemas/input';

export const executePipeline = (input: RunInput): RunOutput => {
  const errors = validateInput(input.contract_id, input.articles);
  let state = WorkflowState.DRAFT;
  const provenance = baseProvenance();

  if (errors.length > 0) {
    return {
      run_id: input.run_id,
      contract_id: input.contract_id,
      run_mode: input.run_mode,
      state: WorkflowState.ERROR,
      screen_result: SourceSurvival.IRRELEVANT,
      cluster: null,
      analysis: null,
      translation: null,
      deployment_use: DeploymentUse.NO_TRADE,
      active_hours_context: null,
      provenance: { ...provenance, notes: [...provenance.notes, ...errors] }
    };
  }

  assertTransition(state, WorkflowState.INTAKE);
  state = WorkflowState.INTAKE;

  const override = contractOverrides[input.contract_id as ContractId];
  provenance.contract_override_ids.push(override.override_id);
  appendRuleTrace(provenance, [
    buildTrace('pipeline', {
      rule_id: override.override_id,
      source_files: override.source_files,
      detail: `Loaded ${override.meta.id} override.`
    })
  ]);

  assertTransition(state, WorkflowState.SCREEN);
  state = WorkflowState.SCREEN;
  const screened = runScreen(input.articles, override);
  appendRuleTrace(provenance, screened.trace);
  const selectedArticles = screened.surviving.map((entry) => entry.article);

  const selectedCount = screened.results.filter((entry) => entry.result === SourceSurvival.SELECTED).length;
  let screenResult = SourceSurvival.SELECTED;
  if (selectedCount === 0 && screened.surviving.length === 0) {
    return {
      run_id: input.run_id,
      contract_id: input.contract_id,
      run_mode: resolveRunMode(input.articles),
      state: WorkflowState.COMPLETED,
      screen_result: SourceSurvival.IRRELEVANT,
      terminal_outcome: 'no_edge',
      cluster: null,
      analysis: null,
      translation: null,
      deployment_use: DeploymentUse.IGNORE,
      active_hours_context: null,
      provenance
    };
  }
  if (selectedCount === 0) screenResult = SourceSurvival.CONTEXT_ONLY;

  assertTransition(state, WorkflowState.CLUSTER);
  state = WorkflowState.CLUSTER;
  const clustered = runCluster(override, screened.surviving);
  appendRuleTrace(provenance, clustered.trace);
  const cluster = clustered.cluster;
  if (cluster.tradability_class === 'noise') {
    return {
      run_id: input.run_id,
      contract_id: input.contract_id,
      run_mode: input.run_mode,
      state: WorkflowState.COMPLETED,
      screen_result: SourceSurvival.NOISE,
      terminal_outcome: 'noise',
      cluster,
      analysis: null,
      translation: null,
      deployment_use: DeploymentUse.IGNORE,
      active_hours_context: null,
      provenance
    };
  }

  assertTransition(state, WorkflowState.ANALYZE);
  state = WorkflowState.ANALYZE;
  const analyzed = runAnalyze(selectedArticles, override, cluster);
  appendRuleTrace(provenance, analyzed.trace);
  const analysis = analyzed.analysis;
  if (analysis.confirmed_facts.length === 0) {
    return {
      run_id: input.run_id,
      contract_id: input.contract_id,
      run_mode: input.run_mode,
      state: WorkflowState.COMPLETED,
      screen_result: screenResult,
      terminal_outcome: 'insufficient_evidence',
      cluster,
      analysis,
      translation: null,
      deployment_use: DeploymentUse.NO_TRADE,
      active_hours_context: null,
      provenance
    };
  }

  assertTransition(state, WorkflowState.TRANSLATE);
  state = WorkflowState.TRANSLATE;
  const translated = runTranslate(override, analysis, cluster, selectedArticles.map((article) => article.source_type));
  appendRuleTrace(provenance, translated.trace);

  if (!translated.translation) {
    return {
      run_id: input.run_id,
      contract_id: input.contract_id,
      run_mode: input.run_mode,
      state: WorkflowState.COMPLETED,
      screen_result: screenResult,
      terminal_outcome: 'no_edge',
      cluster,
      analysis,
      translation: null,
      deployment_use: DeploymentUse.NO_TRADE,
      active_hours_context: null,
      provenance
    };
  }

  const translation = translated.translation;
  assertTransition(state, WorkflowState.DEPLOY);
  state = WorkflowState.DEPLOY;
  const deployed = runDeploy(override, translation.verdict, translation.pricing_assessment);
  appendRuleTrace(provenance, deployed.trace);

  assertTransition(state, WorkflowState.PRE_TRADE_REVIEW);
  state = WorkflowState.PRE_TRADE_REVIEW;
  assertTransition(state, WorkflowState.COMPLETED);
  state = WorkflowState.COMPLETED;

  appendRuleTrace(provenance, [
    buildTrace(
      'pipeline',
      override.ruleRefs.activeHours,
      `Active-hours context added for ${override.meta.id}${translation.selected_channels.length ? ` with channels ${translation.selected_channels.join(', ')}` : ''}.`
    )
  ]);

  return {
    run_id: input.run_id,
    contract_id: input.contract_id,
    run_mode: input.run_mode,
    state,
    screen_result: screenResult,
    cluster,
    analysis,
    translation,
    deployment_use: deployed.deploymentUse,
    active_hours_context: {
      structural_windows: override.activeHours.structural_windows,
      event_windows: override.activeHours.event_windows,
      dominant_side: override.classifySide?.(analysis, translation.selected_channels)
    },
    provenance
  };
};
