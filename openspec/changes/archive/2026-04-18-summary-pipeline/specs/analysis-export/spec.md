## MODIFIED Requirements

### Requirement: Summary pipeline

The system SHALL produce batch summary analysis outputs from backbone segments, LCBs, genome metadata, and optional annotations. The pipeline processes segments into per-genome chains with island identification, assigns typed IDs, and generates multiple output files for download.

**Configurable options** (`SummaryOptions`):
- `islandMinLength`: Minimum island length in base pairs (default: 50)
- `backboneMinLength`: Minimum backbone length in base pairs (default: 50)
- `maxLengthRatio`: Maximum difference-to-average length ratio before a backbone segment is flagged as problematic (default: 3.0)
- `minimumPercentContained`: Minimum fraction of a gene that must overlap a segment to be counted (default: 0.5)

**Segment processing**:
1. Identify the reference genome as the genome with no reversed backbone segments (last such genome; fallback to genome 0).
2. For each genome, build an ordered chain of segments sorted by left position. Backbone segments present in the genome are included with their full per-genome intervals. Gaps between backbone segments are filled with island segments specific to that genome.
3. Assign typed IDs to all segments: `b_N` for segments present in all genomes (full backbone), `i_N` for segments present in only one genome (islands), `b_i_N` for segments present in a subset of genomes (partial backbone). IDs are assigned sequentially and shared across genomes for the same backbone segment.
4. Compute a multiplicity bitmask for each segment indicating which genomes participate (MSB = genome 0).

**Output files**:
1. **Overview** (`_overview.tab`): Per-genome statistics table showing gene counts, segment counts, and base pair counts broken down by multiplicity mask. Each multiplicity row shows count and percentage. Includes header with pipeline parameters, a totals row, and an unknown row for unassigned genes.
2. **Island coordinates** (`_islandcoords.tab`): All non-backbone segments with per-genome left/right coordinates. Reverse-strand segments SHALL have negative coordinate signs. Segments below `islandMinLength` average length SHALL be excluded.
3. **Island features** (`_seq{N}_islands.tab`): Per-genome tab-delimited file listing island segments with type, label (typed ID), contig name, strand, coordinates, and multiplicity. Importable as a Mauve feature file.
4. **Island gene features** (`_seq{N}_island_genes.tab`): Per-genome tab-delimited file listing annotated genes (CDS, gene, tRNA, rRNA, misc_RNA) that overlap island segments by at least `minimumPercentContained`. Columns: island ID, percent on island, type, locus tag, contig, strand, left, right, multiplicity.
5. **Backbone gene features** (`_seq{N}_backbone_genes.tab`): Same format as island gene features but for genes overlapping full-backbone segments.
6. **Trouble backbone** (`_problembb.tab`): Backbone segments present in all genomes whose length variance exceeds `maxLengthRatio`. Shows per-genome coordinates, average length, and difference-to-length ratio.

**Partial FASTA extraction**: The system SHALL support extracting partial FASTA sequences from alignment blocks for specified genomic regions. Output SHALL be multi-FASTA formatted with 70-character line wrapping. Gap characters SHALL be excluded from extracted sequences.

**Export orchestration**: The `exportSummary` function SHALL trigger browser file downloads for all generated output files using a configurable file prefix (default: `alignment`). Per-genome files SHALL only be downloaded when non-empty.

#### Scenario: Run summary pipeline with backbone and annotations
- **WHEN** user invokes the summary pipeline with backbone segments, LCBs, genome metadata, and annotations loaded
- **THEN** system processes segments into per-genome chains, identifies islands, computes multiplicity, generates overview with gene counts, island coordinates, per-genome island/backbone gene files, and trouble backbone report

#### Scenario: Segment processing builds per-genome chains
- **WHEN** backbone segments are processed for a genome
- **THEN** segments present in that genome are sorted by left position, gaps between segments are filled with island segments, and all segments receive typed IDs

#### Scenario: Typed ID assignment
- **WHEN** a segment is present in all genomes
- **THEN** it receives a `b_N` typed ID
- **WHEN** a segment is present in only one genome (island)
- **THEN** it receives an `i_N` typed ID
- **WHEN** a segment is present in a subset of genomes
- **THEN** it receives a `b_i_N` typed ID

#### Scenario: Reference genome detection
- **WHEN** the pipeline processes an alignment
- **THEN** the reference genome is identified as the last genome with no reversed backbone segments; if all genomes have reversals, genome 0 is used

#### Scenario: Overview statistics by multiplicity
- **WHEN** the overview file is generated with annotations available
- **THEN** each genome section shows gene count, segment count, and base pair count per multiplicity mask, with percentages and totals

#### Scenario: Overview without annotations
- **WHEN** the overview file is generated without annotations
- **THEN** gene count columns show zero for all multiplicity rows

#### Scenario: Island coordinate output with reverse strand
- **WHEN** an island segment is on the reverse strand in a genome
- **THEN** its coordinates in the island coordinates file SHALL have negative signs

#### Scenario: Island coordinate minimum length filter
- **WHEN** an island segment has an average length across genomes below `islandMinLength`
- **THEN** it SHALL be excluded from the island coordinates file

#### Scenario: Island feature file format
- **WHEN** island features are generated for a genome
- **THEN** output contains tab-delimited rows with type, label, contig, strand, left, right, and multiplicity columns

#### Scenario: Gene overlap with minimum percent contained
- **WHEN** a gene overlaps a segment by less than `minimumPercentContained`
- **THEN** the gene SHALL NOT be included in the island/backbone gene output for that segment

#### Scenario: Trouble backbone detection
- **WHEN** a backbone segment present in all genomes has a difference-to-average length ratio exceeding `maxLengthRatio` and average length exceeding `backboneMinLength`
- **THEN** it SHALL appear in the trouble backbone report with per-genome coordinates, average length, and ratio

#### Scenario: Partial FASTA extraction
- **WHEN** partial FASTA extraction is requested for a genomic region
- **THEN** system gathers sequence data from overlapping alignment blocks, excludes gap characters, and formats output as multi-FASTA with 70-character line wrapping

#### Scenario: Export triggers browser downloads
- **WHEN** the export function is called with a summary result
- **THEN** browser file downloads are triggered for overview, island coordinates, trouble backbone, and all non-empty per-genome files using the configured file prefix

#### Scenario: Empty per-genome files are not downloaded
- **WHEN** a per-genome island gene or backbone gene file is empty
- **THEN** no file download SHALL be triggered for that genome
