# Operator Review Pass

## Pass gate
- [ ] Branch is `main`
- [ ] Baseline commit is `eb76201`; prior repair reference is `5da2716`
- [ ] `npm test` passed locally
- [ ] `npm run build` passed locally
- [ ] CI on `main` is green
- [ ] Source doctrine matches the contract prompt library and master deployment guide; CL uses its dedicated package
- [ ] Scope remains `NQ`, `ZN`, `GC`, `6E`, `CL`
- [ ] Workflow remains `ingest -> cluster -> analyze -> translate -> score -> deploy`
- [ ] Surfaced outcomes remain `actionable`, `ambiguous`, `insufficient_evidence`, `no_edge`
- [ ] Deployment remains bounded; no exact entry, exact stop, exact size, or autonomous execution permission

## `nq_rates_tech_repricing` (`NQ`)
- [ ] `ingest`: preserve single-article metadata and `primary_reporting`
- [ ] `cluster`: keep one coherent inflation / yields / tech-weakness narrative
- [ ] `analyze`: keep the NQ mechanism tied to yields, semis, and risk appetite
- [ ] `translate`: keep `yields`, `megacap tech`, `semis`, and `risk appetite`
- [ ] `score`: surface `ambiguous` until yields and leadership confirmation make it `actionable`
- [ ] `deploy`: keep `wait_for_confirmation`; no exact entry, stop, or size
- [ ] `provenance`: confirm NQ source files and stage rule IDs are recorded

## `zn_dovish_repricing_cluster` (`ZN`)
- [ ] `ingest`: preserve multi-article mode and the reporting-versus-commentary split
- [ ] `cluster`: keep `discovery` and separate the Fed-path article from commentary
- [ ] `analyze`: rank Fed-path repricing and inflation-growth decomposition above narrative spin
- [ ] `translate`: keep ZN price-versus-yield discipline and the listed channels
- [ ] `score`: surface `actionable` only if primary reporting still dominates; otherwise `ambiguous`
- [ ] `deploy`: keep `continuation_bias` bounded and non-prescriptive
- [ ] `provenance`: confirm ZN canonical source refs and stage rule IDs are recorded

## `gc_geopolitical_without_cross_asset_confirmation` (`GC`)
- [ ] `ingest`: preserve single-article `synthesis` classification and thin-fact context
- [ ] `cluster`: do not overstate single-source coherence
- [ ] `analyze`: keep the unresolved split across geopolitics, real yields, DXY, and liquidity
- [ ] `translate`: keep `geopolitics` and `liquidity stress` with mixed pricing status
- [ ] `score`: surface `ambiguous`; downgrade to `insufficient_evidence` or `no_edge` if confirmation is absent
- [ ] `deploy`: keep `wait_for_confirmation` bounded
- [ ] `provenance`: confirm GC source files and stage rule IDs are recorded

## `6e_relative_policy_divergence` (`6E`)
- [ ] `ingest`: preserve single-article metadata and `primary_reporting`
- [ ] `cluster`: keep one relative-policy divergence narrative
- [ ] `analyze`: preserve the EUR-versus-USD mechanism and `euro_driver` dominance
- [ ] `translate`: keep ECB-Fed divergence, growth differential, and dollar-side channels
- [ ] `score`: surface `actionable` only if spreads, DXY, and Bund-versus-Treasury confirmation align; otherwise `ambiguous`
- [ ] `deploy`: keep `continuation_bias` bounded and non-autonomous
- [ ] `provenance`: confirm 6E source files and stage rule IDs are recorded

## `cl_opec_inventory_conflict` (`CL`)
- [ ] `ingest`: preserve multi-article mode with `official_statement`, `primary_reporting`, and `commentary`
- [ ] `cluster`: keep `mixed` and retain OPEC+, inventory, and post-hoc commentary buckets
- [ ] `analyze`: separate physical supply, inventory, and low-information commentary without collapsing them
- [ ] `translate`: preserve CL-specific channel ranking and best-expression discipline from the dedicated package
- [ ] `score`: surface `ambiguous`; downgrade to `no_edge` if no channel clearly dominates
- [ ] `deploy`: keep `wait_for_confirmation` bounded and non-prescriptive
- [ ] `provenance`: confirm CL source files and stage rule IDs include the dedicated package path
