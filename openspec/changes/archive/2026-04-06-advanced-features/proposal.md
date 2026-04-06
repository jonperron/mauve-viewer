## Why

The Mauve Viewer needs interactive region selection, image export, print support, and sequence navigation to match the original Java Mauve desktop application's feature set. These are core user-facing features for genome analysis workflows.

## What Changes

- **Region selection**: Shift+click+drag selects a genomic region on any visible panel, highlighting the corresponding region across all panels. Provides `SelectedRegion` data (genome index, start, end) via callback.
- **Image export**: Ctrl+E opens a dialog to export the current alignment view as PNG or JPEG (three quality levels: low/medium/high) with configurable width/height (100–10000 px).
- **Print support**: Ctrl+P prints the alignment SVG using the browser's native print dialog with a print-optimized landscape stylesheet.
- **Sequence navigator**: Ctrl+I opens a navigator panel with two tabs — feature search (exact/contains mode, per-genome scope) and go-to-position (coordinate jump). Search results are clickable and navigate to the feature.

## Capabilities

### New Capabilities

- `region-selection`: Interactive Shift+click+drag region selection with cross-panel highlighting

### Modified Capabilities

- `xmfa-viewer`: ViewerHandle extended with `regionSelectionHandle`, destroy() updated with new cleanup calls, image export and print support integrated
- `sequence-navigation`: Feature search implementation with exact/contains modes, per-genome scope, go-to-position, and Ctrl+I shortcut
- `analysis-export`: Image export updated to reflect web implementation (Ctrl+E dialog, PNG/JPEG with quality presets, configurable dimensions)

## Impact

- New module: `src/viewer/region-selection.ts`
- New module: `src/viewer/image-export.ts`
- New module: `src/viewer/print-support.ts`
- New module: `src/viewer/sequence-navigator.ts`
- Modified: `src/viewer/alignment-viewer.ts` (integration of all four features)
- Modified: `index.html` (CSS for new UI components)
