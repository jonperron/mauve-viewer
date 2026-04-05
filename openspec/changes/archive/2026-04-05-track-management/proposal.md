## Why

The XMFA viewer needs interactive track management to let users reorder genome panels, change the reference genome, and hide/show individual genomes — matching the legacy Mauve desktop application's feature set. These controls are essential for multi-genome alignment analysis workflows.

## What Changes

- Add a **track controls sidebar** to the left of the alignment with per-genome buttons: move up (▲), move down (▼), set reference (R), and hide/show (−/+)
- **Genome reordering** via up/down buttons updates a `genomeOrder` array without mutating alignment data
- **Reference genome change** via R button; LCB forward/reverse orientation is computed visually using XOR logic relative to the reference
- **Hidden genomes** render as collapsed 20px placeholder bars (not fully removed) with italic gray genome name; at least one genome must remain visible
- Connecting lines between hidden genome panels are not drawn
- Track controls are rebuilt on every state change
- `ViewerHandle` exposes the `TrackControlsHandle` for lifecycle management

## Capabilities

### New Capabilities

_None — all changes are within the existing `xmfa-viewer` capability._

### Modified Capabilities

- `xmfa-viewer`: Update "Genome reordering and reference change" requirement with visual reverse XOR logic, reorder via display order array, and zoom reset on reorder. Update "Hide genomes" requirement to reflect collapsed placeholder bar rendering and the last-visible guard. Update "ViewerHandle lifecycle API" to include `trackControlsHandle`. Add new requirement for track controls sidebar.

## Impact

- **Files modified**: `viewer-state.ts`, `alignment-viewer.ts`, `cursor.ts`
- **Files added**: `track-controls.ts`, `track-controls.test.ts`
- **API changes**: `ViewerHandle` gains `trackControlsHandle` member; `ViewerState` gains `genomeOrder`, `referenceGenomeIndex`, and `hiddenGenomes` fields
- **No breaking changes** to external consumers — existing `renderAlignment` API is unchanged
