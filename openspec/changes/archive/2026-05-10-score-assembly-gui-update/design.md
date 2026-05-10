## Context

The assembly scoring feature computes a full suite of quality metrics when comparing a draft assembly to a reference genome. The original spec described the GUI entry point as a standalone `ScoreAssembly` toolbar button (matching the Java Swing `ScoreAssemblyFrame`) and the results window as an `AnalysisDisplayWindow` with Java-legacy tab labels. The shipped implementation integrates the feature into the existing Analysis dropdown menu and uses the web-native `createScoringReport` dialog.

## Goals / Non-Goals

**Goals:**
- Align the spec with the actual implementation: Analysis dropdown menu entry point, client-side metric computation, five-tab results dialog

**Non-Goals:**
- Changing any behaviour — this is a spec correction only
- Adding server-side scoring support (all computation remains client-side)

## Decisions

**Analysis dropdown menu as entry point**  
Placing "Score Assembly" inside the Analysis menu alongside "Align Genomes" and "Order Contigs" keeps all analysis actions in a single discoverable location and avoids toolbar clutter. The button is hidden (callback set to `undefined`) when fewer than 2 genomes are loaded.

**Client-side metric computation**  
All five metric functions (`computeStructuralMetrics`, `computeSequenceMetrics`, `computeContigStats`, `computeCdsQualityMetrics`, `computeContentMetrics`) operate on the in-memory `XmfaAlignment` already present in the viewer, making the feature instantaneous and network-free.

**Five-tab dialog via `createScoringReport`**  
The five tabs (Structural, Sequence, Contigs, CDS, Content) map directly to the five metric categories and are already specified in the `Scoring report UI` requirement. The old Java tab names (Summary, SNPs, Gaps, Broken CDS) are replaced by web-native equivalents.

## Risks / Trade-offs

- [Low] Spec drift — the Java CLI scenario remains in the spec but is not exercised by the web implementation. It is retained for completeness and as documentation of the legacy tool's interface.
