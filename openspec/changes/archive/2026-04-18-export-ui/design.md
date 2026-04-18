## Context

Export actions in the Options panel previously fired immediately with hardcoded defaults for homolog export and had no UI for summary pipeline options. This change adds configuration dialogs for both exports and formalizes the button rendering and visibility model.

## Goals

- Allow users to configure homolog export parameters (identity, coverage, feature type) before export
- Allow users to configure summary pipeline options (island/backbone lengths, ratio, contained %) before export
- Ensure the summary export button only appears when backbone data is loaded
- Prevent dialog stacking when multiple export dialogs could be triggered
- Document the data-driven button rendering pattern in the Options panel

## Non-Goals

- Adding configuration dialogs for other exports (SNPs, gaps, permutations, identity matrix, CDS errors)
- Persisting user-chosen export parameters across sessions
- Multi-step export wizards

## Decisions

1. **Modal dialog pattern**: Both dialogs use the same pattern — a backdrop + dialog div with form fields, Cancel/Export buttons, and Escape/backdrop dismissal. This matches the existing image export dialog pattern.
2. **Input clamping**: Numeric inputs are clamped to valid ranges on confirm. Invalid (NaN) values fall back to defaults. This prevents out-of-range parameters without blocking the user.
3. **Data-driven buttons**: `ACTION_BUTTON_DEFS` array defines all action buttons in order. Each entry maps a callback key to a label. Buttons are rendered only when the callback is defined, removing conditional logic per-button.
4. **Dialog lifecycle via `activeDialogHandle`**: A single mutable reference in the alignment viewer closure tracks the currently open config dialog. Opening a new dialog destroys the previous one, preventing stacking.

## Risks

- None significant. Dialogs are purely additive UI. Clamping ensures robustness against invalid input.
