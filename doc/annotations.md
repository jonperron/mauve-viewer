# Annotations

Mauve Viewer displays genomic features from annotation files overlaid on genome panels. This page describes how features are rendered, what information is available on hover and click, and how contig boundaries are shown.

## Supported Feature Types

When you load annotation files (GenBank, EMBL, or INSDseq XML) alongside an alignment, features appear as colored boxes on the genome panels:

| Feature Type | Color |
|-------------|-------|
| CDS (Coding Sequence) | White |
| gene | White |
| tRNA | Green |
| rRNA | Red |
| misc_RNA | Blue |

Features on the forward strand appear above the center line. Features on the reverse strand are shifted below the center line.

## Zoom Threshold

Annotations are only displayed when the visible region is smaller than 1 Mbp (one million base pairs). Zoom in further to see individual features. This threshold prevents the display from becoming cluttered at wide zoom levels.

## Hover Tooltip

Hover over a feature to see a tooltip with:

- Feature type
- Locus tag
- Gene name
- Product description
- Genomic coordinates (start–end)
- Strand direction

<!-- screenshot: annotation tooltip showing feature details -->

## Click Detail Popup

Click on a feature to open a detail popup with full annotation information. The popup includes clickable links to external databases when available:

- **protein_id** — Links to the NCBI protein record
- **GeneID** (from db_xref) — Links to the NCBI Gene record

All user-provided text in tooltips and popups is sanitized to prevent cross-site scripting (XSS).

## Contig Boundaries

When a genome contains multiple contigs (sequence records), red vertical lines mark the boundaries between contigs. You can toggle contig boundary display with the "Show Contigs" option.

## Lazy Loading

Annotations are loaded lazily: they are fetched and parsed only when needed, and cached for subsequent views. This keeps the initial load fast even when annotation files are large.
