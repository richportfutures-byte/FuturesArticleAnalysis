# Proposed File Tree

```text
.
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── app/
│   │   └── App.tsx
│   ├── domain/
│   │   ├── enums.ts
│   │   ├── entities.ts
│   │   ├── rules.ts
│   │   ├── scoring.ts
│   │   ├── provenance.ts
│   │   └── contracts/
│   │       ├── types.ts
│   │       ├── index.ts
│   │       ├── nq.ts
│   │       ├── zn.ts
│   │       ├── gc.ts
│   │       ├── sixe.ts
│   │       └── cl.ts
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
│   ├── fixtures/
│   │   └── seedFixtures.ts
│   ├── report/
│   │   └── acceptance.ts
│   └── tests/
│       ├── stateMachine.test.ts
│       ├── contractOverrides.test.ts
│       ├── terminalOutcomes.test.ts
│       ├── translation.test.ts
│       └── acceptance.test.ts
└── 06_SEED_FIXTURES.json
```
