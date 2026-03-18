import { describe, expect, it } from 'vitest';
import { fetchClientReasonerStatus, resolveClientRequestedMode } from '../app/runtimeConfig';
import { ContractId, ReasonerMode, RunMode, SourceType } from '../domain/enums';
import { executePipeline } from '../engine/pipeline';
import { LiveReasoningProvider } from '../engine/reasoner';

describe('deployment readiness', () => {
  it('reports configured live status from the Vercel health endpoint', async () => {
    const status = await fetchClientReasonerStatus(
      {
        VITE_REASONER_MODE: 'live',
        VITE_REASONER_ENDPOINT: '/api/reasoner'
      },
      async () =>
        ({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ configured: true, model: 'gpt-5-mini' })
        }) as Response
    );

    expect(status.selectedMode).toBe('live');
    expect(status.providerAvailability).toBe('configured');
    expect(status.displayLabel).toBe('Live provider configured');
  });

  it('reports explicit simulated status without claiming live intelligence', () => {
    const status = resolveClientRequestedMode({
      VITE_REASONER_MODE: 'simulated'
    });

    expect(status).toBe('simulated');
  });

  it('completes end to end for manual_text input when live mode is configured explicitly', async () => {
    const liveProvider: LiveReasoningProvider = {
      providerId: 'vercel-live-provider-test',
      generateAnalysis: async () => ({
        core_claim: 'NQ has a source-grounded macro transmission path.',
        confirmed_facts: ['Primary reporting confirms a macro catalyst.'],
        plausible_inference: ['NQ relevance survives contract doctrine review.'],
        speculation: [],
        opinion: [],
        inferred_claims: ['NQ relevance is most plausibly routed through US rates and real yields.'],
        speculative_claims: [],
        rhetorical_elements: [],
        novelty_assessment: 'partly_new',
        causal_chain: ['Article catalyst -> US rates and real yields -> NQ contract relevance'],
        causal_coherence_assessment: 'coherent',
        first_order_effects: ['US rates and real yields can alter the immediate NQ read.'],
        second_order_effects: ['Persistence depends on follow-through in leadership and breadth.'],
        competing_interpretation: 'The move may still reflect broader positioning.',
        strongest_alternative_interpretation: 'The move may still reflect broader positioning.',
        priced_in_assessment: 'partially_priced',
        confirmation_markers: ['10Y yields and real-yield direction'],
        invalidation_markers: ['the supposed transmission channel fails to appear in the relevant cross-market markers'],
        candidate_contract_relevance: [
          {
            contract_id: ContractId.NQ,
            fit: 'primary',
            rationale: 'NQ doctrine relevance survives validation.',
            matched_focus: ['US rates and real yields']
          }
        ],
        source_grounding: [
          {
            article_id: 'a1',
            source_type: SourceType.PRIMARY_REPORTING,
            grounding_type: 'confirmed_fact',
            excerpt: 'Primary reporting confirms a macro catalyst.',
            doctrine_source_files: ['docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx']
          }
        ],
        confidence_notes: ['This is a mocked live-provider deployment-path payload.'],
        explicit_unknowns: ['Sustained follow-through still requires confirmation.'],
        reasoner_mode: ReasonerMode.LIVE_PROVIDER_LLM,
        prompt_context: {
          system_rules: ['Return bounded analysis only.'],
          doctrine_source_files: ['docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx'],
          doctrine_highlights: ['Do not emit execution-prescriptive language.']
        }
      })
    };

    const output = await executePipeline(
      {
        run_id: 'deploy-live-success',
        contract_id: ContractId.NQ,
        run_mode: RunMode.SINGLE_ARTICLE,
        intake_mode: 'manual_text',
        articles: [
          {
            article_id: 'a1',
            headline: 'Hot inflation surprise pushes yields higher as megacap tech weakens',
            body_excerpt:
              'Primary reporting ties the move to higher rate expectations, softer semiconductor leadership, and weaker long-duration equity sentiment.',
            source_type: SourceType.PRIMARY_REPORTING,
            published_at: '2026-03-16T08:30:00Z',
            url: 'https://example.com/deploy-live-success',
            publisher: 'Deployment test desk',
            source_origin: 'manual_paste',
            source_completeness: 'full_text'
          }
        ]
      },
      { reasonerSelection: 'live', liveProvider }
    );

    expect(output.state).toBe('completed');
    expect(output.analysis?.reasoner_mode).toBe(ReasonerMode.LIVE_PROVIDER_LLM);
    expect(output.translation).not.toBeNull();
    expect(output.bias_brief).not.toBeNull();
    expect(output.deployment_use).not.toBe('no_trade');
    expect(output.provenance.notes).toContain('Reasoning source: live provider via vercel-live-provider-test.');
  });

  it('fails closed by default when live mode is selected but no provider is configured', async () => {
    const output = await executePipeline({
      run_id: 'deploy-live-fail-closed',
      contract_id: ContractId.GC,
      run_mode: RunMode.SINGLE_ARTICLE,
      intake_mode: 'manual_text',
      articles: [
        {
          article_id: 'a1',
          headline: 'Central bank demand meets weaker dollar and lower real yields',
          body_excerpt: 'Primary reporting ties gold support to reserve demand and softer real yields.',
          source_type: SourceType.PRIMARY_REPORTING,
          published_at: '2026-03-16T08:30:00Z',
          url: 'https://example.com/deploy-live-fail-closed',
          publisher: 'Deployment test desk',
          source_origin: 'manual_paste',
          source_completeness: 'full_text'
        }
      ]
    });

    expect(output.state).toBe('error');
    expect(output.translation).toBeNull();
    expect(output.bias_brief).toBeNull();
    expect(output.deployment_use).toBe('no_trade');
    expect(output.provenance.notes.some((note) => /failed provider path|provider is unavailable|no model provider/i.test(note))).toBe(true);
  });
});
