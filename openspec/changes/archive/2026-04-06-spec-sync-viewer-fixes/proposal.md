## Why

Several implemented viewer features are not fully reflected in the specifications: Escape key to clear region selection, Export Image and Print action buttons in the options panel dropdown, cursor overlay wheel event forwarding for Ctrl+scroll zoom, and pan clamping via translateExtent to prevent SVG overflow. Specs must be synchronized to match the current implementation.

## What Changes

- **Region selection**: Add Escape key behavior that clears the current selection.
- **Options panel**: Add Export Image (Ctrl+E) and Print (Ctrl+P) action buttons below the checkboxes in the dropdown, separated by a horizontal rule. Buttons close the dropdown before invoking their callback.
- **Zoom/scroll**: Document cursor overlay wheel event forwarding so Ctrl+scroll zoom works when hovering over cursor overlays. Document translateExtent pan clamping that constrains horizontal panning to `[[0,0],[width*2,0]]` to prevent scrolling past alignment boundaries.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `region-selection`: Add Escape key to clear selection scenario.
- `xmfa-viewer`: Add options panel action buttons requirement, cursor overlay wheel forwarding behavior, and pan clamping constraint.

## Impact

- Spec files only — no code changes. All features are already implemented.
