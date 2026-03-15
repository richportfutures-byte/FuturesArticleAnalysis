# Contract Prompt Library Workbench

Deterministic TypeScript + React local workflow engine for futures article analysis across five contracts: **NQ, ZN, GC, 6E, CL**.

## Source-of-truth implementation
This app is implemented directly from the Codex pack documents in this repo:
- `00_SOURCE_INVENTORY.md`
- `01_PRODUCT_SPEC.md`
- `02_STATE_MACHINE_SPEC.md`
- `03_RULES_SCHEMA.md`
- `04_CONTRACT_MODULES.md`
- `05_UI_AND_FILE_TREE.md`
- `06_SEED_FIXTURES.json`
- `07_ACCEPTANCE_CHECKLIST.md`

Source completeness note: all five contracts now have implementation-grade coverage; CL uses a dedicated full workflow package and NQ/ZN/GC/6E use block-level workflow sources.

## Workflow model
Primary product workflow:
- `ingest -> cluster -> analyze -> translate -> score -> deploy`

Explicit app state machine:
- `draft -> intake -> screen -> cluster -> analyze -> translate -> deploy -> pre_trade_review -> completed`
- Optional follow-on stage: `post_reaction_review`.

## Product guardrails
- deterministic workflow engine, not a generic chatbot
- explicit early terminal outcomes: `irrelevant`, `noise`, `insufficient_evidence`, `no_edge`
- shared workflow logic separated from contract-specific overrides
- no exact entry, stop, or position size outputs

## Runtime prerequisites
- Node.js **20+**
- npm **10+**

## Local install and run
```bash
npm install
npm run dev
```
Then open the local Vite URL shown in terminal (typically `http://localhost:5173`).

## Verification commands
```bash
npm test
npm run build
```

## CI verification
GitHub Actions workflow is included at:
- `.github/workflows/ci.yml`

It runs, in order:
1. `npm install`
2. `npm test`
3. `npm run build`

## Troubleshooting
If install/build/test fails locally:

1. **Registry / network restrictions**
   - Symptom: `npm install` gets `403 Forbidden` or timeout.
   - Cause: restricted environment or corporate registry policy.
   - Fix: verify your npm registry access (`npm config get registry`) and authentication, then retry in a normal developer network.

2. **Wrong Node/npm versions**
   - Symptom: toolchain incompatibility or lock/install anomalies.
   - Fix: use Node 20+ and npm 10+.

3. **Missing clean install**
   - Symptom: unresolved module or type errors after dependency updates.
   - Fix:
     ```bash
     rm -rf node_modules package-lock.json
     npm install
     npm test
     npm run build
     ```

4. **Sandbox limitations**
   - Symptom: dependencies unavailable in constrained execution sandboxes.
   - Fix: run the same commands in a normal local environment or CI runner.

## Acceptance report (status)
See machine-readable report in `src/report/acceptance.ts`.
