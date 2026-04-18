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

**UI integration**: The "Export Positional Orthologs" button SHALL appear in the Options panel only when backbone data AND annotations are loaded (`backbone.length > 0 && annotations.size > 0`). Clicking it SHALL trigger a browser file download of `positional_orthologs.tsv`.

**Known limitation**: The alignment output option (XMFA per ortholog group) is not yet implemented — only tabular export is supported.

#### Scenario: Export positional homologs with default parameters
- **WHEN** user clicks "Export Positional Orthologs" in the Options panel with backbone data and annotations loaded
- **THEN** system identifies positional homologs using default thresholds (identity 0.6–1.0, coverage 0.7–1.0, CDS features) and downloads `positional_orthologs.tsv` containing tab-delimited ortholog groups followed by singletons

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
