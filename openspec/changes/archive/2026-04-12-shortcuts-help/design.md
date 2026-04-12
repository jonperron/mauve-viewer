## Context

The viewer supports keyboard shortcuts for zoom, pan, image export, printing, and sequence navigation, but users have no in-app way to discover them. This change adds a help panel accessible via a "?" button or the "?" key.

## Goals / Non-Goals

**Goals**: Add a keyboard shortcuts help panel to the controls bar. Update controls bar element ordering. Ensure proper cleanup on destroy.

**Non-Goals**: No changes to the actual keyboard shortcut behavior. No new shortcuts beyond the "?" toggle.

## Decisions

1. **New requirement in xmfa-viewer spec**: The shortcuts help panel is a self-contained UI component that warrants its own requirement rather than being folded into the navigation toolbar or options panel requirements.

2. **Controls bar ordering**: The controls bar elements are appended in order: shortcuts help, navigation toolbar, color scheme menu, options panel. The Navigation toolbar and Options panel requirements are modified to describe this ordering accurately.

3. **ViewerHandle lifecycle**: The `shortcutsHelpHandle` is added to the list of handles cleaned up by `destroy()`.

4. **"?" key guard**: The keydown handler ignores the "?" key when focus is on INPUT, TEXTAREA, or SELECT elements to avoid interfering with form input.

## Risks / Trade-offs

None significant — additive UI feature with proper cleanup.
