# Mauve Viewer Documentation

Mauve Viewer is a web-based tool for interactive visualization and analysis of multi-genome alignments. It displays Locally Collinear Blocks (LCBs), genomic annotations, and provides export capabilities for downstream analysis.

## Server-Required Features

Some features require a server deployment that provides the native Mauve binaries (`mauveAligner`, `progressiveMauve`). Without a server, Mauve Viewer works in viewer-only mode: you can load and explore existing alignment files, but cannot produce new alignments or run analysis pipelines.

The three server-side features are:

| Feature | When to use | Required files |
|---------|-------------|----------------|
| **Genome Alignment** | Align two or more sequences from scratch | ≥ 2 sequence files in FASTA, GenBank, EMBL, or raw format |
| **Contig Reordering** | Order draft assembly contigs relative to a reference | Exactly 2 files: a complete reference genome (FASTA, GenBank, EMBL, or raw) + a draft assembly (FASTA or GenBank) |
| **Assembly Scoring** | Evaluate draft assembly quality against a reference | Exactly 2 files: a reference genome (FASTA or GenBank) + a draft assembly (FASTA or GenBank); accessible via REST API only |


## PATRIC Genome Name Enrichment

When you load a JSON alignment file containing PATRIC genome identifiers (format: digits followed by a dot and more digits, such as `224914.11`), Mauve Viewer automatically fetches human-readable genome names from the PATRIC API. This lookup has a 5-second timeout and supports up to 50 genomes per request.

## Guides

### Loading Data

- [File Formats](file-formats.md) — Supported input and auxiliary formats

### Viewer

- [Viewer](viewer.md) — Multi-panel layout and display modes
- [Navigation](navigation.md) — Zoom, pan, cursor, region selection, and feature search
- [Annotations](annotations.md) — Genomic feature display and interaction
- [Color Schemes](color-schemes.md) — Available coloring options for alignment blocks
- [Genome Controls](genome-controls.md) — Reorder, hide, and set reference genome
- [Keyboard Shortcuts](keyboard-shortcuts.md) — Quick reference for all shortcuts

### Analysis

The following analysis features are accessible from the **Analysis** menu in the viewer toolbar (server required) or via the REST API.

- [Genome Alignment](genome-alignment.md) — Align two or more genome sequences from scratch using mauveAligner or progressiveMauve
- [Contig Reordering](contig-reorder.md) — Reorder draft assembly contigs relative to a reference genome using the Mauve Contig Mover
- [Data Export](export.md) — Export SNPs, gaps, permutations, positional orthologs, identity matrix, CDS errors, and summary reports from a loaded alignment

Assembly scoring (structural and sequence-level metrics for a draft assembly against a reference) is available via `POST /api/score` on the server API only.

### Output

- [Data Export](export.md) — Tab-separated and ZIP exports of alignment analysis results
- [Image Export and Print](image-export-and-print.md) — Save the alignment as an image or send to a printer

## Developer Reference

- [Code Organization](code-organization.md) — Internal project structure (for developers)
