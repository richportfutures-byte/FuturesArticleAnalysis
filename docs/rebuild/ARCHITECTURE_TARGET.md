# Architecture Target

## Product shape

The target product is a market-intelligence workbench for futures bias formation. It is not a rules-engine intelligence core, an execution engine, or a trade automation product.

The intended pipeline is:
1. intake
2. screening and clustering
3. structured reasoning
4. doctrine evaluation
5. bounded bias brief generation

## Stage definitions

### Intake

Purpose:
- capture article content and metadata with preserved provenance
- distinguish `manual_text`, `fixture`, and scaffolded `manual_url`
- record source completeness as `full_text`, `partial_text`, or `unresolved`

Deterministic code is allowed here for:
- payload validation
- metadata normalization
- provenance capture
- source-completeness labeling
- fail-closed handling for unresolved URL-only inputs

Deterministic code is not allowed to infer article meaning here.

### Screening and clustering

Purpose:
- reject obviously irrelevant or weak inputs
- group surviving articles into a contract-relevant narrative cluster
- preserve source-quality and novelty context for later reasoning

Deterministic code is allowed here for:
- contract scope gating
- schema-safe summaries
- explicit terminal outcomes such as `irrelevant`, `noise`, `insufficient_evidence`, and `no_edge`

Deterministic code is not allowed to replace article reasoning with keyword verdicts or polarity logic.

### Structured reasoning

Purpose:
- use the LLM to produce the actual analysis packet
- separate facts, inference, speculation, rhetoric, novelty, causal chain, alternative interpretation, priced-in assessment, confirmation markers, invalidation markers, and candidate contract relevance

This is the intelligence core.

Deterministic code is allowed here only for:
- provider selection
- runtime schema validation
- provenance labeling
- fail-closed handling

Deterministic code is not allowed to become a disguised reasoning substitute.

### Doctrine evaluation

Purpose:
- evaluate the validated reasoning packet against contract doctrine from `docs/source_of_truth`
- preserve contract scope, bounded expression, timing context, invalidation markers, and doctrine fit

Deterministic code is allowed here for:
- doctrine references
- contract scope enforcement
- bounded formatting
- output normalization

Deterministic code is not allowed to re-interpret the article with post-hoc keyword rematching or synthetic verdict engines.

### Bounded bias brief generation

Purpose:
- produce an expert-style, source-grounded bias brief
- surface contract implications, confirmation watchlist, alternative interpretation, confidence notes, and explicit unknowns

Deterministic code is allowed here for:
- output shaping
- execution-language sanitization
- bounded-use language

Deterministic code is not allowed to add execution directives or automate trading.

## Provenance and fail-closed behavior

The system must always record:
- intake mode
- source completeness
- source grounding
- doctrine source files
- provider mode and provider failure notes when relevant

Fail-closed behavior is required when:
- live mode is selected but the provider is unavailable
- the provider returns an invalid payload
- intake is unresolved and cannot support article-level reasoning

In those cases the app must not silently degrade into simulated mode or deterministic pseudo-reasoning.
