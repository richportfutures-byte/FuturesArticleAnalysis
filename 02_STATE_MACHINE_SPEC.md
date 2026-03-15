# Deterministic State Machine Specification

## Purpose
Encode the prompt-library workflow as an explicit state machine rather than a free-form chat sequence.

## Canonical stages
1. `draft`
2. `intake`
3. `screen`
4. `cluster`
5. `analyze`
6. `translate`
7. `deploy`
8. `pre_trade_review`
9. `post_reaction_review`
10. `completed`
11. `error`

## State details

### `draft`
Initial state before any article or contract selection exists.

**Required inputs to exit**
- contract_id
- source payload (single article or multi-article cluster)

**Allowed transitions**
- `draft -> intake`

### `intake`
Normalize articles into structured source objects.

**Tasks**
- assign article IDs
- capture source type if known
- capture publication metadata if available
- classify run mode: `single_article` or `multi_article`

**Failure conditions**
- empty source payload
- unsupported contract
- unreadable source object

**Allowed transitions**
- `intake -> screen`
- `intake -> error`

### `screen`
Apply article-selection logic.

**Tasks**
- assess whether the article plausibly routes through contract channels
- classify each source as candidate catalyst, context piece, commentary, or likely post-hoc attachment
- reject clearly irrelevant or low-information material

**Possible outputs**
- `selected`
- `context_only`
- `noise`
- `irrelevant`

**Allowed transitions**
- `screen -> cluster` when at least one source survives
- `screen -> completed` with terminal verdict `no_edge` when nothing survives
- `screen -> error`

### `cluster`
Cluster surviving sources around a shared event or move.

**Tasks**
- group articles by event or catalyst
- mark overlapping facts
- isolate disputed causal claims
- identify strongest factual source
- mark cluster mode: `discovery`, `consensus`, or `post_hoc`

**Allowed transitions**
- `cluster -> analyze`
- `cluster -> completed` with terminal verdict `noise` or `no_edge`
- `cluster -> error`

### `analyze`
Perform deep-analysis steps.

**Tasks**
- extract core claim
- separate confirmed facts, plausible inference, speculation, and opinion
- identify what is genuinely new vs recycled background
- classify article/source mode: primary reporting, synthesis, commentary
- state strongest competing interpretation

**Allowed transitions**
- `analyze -> translate`
- `analyze -> completed` with `insufficient_evidence`
- `analyze -> error`

### `translate`
Map the surviving narrative into contract-specific channels.

**Tasks**
- choose relevant transmission channels
- rank drivers
- determine best expression vehicle
- assign pricing status
- assign horizon split
- generate confirmation and invalidation markers

**Terminal guardrail**
If the mechanism is not internally consistent, force terminal verdict `no_edge`.

**Allowed transitions**
- `translate -> deploy`
- `translate -> completed` with `no_edge`
- `translate -> error`

### `deploy`
Generate deployment-oriented output.

**Tasks**
- set best-use classification: continuation bias, fade candidate, wait, ignore, or no trade
- write trade-use note
- surface what the output should shape
- explicitly exclude exact entry/stop/size

**Allowed transitions**
- `deploy -> pre_trade_review`
- `deploy -> completed`
- `deploy -> error`

### `pre_trade_review`
Run checklist before operational use.

**Tasks**
- confirm driver hierarchy recorded
- confirm horizon recorded
- confirm minimum confirmation recorded
- confirm market state reviewed
- confirm thesis can be abandoned if price rejects it

**Allowed transitions**
- `pre_trade_review -> completed`
- `pre_trade_review -> error`

### `post_reaction_review`
Optional later-stage review after price responds.

**Tasks**
- evaluate move direction vs thesis
- inspect cross-market confirmation
- classify move as sustained, faded, reversed, or mixed
- classify article as catalyst, rationalization, or irrelevant
- append event log for continuation / fade / ignore learning

**Allowed transitions**
- `post_reaction_review -> completed`
- `post_reaction_review -> error`

## Global invariants
- No skipping stages.
- `completed` may be reached early only with a terminal no-edge / irrelevant / insufficient-evidence outcome.
- Every completed run must include provenance notes.
- Every deployment output must include confirmation and invalidation markers.
