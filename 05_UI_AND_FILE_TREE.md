# UI, Persistence, and Recommended File Tree

## UI surfaces

### 1. Source Intake
Fields:
- contract selector
- run mode selector
- article list editor
- source type override
- optional publication metadata
- submit button

### 2. Screening View
Show:
- selected vs rejected articles
- why each article was selected or rejected
- channel match
- candidate catalyst / context / commentary / post-hoc tag

### 3. Cluster View
Show:
- narrative buckets
- strongest source by cluster
- common facts
- disputed causal claims
- discovery / consensus / post-hoc classification

### 4. Analysis View
Show:
- core claim
- genuinely new facts
- confirmed vs plausible vs speculative vs opinion
- competing interpretation

### 5. Translation View
Show:
- selected channels
- ranked driver hierarchy
- best expression vehicle
- pricing assessment
- horizon split
- confirmation markers
- invalidation markers

### 6. Deployment View
Show:
- continuation bias / fade candidate / wait / ignore / no trade
- trade-use note
- what this should shape
- what it must not dictate

### 7. Pre-Trade Review View
Show checklist:
- driver hierarchy recorded
- horizon recorded
- minimum confirmation recorded
- current market state checked
- thesis-abandon condition written

### 8. Post-Reaction Review View
Show:
- move direction vs thesis
- cross-market confirmation result
- sustained / faded / reversed / mixed
- catalyst / rationalization / irrelevant classification
- continuation / fade / ignore log tag

### 9. Provenance View
Show:
- source files used
- rule IDs fired
- contract override IDs fired
- notes about accessible-source limitations

## Recommended file tree

```text
contract-prompt-library-workbench/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.ts
│   │   └── layout/
│   ├── domain/
│   │   ├── contracts/
│   │   │   ├── nq.ts
│   │   │   ├── zn.ts
│   │   │   ├── gc.ts
│   │   │   ├── sixe.ts
│   │   │   └── cl.ts
│   │   ├── entities.ts
│   │   ├── enums.ts
│   │   ├── rules.ts
│   │   ├── scoring.ts
│   │   └── provenance.ts
│   ├── engine/
│   │   ├── stateMachine.ts
│   │   ├── pipeline.ts
│   │   ├── screen.ts
│   │   ├── cluster.ts
│   │   ├── analyze.ts
│   │   ├── translate.ts
│   │   ├── deploy.ts
│   │   ├── preTrade.ts
│   │   └── postReaction.ts
│   ├── schemas/
│   │   ├── input.ts
│   │   ├── output.ts
│   │   └── fixtures.ts
│   ├── ui/
│   │   ├── SourceIntake.tsx
│   │   ├── ScreeningView.tsx
│   │   ├── ClusterView.tsx
│   │   ├── AnalysisView.tsx
│   │   ├── TranslationView.tsx
│   │   ├── DeploymentView.tsx
│   │   ├── PreTradeReview.tsx
│   │   ├── PostReactionReview.tsx
│   │   └── ProvenanceView.tsx
│   └── tests/
│       ├── stateMachine.test.ts
│       ├── screening.test.ts
│       ├── translation.test.ts
│       ├── contractOverrides.test.ts
│       └── acceptance.test.ts
└── docs/
    └── app-foundation-pack/
```

## Persistence recommendation
Use structured persisted run records rather than chat history. Every run should save:
- normalized articles
- stage outputs
- final verdict
- provenance
- post-reaction review if completed later
