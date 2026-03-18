# Rebuild Intent

## Current state

The architectural correction is materially complete.

The repo now represents:
- a market-intelligence workbench for futures bias formation
- LLM-native reasoning as the analysis core in live mode
- deterministic code as the governor layer for schema, provenance, contract scope, doctrine evaluation, bounded outputs, and fail-closed behavior

It does not represent:
- a pure rules engine
- a trade automation system
- an execution engine
- a chatbot-first product

## Completed corrections

Completed:
- provider-ready reasoning boundary
- explicit live mode and explicit simulated mode
- fail-closed handling for unconfigured or invalid live-provider paths
- bounded doctrine evaluation and bounded bias brief generation
- manual-text intake as the production-ready path
- fixture intake as an explicit supported path
- Vercel live-provider path through the server-side function

## Current honest limitations

Current limitations:
- `manual_url` is scaffolded only and records unresolved provenance without article extraction
- URL extraction and feed fetching are not implemented
- runtime doctrine loading still includes a temporary manual master-guide fallback excerpt while the canonical `.docx` remains the doctrine authority

## Near-term work

Future work should stay grounded:
- replace the temporary manual master-guide fallback with a checked-in extracted text artifact
- add a reliable extracted-content path for URL or feed intake without faking article text
- keep simulated mode explicit and test-oriented only
