## Context

The Java Mauve application provided gap export through a GUI menu. The web reimplementation follows the same pattern as SNP export: in-memory extraction from parsed XMFA data, tab-delimited formatting, and Blob-based file download. The `resolveContig` and `downloadTextFile` utilities from the SNP export module are reused.

## Goals

- Extract intra-block gaps (runs of '-' characters) from alignment segment data
- Report gap position relative to adjacent non-gap bases, handling both strands
- Match the tab-delimited output convention established by SNP export
- Support contig resolution from loaded annotation data
- Integrate into the Options panel with conditional visibility

## Non-Goals

- CLI export mode (web-only application)
- Inter-block gap detection (only intra-block gaps within alignment segments)
- Gap filtering by minimum length (exports all gaps)

## Decisions

1. **Reuse SNP export utilities** — `resolveContig` and `downloadTextFile` from `snp-export.ts` are imported directly, avoiding duplication.
2. **Adjacent position for gap location** — Forward strand: position of the last non-gap base before the gap. Reverse strand: position of the first non-gap base after the gap. Falls back to segment boundary when no adjacent base exists.
3. **Pre-computed position array** — Non-gap positions are computed once per segment via `computePositions`, matching the SNP export approach.
4. **Sort by genome index then position** — Ensures deterministic, human-readable output regardless of block/segment processing order.
5. **Conditional button visibility** — `onExportGaps` callback is optional in `OptionsCallbacks`. The alignment viewer passes it only when `hasBlocks` is true.

## Risks

- Large alignments with many gaps could produce large TSV files in memory. Acceptable for current expected data sizes.
