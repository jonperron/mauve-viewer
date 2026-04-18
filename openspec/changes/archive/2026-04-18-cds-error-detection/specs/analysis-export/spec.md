## MODIFIED Requirements

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
