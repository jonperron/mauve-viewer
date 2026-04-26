## MODIFIED Requirements

### Requirement: Sequence-level metrics
The system SHALL compute sequence-level metrics by comparing, column by column, a reference genome and a draft assembly from a parsed XMFA alignment. Metrics include: total and percent of missed bases (reference base opposite an assembly gap), total and percent of extra bases (assembly base opposite a reference gap), SNP count with a 4×4 substitution matrix restricted to unambiguous ACGT bases (ambiguities silently ignored), and gap-run locations in both reference and assembly sequences.

**Exported interfaces**:
```ts
/** 4×4 substitution matrix. Row = reference base, column = assembly base. A=0, C=1, T=2, G=3. Diagonal entries are always 0. */
interface SubstitutionMatrix {
  readonly counts: readonly (readonly number[])[];
}

/** A contiguous run of gap characters in one aligned sequence. */
interface GapLocation {
  /** 1-based genome-wide position of the first opposite-sequence base adjacent to the gap run. */
  readonly genomeWidePosition: number;
  /** Number of gap characters in the run. */
  readonly length: number;
}

/** Sequence-level quality metrics for a reference-vs-assembly alignment. */
interface SequenceMetrics {
  readonly missedBases: number;
  readonly missedBasesPercent: number;   // fraction [0, 1]
  readonly extraBases: number;
  readonly extraBasesPercent: number;    // fraction [0, 1]
  readonly snpCount: number;
  readonly substitutionMatrix: SubstitutionMatrix;
  readonly refGaps: readonly GapLocation[];       // assembly has a base, reference has '-'
  readonly assemblyGaps: readonly GapLocation[];  // reference has a base, assembly has '-'
}
```

**Exported function**:
- `computeSequenceMetrics(alignment: XmfaAlignment, refGenomeIdx?: number): SequenceMetrics`
  — `refGenomeIdx` defaults to `0`; all other genomes are treated as draft assembly contigs.

**Module**: `src/scoring/sequence-metrics.ts`

**Algorithm**:
- Alignment blocks containing only the reference (no assembly segment) contribute all their bases to `missedBases`.
- Alignment blocks containing only assembly contigs (no reference segment) contribute all their bases to `extraBases`.
- Mixed blocks are scanned column by column: a reference base opposite an assembly gap increments `missedBases`; an assembly base opposite a reference gap increments `extraBases`; two non-gap bases that differ and are both unambiguous ACGT increment `snpCount` and the corresponding substitution-matrix cell.
- Consecutive gap columns of the same kind (assembly gap or reference gap) are merged into a single `GapLocation` entry. The `genomeWidePosition` of a `GapLocation` is the 1-based position from the opposite sequence at the start of the run.
- Base comparison is case-insensitive (the sequence data may contain lowercase characters).
- Multi-contig assemblies (several non-reference genomes) are supported; each assembly segment is compared independently against the reference segment within the same block.
- `missedBasesPercent` is `missedBases / referenceBases`; `extraBasesPercent` is `extraBases / assemblyBases`; both denominators default to 0-safe division (return 0 when the denominator is 0).

#### Scenario: Compute missed bases
- **WHEN** an alignment block contains a reference segment but no assembly segment
- **THEN** all reference bases in that block are added to `missedBases`

#### Scenario: Compute extra bases
- **WHEN** an alignment block contains assembly segment(s) but no reference segment
- **THEN** all assembly bases in those segments are added to `extraBases`

#### Scenario: Column-by-column SNP detection
- **WHEN** a column contains both a reference base and an assembly base and they differ and both are unambiguous ACGT
- **THEN** `snpCount` is incremented and the substitution-matrix cell `[refIdx][asmIdx]` is incremented

#### Scenario: Ambiguous base handling
- **WHEN** either the reference or the assembly column contains an ambiguous nucleotide (not A, C, T, or G)
- **THEN** the column is silently skipped and does not contribute to `snpCount` or `substitutionMatrix`

#### Scenario: Gap-run tracking
- **WHEN** consecutive columns share the same gap type (assembly-has-gap or reference-has-gap)
- **THEN** they are merged into a single `GapLocation` entry with cumulative `length`

#### Scenario: Case-insensitive comparison
- **WHEN** sequence data contains lowercase nucleotides (e.g. `a`, `c`, `t`, `g`)
- **THEN** they are treated identically to their uppercase equivalents for all metric computations

#### Scenario: Multi-contig assembly
- **WHEN** the alignment contains more than one non-reference genome
- **THEN** each assembly contig is compared independently against the reference and all counts are aggregated

#### Scenario: Single-genome alignment
- **WHEN** `computeSequenceMetrics` is called with an `XmfaAlignment` containing fewer than 2 genomes
- **THEN** it returns a `SequenceMetrics` object with all numeric fields set to 0, empty gap arrays, and a zero-filled substitution matrix
