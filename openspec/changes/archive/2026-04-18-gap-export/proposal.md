## Why

The existing gap export spec was a minimal placeholder describing a Tools menu trigger and basic columns. The implemented feature uses the Options panel (consistent with SNP export), includes genome-wide position and contig-relative position columns, handles forward/reverse strand segments, and resolves contig names from annotation data. The spec must be updated to reflect the actual implementation.

## What Changes

- Gap export is triggered from the Options panel ("Export Gaps" button), not from a Tools → Export menu
- The export button is only visible when alignment blocks are loaded
- Gap extraction works on in-memory `XmfaAlignment` data (no file I/O)
- Output columns: Genome, Contig, Position_in_Contig, GenomeWide_Position, Length
- Gap position is determined by the adjacent non-gap base (forward strand: last base before gap; reverse strand: first base after gap)
- Output is sorted by genome index then genome-wide position
- Contig resolution uses annotation data when available; falls back to genome name
- File download uses Blob URL + anchor click pattern (shared with SNP export)

## Capabilities

### New Capabilities

_None_ — Gap export is already defined in `analysis-export`.

### Modified Capabilities

- `analysis-export`: The gap export requirement is updated to reflect the web-based implementation — GUI trigger, output columns, strand handling, contig resolution, sorting, and conditional visibility.

## Impact

- `src/analysis/export/gap-export.ts` — new module with `extractGaps`, `formatGapTable`, `exportGaps` functions
- `src/analysis/export/index.ts` — added gap export re-exports
- `src/viewer/options-panel.ts` — `onExportGaps` callback added to `OptionsCallbacks`
- `src/viewer/alignment-viewer.ts` — wires gap export with contig resolution, downloads `gaps.tsv`
