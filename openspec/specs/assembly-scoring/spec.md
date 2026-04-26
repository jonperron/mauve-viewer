## Purpose

Defines genome assembly quality evaluation by comparing a draft assembly to a reference genome, computing structural metrics (DCJ/breakpoint/SCJ distances), sequence-level metrics (SNPs, gaps, missed/extra bases), contig statistics (N50/N90), and annotation quality (broken CDS detection).

## Requirements

### Requirement: Assembly quality scoring
The system SHALL evaluate the quality of a genome assembly by aligning it to a reference genome and computing structural, sequence, and annotation metrics via the AssemblyScorer.

#### Scenario: Score assembly via GUI
- **WHEN** user clicks the ScoreAssembly toolbar button with exactly 2 genomes loaded
- **THEN** system computes all assembly quality metrics and displays results in an AnalysisDisplayWindow with Summary, SNPs, Gaps, and Broken CDS tabs

#### Scenario: Score assembly via CLI
- **WHEN** user runs `java -cp Mauve.jar org.gel.mauve.assembly.ScoreAssembly --ref <ref> --draft <draft> --output <dir>`
- **THEN** system aligns, computes metrics, and writes results to the output directory

### Requirement: Structural metrics
The system SHALL compute: number of contigs, number of replicons, total bases in assembly and reference, DCJ distance, breakpoint distance, SCJ distance, Type I adjacency errors (false positive joins), and Type II adjacency errors (false negative joins).

**Exported interface**:
```ts
interface StructuralMetrics {
  contigCount: number;      // draft assembly genomes
  repliconCount: number;    // reference chromosomes (always 1 for a single reference)
  assemblyBases: number;    // sum of draft genome lengths
  referenceBases: number;   // reference genome length
  distances: DistanceResult; // { dcj, breakpoint, scj, blocks }
  typeIErrors: number;      // false positive joins (non-consecutive reference neighbors)
  typeIIErrors: number;     // wrong orientation (consecutive neighbors with inconsistent inversion)
}
```

**Exported functions**:
- `computeStructuralMetrics(alignment, refGenomeIdx?)` → `StructuralMetrics`

**Module**: `src/scoring/structural-metrics.ts`

**Algorithm**:
- Rearrangement distances are computed via `computeDistanceMatrixFromLcbs` from `src/analysis/dcj/distance.ts`.
- Adjacency errors are computed over LCBs present in both reference and assembly (non-zero left coordinate for both).
- Type I error: consecutive pair in assembly-sorted order whose reference ranks differ by more than 1 (|Δrank| ≠ 1).
- Type II error: consecutive pair that IS reference-adjacent (|Δrank| = 1) but has inconsistent net inversions — one block's strand changed between reference and assembly while the adjacent block's did not.

#### Scenario: Compute rearrangement distances
- **WHEN** assembly scoring completes
- **THEN** system reports DCJ, breakpoint, and SCJ distances between the draft and reference genome arrangements

#### Scenario: Compute adjacency errors
- **WHEN** assembly scoring completes
- **THEN** system reports Type I errors (false positive joins between non-adjacent reference blocks) and Type II errors (orientation inconsistencies between reference-adjacent blocks)

#### Scenario: Two-genome alignment input
- **WHEN** an XmfaAlignment with fewer than 2 genomes is provided
- **THEN** `computeStructuralMetrics` returns zero-valued metrics without error

### Requirement: Sequence-level metrics
The system SHALL compute: total and percent of missed bases (in reference but not assembly), total and percent of extra bases (in assembly but not reference), SNP count with a 4×4 substitution matrix (A/C/T/G), and gap count with locations in both reference and assembly.

#### Scenario: Compute missed bases
- **WHEN** assembly scoring completes
- **THEN** system reports the total number and percentage of reference bases not represented in the assembly

### Requirement: Contig size statistics
The system SHALL compute contig N50, N90, minimum contig length, and maximum contig length.

#### Scenario: Compute N50
- **WHEN** assembly scoring completes
- **THEN** system reports the contig N50 value (the minimum contig length such that 50% of total bases are in contigs of that length or longer)

### Requirement: Annotation quality metrics
The system SHALL detect broken CDS features by projecting SNPs and gaps onto annotated coding sequences, identifying frameshift mutations, premature stop codons, and amino acid substitutions. Reports the number of broken and complete CDS.

#### Scenario: Detect broken CDS
- **WHEN** assembly scoring runs on a GenBank-annotated reference genome
- **THEN** system identifies CDS that contain frameshifts, premature stops, or significant substitutions and reports them with details

### Requirement: Content metrics
The system SHALL identify missing chromosomes (present in reference but absent from assembly) and extra contigs (present in assembly but absent from reference).

#### Scenario: Identify missing chromosomes
- **WHEN** assembly scoring completes
- **THEN** system lists any reference chromosomes with no corresponding assembly contigs

### Requirement: Batch mode
The system SHALL support batch mode (`--batch`) for non-interactive scoring, and `--no-cds` to skip CDS error analysis.

#### Scenario: Batch scoring without CDS analysis
- **WHEN** user runs ScoreAssembly with `--batch --no-cds`
- **THEN** system computes all metrics except CDS analysis and outputs results without GUI interaction

### Requirement: Default alignment parameters
The system SHALL use `--skip-refinement` and `--weight=200` as default alignment arguments for assembly scoring.

#### Scenario: Use default scoring alignment
- **WHEN** user runs ScoreAssembly without custom alignment arguments
- **THEN** system aligns using --skip-refinement and --weight=200 for fast, adequate alignment
