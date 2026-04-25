# Mauve Viewer Documentation

Mauve Viewer is a web-based tool for interactive visualization and analysis of multi-genome alignments. It displays Locally Collinear Blocks (LCBs), genomic annotations, and provides export capabilities for downstream analysis.

## PATRIC Genome Name Enrichment

When you load a JSON alignment file containing PATRIC genome identifiers (format: digits followed by a dot and more digits, such as `224914.11`), Mauve Viewer automatically fetches human-readable genome names from the PATRIC API. This lookup has a 5-second timeout and supports up to 50 genomes per request.

## Guides

- [File Formats](file-formats.md) — Supported input and auxiliary formats
- [Genome Alignment](genome-alignment.md) — Run new alignments with server-side execution
- [Viewer](viewer.md) — Multi-panel layout and display modes
- [Navigation](navigation.md) — Zoom, pan, cursor, region selection, and feature search
- [Annotations](annotations.md) — Genomic feature display and interaction
- [Color Schemes](color-schemes.md) — Available coloring options for alignment blocks
- [Genome Controls](genome-controls.md) — Reorder, hide, and set reference genome
- [Data Export](export.md) — Export SNPs, gaps, permutations, orthologs, and more
- [Image Export and Print](image-export-and-print.md) — Save images and print the alignment
- [Keyboard Shortcuts](keyboard-shortcuts.md) — Quick reference for all shortcuts

## Developer Reference

- [Code Organization](code-organization.md) — Internal project structure (for developers)
