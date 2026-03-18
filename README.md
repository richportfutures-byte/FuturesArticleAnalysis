# Futures Market-Intelligence Workbench

This repo is a market-intelligence workbench for futures bias formation across exactly five contracts: **NQ, ZN, GC, 6E, CL**.

It uses:
- LLM-native reasoning for article analysis in live mode
- deterministic code only as the governor layer for schema validation, provenance, contract scope, doctrine evaluation, bounded outputs, and fail-closed behavior

It is not:
- a pure rules engine
- a trade automation system
- an execution engine
- a chatbot-first product
- a system that gives exact entry, exact stop, exact size, or autonomous execution directives

## Current workflow

Supported workflow today:
1. intake
2. screening and clustering
3. structured reasoning
4. doctrine evaluation
5. bounded bias brief generation

Supported intake modes:
- `manual_text`: production-ready
- `fixture`: explicit and supported
- `manual_url`: scaffolded only and fails closed honestly without extraction

## Architecture summary

Core architecture:
- **LLM reasoning layer**: separates facts, inference, speculation, rhetoric, causal chain, alternative interpretation, priced-in assessment, confirmation markers, invalidation markers, and contract relevance
- **Deterministic guardrail layer**: validates schema, enforces contract scope, records provenance, sanitizes execution language, and fails closed when the provider is unavailable or invalid
- **Doctrine evaluation layer**: applies local doctrine from `docs/source_of_truth` to contract relevance, bounded expression, timing context, and bias-brief shaping
- **Bounded output layer**: produces a source-grounded bias brief and never execution instructions

The intelligence core is not deterministic. Deterministic logic is allowed only for constraints, not for article reasoning.

## Current deployment scope

Honest production scope:
- contracts are limited to exactly `NQ`, `ZN`, `GC`, `6E`, `CL`
- `manual_text` is the production-ready intake path
- live analysis is LLM-driven in live mode
- simulated mode is explicit only
- live mode fails closed if the provider is unavailable or returns an invalid payload
- deployed live-provider requests go through the Netlify function
- doctrine is sourced from `docs/source_of_truth`
- runtime doctrine loading still includes a temporary manual master-guide fallback until a checked-in extracted text artifact replaces it

## Guardrails

This app:
- shapes bias, scenario framing, contract implications, confirmation watchlists, and alternative interpretations
- records source grounding and provenance
- refuses silent degradation when the live provider path is unavailable

This app does not:
- automate trades
- place orders
- route execution
- provide exact entry, exact stop, or exact size
- grant autonomous execution permission

## Environment and config

High-level config:
- client mode selection uses `VITE_REASONER_MODE`
- client discovery mode selection uses `VITE_SEARCH_MODE`
- deployed live-provider requests use the Netlify function at `/.netlify/functions/reasoner` by default
- deployed live discovery requests use the Netlify function at `/.netlify/functions/discover` by default
- server-side cluster refinement configuration uses `GEMINI_API_KEY` (server-side only) and optional `GEMINI_MODEL` (defaults to `gemini-3-pro-preview`)
- server-side discovery configuration uses `TAVILY_API_KEY` and optional `TAVILY_BASE_URL`

Important:
- live mode on Netlify is designed to keep the API key server-side
- `VITE_SEARCH_MODE` supports `live` (default) and `simulated`
- `TAVILY_API_KEY` must remain server-side only and must never be exposed as `VITE_TAVILY_API_KEY`
- simulated mode must be chosen explicitly
- if live mode is selected without a valid provider configuration, the app fails closed rather than silently falling back

## Source of truth

Canonical doctrine lives under:
- `docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx`
- `docs/source_of_truth/contract_prompt_library/README.md`
- `docs/source_of_truth/contract_prompt_library/NQ/`
- `docs/source_of_truth/contract_prompt_library/ZN/`
- `docs/source_of_truth/contract_prompt_library/GC/`
- `docs/source_of_truth/contract_prompt_library/6E/`
- `docs/source_of_truth/contract_prompt_library/CL/`

Do not invent doctrine that is not present in those files.

## Local run and verification

Prerequisites:
- Node.js 20+
- npm 10+

Commands:

```bash
npm install
npm run dev
npm test
npm run build
```
