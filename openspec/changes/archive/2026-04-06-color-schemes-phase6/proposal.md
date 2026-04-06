## Why

The viewer previously used a hardcoded D3 schemeCategory20 palette with modulo cycling for LCB colors, which did not match the Java Mauve color scheme system. Phase 6 implements the full color scheme system from legacy Mauve, providing 6 HSB-based color schemes with a user-facing dropdown menu, while deferring backbone-dependent schemes until backbone data support is available.

## What Changes

- Replaced D3 schemeCategory20 palette with proper HSB color computation matching Java's `Color.getHSBColor`
- Implemented 6 color schemes: LCB, Offset, Normalized Offset, Multiplicity, Multiplicity Type, Normalized Multiplicity Type
- Added dynamic color scheme menu (HTML `<select>` dropdown) in the controls bar
- Added dynamic scheme filtering: multiplicity type schemes hidden for alignments with > 62 sequences
- Backbone LCB and Backbone Multiplicity schemes declared but deferred (require backbone data)

## Capabilities

### New Capabilities

_(none — color-schemes spec already exists)_

### Modified Capabilities

- `color-schemes`: Updated to reflect implementation status — 6 of 8 schemes implemented, backbone schemes deferred, HSB color conversion details, menu UI as `<select>` dropdown, multiplicity type sequence limit enforced

## Impact

- `src/viewer/color-schemes.ts` — new module with color scheme algorithms
- `src/viewer/color-scheme-menu.ts` — new dropdown UI component
- `src/viewer/alignment-viewer.ts` — replaced old palette with color scheme integration, added `ColorSchemeMenuHandle` to `ViewerHandle`
- `index.html` — CSS for color scheme menu
