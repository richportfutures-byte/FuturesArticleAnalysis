import { describe, expect, it } from 'vitest';
import { contractOverrides } from '../domain/contracts';
import { Article, DeepAnalysis } from '../domain/entities';
import {
  CausalCoherenceAssessment,
  ContractId,
  DeploymentUse,
  NoveltyAssessment,
  PricedInAssessment,
  ReasonerMode,
  RunMode,
  SourceType,
  Verdict
} from '../domain/enums';
import { runTranslate } from '../engine/translate';
import { executePipeline } from '../engine/pipeline';
import { seedFixtures } from '../fixtures/seedFixtures';

const requiredRuleRefKeys = ['screening', 'clustering', 'analysis', 'translation', 'pricing', 'deployment', 'activeHours'] as const;
const canonicalSourceByContract: Record<ContractId, string> = {
  [ContractId.NQ]: 'docs/source_of_truth/contract_prompt_library/NQ/README.md',
  [ContractId.ZN]: 'docs/source_of_truth/contract_prompt_library/ZN/README.md',
  [ContractId.GC]: 'docs/source_of_truth/contract_prompt_library/GC/README.md',
  [ContractId.SIXE]: 'docs/source_of_truth/contract_prompt_library/6E/README.md',
  [ContractId.CL]: 'docs/source_of_truth/contract_prompt_library/CL/01_article_selection_protocol.md'
};

const makeArticle = (article_id: string, headline: string, source_type: SourceType): Article => ({
  article_id,
  headline,
  body_excerpt: headline,
  source_type,
  published_at: null,
  url: null
});

const sourceBackedRuns: Record<ContractId, { run_mode: RunMode; articles: Article[] }> = {
  [ContractId.NQ]: {
    run_mode: RunMode.SINGLE_ARTICLE,
    articles: [
      makeArticle(
        'nq-1',
        'Hot inflation surprise pushes yields higher as megacap tech weakens and semis underperform',
        SourceType.PRIMARY_REPORTING
      )
    ]
  },
  [ContractId.ZN]: {
    run_mode: RunMode.SINGLE_ARTICLE,
    articles: [makeArticle('zn-1', 'Fed speaker opens door to slower pace as cooling inflation softens growth', SourceType.PRIMARY_REPORTING)]
  },
  [ContractId.GC]: {
    run_mode: RunMode.SINGLE_ARTICLE,
    articles: [
      makeArticle(
        'gc-1',
        'Central bank purchase meets weaker dollar and lower real yields as geopolitical stress lifts gold',
        SourceType.PRIMARY_REPORTING
      )
    ]
  },
  [ContractId.SIXE]: {
    run_mode: RunMode.SINGLE_ARTICLE,
    articles: [makeArticle('6e-1', 'ECB hawkish as US data softens and dollar weakens on policy divergence', SourceType.PRIMARY_REPORTING)]
  },
  [ContractId.CL]: {
    run_mode: RunMode.SINGLE_ARTICLE,
    articles: [
      makeArticle(
        'cl-1',
        'OPEC tighter compliance meets inventory draw and shipping disruption as refinery runs improve',
        SourceType.PRIMARY_REPORTING
      )
    ]
  }
};

const buildFixtureArticles = (fixture: any): Article[] =>
  Array.isArray(fixture.articles)
    ? fixture.articles.map((article: any, index: number) => ({
        article_id: `${fixture.fixture_id}-${index}`,
        headline: article.headline,
        body_excerpt: article.body_excerpt ?? article.headline,
        source_type: article.source_type as SourceType,
        published_at: null,
        url: null
      }))
    : [
        {
          article_id: `${fixture.fixture_id}-0`,
          headline: fixture.article.headline,
          body_excerpt: fixture.article.body_excerpt ?? fixture.article.headline,
          source_type: fixture.article.source_type as SourceType,
          published_at: null,
          url: null
        }
      ];

const buildNoMappingAnalysis = (): DeepAnalysis => ({
  core_claim: 'Confirmed reporting with no supported contract mechanism or source-backed channel mapping.',
  confirmed_facts: ['Confirmed reporting exists.'],
  plausible_inference: [],
  speculation: [],
  opinion: [],
  inferred_claims: [],
  speculative_claims: [],
  rhetorical_elements: [],
  novelty_assessment: NoveltyAssessment.GENUINELY_NEW,
  causal_chain: ['No clean contract transmission survives doctrine review.'],
  causal_coherence_assessment: CausalCoherenceAssessment.UNSUPPORTED,
  first_order_effects: [],
  second_order_effects: [],
  competing_interpretation: 'The article may matter elsewhere, but not for this contract.',
  strongest_alternative_interpretation: 'The article may matter elsewhere, but not for this contract.',
  priced_in_assessment: PricedInAssessment.UNCLEAR,
  confirmation_markers: [],
  invalidation_markers: [],
  candidate_contract_relevance: [],
  source_grounding: [],
  confidence_notes: ['No doctrine-backed driver survived.'],
  explicit_unknowns: ['Contract transmission is unsupported.'],
  reasoner_mode: ReasonerMode.SIMULATED_LLM,
  prompt_context: {
    system_rules: [],
    doctrine_source_files: [],
    doctrine_highlights: []
  }
});

describe('anti-drift override doctrine', () => {
  it.each(Object.values(ContractId))('keeps canonical source refs, stage rule refs, and explicit channel tables for %s', (contractId) => {
    const override = contractOverrides[contractId];
    const channelTable = Array.from(new Set(override.channelRules.map((rule) => rule.channel)));
    const ruleIds = requiredRuleRefKeys.map((key) => override.ruleRefs[key].rule_id);

    expect(override.source_files).toContain('docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx');
    expect(override.source_files).toContain(canonicalSourceByContract[contractId]);
    expect(override.channels.length).toBeGreaterThan(0);
    expect(channelTable.sort()).toEqual([...override.channels].sort());
    expect(new Set(ruleIds).size).toBe(requiredRuleRefKeys.length);

    override.channelRules.forEach((rule) => {
      expect(rule.keywords.length).toBeGreaterThan(0);
      expect(override.channels).toContain(rule.channel);
    });

    requiredRuleRefKeys.forEach((key) => {
      const ruleRef = override.ruleRefs[key];
      expect(ruleRef.rule_id).toBeTruthy();
      expect(ruleRef.detail).toBeTruthy();
      expect(ruleRef.source_files.length).toBeGreaterThan(0);
      expect(ruleRef.source_files).toEqual(expect.arrayContaining(override.source_files));
    });
  });
});

describe('anti-drift provenance traces', () => {
  it.each(Object.values(ContractId))('records source-backed provenance across stage traces for %s', async (contractId) => {
    const input = sourceBackedRuns[contractId];
    const override = contractOverrides[contractId];
    const output = await executePipeline(
      {
        run_id: `${contractId.toLowerCase()}-anti-drift`,
        contract_id: contractId,
        run_mode: input.run_mode,
        articles: input.articles
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.translation).toBeTruthy();
    expect(output.analysis?.reasoner_mode).toBe(ReasonerMode.SIMULATED_LLM);
    expect(output.bias_brief?.bounded_use).toBeTruthy();
    expect(output.provenance.contract_override_ids).toContain(override.override_id);
    expect(output.provenance.source_files).toEqual(expect.arrayContaining(override.source_files));
    expect(output.provenance.rule_ids).toEqual(expect.arrayContaining(requiredRuleRefKeys.map((key) => override.ruleRefs[key].rule_id)));
    expect(output.provenance.rule_trace.map((entry) => entry.stage)).toEqual(
      expect.arrayContaining(['pipeline', 'intake', 'screen', 'cluster', 'analyze', 'translate', 'deploy'])
    );
  });

  it.each(seedFixtures as any[])('records provenance for fixture $fixture_id', async (fixture) => {
    const override = contractOverrides[fixture.contract_id as ContractId];
    const output = await executePipeline(
      {
        run_id: fixture.fixture_id,
        contract_id: fixture.contract_id as ContractId,
        run_mode: fixture.run_mode as RunMode,
        articles: buildFixtureArticles(fixture)
      },
      { reasonerSelection: 'simulated' }
    );

    expect(output.provenance.contract_override_ids).toContain(override.override_id);
    expect(output.provenance.source_files).toEqual(expect.arrayContaining(override.source_files));
    expect(output.provenance.rule_trace.some((entry) => entry.rule_id === override.ruleRefs.screening.rule_id)).toBe(true);
  });
});

describe('anti-drift translation fail-closed behavior', () => {
  it.each(Object.values(ContractId))('fails closed when %s has no source-backed mapping', (contractId) => {
    const override = contractOverrides[contractId];
    const translated = runTranslate(override, buildNoMappingAnalysis(), null, [SourceType.PRIMARY_REPORTING]);
    const translation = translated.translation;

    expect(translation).not.toBeNull();
    expect(translation?.doctrine_fit).toBe('none');
    expect(translation?.verdict).toBe(Verdict.NO_EDGE);
    expect(translation?.matched_drivers).toEqual([]);
    expect(translated.trace.some((entry) => entry.rule_id === override.ruleRefs.translation.rule_id)).toBe(true);
    expect(translated.trace.some((entry) => /matched drivers: none/i.test(entry.detail))).toBe(true);
  });
});

describe('anti-drift deployment boundaries', () => {
  it.each(Object.values(ContractId))('keeps %s deployment output bounded and non-autonomous', async (contractId) => {
    const input = sourceBackedRuns[contractId];
    const output = await executePipeline(
      {
        run_id: `${contractId.toLowerCase()}-deployment-boundary`,
        contract_id: contractId,
        run_mode: input.run_mode,
        articles: input.articles
      },
      { reasonerSelection: 'simulated' }
    );
    const translation = output.translation;

    expect(translation).toBeTruthy();
    expect([
      DeploymentUse.CONTINUATION_BIAS,
      DeploymentUse.FADE_CANDIDATE,
      DeploymentUse.WAIT_FOR_CONFIRMATION,
      DeploymentUse.IGNORE,
      DeploymentUse.NO_TRADE
    ]).toContain(output.deployment_use);

    expect(translation).not.toHaveProperty('exact_entry');
    expect(translation).not.toHaveProperty('exact_stop');
    expect(translation).not.toHaveProperty('exact_size');
    expect(translation).not.toHaveProperty('autonomous_execution_permission');
    expect(translation?.trade_use_note.toLowerCase()).not.toMatch(
      /\bexact entry\b|\bexact stop\b|\bexact size\b|\bautonomous execution\b|\bexecute automatically\b|\bplace order\b/
    );
    expect(output.bias_brief?.prose.toLowerCase()).not.toMatch(
      /\bexact entry\b|\bexact stop\b|\bexact size\b|\bautonomous execution\b|\bexecute automatically\b|\bplace order\b/
    );
  });
});
