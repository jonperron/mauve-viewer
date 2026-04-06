## Context

Phase 7 of the Mauve Viewer reimplementation adds four advanced interactive features: region selection, image export, print support, and sequence navigation. These features are implemented as independent modules in `src/viewer/` and integrated into the main `alignment-viewer.ts` via the `ViewerHandle` lifecycle.

## Goals

- Provide region selection via Shift+click+drag with cross-panel highlighting
- Enable image export (PNG/JPEG) via Ctrl+E with a configurable dialog
- Support printing via Ctrl+P using browser native print with SVG isolation
- Implement sequence navigator (Ctrl+I) with feature search and coordinate jump

## Non-Goals

- No server-side rendering or export
- No CLI-based export (web-only)
- No vector (SVG/PDF) file export — uses browser print for PDF output

## Decisions

1. **Region selection uses Shift modifier**: Shift+click+drag is used to differentiate from regular drag-to-pan. The drag overlay captures events during selection to prevent interference with zoom/cursor behaviors.

2. **Image export via Canvas rendering**: SVG is cloned, styles are inlined, rendered to an offscreen Canvas, then converted to a Blob for download. This avoids external dependencies.

3. **Print support via browser native dialog**: A temporary print-isolation wrapper with a cloned SVG is inserted into the DOM, `window.print()` is called, and the wrapper is removed after the dialog closes. A `@media print` stylesheet hides all other content.

4. **Sequence navigator as modal panel**: The navigator is a DOM panel (not SVG) with tab switching between feature search and go-to-position. It is created/destroyed on Ctrl+I toggle.

5. **Cleanup via destroy pattern**: All four features provide cleanup functions or handles that are called in the `ViewerHandle.destroy()` chain.

## Risks

- Canvas rendering of SVG may lose some styles on certain browsers; mitigated by inlining computed styles.
- Print output depends on browser print implementation; the landscape `@page` directive is a hint, not a guarantee.
