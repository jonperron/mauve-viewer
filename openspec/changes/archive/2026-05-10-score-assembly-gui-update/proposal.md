## Why

The "Score Assembly" feature was documented in the spec as triggered by a dedicated `ScoreAssembly` toolbar button and displaying results in a Java-style `AnalysisDisplayWindow` with legacy tab labels. The actual implementation places the button inside the **Analysis** dropdown menu (alongside "Align Genomes" and "Order Contigs"), computes all metrics entirely **client-side** from the currently loaded alignment, and displays the results via `createScoringReport()` with five tabs (Structural, Sequence, Contigs, CDS, Content). The spec must be corrected to match the shipped implementation.

## What Changes

- Update the "Score assembly via GUI" scenario to reference the **Analysis dropdown menu** instead of a standalone toolbar button
- Update the scenario THEN clause to reflect **client-side metric computation** and the **five-tab dialog** (Structural, Sequence, Contigs, CDS, Content)
- Remove the outdated reference to `AnalysisDisplayWindow` and legacy tab names (Summary, SNPs, Gaps, Broken CDS)

## Capabilities

### Modified Capabilities

- `assembly-scoring`: Corrected GUI trigger and results display description for the "Score assembly via GUI" scenario

## Impact

- `openspec/specs/assembly-scoring/spec.md` — one scenario updated
- No code changes; spec alignment only
