# Codex Handoff Prompt

Paste everything in this file into Codex together with the other documents in this pack.

```text
Build a local web application from the attached app-foundation pack.

Source-of-truth documents:
- 00_SOURCE_INVENTORY.md
- 01_PRODUCT_SPEC.md
- 02_STATE_MACHINE_SPEC.md
- 03_RULES_SCHEMA.md
- 04_CONTRACT_MODULES.md
- 05_UI_AND_FILE_TREE.md
- 06_SEED_FIXTURES.json
- 07_ACCEPTANCE_CHECKLIST.md

Mission:
Implement a deterministic Contract Prompt Library Workbench for five futures contracts: NQ, ZN, GC, 6E, and CL.

Critical product behavior:
1. The app is an article-to-deployment workflow engine, not a generic chatbot.
2. It must process either a single article or a cluster of related articles.
3. It must explicitly stage the workflow:
   draft -> intake -> screen -> cluster -> analyze -> translate -> deploy -> pre_trade_review -> completed
   with optional later-stage post_reaction_review.
4. It must support early terminal outcomes:
   irrelevant, noise, insufficient_evidence, no_edge.
5. It must never output exact entry, exact stop, or exact size.
6. Every translated output must include:
   - selected channels
   - ranked driver hierarchy
   - pricing assessment
   - horizon split
   - confirmation markers
   - invalidation markers
   - bounded trade-use note
7. Contract-specific behavior must be implemented through explicit override tables, not hidden prompt strings.

Implementation requirements:
- Use TypeScript.
- Prefer React + Vite for the local web app scaffold.
- Use typed entities and enums for all workflow objects.
- Use a deterministic rules engine.
- Add provenance fields to outputs.
- Keep shared logic separate from contract-specific overrides.
- Surface insufficient-evidence and no-edge outcomes clearly in the UI.
- Add seed fixtures and tests.

Recommended deliverables:
1. proposed file tree
2. TypeScript domain model
3. state machine implementation
4. screening / clustering / translation engine
5. contract override modules
6. UI scaffold for all required screens
7. fixture data
8. unit tests
9. acceptance results
10. run instructions

Hard constraints:
- Do not improvise unsupported trading logic.
- Do not flatten all contracts into a single macro template.
- Do not convert the workflow into an autonomous trading signal engine.
- Use CL package details directly for CL.
- Use ZN and 6E detailed block outputs to shape the general deterministic output contract.
- Use the uploaded NQ block set directly for NQ, including selection, clustering, deep analysis, translation, confirmation, SOPs, one-shot outputs, quick filter, domain appendix, and active-hours context.
- Use the uploaded GC block set directly for GC, including selection, clustering, deep analysis, translation, confirmation, SOPs, one-shot outputs, and active-hours context.
- Use the uploaded 6E block set directly for 6E, including selection, clustering, deep analysis, translation, confirmation, SOPs, one-shot outputs, and active-hours context.

Engineering preference:
Prefer behavioral correctness, traceability, and contract separation over visual polish.

At the end, report:
- what was implemented
- what remains to refine after first implementation
- which acceptance checks passed
- which acceptance checks remain open because of engineering work not yet completed
```
