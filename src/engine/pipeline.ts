import { contractOverrides } from '../domain/contracts';
import { buildTrace } from '../domain/contracts/types';
import { IntakeSummary, RunOutput } from '../domain/entities';
import { ContractId, DeploymentUse, SourceSurvival, WorkflowState } from '../domain/enums';
import { appendRuleTrace, baseProvenance } from '../domain/provenance';
import { resolveRunMode } from '../domain/rules';
import { ParsedRunInput, RunInput, RunInputSchema } from '../schemas/input';
import { runAnalyze } from './analyze';
import { runCluster } from './cluster';
import { runDeploy } from './deploy';
import { runIntake } from './intake';
import { LiveReasoningProvider, ReasonerSelectionMode } from './reasoner';
import { runScreen } from './screen';
import { assertTransition } from './stateMachine';
import { runTranslate } from './translate';

const deriveTerminalOutcome = (output: Pick<RunOutput, 'screen_result' | 'cluster' | 'analysis' | 'translation'>) => {
  if (output.screen_result === SourceSurvival.IRRELEVANT) return 'irrelevant' as const;
  if (output.cluster?.tradability_class === 'noise') return 'noise' as const;
  if ((output.analysis?.confirmed_facts.length ?? 0) === 0) return 'insufficient_evidence' as const;
  if (output.translation?.verdict === 'no_edge') return 'no_edge' as const;
  return undefined;
};

type PipelineOptions = {
  reasonerSelection?: ReasonerSelectionMode;
  liveProvider?: LiveReasoningProvider | null;
};

const buildEmptyIntake = (intakeMode: IntakeSummary['intake_mode'] = 'manual_text', issues: string[] = []): IntakeSummary => ({
  intake_mode: intakeMode,
  status: 'unresolved',
  issues,
  normalized_articles: [],
  source_records: [],
  source_completeness_summary: {
    full_text: 0,
    partial_text: 0,
    unresolved: 0
  },
  source_origin_summary: {
    manual_paste: 0,
    manual_url: 0,
    fixture: 0,
    live_fetched: 0
  }
});

const validatePipelineInput = (input: ParsedRunInput): string[] => {
  const errors: string[] = [];

  if (input.articles.length === 0) {
    errors.push('source payload empty');
  }

  if (input.intake_mode === 'manual_text') {
    if (input.articles.some((article) => !article.body_excerpt.trim() && !article.headline.trim())) {
      errors.push('manual_text intake requires pasted article text or a title.');
    }
  }

  if (input.intake_mode === 'manual_url') {
    if (input.articles.some((article) => !article.url?.trim())) {
      errors.push('manual_url intake requires a source URL for each article.');
    }
  }

  if (input.intake_mode === 'fixture') {
    if (input.articles.some((article) => !article.body_excerpt.trim() && !article.headline.trim())) {
      errors.push('fixture intake requires seeded article content.');
    }
  }

  return errors;
};

const appendReasoningProvenance = (
  notes: string[],
  providerStatus: 'simulated' | 'live_provider' | 'failed_provider_path',
  providerId: string
) => {
  if (providerStatus === 'simulated') {
    notes.push(`Reasoning source: explicit simulated mode via ${providerId}.`);
    return;
  }

  if (providerStatus === 'live_provider') {
    notes.push(`Reasoning source: live provider via ${providerId}.`);
    return;
  }

  notes.push(`Reasoning source: failed provider path via ${providerId}.`);
};

const appendDiscoveryImportProvenance = (notes: string[], intakeSources: NonNullable<RunOutput['provenance']['intake_sources']>) => {
  intakeSources
    .filter((entry) => entry.discovery_context)
    .forEach((entry) => {
      const discovery = entry.discovery_context!;
      notes.push(
        `Discovery import: ${entry.article_id} came from ${discovery.search_provider} using query "${discovery.search_query}" over the last ${discovery.recency_window_hours}h with ${discovery.import_readiness} readiness.`
      );

      if (discovery.operator_edits_after_import.length > 0) {
        notes.push(`Operator edits after import for ${entry.article_id}: ${discovery.operator_edits_after_import.join(', ')}.`);
      }
    });
};

export const executePipeline = async (input: RunInput, options: PipelineOptions = {}): Promise<RunOutput> => {
  const parsedInput = RunInputSchema.safeParse(input);
  if (!parsedInput.success) {
    const issues = parsedInput.error.issues.map((issue) => `${issue.path.join('.') || 'input'} ${issue.message}`);
    const provenance = baseProvenance();

    return {
      run_id: input.run_id,
      contract_id: input.contract_id,
      run_mode: input.run_mode,
      state: WorkflowState.ERROR,
      intake: buildEmptyIntake('manual_text', issues),
      screening: {
        articles: [],
        selected_article_ids: [],
        context_article_ids: [],
        rejected_article_ids: [],
        aggregate_result: SourceSurvival.IRRELEVANT
      },
      screen_result: SourceSurvival.IRRELEVANT,
      cluster: null,
      analysis: null,
      translation: null,
      bias_brief: null,
      deployment_use: DeploymentUse.NO_TRADE,
      active_hours_context: null,
      provenance: { ...provenance, notes: [...provenance.notes, ...issues] }
    };
  }

  const runInput = parsedInput.data;
  const errors = validatePipelineInput(runInput);
  let state = WorkflowState.DRAFT;
  const provenance = baseProvenance();

  if (errors.length > 0) {
    return {
      run_id: runInput.run_id,
      contract_id: runInput.contract_id,
      run_mode: runInput.run_mode,
      state: WorkflowState.ERROR,
      intake: buildEmptyIntake(runInput.intake_mode, errors),
      screening: {
        articles: [],
        selected_article_ids: [],
        context_article_ids: [],
        rejected_article_ids: [],
        aggregate_result: SourceSurvival.IRRELEVANT
      },
      screen_result: SourceSurvival.IRRELEVANT,
      cluster: null,
      analysis: null,
      translation: null,
      bias_brief: null,
      deployment_use: DeploymentUse.NO_TRADE,
      active_hours_context: null,
      provenance: { ...provenance, notes: [...provenance.notes, ...errors] }
    };
  }

  assertTransition(state, WorkflowState.INTAKE);
  state = WorkflowState.INTAKE;

  const override = contractOverrides[runInput.contract_id as ContractId];
  provenance.contract_override_ids.push(override.override_id);
  appendRuleTrace(provenance, [
    buildTrace('pipeline', {
      rule_id: override.override_id,
      source_files: override.source_files,
      detail: `Loaded ${override.meta.id} doctrine profile.`
    })
  ]);

  const intake = runIntake(runInput.articles, runInput.contract_id as ContractId, runInput.intake_mode);
  provenance.intake_mode = intake.intake_mode;
  provenance.intake_status = intake.status;
  provenance.intake_sources = intake.source_records;
  if (intake.issues.length > 0) {
    provenance.notes.push(...intake.issues);
  }
  appendDiscoveryImportProvenance(provenance.notes, intake.source_records);
  appendRuleTrace(provenance, intake.trace);

  if (intake.status === 'unresolved') {
    return {
      run_id: runInput.run_id,
      contract_id: runInput.contract_id,
      run_mode: runInput.run_mode,
      state: WorkflowState.ERROR,
      intake,
      screening: {
        articles: [],
        selected_article_ids: [],
        context_article_ids: [],
        rejected_article_ids: [],
        aggregate_result: SourceSurvival.IRRELEVANT
      },
      screen_result: SourceSurvival.IRRELEVANT,
      cluster: null,
      analysis: null,
      translation: null,
      bias_brief: null,
      deployment_use: DeploymentUse.NO_TRADE,
      active_hours_context: null,
      terminal_outcome: 'insufficient_evidence',
      provenance: {
        ...provenance,
        notes: [
          ...provenance.notes,
          'All intake sources are unresolved. The pipeline will not infer article meaning from URL-only or metadata-only inputs.'
        ]
      }
    };
  }

  assertTransition(state, WorkflowState.SCREEN);
  state = WorkflowState.SCREEN;
  const screened = runScreen(intake.normalized_articles, override);
  appendRuleTrace(provenance, screened.trace);
  const selectedArticles = screened.surviving.map((entry) => entry.article);
  const screenResult = screened.screening.aggregate_result;

  assertTransition(state, WorkflowState.CLUSTER);
  state = WorkflowState.CLUSTER;
  const clustered = runCluster(override, screened.surviving);
  appendRuleTrace(provenance, clustered.trace);
  const cluster = clustered.cluster;

  assertTransition(state, WorkflowState.ANALYZE);
  state = WorkflowState.ANALYZE;
  const analyzed = await runAnalyze(intake.normalized_articles, screened.surviving, override, cluster, {
    reasonerSelection: options.reasonerSelection,
    liveProvider: options.liveProvider
  });
  appendRuleTrace(provenance, analyzed.trace);
  const analysis = analyzed.analysis;

  if (!analysis) {
    const notes = [...provenance.notes];
    appendReasoningProvenance(notes, analyzed.providerStatus, analyzed.providerId);
    if (analyzed.issue) {
      notes.push(analyzed.issue);
    }

    return {
      run_id: runInput.run_id,
      contract_id: runInput.contract_id,
      run_mode: resolveRunMode(runInput.articles),
      state: WorkflowState.ERROR,
      intake,
      screening: screened.screening,
      screen_result: screenResult,
      cluster,
      analysis: null,
      translation: null,
      bias_brief: null,
      deployment_use: DeploymentUse.NO_TRADE,
      active_hours_context: null,
      terminal_outcome: 'insufficient_evidence',
      provenance: {
        ...provenance,
        notes
      }
    };
  }

  if (intake.status !== 'ready') {
    analysis.confidence_notes.push(
      ...intake.issues.filter((issue) => !analysis.confidence_notes.includes(issue))
    );
  }

  appendReasoningProvenance(provenance.notes, analyzed.providerStatus, analyzed.providerId);

  assertTransition(state, WorkflowState.TRANSLATE);
  state = WorkflowState.TRANSLATE;
  const translated = runTranslate(override, analysis, cluster, selectedArticles.map((article) => article.source_type));
  appendRuleTrace(provenance, translated.trace);
  const translation = translated.translation;

  if (!translation) {
    return {
      run_id: runInput.run_id,
      contract_id: runInput.contract_id,
      run_mode: resolveRunMode(runInput.articles),
      state: WorkflowState.ERROR,
      intake,
      screening: screened.screening,
      screen_result: screenResult,
      cluster,
      analysis,
      translation: null,
      bias_brief: null,
      deployment_use: DeploymentUse.NO_TRADE,
      active_hours_context: null,
      terminal_outcome: 'insufficient_evidence',
      provenance: {
        ...provenance,
        notes: [...provenance.notes, `Doctrine evaluation unavailable for ${override.meta.id}.`]
      }
    };
  }

  assertTransition(state, WorkflowState.DEPLOY);
  state = WorkflowState.DEPLOY;
  const deployed = runDeploy(override, translation, analysis, screenResult);
  appendRuleTrace(provenance, deployed.trace);

  assertTransition(state, WorkflowState.PRE_TRADE_REVIEW);
  state = WorkflowState.PRE_TRADE_REVIEW;
  assertTransition(state, WorkflowState.COMPLETED);
  state = WorkflowState.COMPLETED;

  appendRuleTrace(provenance, [
    buildTrace(
      'pipeline',
      override.ruleRefs.activeHours,
      `Active-hours context added for ${override.meta.id}${translation.selected_channels.length ? ` with drivers ${translation.selected_channels.join(', ')}` : ''}.`
    )
  ]);

  const terminalOutcome = deriveTerminalOutcome({
    screen_result: screenResult,
    cluster,
    analysis,
    translation
  });

  return {
    run_id: runInput.run_id,
    contract_id: runInput.contract_id,
    run_mode: resolveRunMode(runInput.articles),
    state,
    intake,
    screening: screened.screening,
    screen_result: screenResult,
    cluster,
    analysis,
    translation,
    bias_brief: deployed.biasBrief,
    deployment_use: deployed.deploymentUse,
    active_hours_context: {
      structural_windows: override.activeHours.structural_windows,
      event_windows: override.activeHours.event_windows,
      dominant_side: override.classifySide?.(analysis, translation.selected_channels)
    },
    terminal_outcome: terminalOutcome,
    provenance
  };
};
