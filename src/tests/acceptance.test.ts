import { describe, expect, it } from 'vitest';
import { executePipeline } from '../engine/pipeline';
import { seedFixtures } from '../fixtures/seedFixtures';
import { ContractId, RunMode, SourceType } from '../domain/enums';

describe('fixture-based acceptance', () => {
  it('runs at least one fixture per contract', () => {
    const seen = new Set<string>();
    seedFixtures.forEach((fixture) => {
      seen.add(fixture.contract_id);
      const fixtureAny = fixture as any;
      const articles = Array.isArray(fixtureAny.articles)
        ? fixtureAny.articles.map((a: any, i: number) => ({ article_id: `${fixture.fixture_id}-${i}`, headline: a.headline, body_excerpt: a.headline, source_type: a.source_type as SourceType, published_at: null, url: null }))
        : [{ article_id: `${fixture.fixture_id}-0`, headline: fixtureAny.article.headline, body_excerpt: fixtureAny.article.body_excerpt ?? fixtureAny.article.headline, source_type: fixtureAny.article.source_type as SourceType, published_at: null, url: null }];

      const result = executePipeline({
        run_id: fixture.fixture_id,
        contract_id: fixture.contract_id as ContractId,
        run_mode: fixture.run_mode as RunMode,
        articles
      });
      expect(result.contract_id).toBe(fixture.contract_id as ContractId);
    });

    expect(Array.from(seen).sort()).toEqual(['6E', 'CL', 'GC', 'NQ', 'ZN']);
  });
});
