import { describe, expect, it } from 'vitest';
import { executePipeline } from '../engine/pipeline';
import { ContractId, RunMode, SourceType } from '../domain/enums';

describe('terminal outcomes', () => {
  it('returns irrelevant for an article with no contract transmission', async () => {
    const output = await executePipeline(
      {
        run_id: 'r1',
        contract_id: ContractId.NQ,
        run_mode: RunMode.SINGLE_ARTICLE,
        articles: [{ article_id: 'a1', headline: 'Sports recap', body_excerpt: 'No macro mechanism', source_type: SourceType.COMMENTARY, published_at: null, url: null }]
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.screen_result).toBe('irrelevant');
    expect(output.terminal_outcome).toBe('irrelevant');
  });

  it('returns insufficient_evidence when only commentary survives screening', async () => {
    const output = await executePipeline(
      {
        run_id: 'r2',
        contract_id: ContractId.GC,
        run_mode: RunMode.SINGLE_ARTICLE,
        articles: [
          {
            article_id: 'a1',
            headline: 'Gold commentary says a softer dollar could help precious metals',
            body_excerpt: 'Commentary argues that a weaker dollar and lower yields could keep gold supported, but it offers no fresh reporting.',
            source_type: SourceType.COMMENTARY,
            published_at: null,
            url: null
          }
        ]
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.screen_result).toBe('context_only');
    expect(output.terminal_outcome).toBe('insufficient_evidence');
  });
});
