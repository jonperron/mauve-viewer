# Data Export

Mauve Viewer can export alignment analysis results in several tabular formats. Access all exports from the **Export** button in the toolbar.

## Available Exports

### SNPs

Extracts Single Nucleotide Polymorphisms (SNPs) from aligned blocks. The output includes each SNP position with both contig-relative and genome-wide coordinates, the nucleotide in each genome, and the containing LCB.

### Gaps

Identifies gap regions in each genome relative to the alignment. The output lists gap start and end positions per genome with contig-relative and genome-wide coordinates.

### Permutations

Computes signed permutation representations of LCB order for each genome. The output is formatted for use with rearrangement analysis tools such as BADGER, GRAPPA, MGR, and GRIMM.

### Positional Orthologs

Identifies genes that occupy the same aligned position across genomes. This export compares annotated features (CDS by default) within aligned LCB regions and groups them by sequence similarity.

Configurable parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| Minimum identity | 0.6 (60%) | Minimum sequence identity to consider a match |
| Maximum identity | 1.0 (100%) | Maximum sequence identity |
| Minimum coverage | 0.7 (70%) | Minimum alignment coverage |
| Maximum coverage | 1.0 (100%) | Maximum alignment coverage |
| Feature type | CDS | Type of feature to compare |

This export requires annotation files to be loaded.

### Identity Matrix

Computes a pairwise divergence matrix across all genomes in the alignment. Each cell represents the sequence distance between two genomes based on shared backbone regions.

### CDS Errors

Detects broken Coding Sequences (CDS) by comparing two genomes. This export requires an alignment with exactly two genomes and annotation files loaded. The output reports:

- **Frameshifts** — Gaps within a CDS that shift the reading frame
- **Premature stop codons** — Stop codons appearing before the expected end of a CDS
- **Amino acid substitutions** — Non-synonymous changes within coding regions

This export requires annotation files to be loaded.

### Summary

Runs a comprehensive analysis pipeline and produces multiple output files packaged together:

- Overview table with alignment statistics
- Island coordinates per genome
- Gene lists organized by multiplicity (shared vs. genome-specific)
- Backbone problem regions

## Download Format

Individual exports download as tab-separated text files. The Summary export downloads as a ZIP archive containing all output files.
