import { describe, expect, it } from 'vitest';
import { contractOverrides } from '../domain/contracts';
import { DeepAnalysis } from '../domain/entities';
import {
  CausalCoherenceAssessment,
  ContractId,
  NoveltyAssessment,
  PricedInAssessment,
  ReasonerMode,
  RunMode,
  SourceType
} from '../domain/enums';
import { runAnalyze } from '../engine/analyze';
import { runCluster } from '../engine/cluster';
import { runIntake } from '../engine/intake';
import { executePipeline } from '../engine/pipeline';
import { LiveReasoningProvider } from '../engine/reasoner';
import { runScreen } from '../engine/screen';

const buildLiveAnalysisPayload = (contractId: ContractId, matchedFocus: string[]): DeepAnalysis => ({
  core_claim: `${contractId} has a source-grounded macro transmission path that remains bounded and non-executional.`,
  confirmed_facts: ['Primary reporting confirms the catalyst.'],
  plausible_inference: [`${contractId} relevance is supported by the validated doctrine channel.`],
  speculation: [],
  opinion: [],
  inferred_claims: [`${contractId} relevance is most plausibly routed through ${matchedFocus.join(', ')}.`],
  speculative_claims: [],
  rhetorical_elements: [],
  novelty_assessment: NoveltyAssessment.PARTLY_NEW,
  causal_chain: [`Article catalyst -> ${matchedFocus[0]} -> ${contractId} contract relevance`],
  causal_coherence_assessment: CausalCoherenceAssessment.COHERENT,
  first_order_effects: [`${matchedFocus[0]} can alter the immediate contract read for ${contractId}.`],
  second_order_effects: ['Persistence depends on follow-through in the contract-native confirmation stack.'],
  competing_interpretation: 'The move may still be partly explained by broader positioning rather than the article alone.',
  strongest_alternative_interpretation: 'The move may still be partly explained by broader positioning rather than the article alone.',
  priced_in_assessment: PricedInAssessment.PARTIALLY_PRICED,
  confirmation_markers: ['contract-native confirmation marker'],
  invalidation_markers: ['contract-native invalidation marker'],
  candidate_contract_relevance: [
    {
      contract_id: contractId,
      fit: 'primary',
      rationale: `${contractId} doctrine relevance survives validation.`,
      matched_focus: matchedFocus
    }
  ],
  source_grounding: [
    {
      article_id: 'a1',
      source_type: SourceType.PRIMARY_REPORTING,
      grounding_type: 'confirmed_fact',
      excerpt: 'Primary reporting confirms the catalyst.',
      doctrine_source_files: [
        'docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx',
        `docs/source_of_truth/contract_prompt_library/${contractId === ContractId.SIXE ? '6E' : contractId}/README.md`
      ]
    }
  ],
  confidence_notes: ['This payload is a mocked live-provider response for schema-validation coverage.'],
  explicit_unknowns: ['Sustained follow-through still requires confirmation.'],
  reasoner_mode: ReasonerMode.LIVE_PROVIDER_LLM,
  prompt_context: {
    system_rules: ['Return bounded analysis only.'],
    doctrine_source_files: [
      'docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx',
      `docs/source_of_truth/contract_prompt_library/${contractId === ContractId.SIXE ? '6E' : contractId}/README.md`
    ],
    doctrine_highlights: ['Do not emit execution-prescriptive language.']
  }
});

describe('translation outputs', () => {
  it('produces structured reasoning, doctrine evaluation, and a bounded bias brief', async () => {
    const output = await executePipeline(
      {
        run_id: 'r3',
        contract_id: ContractId.SIXE,
        run_mode: RunMode.SINGLE_ARTICLE,
        articles: [
          {
            article_id: 'a1',
            headline: 'ECB hawkish euro dollar spread',
            body_excerpt: 'ECB hawkish euro dollar spread',
            source_type: SourceType.PRIMARY_REPORTING,
            published_at: null,
            url: null
          }
        ]
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.analysis?.reasoner_mode).toBe(ReasonerMode.SIMULATED_LLM);
    expect(output.analysis?.causal_chain.length).toBeGreaterThan(0);
    expect(output.translation?.pricing_assessment).toBeTruthy();
    expect(output.translation?.doctrine_fit).toBeTruthy();
    expect((output.translation?.horizon_split.length ?? 0) > 0).toBe(true);
    expect(output.bias_brief?.executive_summary).toBeTruthy();
    expect(output.bias_brief?.bounded_use.toLowerCase()).not.toMatch(
      /\bexact entry\b|\bexact stop\b|\bexact size\b|\bautonomous execution\b|\bexecute automatically\b|\bplace order\b/
    );
  });

  it('records provenance rule traces for source-backed translation decisions', async () => {
    const output = await executePipeline(
      {
        run_id: 'r4',
        contract_id: ContractId.NQ,
        run_mode: RunMode.SINGLE_ARTICLE,
        articles: [
          {
            article_id: 'a1',
            headline: 'Hot inflation surprise pushes yields higher as megacap tech weakens',
            body_excerpt: 'Primary reporting ties the move to rising yields and weaker semiconductor leadership.',
            source_type: SourceType.PRIMARY_REPORTING,
            published_at: null,
            url: null
          }
        ]
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.provenance.rule_trace.some((entry) => entry.rule_id === 'NQ_TRANSLATION_DRIVER_STACK')).toBe(true);
    expect(output.provenance.source_files).toContain('docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx');
    expect(output.analysis?.prompt_context.doctrine_source_files).toContain(
      'docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx'
    );
  });

  it('fails closed when live provider mode is requested without a configured provider', async () => {
    const output = await executePipeline(
      {
        run_id: 'r5',
        contract_id: ContractId.NQ,
        run_mode: RunMode.SINGLE_ARTICLE,
        articles: [
          {
            article_id: 'a1',
            headline: 'Hot inflation surprise pushes yields higher as megacap tech weakens',
            body_excerpt: 'Primary reporting ties the move to rising yields and weaker semiconductor leadership.',
            source_type: SourceType.PRIMARY_REPORTING,
            published_at: null,
            url: null
          }
        ]
      },
      { reasonerSelection: 'live', liveProvider: null }
    );

    expect(output.state).toBe('error');
    expect(output.analysis).toBeNull();
    expect(output.translation).toBeNull();
    expect(output.deployment_use).toBe('no_trade');
    expect(output.provenance.notes.some((note) => /failed provider path/i.test(note))).toBe(true);
  });

  it('accepts a validated live-provider response when a provider is injected explicitly', async () => {
    const liveProvider: LiveReasoningProvider = {
      providerId: 'test-live-provider',
      generateAnalysis: async () => buildLiveAnalysisPayload(ContractId.NQ, ['US rates and real yields'])
    };

    const output = await executePipeline(
      {
        run_id: 'r6',
        contract_id: ContractId.NQ,
        run_mode: RunMode.SINGLE_ARTICLE,
        articles: [
          {
            article_id: 'a1',
            headline: 'Hot inflation surprise pushes yields higher as megacap tech weakens',
            body_excerpt: 'Primary reporting ties the move to rising yields and weaker semiconductor leadership.',
            source_type: SourceType.PRIMARY_REPORTING,
            published_at: null,
            url: null
          }
        ]
      },
      { reasonerSelection: 'live', liveProvider }
    );

    expect(output.state).toBe('completed');
    expect(output.analysis?.reasoner_mode).toBe(ReasonerMode.LIVE_PROVIDER_LLM);
    expect(output.translation).not.toBeNull();
    expect(output.provenance.notes).toContain('Reasoning source: live provider via test-live-provider.');
  });

  it('fails closed when a live provider returns an invalid payload', async () => {
    const invalidProvider: LiveReasoningProvider = {
      providerId: 'invalid-live-provider',
      generateAnalysis: async () => ({ invalid: true })
    };

    const output = await executePipeline(
      {
        run_id: 'r7',
        contract_id: ContractId.GC,
        run_mode: RunMode.SINGLE_ARTICLE,
        articles: [
          {
            article_id: 'a1',
            headline: 'Central bank demand meets weaker dollar and lower real yields',
            body_excerpt: 'Primary reporting ties gold support to reserve demand and softer real yields.',
            source_type: SourceType.PRIMARY_REPORTING,
            published_at: null,
            url: null
          }
        ]
      },
      { reasonerSelection: 'live', liveProvider: invalidProvider }
    );

    expect(output.state).toBe('error');
    expect(output.analysis).toBeNull();
    expect(output.translation).toBeNull();
    expect(output.provenance.notes.some((note) => /invalid reasoning payload/i.test(note))).toBe(true);
  });

  it('uses simulated reasoning only when simulation is selected explicitly', async () => {
    const override = contractOverrides[ContractId.NQ];
    const intake = runIntake(
      [
        {
          article_id: 'a1',
          headline: 'Hot inflation surprise pushes yields higher as megacap tech weakens',
          body_excerpt: 'Primary reporting ties the move to rising yields and weaker semiconductor leadership.',
          source_type: SourceType.PRIMARY_REPORTING,
          published_at: null,
          url: null
        }
      ],
      ContractId.NQ
    );
    const screened = runScreen(intake.normalized_articles, override);
    const clustered = runCluster(override, screened.surviving);
    const analyzed = await runAnalyze(intake.normalized_articles, screened.surviving, override, clustered.cluster, {
      reasonerSelection: 'simulated'
    });

    expect(analyzed.analysis?.reasoner_mode).toBe(ReasonerMode.SIMULATED_LLM);
    expect(analyzed.providerStatus).toBe('simulated');
    expect(analyzed.issue).toBeUndefined();
  });
});
