# Rules Schema

## Top-level enums

### ContractId
- `NQ`
- `ZN`
- `GC`
- `6E`
- `CL`

### RunMode
- `single_article`
- `multi_article`

### SourceType
- `primary_reporting`
- `official_statement`
- `synthesis`
- `commentary`
- `unknown`

### SourceSurvival
- `selected`
- `context_only`
- `noise`
- `irrelevant`

### NoveltyAssessment
- `genuinely_new`
- `partly_new`
- `recycled_background`
- `post_hoc_attachment`
- `unclear`

### ClusterMode
- `discovery`
- `consensus`
- `post_hoc`
- `mixed`
- `none`

### EvidenceStrength
- `confirmed`
- `plausible`
- `weak`
- `unsupported`

### PricingAssessment
- `underpriced`
- `already_priced`
- `mixed`
- `impossible_to_assess`
- `consensus`
- `stale`

### HorizonBucket
- `overnight`
- `pre_open`
- `rth_open`
- `same_session_continuation`
- `one_to_three_day_swing`

### DeploymentUse
- `continuation_bias`
- `fade_candidate`
- `wait_for_confirmation`
- `ignore`
- `no_trade`

### Verdict
- `bullish`
- `bearish`
- `mixed`
- `no_edge`

### ActionabilityBand
- `high`
- `medium`
- `low`
- `none`

## Core entity schema

### Contract
Required:
- `id: ContractId`
- `name: string`
- `primary_objective: string`
- `core_transmission_focus: string[]`
- `confirmation_markers: string[]`
- `least_valuable_use: string`
- `deployment_windows: string[]`
- `shared_block_map: string[]`

### Article
Required:
- `article_id: string`
- `headline: string`
- `body_excerpt: string`
- `source_type: SourceType`
- `published_at: string | null`
- `url: string | null`

Optional:
- `author`
- `publisher`
- `notes`

### NarrativeCluster
Required:
- `cluster_id: string`
- `contract_id: ContractId`
- `cluster_mode: ClusterMode`
- `common_facts: string[]`
- `disputed_claims: string[]`
- `strongest_source_article_id: string | null`
- `weakest_source_article_id: string | null`
- `newness_confidence: number`
- `tradability_class: "tradable" | "context_only" | "noise"`

### DeepAnalysis
Required:
- `core_claim: string`
- `confirmed_facts: string[]`
- `plausible_inference: string[]`
- `speculation: string[]`
- `opinion: string[]`
- `novelty_assessment: NoveltyAssessment`
- `competing_interpretation: string`

### TranslationResult
Required:
- `contract_id: ContractId`
- `selected_channels: string[]`
- `primary_driver_hierarchy: string[]`
- `best_expression_vehicle: string`
- `pricing_assessment: PricingAssessment`
- `horizon_split: {bucket: HorizonBucket, note: string}[]`
- `confirmation_markers: string[]`
- `invalidation_markers: string[]`
- `verdict: Verdict`
- `confidence_score: number`
- `actionability_score: number`
- `trade_use_note: string`

### ProvenanceRecord
Required:
- `source_files: string[]`
- `rule_ids: string[]`
- `contract_override_ids: string[]`
- `notes: string[]`

### RunOutput
Required:
- `run_id: string`
- `contract_id: ContractId`
- `run_mode: RunMode`
- `screen_result: SourceSurvival`
- `cluster: NarrativeCluster | null`
- `analysis: DeepAnalysis | null`
- `translation: TranslationResult | null`
- `deployment_use: DeploymentUse`
- `active_hours_context: {structural_windows?: string[], event_windows?: string[], dominant_side?: "euro_driver" | "dollar_driver" | "mixed" | "unclear"} | null`
- `provenance: ProvenanceRecord`

## Validation rules
1. Reject any run with no contract selected.
2. Reject any run with empty source payload.
3. `confidence_score` and `actionability_score` must be integers 1-10 when a translation exists.
4. A completed translation must always include:
   - at least one channel
   - at least one confirmation marker
   - at least one invalidation marker
   - a trade-use note
5. If `verdict == no_edge`, `deployment_use` must be either `ignore` or `no_trade`.
6. If `source_type == commentary` and novelty is weak or recycled, default actionability must be low or none unless another article in the cluster upgrades it.
7. Multi-article mode must include:
   - strongest source
   - common facts
   - disputed claims
   - cluster mode
8. Translation must fail closed when the mechanism is internally inconsistent.
9. Exact entry, exact stop, and exact size fields are forbidden in the output model.

## Shared scoring logic
Use rules, not opaque model output:

### Relevance score drivers
- + channel match
- + genuine new facts
- + primary reporting or official statement
- + strong cluster coherence
- - commentary only
- - post-hoc explanation
- - already-priced or stale narrative
- - internal inconsistency
- - no cross-market confirmation path

### Confidence score should reflect
- source quality
- mechanism clarity
- agreement among strongest sources
- degree of contradiction in competing interpretation

### Actionability score should reflect
- novelty
- clean channel mapping
- confirmation observability
- pricing status
- absence of disqualifying conditions

## Contract overrides
Use explicit tables per contract rather than free-form prompting. See `04_CONTRACT_MODULES.md`.





## Additional NQ-specific override requirements
When `contract_id == NQ`, the override table must also support:
- ranked driver hierarchy across US rates and real yields, megacap tech leadership, semiconductors and AI capex, broad risk sentiment and liquidity, and earnings / growth expectations
- selection-rubric fields for novelty, source quality, contract relevance, timing sensitivity, and explanatory mechanism clarity
- cluster rejection when no core NQ channel is present
- active-hours context for the 9:30 AM to 11:00 AM ET cash open, 3:00 PM to 4:00 PM ET close, 3:00 AM to 6:00 AM ET European open, 8:30 AM ET primary US macro, 10:00 AM ET secondary macro, 2:00 PM to 2:30 PM ET FOMC window, and 4:00 PM to 4:15 PM ET megacap earnings window
- explicit `underpriced / already_priced / mixed / impossible_to_assess / stale / no_edge` fail-closed logic when the mechanism is internally inconsistent
- fixed confirmation markers from the NQ playbook
- bounded output sections for single-article, multi-article, and quick-filter modes

## Additional GC-specific override requirements
When `contract_id == GC`, the override table must also support:
- ranked driver hierarchy across real yields, DXY, central-bank demand, geopolitics, inflation expectations, and liquidity stress
- selection-rubric fields for novelty, source quality, contract relevance, timing sensitivity, and explanatory mechanism clarity
- cluster rejection when no core GC channel is present
- active-hours context for European, overlap, COMEX, and event-driven catalyst windows
- explicit `underpriced / consensus / stale / impossible_to_assess / no_edge` fail-closed logic when the mechanism is internally inconsistent
- fixed confirmation markers from the GC playbook
- bounded output sections for single-article, multi-article, and quick-filter modes

## Additional 6E-specific override requirements
When `contract_id == 6E`, the override table must also support:
- side classification: `euro_driver`, `dollar_driver`, `mixed`, or `unclear`
- selection rubric fields for novelty, source quality, contract relevance, timing sensitivity, and explanatory mechanism clarity
- cluster rejection when no core 6E channel is present
- active-hours context for European, overlap, and US catalyst windows
- explicit `underpriced / consensus / stale / no_edge` fail-closed logic when the mechanism is internally inconsistent
- fixed confirmation markers from the 6E playbook
- bounded output sections for single-article, multi-article, and quick-filter modes
