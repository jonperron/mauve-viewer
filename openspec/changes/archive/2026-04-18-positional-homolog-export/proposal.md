## Why

The Mauve Viewer needs to export positional homolog (ortholog) groups identified via backbone-based coordinate mapping. This is a core analysis feature from the legacy Java application that enables researchers to identify conserved genes across aligned genomes.

## What Changes

- Implement positional homolog extraction using backbone segments to map feature coordinates across genomes
- Compute pairwise nucleotide identity from alignment blocks with configurable identity (0.6–1.0) and coverage (0.7–1.0) thresholds
- Apply transitive closure (DFS) to group features: if A↔B and B↔C then {A, B, C}
- Export results as tab-delimited TSV with genome:locus_tag:left-right format per member
- List singletons (features without orthologs) separately after groups
- Add "Export Positional Orthologs" button to Options panel, visible only when backbone data AND annotations are loaded
- Support feature types: CDS, gene, tRNA, rRNA, misc_RNA (default: CDS)

## Capabilities

### New Capabilities

(none — this extends an existing capability)

### Modified Capabilities

- `analysis-export`: Updates the "Positional homolog export" requirement with full implementation details including parameters, algorithm, output format, UI integration, and known limitations

## Impact

- New module: `src/export/homolog/homolog-export.ts`
- Updated barrel: `src/export/index.ts`
- Updated UI: `src/viewer/toolbar/options/options-panel.ts` (new button)
- Updated wiring: `src/viewer/alignment-viewer.ts` (callback guard)
