# Contract Translation Layer

The translation layer exists to bridge article analysis and actual contract relevance.

## Contract thesis
Bullish 6E means the euro strengthens versus the dollar, usually through ECB relative hawkishness, improving euro-area growth expectations, or broad dollar weakness. Bearish 6E means the euro weakens versus the dollar, usually through Fed outperformance, euro-area weakness, energy stress, or stronger structural dollar demand.

## Mandatory outputs
- net impact on Euro FX Futures (6E): bullish / bearish / mixed / no edge
- primary driver hierarchy, ranked
- whether the best expression is this contract or a different one
- expected reaction horizon
- underpriced / consensus / stale assessment
- confirmation markers
- invalidation markers
- trade-use note describing how the output should shape bias or setup preference without dictating execution

## Clean translation rule
If the article cannot be translated into a contract-specific mechanism with internal consistency, output **no edge**.
