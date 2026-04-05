---
description: "Use when generating git commit messages. Covers conventional commit format, subject line, body structure, and new module listing."
---
# Commit Messages

- Conventional Commits: `type(scope): summary`
- Types: feat, fix, chore, refactor, test, docs
- Subject line: lowercase, imperative, no period, max 72 chars
- Blank line between subject and body

# Body Structure

- Bullet list with `- Feature name:` followed by a concise description
- Wrap lines at 72 characters; indent continuation lines with 2 spaces
- Focus on what and why, not how
- Reference API surface changes (new methods, extended interfaces)

# New Modules Section

- When new files are added, end with a `New modules:` section
- Format: `- filename.ts: brief purpose description`

# Example

```
feat(viewer): add zoom, cursor, and click-to-align interactions

- Zoom & pan: D3 zoom with Ctrl+scroll, drag-to-pan, keyboard
  shortcuts (Ctrl+Arrows, Shift for acceleration), programmatic
  zoomIn/zoomOut/panLeft/panRight/reset methods
- ViewerHandle API: renderAlignment returns a handle with destroy(),
  getState(), and access to zoom/cursor handles for proper lifecycle
  management

New modules:
- viewer-state.ts: immutable state, scale management, homologous
  position mapping, pixel/position conversion
- zoom.ts: D3 zoom behavior setup, keyboard shortcuts, extent config
```
