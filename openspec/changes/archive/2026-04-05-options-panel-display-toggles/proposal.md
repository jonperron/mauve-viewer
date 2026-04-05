## Why

The Mauve viewer needs an Options Panel to let users toggle display elements on/off at runtime—matching the original Java Mauve application's View menu options. Users need to control genome label format, connecting line visibility, feature annotation visibility, and contig boundary visibility.

## What Changes

- Add an **Options Panel** dropdown with four checkboxes: Show Genome ID, LCB Connecting Lines, Show Features (zoomed), Show Contigs.
- Genome labels toggle between full filename (e.g. "genome1.fasta") and name without extension ("genome1").
- LCB connecting lines between adjacent panels can be toggled on/off.
- Feature annotations and contig boundaries can be independently toggled on/off.
- The options panel and navigation toolbar are grouped in a controls bar above the alignment SVG.
- `AnnotationsHandle.update()` accepts an optional `AnnotationDisplayOptions` parameter to control feature/contig visibility.
- `ViewerHandle` now includes an `optionsPanelHandle` member.
- `getGenomeLabel()` exported helper computes genome labels based on the showGenomeId toggle.

## Capabilities

### New Capabilities

_None_ — the options panel is part of the existing xmfa-viewer capability.

### Modified Capabilities

- `xmfa-viewer`: Add requirements for the Options Panel UI, display toggles (genome ID, connecting lines, features, contigs), controls bar layout, and updated ViewerHandle lifecycle.

## Impact

- `src/viewer/options-panel.ts` — new module
- `src/viewer/alignment-viewer.ts` — controls bar, options wiring, `getGenomeLabel()`, updated `ViewerHandle`
- `src/viewer/annotations.ts` — `AnnotationDisplayOptions` interface, display options in `update()`
- `index.html` — CSS for controls bar and options panel
