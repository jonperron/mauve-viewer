# Assembly Scoring

Assembly Scoring evaluates the quality of a draft genome assembly by comparing it to a reference genome. It computes structural metrics (rearrangement distances, adjacency errors), sequence-level metrics (SNPs, missed and extra bases), contig size statistics (N50, N90), annotation quality (broken CDS detection), and content metrics (missing chromosomes, extra contigs).

## Requirements

- Exactly two genomes: a complete reference and a draft assembly
- Reference genome: FASTA or GenBank format
- Draft assembly: FASTA or GenBank format

## Scoring Report

Once scoring completes, the results are presented in a modal dialog with five tabs.

### Structural Tab

Reports the overall structural relationship between the draft assembly and the reference genome.

| Metric | Description |
|--------|-------------|
| Contig count | Number of contigs in the draft assembly |
| Replicon count | Number of chromosomes in the reference |
| Assembly bases | Total base pairs in the draft assembly |
| Reference bases | Total base pairs in the reference genome |
| DCJ distance | Double Cut and Join (DCJ) distance between the two arrangements |
| Breakpoint distance | Number of breakpoints between the arrangements |
| SCJ distance | Single Cut or Join (SCJ) distance |
| Alignment blocks | Total number of locally collinear blocks shared by both |
| Type I errors | False positive joins: draft assembly contigs that are joined but are not adjacent in the reference |
| Type II errors | Orientation inconsistencies: reference-adjacent pairs whose relative strand orientation disagrees between the draft and the reference |

### Sequence Tab

Reports base-level accuracy of the draft assembly relative to the reference.

| Metric | Description |
|--------|-------------|
| Missed bases | Reference bases absent from the draft (opposite an assembly gap) |
| Missed bases % | `missed / reference bases` |
| Extra bases | Assembly bases with no corresponding reference base |
| Extra bases % | `extra / assembly bases` |
| SNP count | Number of positions where both genomes have an unambiguous nucleotide (A, C, T, G) but disagree |

Ambiguous nucleotides (IUPAC codes other than A, C, T, G) are silently ignored and do not contribute to SNP counts.

### Contigs Tab

Reports contig assembly statistics.

| Metric | Description |
|--------|-------------|
| N50 | Minimum contig length such that 50% of the total assembly is in contigs of that length or longer |
| N90 | Same as N50 but at the 90% threshold |
| Minimum length | Length of the shortest contig |
| Maximum length | Length of the longest contig |

### CDS Tab

Reports annotation quality when the reference genome contains GenBank CDS features. Broken CDS are those that contain frameshifts, premature stop codons, or significant amino acid substitutions caused by SNPs or gaps in the draft assembly.

| Metric | Description |
|--------|-------------|
| Total CDS | Number of CDS features in the reference |
| Broken CDS | Number of CDS that are disrupted in the draft assembly |
| Complete CDS | Number of CDS that are intact |

This tab is only populated when the reference genome is in GenBank format with annotated CDS features.

### Content Tab

Reports chromosomes or regions present in one genome but absent from the other.

| Metric | Description |
|--------|-------------|
| Missing chromosomes | Reference chromosomes with no corresponding assembly contigs |
| Extra contigs | Assembly contigs with no corresponding reference region |

## Exporting the Report

Use the **Export** button in the scoring report dialog to download the full report as a tab-delimited text file. The file contains three columns: Section, Metric, and Value, one metric per line.