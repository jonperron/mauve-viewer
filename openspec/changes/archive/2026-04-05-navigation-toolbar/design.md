## Context

The alignment viewer already supports zoom/pan/reset via keyboard shortcuts (Ctrl+Up/Down/Left/Right) and programmatic `ZoomHandle` methods. However, there is no visible UI for these actions. Both legacy applications (Java Mauve and the TypeScript `mauve-viewer-legacy`) provide toolbar buttons for navigation. This change adds a toolbar to restore feature parity.

## Goals

- Provide clickable buttons for Reset, Pan Left, Zoom In, Zoom Out, Pan Right.
- Delegate each button to the existing `ZoomHandle` methods — no new navigation logic.
- Follow accessibility best practices (ARIA roles, labels, keyboard shortcut hints).
- Integrate the toolbar into the `ViewerHandle` lifecycle for proper cleanup.

## Non-Goals

- Custom key-binding configuration for toolbar buttons.
- Toolbar position customization (always above the SVG).
- Additional toolbar actions beyond the five navigation buttons.

## Decisions

1. **Separate module**: The toolbar is implemented in `navigation-toolbar.ts` with a pure function `createNavigationToolbar(container, callbacks)` that returns a `NavigationToolbarHandle`. This keeps the toolbar logic isolated from the alignment rendering.
2. **Callback interface**: The toolbar accepts a `NavigationCallbacks` object rather than a direct `ZoomHandle` reference, decoupling it from the zoom implementation.
3. **DOM insertion**: The toolbar `<div>` is inserted as the first child of the container via `insertBefore`, placing it above the SVG.
4. **Button definitions**: A static `BUTTON_DEFS` array drives button creation, making it easy to add or reorder buttons.
5. **Cleanup**: `destroy()` calls `toolbar.remove()` to detach the element from the DOM.

## Risks

- **CSS conflicts**: Toolbar styles are defined in `index.html` inline styles. If the viewer is embedded in another page, styles may conflict. Mitigation: use scoped class names prefixed with `nav-`.
