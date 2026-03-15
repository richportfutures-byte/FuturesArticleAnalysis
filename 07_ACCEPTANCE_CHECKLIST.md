# Acceptance Checklist

## Source-faithfulness
- [ ] The build treats the contract prompt library and deployment guide as source of truth.
- [ ] Shared workflow doctrine comes from the master deployment guide.
- [ ] CL uses its dedicated package rather than inferred generic logic.
- [ ] ZN uses its detailed block files for clustering, one-shot output shape, and domain discipline.
- [ ] NQ uses its uploaded full block set, including active-hours guidance, rather than readme-only inference.
- [ ] GC uses its uploaded full block set, including active-hours guidance, rather than readme-only inference.
- [ ] 6E uses its uploaded full block set, including active-hours guidance, rather than readme-only inference.

## Behavioral correctness
- [ ] The app is deterministic and stage-based.
- [ ] The state machine enforces ordered transitions.
- [ ] Early terminal outcomes exist for irrelevant, noise, no edge, and insufficient evidence.
- [ ] Exact entry, exact stop, and exact size are not represented in the output model.
- [ ] Every deployment result includes confirmation and invalidation markers.

## Contract separation
- [ ] Shared logic is reusable.
- [ ] Contract overrides are explicit and isolated.
- [ ] NQ logic is not flattened into GC or 6E logic.
- [ ] GC driver hierarchy logic is distinct from generic safe-haven storytelling.
- [ ] 6E logic uses relative-value framing rather than simple bullish/bearish macro language.
- [ ] CL logic distinguishes crude, products, and other expression vehicles.
- [ ] ZN logic preserves price-versus-yield discipline and outright-vs-curve separation.

## UI requirements
- [ ] The source intake screen supports single-article and multi-article modes.
- [ ] The cluster screen shows strongest source and disputed claims.
- [ ] The translation screen shows driver hierarchy and best expression vehicle.
- [ ] The deployment screen shows bounded outputs: continuation bias, fade candidate, wait, ignore, no trade.
- [ ] The provenance screen shows source files and rule IDs used.

## Test requirements
- [ ] State-machine tests exist.
- [ ] Contract override tests exist for all five modules.
- [ ] No-edge / irrelevant / insufficient-evidence tests exist.
- [ ] Pricing assessment and horizon split tests exist.
- [ ] Fixture-based acceptance tests exist for at least one run per contract.

## Source-completeness note
- [ ] The implementation docs explicitly note that all five contracts now have implementation-grade source coverage, with CL provided as a dedicated full workflow package and NQ / ZN / GC / 6E provided through block-level files.
