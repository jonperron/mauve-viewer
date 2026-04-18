## MODIFIED Requirements

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
