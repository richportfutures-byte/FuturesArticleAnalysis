import { describe, expect, it } from 'vitest';
import { executePipeline } from '../engine/pipeline';
import { ContractId, ReasonerMode, RunMode, SourceType } from '../domain/enums';

describe('intake modes', () => {
  it('runs manual_text intake end to end with preserved provenance', async () => {
    const output = await executePipeline(
      {
        run_id: 'manual-text-1',
        contract_id: ContractId.NQ,
        run_mode: RunMode.SINGLE_ARTICLE,
        intake_mode: 'manual_text',
        articles: [
          {
            article_id: 'a1',
            headline: 'Hot inflation surprise pushes yields higher as megacap tech weakens',
            body_excerpt:
              'Primary reporting ties the move to higher rate expectations, weaker semiconductor leadership, and softer breadth in long-duration equities.',
            source_type: SourceType.PRIMARY_REPORTING,
            published_at: '2026-03-16T08:30:00Z',
            url: 'https://example.com/manual-text-nq',
            publisher: 'Manual desk',
            source_origin: 'manual_paste',
            source_completeness: 'full_text'
          }
        ]
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.state).toBe('completed');
    expect(output.analysis?.reasoner_mode).toBe(ReasonerMode.SIMULATED_LLM);
    expect(output.intake.intake_mode).toBe('manual_text');
    expect(output.intake.status).toBe('ready');
    expect(output.intake.normalized_articles[0].source_origin).toBe('manual_paste');
    expect(output.intake.normalized_articles[0].source_completeness).toBe('full_text');
    expect(output.provenance.intake_mode).toBe('manual_text');
    expect(output.provenance.intake_sources?.[0].url).toBe('https://example.com/manual-text-nq');
  });

  it('fails closed for unresolved manual_url intake without article text', async () => {
    const output = await executePipeline({
      run_id: 'manual-url-1',
      contract_id: ContractId.GC,
      run_mode: RunMode.SINGLE_ARTICLE,
      intake_mode: 'manual_url',
      articles: [
        {
          article_id: 'a1',
          headline: 'Gold headline only',
          body_excerpt: '',
          source_type: SourceType.UNKNOWN,
          published_at: null,
          url: 'https://example.com/manual-url-gc',
          publisher: 'URL capture desk',
          source_origin: 'manual_url',
          source_completeness: 'unresolved'
        }
      ]
    });

    expect(output.state).toBe('error');
    expect(output.analysis).toBeNull();
    expect(output.translation).toBeNull();
    expect(output.deployment_use).toBe('no_trade');
    expect(output.intake.intake_mode).toBe('manual_url');
    expect(output.intake.status).toBe('unresolved');
    expect(output.provenance.intake_status).toBe('unresolved');
    expect(output.provenance.notes.some((note) => /url-only|unresolved|metadata-only/i.test(note))).toBe(true);
  });

  it('keeps fixture intake as an explicit supported mode', async () => {
    const output = await executePipeline(
      {
        run_id: 'fixture-1',
        contract_id: ContractId.CL,
        run_mode: RunMode.SINGLE_ARTICLE,
        intake_mode: 'fixture',
        articles: [
          {
            article_id: 'a1',
            headline: 'OPEC tighter compliance meets inventory draw and shipping disruption',
            body_excerpt:
              'Fixture content ties crude strength to tighter balances, firm prompt spreads, and improving refinery runs.',
            source_type: SourceType.PRIMARY_REPORTING,
            published_at: null,
            url: 'https://example.com/fixture-cl',
            publisher: 'Fixture harness',
            source_origin: 'fixture',
            source_completeness: 'full_text'
          }
        ]
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.state).toBe('completed');
    expect(output.intake.intake_mode).toBe('fixture');
    expect(output.intake.status).toBe('ready');
    expect(output.provenance.intake_mode).toBe('fixture');
    expect(output.provenance.intake_sources?.[0].source_origin).toBe('fixture');
  });

  it('records degraded provenance and bounded confidence notes for partial manual_text intake', async () => {
    const output = await executePipeline(
      {
        run_id: 'manual-text-partial-1',
        contract_id: ContractId.SIXE,
        run_mode: RunMode.SINGLE_ARTICLE,
        intake_mode: 'manual_text',
        articles: [
          {
            article_id: 'a1',
            headline: 'ECB hawkish as US data softens',
            body_excerpt: 'Excerpt only: relative-rate divergence supports the euro against the dollar.',
            source_type: SourceType.PRIMARY_REPORTING,
            published_at: null,
            url: 'https://example.com/manual-text-6e',
            publisher: 'Manual desk',
            source_origin: 'manual_paste',
            source_completeness: 'partial_text'
          }
        ]
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.state).toBe('completed');
    expect(output.intake.status).toBe('degraded');
    expect(output.provenance.intake_status).toBe('degraded');
    expect(output.provenance.intake_sources?.[0].source_completeness).toBe('partial_text');
    expect(output.analysis?.confidence_notes.some((note) => /partial source text|bounded/i.test(note))).toBe(true);
  });
});
