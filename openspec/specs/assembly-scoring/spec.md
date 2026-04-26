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

### Requirement: Scoring report UI
The system SHALL display all computed assembly quality metrics in a modal dialog with five tabbed sections, and SHALL allow the user to export the full report as a tab-delimited text file.

**Exported types**:
```ts
/** All computed metrics passed to the scoring report dialog */
interface ScoringReportMetrics {
  readonly structural: StructuralMetrics;
  readonly sequence: SequenceMetrics;
  readonly contigs: ContigStats;
  readonly cds: CdsQualityMetrics;
  readonly content: ContentMetrics;
}

/** Lifecycle callbacks for the scoring report dialog */
interface ScoringReportCallbacks {
  readonly onClose?: () => void;
}

/** Handle returned by createScoringReport() */
interface ScoringReportHandle {
  readonly element: HTMLDialogElement;
  readonly destroy: () => void;
}

/** Valid tab identifiers */
type ScoringReportTab = 'structural' | 'sequence' | 'contigs' | 'cds' | 'content';
```

**Exported functions**:
- `createScoringReport(container, metrics, callbacks): ScoringReportHandle`
  — Appends a native `<dialog>` to `container`, calls `showModal()`, and returns a handle.
- `exportScoringReport(metrics): string`
  — Returns a tab-delimited string with columns Section / Metric / Value, one metric per line.

**Module**: `src/scoring/scoring-report.ts`

#### Scenario: Dialog opens with five tabs
- **WHEN** `createScoringReport()` is called with valid metrics
- **THEN** a modal dialog is shown containing tabs labelled Structural, Sequence, Contigs, CDS, and Content, with the Structural tab active by default

#### Scenario: Tab switching via click
- **WHEN** the user clicks a tab button
- **THEN** the corresponding panel becomes visible (`hidden` attribute removed) and its button receives `aria-selected="true"`; all other panels are hidden and their buttons receive `aria-selected="false"`

#### Scenario: Structural tab content
- **WHEN** the Structural tab is active
- **THEN** the panel displays contig count, replicon count, assembly bases, reference bases, DCJ distance, breakpoint distance, SCJ distance, alignment blocks, Type I errors, and Type II errors

#### Scenario: Sequence tab content
- **WHEN** the Sequence tab is active
- **THEN** the panel displays missed bases (count and percent), extra bases (count and percent), SNP count, assembly gap run count, reference gap run count, and the 4×4 substitution matrix labelled "Row = reference base, Column = assembly base"

#### Scenario: Contigs tab content
- **WHEN** the Contigs tab is active
- **THEN** the panel displays N50, N90, minimum contig length, maximum contig length, total contig count, and a per-contig length distribution table; an empty distribution shows "No contigs."

#### Scenario: CDS tab content
- **WHEN** the CDS tab is active
- **THEN** the panel displays total CDS analyzed, complete CDS count, broken CDS count, frameshift count, premature stop count, AA substitution count, and a broken CDS detail table; no broken CDS shows "No broken CDS detected."

#### Scenario: Content tab content
- **WHEN** the Content tab is active
- **THEN** the panel displays missing chromosome count with a table of name and length, and extra contig count with a table of index, name, and length; empty sections show "None."

#### Scenario: HTML escaping
- **WHEN** metric data contains HTML special characters (e.g. `<`, `>`, `&`, `"`) in feature IDs, chromosome names, or contig names
- **THEN** those characters are HTML-escaped before insertion into the dialog DOM

#### Scenario: Close button
- **WHEN** the user clicks the Close button
- **THEN** `onClose` callback is invoked (if provided), the dialog is closed, and its DOM element is removed

#### Scenario: Escape key suppressed
- **WHEN** the user presses the Escape key while the dialog is open
- **THEN** the native cancel event is prevented and the dialog remains open

#### Scenario: Export button triggers TSV download
- **WHEN** the user clicks the Export Report button
- **THEN** `exportScoringReport()` is called, a Blob of type `text/tab-separated-values` is created, and a file named `assembly-scoring-report.tsv` is downloaded via a temporary object URL

#### Scenario: TSV report format
- **WHEN** `exportScoringReport()` is called
- **THEN** it returns a string whose first line is `Section\tMetric\tValue` and whose subsequent lines each contain the section name, metric name, and value separated by tabs, with blank lines separating sections

#### Scenario: TSV report completeness
- **WHEN** `exportScoringReport()` is called
- **THEN** the output includes all metrics from all five sections: structural (10 metrics), sequence (7 summary metrics + 16 substitution-matrix cells), contigs (5 summary metrics + per-contig lengths), CDS (6 summary metrics + per-broken-CDS detail rows), and content (missing chromosomes and extra contigs with per-entry rows)

