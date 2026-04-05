## Why

The viewer needs to display genomic annotations (CDS, tRNA, rRNA, misc_RNA) and contig boundaries when users zoom into aligned genomes. This is a core visualization feature from the legacy Mauve desktop application that enables biologists to correlate alignment features with annotated genes and gene products.

## What Changes

- Add GenBank flat file parser extracting supported feature types with qualifiers
- Add annotation rendering on genome panels (color-coded rectangles, strand-aware positioning)
- Add contig boundary rendering as vertical lines on genome panels
- Add feature tooltips on hover (summary) and click (full details + NCBI links)
- Integrate annotation lifecycle into the viewer handle (update on zoom/pan, cleanup on destroy)

## Capabilities

### New Capabilities

_None — all changes fall under existing capabilities._

### Modified Capabilities

- `file-format-support`: GenBank parser now implemented with full feature extraction (CDS, gene, tRNA, rRNA, misc_RNA), complement/join location handling, multi-record support, and contig boundary detection
- `xmfa-viewer`: Annotated feature display, contig boundary rendering, feature tooltips, and annotation lifecycle integration into ViewerHandle are now implemented

## Impact

- New modules: `src/annotations/` (types, parser, index), `src/viewer/annotations.ts`, `src/viewer/feature-tooltip.ts`
- Modified: `src/viewer/alignment-viewer.ts` (accepts optional `AnnotationMap`, returns `annotationsHandle` on `ViewerHandle`)
- No breaking changes to existing APIs
