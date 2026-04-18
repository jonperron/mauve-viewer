## MODIFIED Requirements

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
