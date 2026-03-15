import { contractOverrides } from '../domain/contracts';
import { RunOutput } from '../domain/entities';
import { baseProvenance } from '../domain/provenance';
import { resolveRunMode, validateInput } from '../domain/rules';
import { ContractId, DeploymentUse, RunMode, SourceSurvival, WorkflowState } from '../domain/enums';
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

  assertTransition(state, WorkflowState.SCREEN);
  state = WorkflowState.SCREEN;
  const screen = runScreen(input.articles, override);
  const selectedArticles = screen.surviving.map((s) => s.article);

  const selectedCount = screen.results.filter((r) => r.result === SourceSurvival.SELECTED).length;
  let screenResult = SourceSurvival.SELECTED;
  if (selectedCount === 0 && screen.surviving.length === 0) {
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
  const cluster = runCluster(input.contract_id, selectedArticles.map((a) => a.article_id), selectedArticles.map((a) => a.source_type));
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
  const analysis = runAnalyze(selectedArticles);
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

  try {
    const translation = runTranslate(override, analysis, cluster, selectedArticles.map((a) => a.source_type));
    assertTransition(state, WorkflowState.DEPLOY);
    state = WorkflowState.DEPLOY;
    const deployment_use = runDeploy(translation.verdict, translation.pricing_assessment);

    assertTransition(state, WorkflowState.PRE_TRADE_REVIEW);
    state = WorkflowState.PRE_TRADE_REVIEW;
    assertTransition(state, WorkflowState.COMPLETED);
    state = WorkflowState.COMPLETED;

    return {
      run_id: input.run_id,
      contract_id: input.contract_id,
      run_mode: input.run_mode,
      state,
      screen_result: screenResult,
      cluster,
      analysis,
      translation,
      deployment_use,
      active_hours_context: {
        structural_windows: override.activeHours.structural_windows,
        event_windows: override.activeHours.event_windows,
        dominant_side: override.classifySide?.(analysis)
      },
      provenance: { ...provenance, rule_ids: ['RULE_STAGE_ORDER', 'RULE_FAIL_CLOSED_TRANSLATION', 'RULE_NO_EXACT_EXECUTION_OUTPUT'] }
    };
  } catch {
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
};
