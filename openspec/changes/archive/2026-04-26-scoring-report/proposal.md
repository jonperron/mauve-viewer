## Why

The assembly scoring pipeline now computes five categories of quality metrics (structural, sequence, contigs, CDS, and content) but had no UI to display or export these results. Users need a way to view the full report interactively and export it for downstream analysis.

## What Changes

- `createScoringReport()` creates a modal dialog with five tabbed sections (Structural, Sequence, Contigs, CDS, Content) displaying all computed assembly quality metrics.
- `exportScoringReport()` serialises all metrics to a three-column tab-delimited text file (Section / Metric / Value) and triggers a browser download.
- HTML-escaped rendering for all user-supplied string data (feature IDs, chromosome names, contig names).
- Native `<dialog>` Escape key is suppressed; the dialog can only be closed via the Close button.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `assembly-scoring`: add `§Report` requirement covering the scoring report dialog and TSV export function.

## Impact

- New module: `src/scoring/scoring-report.ts` (public exports `createScoringReport`, `exportScoringReport`, types `ScoringReportMetrics`, `ScoringReportCallbacks`, `ScoringReportHandle`, `ScoringReportTab`).
- No API, server, or existing module changes.
