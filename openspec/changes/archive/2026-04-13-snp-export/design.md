## Context

The Java Mauve application provided SNP export via a CLI tool (`SnpExporter`) and a GUI menu (Tools → Export → Export SNPs). The web reimplementation replaces both paths with a browser-based flow: in-memory extraction from parsed XMFA data, tab-delimited formatting, and Blob-based file download.

## Goals

- Extract SNPs column-by-column from XMFA alignment blocks
- Match the Java legacy output format (tab-delimited, same column naming)
- Integrate into the Options panel with conditional visibility
- Support contig resolution from loaded annotation data

## Non-Goals

- CLI export mode (web-only application)
- Streaming/chunked export for very large alignments (not needed for current scale)

## Decisions

1. **Pure functions for extraction and formatting** — `extractSnps` and `formatSnpTable` are separate, composable, testable functions. `exportSnps` is a convenience wrapper.
2. **Position tracking via pre-computed offsets** — Non-gap offsets are pre-computed per segment to avoid repeated iteration. Reverse strand positions count down from segment end.
3. **ContigMap as optional parameter** — Contig resolution is opt-in. When absent, genome name is used as contig name with genome-wide position.
4. **Browser download via Blob URL** — `downloadTextFile` creates a temporary anchor element for download. No server-side component needed.
5. **Conditional button visibility** — `onExportSnps` callback is optional in `OptionsCallbacks`. The alignment viewer passes it only when `hasBlocks` is true.

## Risks

- Large alignments with many polymorphic sites could produce large TSV files in memory. Acceptable for current expected data sizes.
