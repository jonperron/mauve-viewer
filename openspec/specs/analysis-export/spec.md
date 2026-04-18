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

The system SHALL identify and export sets of positionally homologous annotated features across aligned genomes using backbone-based coordinate mapping with configurable nucleotide identity and coverage thresholds.

**Parameters** (`HomologExportParameters`):
- `minIdentity` / `maxIdentity`: Nucleotide identity range in aligned regions (default 0.6–1.0)
- `minCoverage` / `maxCoverage`: Fraction of feature length covered by alignment (default 0.7–1.0)
- `featureType`: One of CDS, gene, tRNA, rRNA, misc_RNA (default: CDS)

**Algorithm**:
1. Extract features of the specified type from each genome's annotations, sorted by left coordinate, deduplicated.
2. For each feature, find backbone segments that overlap the feature's coordinate range in its genome.
3. In other genomes, find features whose coordinates overlap the mapped backbone intervals.
4. Compute pairwise nucleotide identity from alignment blocks over the overlapping region. Coverage SHALL be measured as the genomic coordinate span covered by the alignment (not the count of aligned columns).
5. Apply identity and coverage threshold filters to both features in a candidate pair.
6. Apply transitive closure via depth-first search to build homolog groups: if A↔B and B↔C, then {A, B, C} form a group.
7. Features not assigned to any group SHALL be reported as singletons.

**Output format**: Tab-delimited text. Each group occupies one line with tab-separated members in the format `genomeIndex:locus_tag:left-right`. Singletons are listed after groups, one per line in the same format. The output ends with a newline. An empty result (no groups or singletons) SHALL produce an empty string.

**UI integration**: The "Export Positional Orthologs" button SHALL appear in the Options panel only when backbone data AND annotations are loaded (`backbone.length > 0 && annotations.size > 0`). Clicking it SHALL open a configuration dialog where the user can set identity range (0–1), coverage range (0–1), and feature type (CDS/gene/tRNA/rRNA/misc_RNA). The dialog SHALL display default values from `DEFAULT_HOMOLOG_PARAMS`. The dialog SHALL be a modal with backdrop, dismissable via Cancel button, backdrop click, or Escape key. Clicking Export in the dialog SHALL trigger a browser file download of `positional_orthologs.tsv` using the configured parameters.

**Known limitation**: The alignment output option (XMFA per ortholog group) is not yet implemented — only tabular export is supported.

#### Scenario: Export positional homologs with default parameters
- **WHEN** user clicks "Export Positional Orthologs" in the Options panel with backbone data and annotations loaded
- **THEN** system opens a configuration dialog pre-filled with default thresholds (identity 0.6–1.0, coverage 0.7–1.0, CDS features)

#### Scenario: Confirm homolog export with custom parameters
- **WHEN** user adjusts identity, coverage, and feature type in the homolog export dialog and clicks Export
- **THEN** system identifies positional homologs using the user-specified thresholds and downloads `positional_orthologs.tsv`

#### Scenario: Dismiss homolog export dialog
- **WHEN** user presses Escape, clicks Cancel, or clicks the backdrop in the homolog export dialog
- **THEN** system closes the dialog without exporting

#### Scenario: Button visibility requires both backbone and annotations
- **WHEN** backbone data is loaded AND annotations are loaded
- **THEN** the "Export Positional Orthologs" button is visible in the Options panel
- **WHEN** backbone data is NOT loaded OR annotations are NOT loaded
- **THEN** the "Export Positional Orthologs" button is NOT visible

#### Scenario: Transitive closure grouping
- **WHEN** feature A in genome 0 is orthologous to feature B in genome 1, and feature B is orthologous to feature C in genome 2, but A is not directly orthologous to C
- **THEN** features A, B, and C SHALL be grouped into a single homolog group

#### Scenario: Singleton reporting
- **WHEN** a feature has no ortholog in any other genome after applying identity and coverage thresholds
- **THEN** the feature SHALL be listed as a singleton in the output, after all groups

#### Scenario: Identity and coverage filtering
- **WHEN** a candidate feature pair has nucleotide identity or coverage outside the configured min/max range
- **THEN** the pair SHALL NOT be included in the ortholog mapping

#### Scenario: Empty result
- **WHEN** no features of the specified type exist in any genome, or no pairs pass thresholds
- **THEN** the export SHALL produce an empty string

#### Scenario: Feature deduplication
- **WHEN** annotations contain duplicate features with the same coordinates and locus_tag
- **THEN** duplicates SHALL be removed before ortholog detection, keeping one copy

#### Scenario: Locus tag fallback
- **WHEN** a feature has no locus_tag qualifier
- **THEN** the gene qualifier SHALL be used as fallback; if neither exists, an empty string SHALL be used

### Requirement: Identity matrix computation

The system SHALL compute a pairwise divergence matrix across all aligned genomes using substitution counts from alignment blocks normalized by shared backbone length.

**Computation**:
1. For each genome pair (i, j), count substitutions across all alignment blocks: a column is a substitution when both genomes have different unambiguous bases (A, C, G, T, case-insensitive). Gaps and IUPAC ambiguity codes SHALL be excluded.
2. For each genome pair (i, j), compute shared backbone length: sum the interval length (`rightEnd - leftEnd + 1`) of backbone segments where both genomes participate (both have non-zero left and right end coordinates). The length SHALL be taken from genome i's interval.
3. Divergence = substitutions / shared_backbone_length. When shared backbone length is zero, divergence SHALL be 0.
4. The matrix SHALL be symmetric with zeros on the diagonal.

**Legacy bug fix**: The implementation SHALL correctly count adenine-involving substitutions, fixing the legacy Java bug in `SnpExporter.getBaseIdx()` where adenine (A/a) mapped to index 0 and was excluded by the `b_i > 0 && b_j > 0` guard.

**Output format**: Upper-triangular N×N tab-delimited text. Diagonal and lower-triangle cells SHALL be empty strings. Upper-triangle cells SHALL contain the divergence value. Rows SHALL be separated by newlines, columns by tabs. The output SHALL end with a trailing newline.

**UI integration**: The "Export Identity Matrix" button SHALL appear in the Options panel only when backbone data is loaded (`backbone.length > 0`). Clicking it SHALL trigger a browser file download of `identity_matrix.tsv`.

#### Scenario: Export identity matrix with backbone data loaded
- **WHEN** user clicks "Export Identity Matrix" in the Options panel with backbone data loaded
- **THEN** system computes pairwise divergence for all genome pairs and downloads an upper-triangular tab-delimited `identity_matrix.tsv` file

#### Scenario: Button visibility requires backbone data
- **WHEN** backbone data is loaded (backbone.length > 0)
- **THEN** the "Export Identity Matrix" button is visible in the Options panel
- **WHEN** backbone data is NOT loaded
- **THEN** the "Export Identity Matrix" button is NOT visible

#### Scenario: Substitution counting excludes gaps and ambiguity codes
- **WHEN** an alignment column contains a gap or IUPAC ambiguity code in either genome
- **THEN** that column SHALL NOT be counted as a substitution

#### Scenario: Identical unambiguous bases are not substitutions
- **WHEN** an alignment column contains the same unambiguous base in both genomes (case-insensitive)
- **THEN** that column SHALL NOT be counted as a substitution

#### Scenario: Adenine substitutions are correctly counted
- **WHEN** an alignment column contains adenine in one genome and a different unambiguous base in the other
- **THEN** that column SHALL be counted as a substitution (unlike the legacy Java implementation)

#### Scenario: Zero shared backbone length
- **WHEN** no backbone segments exist where both genomes participate
- **THEN** the divergence value for that pair SHALL be 0

#### Scenario: Upper-triangular output format
- **WHEN** the identity matrix is formatted for export
- **THEN** the output SHALL contain empty cells for the diagonal and lower triangle, and divergence values for the upper triangle only

### Requirement: CDS error detection

The system SHALL project SNPs and gaps onto annotated CDS features to identify broken coding sequences, including frameshift mutations, premature stop codons, amino acid substitutions, insertion stop codons, and gap segments in aligned coding regions.

**Prerequisites**:
- An XMFA alignment with exactly 2 genomes.
- GenBank annotations with CDS features loaded for the reference genome (genome index 0).
- CDS features with nucleotide length divisible by 3 are analyzed; others are skipped.

**Detection rules**:
1. For each CDS feature in the reference genome, extract the pairwise alignment (reference vs assembly) covering the CDS coordinate range from alignment blocks.
2. Split the pairwise alignment into codon-aligned chunks based on reference sequence positions. Inter-codon gap-only regions and 3-gap insertion regions SHALL be emitted as separate chunks.
3. Translate codons using the standard genetic code (NCBI translation table 1). Unknown codons SHALL translate to `?`.
4. **Frameshift detection**: When the cumulative gap difference (assembly gaps minus reference gaps) is not a multiple of 3, the reading frame is broken. Contiguous out-of-frame regions SHALL be reported as broken frame segments with start and end codon positions.
5. **Premature stop codon detection**: When an in-frame assembly codon translates to a stop codon (`*`) but the corresponding reference codon does not, the position SHALL be reported as a premature stop with the original reference amino acid.
6. **Amino acid substitution detection**: When an in-frame assembly codon translates to a different non-stop amino acid than the reference codon, the position SHALL be reported as a substitution with reference and assembly amino acids.
7. **Gap segment detection**: When an in-frame assembly codon contains intra-codon gaps (not exactly 3 valid nucleic acid characters), it SHALL contribute to a gap segment. Contiguous gap-affected codons SHALL be merged into segments with start and end codon positions.
8. **Insertion stop detection**: When a reference gap of 3 characters corresponds to an assembly codon that translates to a stop codon, the assembly codon position SHALL be reported as an insertion stop.
9. **Error rate computation**: The percentage of incorrect amino acids SHALL be computed as the number of codons with any error (substitution, stop, gap, or out-of-frame) divided by the total number of reference codons analyzed.

**Feature identification**: The feature ID SHALL be the `locus_tag` qualifier if present, falling back to the `gene` qualifier, or an empty string if neither exists.

**Output format**: Tab-delimited TSV with header row and one data row per broken CDS. Columns:
- `FeatureID`: Feature identifier
- `Peptide_Length`: CDS nucleotide length divided by 3
- `Perc_Incorrect_AAs`: Error rate formatted to 6 decimal places
- `Broken_Frame_Segments`: Comma-separated `[start,end]` codon pairs, or `-` if none
- `Gap_Segments`: Comma-separated `[start,end]` codon pairs, or `-` if none
- `Substituted_Positions`: Comma-separated 1-based codon positions, or `-` if none
- `Substitutions`: Comma-separated `ref->ass` amino acid pairs, or `-` if none
- `Stop_Codon_Positions`: Comma-separated 1-based codon positions of premature stops, or `-` if none
- `Original_Residue`: Comma-separated reference amino acids at premature stop positions, or `-` if none
- `Insertion_Stops`: Comma-separated assembly codon positions with insertion-induced stops, or `-` if none

Only CDS features with at least one detected error SHALL appear in the output. An alignment with no broken CDS SHALL produce an empty string.

**UI integration**: The "Export CDS Errors" button SHALL appear in the Options panel only when alignment blocks are loaded AND annotations are loaded (`annotations.size > 0`). Clicking it SHALL trigger a browser file download of `cds_errors.tsv`. If no CDS errors are detected, no file SHALL be downloaded.

#### Scenario: Detect frameshift in CDS
- **WHEN** an alignment gap within a CDS causes the cumulative gap difference to not be a multiple of 3 nucleotides
- **THEN** system reports the CDS as having a broken frame segment with start and end codon positions

#### Scenario: Detect premature stop codon
- **WHEN** an in-frame assembly codon translates to a stop codon but the reference codon translates to a non-stop amino acid
- **THEN** system reports the codon position as a premature stop and records the original reference amino acid

#### Scenario: Detect amino acid substitution
- **WHEN** an in-frame assembly codon translates to a different non-stop amino acid than the reference codon
- **THEN** system reports the codon position as a substitution with both reference and assembly amino acids

#### Scenario: Detect gap segments
- **WHEN** an in-frame assembly codon contains intra-codon gaps (fewer than 3 valid nucleotides)
- **THEN** system reports contiguous gap-affected codons as a gap segment with start and end codon positions

#### Scenario: Detect insertion stop codons
- **WHEN** a 3-character reference gap corresponds to an assembly codon that translates to a stop codon
- **THEN** system reports the assembly codon position as an insertion stop

#### Scenario: Export CDS errors as TSV
- **WHEN** user clicks "Export CDS Errors" in the Options panel with a 2-genome alignment and CDS annotations loaded
- **THEN** system analyzes all CDS features, detects errors, and downloads a tab-delimited `cds_errors.tsv` file listing only broken CDS features

#### Scenario: CDS errors button visibility
- **WHEN** alignment blocks are loaded AND annotations are loaded
- **THEN** the "Export CDS Errors" button is visible in the Options panel
- **WHEN** alignment blocks are NOT loaded OR annotations are NOT loaded
- **THEN** the "Export CDS Errors" button is NOT visible

#### Scenario: No broken CDS detected
- **WHEN** all CDS features in the reference genome have identical codons in the assembly
- **THEN** the export produces an empty string and no file is downloaded

#### Scenario: CDS length filtering
- **WHEN** a CDS feature has a nucleotide length not divisible by 3
- **THEN** that CDS SHALL be excluded from analysis

#### Scenario: Feature ID fallback
- **WHEN** a CDS feature has no `locus_tag` qualifier
- **THEN** the `gene` qualifier SHALL be used as the feature ID; if neither exists, an empty string SHALL be used

#### Scenario: Error rate computation
- **WHEN** a CDS has some codons with errors and some without
- **THEN** the `Perc_Incorrect_AAs` column SHALL contain the fraction of codons with any error, formatted to 6 decimal places

#### Scenario: Empty fields use dash
- **WHEN** a broken CDS has no entries for a particular error type (e.g., no frameshifts)
- **THEN** the corresponding column SHALL contain `-` instead of an empty value

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

**UI integration**: The "Export Summary" button SHALL appear in the Options panel only when backbone data is loaded (`backbone.length > 0`). Clicking it SHALL open a configuration dialog where the user can set island min length, backbone min length, max length ratio, and min percent contained. The dialog SHALL display default values from `DEFAULT_SUMMARY_OPTIONS`. The dialog SHALL be a modal with backdrop, dismissable via Cancel button, backdrop click, or Escape key. Clicking Export in the dialog SHALL run the summary pipeline with the configured options and trigger browser file downloads for all generated output files.

#### Scenario: Summary export button visibility
- **WHEN** backbone data is loaded (backbone.length > 0)
- **THEN** the "Export Summary" button is visible in the Options panel
- **WHEN** backbone data is NOT loaded
- **THEN** the "Export Summary" button is NOT visible

#### Scenario: Open summary config dialog
- **WHEN** user clicks "Export Summary" in the Options panel with backbone data loaded
- **THEN** system opens a configuration dialog pre-filled with default summary options (island min 50, backbone min 50, max ratio 3.0, min contained 0.5)

#### Scenario: Confirm summary export with custom options
- **WHEN** user adjusts summary options in the dialog and clicks Export
- **THEN** system runs the summary pipeline with user-specified options and triggers browser file downloads for all output files

#### Scenario: Dismiss summary config dialog
- **WHEN** user presses Escape, clicks Cancel, or clicks the backdrop in the summary export dialog
- **THEN** system closes the dialog without exporting

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

### Requirement: Export button rendering

The Options panel SHALL render export action buttons from an ordered data-driven definition list (`ACTION_BUTTON_DEFS`). Each button SHALL only be rendered when its corresponding callback is defined (non-undefined) in `OptionsCallbacks`. The button order SHALL be: Export Image, Export SNPs, Export Gaps, Export Permutations, Export Positional Orthologs, Export Identity Matrix, Export CDS Errors, Export Summary, Print. At most one export configuration dialog SHALL be open at a time; opening a new dialog SHALL destroy any previously open dialog.

#### Scenario: Conditional button rendering
- **WHEN** an export callback is provided (non-undefined) in OptionsCallbacks
- **THEN** the corresponding button SHALL be rendered in the Options panel
- **WHEN** an export callback is undefined
- **THEN** the corresponding button SHALL NOT be rendered

#### Scenario: Button order
- **WHEN** multiple export buttons are rendered
- **THEN** they SHALL appear in the defined order: Export Image, Export SNPs, Export Gaps, Export Permutations, Export Positional Orthologs, Export Identity Matrix, Export CDS Errors, Export Summary, Print

#### Scenario: Dialog stacking prevention
- **WHEN** user clicks an export button that opens a config dialog while another config dialog is already open
- **THEN** the previously open dialog SHALL be destroyed before the new dialog opens

