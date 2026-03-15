# Product Specification

## Product name
Contract Prompt Library Workbench

## Core objective
Build a deterministic article-to-deployment analysis application for five futures contracts: NQ, ZN, GC, 6E, and CL. The app ingests one article or a cluster of related articles, decides whether they are relevant to the chosen contract, extracts genuinely new facts, maps the information into contract-specific transmission channels, ranks the active drivers, assesses timing and pricing status, and outputs deployment guidance that shapes bias and setup preference without dictating exact execution.

## Explicit non-goals
- Not a generic chatbot.
- Not an autonomous trading engine.
- Not an exact-entry / stop / size recommender.
- Not a replacement for price acceptance, structure, or cross-market confirmation.
- Not a generic macro-news summarizer.

## Product thesis
The product’s value is compression and translation:
1. Decide whether an article matters for a contract at all.
2. Reject post-hoc narrative attachment and weak commentary.
3. Translate surviving facts into contract-specific mechanism maps.
4. Separate context, catalyst, and executable trigger.
5. Output a bounded action surface: continuation bias, fade candidate, wait, ignore, or no edge.

## Primary user
A discretionary futures trader using article analysis to shape contract-specific bias and deployment posture.

## Shared workflow stages
1. Article intake
2. Article selection / relevance screening
3. Narrative clustering and screening
4. Deep analysis
5. Contract translation
6. Deployment guidance
7. Confirmation / invalidation review
8. Pre-trade checklist
9. Post-article reaction logging

## Operator-facing outputs
Every completed analysis should surface:
- contract
- source mode: single article or article cluster
- relevance
- novelty assessment
- source-quality assessment
- mechanism map
- primary driver hierarchy
- competing interpretation
- pricing assessment
- horizon split
- active-hours context when contract-specific sources require it
- confirmation markers
- invalidation markers
- best expression vehicle
- trade-use note
- final verdict
- confidence score
- actionability score

## Required app screens
1. Source Intake
2. Contract Workspace
3. Narrative Cluster View
4. Translation and Driver Hierarchy View
5. Deployment Guidance View
6. Confirmation / Invalidation Panel
7. Pre-Trade Checklist View
8. Active-Hours / Catalyst Context View when supported by contract sources
9. Post-Article Review Log
10. Prompt Run / Provenance Trace

## UX doctrine
- Deterministic and stage-based.
- Every stage must have visible inputs and outputs.
- The UI must make “no edge” and “insufficient evidence” easy to reach.
- Explanations should be explicit about why a result was produced.
- Contract logic must remain visibly distinct rather than flattened into one macro template.

## App-wide hard rules
- Prefer no edge over forced conviction.
- Do not confuse narrative coherence with tradeability.
- Never let the analysis override clear market rejection.
- Preserve internal consistency of the contract mechanism.
- Keep output descriptive and deployment-oriented, not execution-prescriptive.


## Source-visibility note
The current source pack supports implementation-grade detail for all five contracts. NQ, ZN, GC, and 6E each have block-level workflow sources, while CL is governed by its dedicated full workflow package.
