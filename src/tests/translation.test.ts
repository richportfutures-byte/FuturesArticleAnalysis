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

  it('records provenance rule traces for source-backed translation decisions', () => {
    const output = executePipeline({
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
    });

    expect(output.provenance.rule_trace.some((entry) => entry.rule_id === 'NQ_TRANSLATION_DRIVER_STACK')).toBe(true);
    expect(output.provenance.source_files).toContain('master_deployment_guide_by_contract.docx');
  });
});
