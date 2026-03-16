import { describe, expect, it } from 'vitest';
import { executePipeline } from '../engine/pipeline';
import { ContractId, RunMode, SourceType } from '../domain/enums';

describe('terminal outcomes', () => {
  it('returns no_edge for irrelevant source', () => {
    const output = executePipeline({
      run_id: 'r1',
      contract_id: ContractId.NQ,
      run_mode: RunMode.SINGLE_ARTICLE,
      articles: [{ article_id: 'a1', headline: 'Sports recap', body_excerpt: 'No macro mechanism', source_type: SourceType.COMMENTARY, published_at: null, url: null }]
    });
    expect(output.terminal_outcome).toBe('no_edge');
  });

  it('returns insufficient_evidence when no confirmed facts', () => {
    const output = executePipeline({
      run_id: 'r2',
      contract_id: ContractId.GC,
      run_mode: RunMode.SINGLE_ARTICLE,
      articles: [{ article_id: 'a1', headline: 'gold dollar', body_excerpt: 'gold dollar', source_type: SourceType.COMMENTARY, published_at: null, url: null }]
    });
    expect(output.terminal_outcome).toBe('insufficient_evidence');
  });
});
