## Context

The summary pipeline is the largest batch-analysis feature in Mauve, originally implemented in Java as `SummaryExporter` and related classes. It was the last major export feature remaining after SNP, gap, permutation, homolog, identity matrix, and CDS error detection were implemented.

## Goals

- Faithfully reimplement all summary output types from legacy Mauve
- Modular design: each output type in its own module for testability
- Pure functions operating on in-memory data structures (no file I/O)
- Configurable thresholds matching legacy defaults

## Non-Goals

- GUI options panel for summary configuration (deferred — uses defaults)
- Streaming processing for very large alignments
- Incremental re-computation on data changes

## Decisions

### Segment processing as a separate module
Segment processing (chain building, island detection, ID assignment) is isolated in `segment-processor.ts` so it can be tested independently of output formatting. All downstream modules receive `ProcessedSegmentData`.

### Typed ID scheme
IDs follow the legacy convention: `b_N` (full backbone), `i_N` (single-genome island), `b_i_N` (partial multiplicity). IDs are assigned sequentially during a single pass across all genome chains, ensuring backbone segments shared across genomes receive the same ID.

### Multiplicity bitmask
Each segment carries a bitmask where MSB = genome 0. This allows efficient set operations and matches the legacy binary-string label format.

### Browser download via shared utility
File downloads reuse the existing `downloadTextFile` helper from the SNP export module, avoiding duplication.

## Risks

- Large alignments with many genomes produce combinatorial multiplicity rows (2^N - 1); performance is acceptable for typical genome counts (< 20).
- Partial FASTA extraction depends on alignment block sequence data being available in memory.
