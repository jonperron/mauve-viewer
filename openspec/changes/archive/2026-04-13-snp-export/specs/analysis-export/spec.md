## MODIFIED Requirements

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
