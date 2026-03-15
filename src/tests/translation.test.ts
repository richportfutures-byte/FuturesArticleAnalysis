import { describe, expect, it } from 'vitest';
import { executePipeline } from '../engine/pipeline';
import { ContractId, RunMode, SourceType } from '../domain/enums';

describe('translation outputs', () => {
  it('includes pricing assessment and horizon split', () => {
    const output = executePipeline({
      run_id: 'r3',
      contract_id: ContractId.SIXE,
      run_mode: RunMode.SINGLE_ARTICLE,
      articles: [{ article_id: 'a1', headline: 'ECB hawkish euro dollar spread', body_excerpt: 'ECB hawkish euro dollar spread', source_type: SourceType.PRIMARY_REPORTING, published_at: null, url: null }]
    });
    expect(output.translation?.pricing_assessment).toBeTruthy();
    expect((output.translation?.horizon_split.length ?? 0) > 0).toBe(true);
  });
});
