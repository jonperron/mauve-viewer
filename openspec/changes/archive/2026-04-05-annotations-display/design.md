## Context

The Mauve desktop application displays genomic annotations (CDS, tRNA, rRNA, misc_RNA) as colored boxes on genome panels when zoomed sufficiently. It also renders contig boundaries as vertical lines. This change brings these features to the web viewer.

## Goals

- Parse GenBank flat files to extract feature annotations and contig boundaries
- Render features as color-coded rectangles on genome panels at appropriate zoom levels
- Provide interactive tooltips for feature inspection with NCBI cross-references
- Integrate annotation lifecycle into the existing viewer architecture

## Non-Goals

- EMBL or INSDseq annotation parsing (future work)
- Similarity profile rendering within features
- Feature search/filtering UI

## Decisions

### GenBank parser as pure function
The parser (`parseGenBank`, `parseGenBankMulti`) is implemented as stateless pure functions that take a string and return `GenomeAnnotations`. This keeps parsing testable and decoupled from the viewer.

### AnnotationMap as optional parameter
`renderAlignment()` accepts an optional `AnnotationMap` (Map<number, GenomeAnnotations>) parameter rather than requiring annotations. This preserves backward compatibility — callers without annotations see no change.

### Zoom threshold constant
The 1 Mbp threshold is defined as `FEATURE_ZOOM_THRESHOLD` in `src/annotations/types.ts`. Features are only rendered when the visible range is below this threshold, matching the legacy Mauve behavior.

### XSS protection strategy
All user-provided text from GenBank qualifiers is escaped via `escapeHtml()` (using DOM textContent → innerHTML) before insertion into tooltip HTML. URL parameters use `encodeURIComponent()`. This prevents injection from malicious GenBank files.

### Contig boundaries always visible
Contig boundaries are rendered as vertical red lines regardless of zoom level, while feature annotations follow the 1 Mbp threshold. This matches legacy behavior where contig junctions are structural markers visible at all scales.

## Risks

- Large GenBank files with thousands of features may impact rendering performance at high zoom. Mitigated by filtering to only visible features before rendering.
- Multi-record GenBank files with many contigs create many boundary lines. Impact is minimal since lines are simple SVG elements.
