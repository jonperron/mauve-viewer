# Proposal: Phase 3 Display Modes & Similarity Profiles

## Why

The xmfa-viewer spec described three display modes (LCB, ungapped match, similarity profile) at a high level but lacked implementation detail for mode switching, the ungapped match renderer, the similarity profile renderer, and unaligned region indicators. Phase 3 delivers the full display mode architecture, rendering pipelines, and toolbar integration.

## What Changes

- **Modified**: `ViewerState` now includes a `displayMode` field and `setDisplayMode()` function for immutable mode transitions
- **Modified**: Navigation toolbar gains a display mode selector dropdown (shown only when multiple modes are available)
- **New**: Ungapped match renderer (`ungapped-match-renderer.ts`) for thin colored rectangles per LCB
- **New**: Similarity profile renderer (`similarity-profile-renderer.ts`) for D3 area charts with zoom-adaptive resolution
- **New**: Unaligned region renderer (`unaligned-regions.ts`) computing and displaying gaps between LCBs
- **Modified**: `renderAlignment` dispatches to the correct renderer by mode, only draws connecting lines in LCB mode, and triggers full re-render on mode change

## Capabilities

### New Capabilities

- **Display mode selector**: Dropdown in navigation toolbar for switching between available display modes
- **Ungapped match display**: Thin colored rectangles (8px) per LCB block without connecting lines
- **Similarity profile display**: Filled D3 area charts per LCB region with zoom-adaptive multi-level profiles
- **Unaligned region indicators**: White semi-transparent blocks for genomic regions not covered by any LCB

### Modified Capabilities

- **xmfa-viewer / Three display modes**: Expanded from a brief description to full requirements with rendering details, mode switching behavior, and data availability detection
- **xmfa-viewer / Navigation toolbar**: Now includes optional display mode selector
- **xmfa-viewer / ViewerHandle lifecycle API**: `ViewerState` includes `displayMode` field; `renderAlignment` accepts optional `initialDisplayMode` parameter

## Impact

- New modules: `src/viewer/ungapped-match-renderer.ts`, `src/viewer/similarity-profile-renderer.ts`, `src/viewer/unaligned-regions.ts`
- Modified modules: `src/viewer/viewer-state.ts`, `src/viewer/navigation-toolbar.ts`, `src/viewer/alignment-viewer.ts`
- Depends on `src/analysis/similarity/compute.ts` for multi-level profile computation
- No breaking changes; all new features are additive
