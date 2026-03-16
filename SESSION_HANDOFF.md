# Session Handoff

## Verified baseline
- Repo: `richportfutures-byte/FuturesArticleAnalysis`
- Branch: `main`
- Green baseline commit: `eb76201` (`verified-green-eb76201`)
- Prior repair commit: `5da2716`
- Local verification: passed (`npm test`, `npm run build`)
- CI on `main`: green

## Source doctrine
- Source of truth: contract prompt library plus master deployment guide
- CL uses its dedicated package where CL-specific doctrine applies
- Scope stays exact: `NQ`, `ZN`, `GC`, `6E`, `CL`

## Required workflow
- `ingest -> cluster -> analyze -> translate -> score -> deploy`
- Surfaced outcomes: `actionable`, `ambiguous`, `insufficient_evidence`, `no_edge`

## Guardrails
- Deterministic workflow only
- Bounded deployment guidance only
- No exact entry, exact stop, exact size, or autonomous execution permission

## Operator default
- Preserve canonical source refs, stage rule refs, channel tables, and provenance traces
- Re-run `npm test` and `npm run build` before comparing any future change against `eb76201`
