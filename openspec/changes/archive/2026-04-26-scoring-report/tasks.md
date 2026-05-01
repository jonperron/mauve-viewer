## 1. Dialog and tab system

- [x] Define `ScoringReportMetrics`, `ScoringReportCallbacks`, `ScoringReportHandle`, `ScoringReportTab` in `src/scoring/scoring-report.ts`
- [x] Implement `buildDialogHtml()` with five tab buttons and five tab panels
- [x] Implement `activateTab()` setting `aria-selected`, `hidden`, and CSS class on buttons/panels
- [x] Wire tab button `click` event to `activateTab()`
- [x] Suppress native Escape key via `cancel` event `preventDefault()`

## 2. Tab content builders

- [x] Implement `buildStructuralTab()` displaying 10 structural metrics
- [x] Implement `buildSequenceTab()` with summary metrics and 4×4 substitution matrix
- [x] Implement `buildContigsTab()` with summary metrics and per-contig length distribution table
- [x] Implement `buildCdsTab()` with summary metrics and broken CDS detail table (empty state: "No broken CDS detected.")
- [x] Implement `buildContentTab()` with missing chromosomes and extra contigs tables (empty state: "None.")
- [x] HTML-escape all user-supplied strings via `escapeHtml()`

## 3. TSV export

- [x] Implement `exportScoringReport()` returning a three-column TSV string
- [x] Include all five sections separated by blank lines
- [x] Include per-entry rows for contigs, broken CDS, missing chromosomes, and extra contigs

## 4. Download helper

- [x] Implement `triggerTsvDownload()` using Blob + `URL.createObjectURL` + `<a>.click()` + `revokeObjectURL`
- [x] Wire Export button `click` event to `exportScoringReport()` + `triggerTsvDownload()`

## 5. Public API

- [x] Implement `createScoringReport(container, metrics, callbacks): ScoringReportHandle`
- [x] Close button calls `onClose` callback, closes dialog, removes element
- [x] `destroy()` method closes and removes dialog
