## MODIFIED Requirements

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

## ADDED Requirements

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
