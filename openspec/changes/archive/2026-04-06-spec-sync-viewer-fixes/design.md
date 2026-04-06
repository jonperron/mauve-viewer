## Context

This is a spec-only synchronization change. All features are already implemented and working. The specs lagged behind the implementation for four specific behaviors added during the advanced-features commit.

## Goals / Non-Goals

**Goals**: Update specifications to accurately describe the current implementation of region selection Escape key behavior, options panel action buttons, cursor overlay wheel forwarding, and pan clamping.

**Non-Goals**: No code changes. No new features. No refactoring.

## Decisions

1. **Escape key clearing in region-selection spec**: Added as a new scenario under the existing "Region selection via Shift+click+drag" requirement rather than a separate requirement, since it is a supplementary interaction for the same capability.

2. **Options panel action buttons in xmfa-viewer spec**: Added as scenarios under the existing "Options panel" requirement rather than a new requirement, since the buttons are part of the same dropdown UI.

3. **Cursor overlay wheel forwarding**: Added as a scenario under the existing "Mouse-based interaction" requirement, since it describes overlay behavior that affects cursor interaction zones.

4. **Pan clamping**: Added as a scenario under "Zoom and scroll navigation", since translateExtent is part of the D3 zoom setup.

## Risks / Trade-offs

None — spec-only change with no implementation impact.
