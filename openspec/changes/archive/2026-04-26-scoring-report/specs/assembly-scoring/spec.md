## ADDED Requirements

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
