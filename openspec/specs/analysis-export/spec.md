## Purpose

Defines the analysis and export capabilities: SNP export, gap export, permutation export for rearrangement phylogeny tools, positional homolog identification and export, identity matrix computation, CDS error detection, summary pipeline, and image export.

## Requirements

### Requirement: SNP export
The system SHALL export single nucleotide polymorphisms from XMFA alignments as a tab-delimited file with columns: SNP pattern (one character per genome), and per-genome contig name, position within contig, and global genome position. IUPAC ambiguity codes are treated as potential SNPs.

#### Scenario: Export SNPs via GUI
- **WHEN** user selects Tools → Export → Export SNPs with an XMFA alignment loaded
- **THEN** system writes a tab-delimited SNP file listing all polymorphic sites

#### Scenario: Export SNPs via CLI
- **WHEN** user runs SnpExporter with `-f <xmfa> -o <output>`
- **THEN** system produces the same tab-delimited SNP output

### Requirement: Gap export
The system SHALL export alignment gaps as a tab-delimited file with columns: Genome, Contig, Position, Length.

#### Scenario: Export gaps
- **WHEN** user selects Tools → Export → Export Gaps
- **THEN** system writes a tab-delimited file listing all gaps per genome

### Requirement: Permutation export
The system SHALL export signed permutation representations of LCB arrangements for downstream rearrangement analysis tools (BADGER, GRAPPA, MGR, GRIMM). Supports projecting LCB lists onto genome subsets and splitting LCBs at contig/chromosome boundaries.

#### Scenario: Export permutations for subset of genomes
- **WHEN** user selects Tools → Export → Export Permutation and chooses a subset of genomes
- **THEN** system produces signed permutation strings for only the selected genomes

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
The system SHALL export the current alignment view as a raster image (JPEG with three quality levels or PNG) with user-configurable dimensions via File → Export Image (Ctrl+E).

#### Scenario: Export alignment as JPEG
- **WHEN** user selects File → Export Image and chooses JPEG with high quality
- **THEN** system renders the alignment view to a JPEG file at the specified dimensions
