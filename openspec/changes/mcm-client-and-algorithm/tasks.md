## 1. Client-Side Types and API Client

- [x] Define `ReorderJobStatus`, `ReorderSequenceFormat`, `ReorderRequest`, `ReorderJobCreated`, `ReorderJobStatusResponse`, `ReorderResult`, `ReorderClientConfig` in `src/contig-reorder/types.ts`
- [x] Define `ContigStrand`, `ParsedContigEntry`, `ParsedContigsTab` in `src/contig-reorder/types.ts`
- [x] Implement `submitReorder()` in `src/contig-reorder/api-client.ts`
- [x] Implement `getReorderStatus()` in `src/contig-reorder/api-client.ts`
- [x] Implement `cancelReorder()` in `src/contig-reorder/api-client.ts`
- [x] Implement `getReorderResult()` in `src/contig-reorder/api-client.ts`

## 2. Tab File Parser

- [x] Implement `parseContigsTab()` in `src/contig-reorder/tab-parser.ts`
- [x] Handle preamble skip, section detection, header row skip
- [x] Parse strand column into `ContigStrand`
- [x] Silently ignore malformed rows (< 6 columns or non-numeric coordinates)

## 3. Progress Dialog

- [x] Implement `createReorderProgress()` in `src/contig-reorder/reorder-progress.ts`
- [x] Sequential `setTimeout`-based polling at 2000 ms interval
- [x] Status messages for `queued`, `running`, `completed`, `failed`, `cancelled`
- [x] Cancel button triggers `cancelReorder()` and `onCancel` callback
- [x] Terminal states disable cancel button and show close button
- [x] `onComplete`, `onError`, `onCancel` lifecycle callbacks

## 4. Results Viewer

- [x] Implement `createResultsViewer()` in `src/contig-reorder/results-viewer.ts`
- [x] Parse `result.contigsTab` via `parseContigsTab()`
- [x] Render ordered, reversed, and conflicted sections as tables
- [x] "None" placeholder for empty sections
- [x] Forward/complement strand badges with CSS classes
- [x] HTML-escape all contig names before insertion
- [x] "Load Alignment" button calls `onLoadAlignment` when callback provided
- [x] "Close" button calls `onClose` and removes dialog

## 5. Server — Convergence Detector

- [x] Implement `ConvergenceDetector` class in `server/contig-reorder/convergence-detector.ts`
- [x] `check()` records new orderings and returns `true` on repeat
- [x] `iterationCount` getter returns number of distinct orderings seen
- [x] `reset()` clears all recorded orderings

## 6. Server — Tab Generator

- [x] Implement `generateContigsTab()` in `server/contig-reorder/tab-generator.ts`
- [x] Emit fixed preamble matching Java `ContigFeatureWriter`
- [x] Emit three sections; omit empty sections
- [x] Implement `assignPseudocoordinates()` with 1-based sequential allocation

## 7. Server — Contig Grouper

- [x] Implement `groupContigs()` in `server/contig-reorder/contig-grouper.ts`
- [x] Export `MAX_IGNORABLE_DIST = 50` and `MIN_LENGTH_RATIO = 0.01`
- [x] Implement `getPrimaryContig()` with overlap fraction check
- [x] Implement `areProximate()` for reference-gap check
- [x] Sort LCBs by reference start; group by proximity
- [x] Detect conflicted contigs (solidly in multiple non-proximate groups)
- [x] Detect reversed contigs (majority strand is reverse complement)
- [x] Append unaligned contigs at end in original input order
- [x] Return `{ toReverse: [], ordered: all, conflicted: [] }` for empty input
