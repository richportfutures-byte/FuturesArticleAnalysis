# Anti-Drift Test Plan

## Baseline pin
- Compare changes against `main` at `eb76201`
- Keep `5da2716` as the prior repair reference

## Required verification
- Run `npm test`
- Run `npm run build`

## Drift protections
1. Source doctrine stays pinned to the contract prompt library and master deployment guide; CL keeps its dedicated package path.
2. Contract scope stays exact: `NQ`, `ZN`, `GC`, `6E`, `CL`.
3. Required workflow stays `ingest -> cluster -> analyze -> translate -> score -> deploy`.
4. Surfaced outcomes stay `actionable`, `ambiguous`, `insufficient_evidence`, `no_edge`.
5. Each contract override keeps canonical source refs, stage rule refs, and explicit channel tables.
6. Provenance traces keep source files, rule IDs, and override IDs through the run.
7. Deployment output stays bounded and never adds exact entry, exact stop, exact size, or autonomous execution permission.
8. Fixture coverage keeps one reviewable fixture per contract.

## Fail conditions
- Fail if local verification breaks.
- Fail if any protection above is weakened or replaced with generic logic.
