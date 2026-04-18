## Purpose

Defines the analysis and export capabilities: SNP export, gap export, permutation export for rearrangement phylogeny tools, positional homolog identification and export, identity matrix computation, CDS error detection, summary pipeline, and image export.
## Requirements
### Requirement: SNP export
The system SHALL extract single nucleotide polymorphisms from in-memory XMFA alignment data and export them as a tab-delimited `.tsv` file. The output SHALL contain columns: SNP pattern (one character per genome), and per-genome contig name (`sequence_N_Contig`), position within contig (`sequence_N_PosInContg`), and genome-wide position (`sequence_N_GenWidePos`).

Polymorphism detection rules:
- A column is polymorphic if it contains at least two distinct non-gap bases (compared case-insensitively).
- IUPAC ambiguity codes (R, Y, K, M, S, W, B, D, H, V, N, X) SHALL be treated as distinct from standard bases (A, C, G, T). Identical ambiguity codes at the same position SHALL NOT be considered polymorphic.
- Gap characters (`-`) SHALL be excluded from polymorphism detection.
- Reverse-strand segments SHALL have positions counting down from the segment end.

The Export SNPs button SHALL appear in the Options panel only when alignment blocks are loaded. Clicking it SHALL trigger a browser file download of `snps.tsv`. When contig boundaries are available from loaded annotations, positions SHALL be resolved to contig-relative coordinates.

#### Scenario: Export SNPs from loaded alignment
- **WHEN** user clicks "Export SNPs" in the Options panel with an XMFA alignment loaded
- **THEN** system extracts all polymorphic columns from alignment blocks and downloads a tab-delimited `snps.tsv` file listing all SNP sites with per-genome position data

#### Scenario: SNP export button visibility
- **WHEN** alignment blocks are loaded
- **THEN** the "Export SNPs" button is visible in the Options panel
- **WHEN** no alignment blocks are loaded
- **THEN** the "Export SNPs" button is not visible

#### Scenario: IUPAC ambiguity codes
- **WHEN** a column contains ambiguity codes mixed with standard bases (e.g., `R` and `A`)
- **THEN** the column is treated as polymorphic
- **WHEN** a column contains identical ambiguity codes across all genomes (e.g., all `N`)
- **THEN** the column is NOT treated as polymorphic

#### Scenario: Reverse strand positions
- **WHEN** a segment is on the reverse strand
- **THEN** genome-wide positions for that segment count down from the segment end position

#### Scenario: Contig resolution
- **WHEN** contig boundaries are available from loaded annotations
- **THEN** genome-wide positions are resolved to contig name and position within that contig
- **WHEN** no contig boundaries are available
- **THEN** the genome name is used as the contig name and position is genome-wide

### Requirement: Gap export
The system SHALL extract intra-block alignment gaps (runs of `-` characters) from in-memory XMFA alignment data and export them as a tab-delimited `.tsv` file. The output SHALL contain columns: Genome (`sequence_N`), Contig, Position_in_Contig, GenomeWide_Position, and Length.

Gap detection rules:
- A gap is a contiguous run of one or more `-` characters within a segment's sequence data.
- For forward-strand segments, the gap's genome-wide position SHALL be the position of the last non-gap base before the gap. If no preceding base exists, the segment start position SHALL be used.
- For reverse-strand segments, the gap's genome-wide position SHALL be the position of the first non-gap base after the gap. If no following base exists, the segment end position SHALL be used.
- Output SHALL be sorted by genome index, then by genome-wide position.

The Export Gaps button SHALL appear in the Options panel only when alignment blocks are loaded. Clicking it SHALL trigger a browser file download of `gaps.tsv`. When contig boundaries are available from loaded annotations, positions SHALL be resolved to contig-relative coordinates.

#### Scenario: Export gaps from loaded alignment
- **WHEN** user clicks "Export Gaps" in the Options panel with an XMFA alignment loaded
- **THEN** system extracts all intra-block gaps from alignment segments and downloads a tab-delimited `gaps.tsv` file listing all gap sites with per-genome position data

#### Scenario: Gap export button visibility
- **WHEN** alignment blocks are loaded
- **THEN** the "Export Gaps" button is visible in the Options panel
- **WHEN** no alignment blocks are loaded
- **THEN** the "Export Gaps" button is not visible

#### Scenario: Multiple gaps in one segment
- **WHEN** a segment contains multiple non-contiguous runs of gap characters
- **THEN** each run is reported as a separate gap record with its own position and length

#### Scenario: Reverse strand gap positions
- **WHEN** a gap occurs in a reverse-strand segment
- **THEN** the gap's genome-wide position is the position of the first non-gap base after the gap in column order

#### Scenario: Contig resolution
- **WHEN** contig boundaries are available from loaded annotations
- **THEN** genome-wide positions are resolved to contig name and position within that contig
- **WHEN** no contig boundaries are available
- **THEN** the genome name is used as the contig name and position is genome-wide

#### Scenario: Output sorting
- **WHEN** gaps are extracted from multiple genomes and blocks
- **THEN** output rows are sorted by genome index (ascending), then by genome-wide position (ascending)

### Requirement: Permutation export
The system SHALL export signed permutation representations of LCB arrangements for downstream rearrangement analysis tools (BADGER, GRAPPA, MGR, GRIMM).

LCB projection rules:
- When exporting a genome subset, only LCBs present in ALL selected genomes SHALL be included. An LCB is present in a genome if its left coordinate is non-zero.
- Projected LCBs SHALL be numbered 1..N in the order they appear in the projected list.

Signed permutation computation rules:
- For each genome, projected LCBs SHALL be sorted by their left position in that genome.
- Each LCB SHALL produce a signed integer: positive if the LCB is on the forward strand in that genome, negative if on the reverse strand.
- The integer's absolute value SHALL be the LCB's 1-based number from the projection step.

Contig/chromosome boundary grouping rules:
- When contig boundaries are provided, LCBs SHALL be grouped by which contig they belong to (based on the LCB's left position relative to contig boundary positions).
- Each contig group SHALL be terminated with a `$` delimiter in the output.
- When no contig boundaries are provided or only one contig exists, all LCBs SHALL be placed in a single chromosome group.

Output format:
- The output SHALL begin with header comment lines prefixed with `#`, including a title line and one line per selected genome with format `# Genome <index>: <name>`.
- Each genome SHALL produce one output line with comma-separated signed integers per chromosome, each chromosome terminated by `$`, separated by spaces.
- The output SHALL end with a newline.
- When no LCBs are present after projection, no data lines SHALL be emitted (only header comments).

The system SHALL default to exporting all genomes in the alignment when no subset is specified.

Known limitations:
- LCBs spanning multiple contigs are grouped into the contig of their left position but are NOT split at contig boundaries.
- Circular chromosome markers are not supported.

#### Scenario: Export permutations for all genomes
- **WHEN** user exports permutations from an alignment with multiple genomes and no subset is specified
- **THEN** system produces signed permutation output for all genomes with header comments and comma-separated values terminated by `$`

#### Scenario: Export permutations for subset of genomes
- **WHEN** user exports permutations and selects a subset of genomes
- **THEN** system filters LCBs to only those present in all selected genomes, numbers them 1..N, and produces signed permutation output for only the selected genomes

#### Scenario: Reverse strand LCBs
- **WHEN** an LCB is on the reverse strand in a given genome
- **THEN** the LCB's permutation value is negative (e.g., `-2` instead of `2`)

#### Scenario: Contig boundary grouping
- **WHEN** contig boundaries are provided for a genome with multiple contigs
- **THEN** LCBs are grouped by their contig and each group is separated by `$` in the output

#### Scenario: Single contig genome
- **WHEN** a genome has no contig boundaries or only one contig
- **THEN** all LCBs appear in a single chromosome group terminated by `$`

#### Scenario: Empty LCB projection
- **WHEN** no LCBs are present in all selected genomes after projection
- **THEN** the output contains only header comments with no data lines

#### Scenario: LCB ordering differs across genomes
- **WHEN** LCBs have different positional orders in different genomes (rearrangements)
- **THEN** each genome's permutation line reflects its own positional order using the shared LCB numbering

### Requirement: Positional homolog export
The system SHALL identify and export sets of positionally homologous annotated features (CDS, gene, rRNA, tRNA, misc_RNA) using backbone-based mapping with configurable nucleotide identity and coverage thresholds. Transitivity is applied: if A↔B and B↔C, then A↔C.

#### Scenario: Export positional homologs
- **WHEN** user selects Tools → Export → Export Positional Orthologs and sets identity and coverage ranges
- **THEN** system identifies positional homologs across all genomes and writes a tab-delimited output with genome index, locus_tag, and coordinates

#### Scenario: Export homolog alignments
- **WHEN** user enables the option to output multiple alignments
- **THEN** system produces alignment files for each positional homolog group, named using /locus_tag qualifiers

### Requirement: Identity matrix computation
The system SHALL compute a pairwise identity matrix (substitutions / shared backbone length) across all aligned genomes.

#### Scenario: Compute identity matrix via CLI
- **WHEN** user runs IdentityMatrix with `-f <xmfa> -o <output>`
- **THEN** system produces a tab-delimited matrix file with pairwise identity scores between 0 and 1

### Requirement: CDS error detection
The system SHALL project SNPs and gaps onto annotated CDS features to identify broken coding sequences, including frameshift mutations, premature stop codons, and amino acid substitutions.

#### Scenario: Detect frameshift in CDS
- **WHEN** an alignment gap within a CDS is not a multiple of 3 nucleotides
- **THEN** system reports the CDS as having a frameshift mutation

### Requirement: Summary pipeline
The system SHALL produce batch summary analysis outputs including: overview file (gene counts by multiplicity, island statistics), island coordinate files, island feature files importable into Mauve, island/backbone gene files with overlap percentages, partial FASTA extraction, and backbone comparison files.

#### Scenario: Run summary pipeline via CLI
- **WHEN** user runs MauveInterfacer with an alignment and feature files
- **THEN** system processes backbone, identifies islands and genes per segment, and writes all summary output files

### Requirement: Image export
The system SHALL export the current alignment view as a raster image (PNG or JPEG with three quality levels: low at 0.5, medium at 0.75, high at 0.95) via Ctrl+E. The export dialog SHALL allow configuring output width and height between 100 and 10000 pixels. The system SHALL clone the SVG, inline computed CSS styles for export accuracy, render to a Canvas element, and trigger a browser file download. JPEG export SHALL use a white background fill. The dialog SHALL be a modal with backdrop, dismissable via Cancel button, backdrop click, or Escape key.

#### Scenario: Export alignment as JPEG
- **WHEN** user presses Ctrl+E, selects JPEG format, chooses high quality, sets dimensions, and clicks Export
- **THEN** system renders the alignment view to a JPEG file at the specified dimensions and 0.95 quality, and triggers a download of `alignment.jpeg`

#### Scenario: Export alignment as PNG
- **WHEN** user presses Ctrl+E, selects PNG format, sets dimensions, and clicks Export
- **THEN** system renders the alignment view to a PNG file at the specified dimensions and triggers a download of `alignment.png`

#### Scenario: Dismiss export dialog
- **WHEN** user presses Escape, clicks Cancel, or clicks the backdrop
- **THEN** system closes the export dialog without exporting

#### Scenario: JPEG quality presets
- **WHEN** user selects JPEG format in the export dialog
- **THEN** system shows a quality dropdown with Low (0.5), Medium (0.75), and High (0.95) options

