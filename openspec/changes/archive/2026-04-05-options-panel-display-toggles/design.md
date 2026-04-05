## Context

The Mauve viewer needs runtime display toggles matching the original Java application's View menu. Phase 4 adds an Options Panel with four checkboxes that control display elements without requiring a full re-render when possible.

## Goals

- Provide an Options Panel with toggleable display controls for genome labels, connecting lines, features, and contigs.
- Group the Options Panel and navigation toolbar into a single controls bar.
- Support efficient toggling (e.g., genome labels update in-place without full re-render).
- Extend `AnnotationsHandle` to accept display option flags.

## Non-Goals

- Persisting option state across sessions (local storage).
- Custom color schemes or additional display options beyond the four checkboxes.
- Keyboard shortcuts for toggling options.

## Decisions

1. **Separate module**: `options-panel.ts` encapsulates all panel creation, state, and DOM management. It exports `OptionsState`, `OptionsCallbacks`, `OptionsPanelHandle`, and `createOptionsPanel()`.
2. **Controls bar**: A `div.viewer-controls-bar` groups the options panel and navigation toolbar on one line, inserted as the first child of the container.
3. **Dropdown pattern**: The options panel uses a click-to-toggle dropdown with a `show` CSS class, closing on outside clicks via a document-level listener.
4. **Mutable closure for options**: `optionsState` is held as a mutable variable in the `renderAlignment` closure, following the same pattern as `viewerState`.
5. **Annotation display options**: `AnnotationDisplayOptions` interface with `showFeatures` and `showContigs` flags. Passed to `AnnotationsHandle.update()` as an optional parameter.
6. **Genome label helper**: `getGenomeLabel(name, showGenomeId)` is exported from `alignment-viewer.ts` for testability and reuse.
7. **In-place label updates**: Toggling genome ID updates labels via D3 selection without re-rendering panels.

## Risks

- Document-level click listener for dropdown close: cleaned up in `destroy()` to prevent leaks.
- Mutable options state: same trade-off as existing `viewerState` pattern. Documented as intentional exception.
