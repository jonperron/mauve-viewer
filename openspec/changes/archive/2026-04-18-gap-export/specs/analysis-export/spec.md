## MODIFIED Requirements

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
