## Why

The alignment viewer supports zoom, pan, and reset via keyboard shortcuts and programmatic API, but lacks a visible UI for users who prefer mouse-based navigation or are unaware of keyboard shortcuts. Both the legacy Java Mauve (Home/Left/ZoomIn/ZoomOut/Right buttons) and the legacy TypeScript viewer (Reset/PanLeft/ZoomIn/ZoomOut/PanRight) provide toolbar buttons for these actions. Adding a navigation toolbar restores feature parity with both legacy applications.

## What Changes

- A navigation toolbar with five buttons (Reset, Pan Left, Zoom In, Zoom Out, Pan Right) is inserted above the SVG alignment view.
- Each button delegates to the corresponding `ZoomHandle` method.
- Buttons include ARIA labels and keyboard shortcut hints in tooltips.
- The toolbar is created during `renderAlignment` and destroyed via the `ViewerHandle.destroy()` lifecycle.
- The `ViewerHandle` now exposes a `toolbarHandle` property.

## Capabilities

### New Capabilities

_(none — the toolbar augments the existing xmfa-viewer capability)_

### Modified Capabilities

- `xmfa-viewer`: Adds a navigation toolbar requirement and updates the ViewerHandle lifecycle API requirement to include `toolbarHandle`.

## Impact

- `src/viewer/navigation-toolbar.ts` — new module
- `src/viewer/alignment-viewer.ts` — imports and integrates the toolbar
- `index.html` — CSS styles for toolbar buttons
- `ViewerHandle` interface gains a `toolbarHandle` member
