## 1. Annotation types and constants

- [x] Define `FeatureType`, `GenomicFeature`, `ContigBoundary`, `GenomeAnnotations` types
- [x] Define feature color constants (CDS=white, tRNA=green, rRNA=red, misc_RNA=blue)
- [x] Define `FEATURE_ZOOM_THRESHOLD` constant (1 Mbp)

## 2. GenBank parser

- [x] Implement `parseLocation()` with complement() and join() support
- [x] Implement `parseQualifiers()` for multi-line qualifier extraction
- [x] Implement `extractFeatureBlocks()` to identify feature entries in FEATURES section
- [x] Implement `parseGenBank()` for single-record GenBank files
- [x] Implement `parseGenBankMulti()` for multi-record files with contig boundary detection
- [x] Add unit tests for GenBank parser

## 3. Annotation renderer

- [x] Implement `setupAnnotations()` function with AnnotationsHandle lifecycle
- [x] Render feature rectangles with color-coding and strand-aware positioning
- [x] Filter features to visible range for performance
- [x] Render contig boundaries as vertical red lines (#b50707)
- [x] Update annotations on zoom/pan state changes
- [x] Add unit tests for annotation renderer

## 4. Feature tooltips

- [x] Implement `escapeHtml()` for XSS protection
- [x] Implement `buildTooltipContent()` for hover tooltips (locus_tag, gene, product, coordinates)
- [x] Implement `buildDetailContent()` for click details (full qualifiers + NCBI links)
- [x] Implement `createFeatureTooltip()` with show/showDetails/hide/destroy lifecycle
- [x] Add NCBI Protein link (protein_id) and NCBI Gene link (GeneID from db_xref)
- [x] Add unit tests for feature tooltips

## 5. Viewer integration

- [x] Add optional `AnnotationMap` parameter to `renderAlignment()`
- [x] Add `annotationsHandle` to `ViewerHandle` interface
- [x] Wire annotation updates on zoom/pan changes
- [x] Wire annotation and tooltip cleanup in `destroy()`
- [x] Update annotations on panel rerender (reorder, visibility toggle)
