## Why

Phases 7.3 and 7.4 complete the client-side MCM workflow and the server-side algorithm core. The REST API scaffolding (phase 7.1) and job manager (phase 7.2) are already in place; the missing pieces are (a) the browser UI that drives the workflow and displays results, and (b) the TypeScript ports of the three Java algorithm components needed to produce output files.

## What Changes

- Add client-side REST API client (`src/contig-reorder/api-client.ts`) with typed wrappers for all `/api/reorder/**` endpoints
- Add `*_contigs.tab` parser (`src/contig-reorder/tab-parser.ts`) that converts raw tab file text into a structured `ParsedContigsTab` object
- Add polling progress dialog (`src/contig-reorder/reorder-progress.ts`) that tracks job status at 2-second intervals and calls lifecycle callbacks
- Add results display modal (`src/contig-reorder/results-viewer.ts`) that renders the three contig sections as tables with strand badges and a "Load Alignment" action
- Add client-side type definitions (`src/contig-reorder/types.ts`) mirroring server types and adding parsed tab representations
- Add `ConvergenceDetector` class (`server/contig-reorder/convergence-detector.ts`) that tracks seen orderings using a `Set<string>` and detects when a repeat occurs
- Add `generateContigsTab()` and `assignPseudocoordinates()` (`server/contig-reorder/tab-generator.ts`) producing `*_contigs.tab` content matching the Java `ContigFeatureWriter` format
- Add `groupContigs()`, `getPrimaryContig()`, `areProximate()` (`server/contig-reorder/contig-grouper.ts`) — TypeScript port of Java `ContigGrouper`/`ContigReorderer` with constants `MAX_IGNORABLE_DIST=50`, `MIN_LENGTH_RATIO=0.01`

## Capabilities

### New Capabilities

- `mcm-client-ui`: Browser-side workflow components — API client, tab parser, progress dialog, results viewer

### Modified Capabilities

- `contig-reordering`: New requirements for convergence detection, tab file generation, contig grouping algorithm, and client UI

## Impact

- `src/contig-reorder/` — new client-side module tree
- `server/contig-reorder/` — three new algorithm modules consumed by the job runner
- No breaking changes to existing REST API endpoints
