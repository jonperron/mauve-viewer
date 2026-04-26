## Context

The assembly scoring pipeline (phase 8) computes five families of metrics. Step 8.7 adds the presentation layer: a modal dialog that surfaces all results interactively and a pure function for serialising them to TSV.

## Goals

- Provide a single entry point (`createScoringReport`) that attaches a self-contained modal dialog to any container element.
- Provide a pure serialiser (`exportScoringReport`) that can be called independently of the dialog.
- Keep all user-visible strings HTML-escaped to prevent XSS from metric data.

## Non-Goals

- Styling / theming (CSS is out of scope for this spec).
- Server-side rendering or PDF export.
- Accessibility beyond `role="tab"` / `aria-selected` / `role="tabpanel"` / `aria-label`.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Dialog primitive | Native `<dialog>` + `showModal()` | Provides focus trapping and backdrop for free; no third-party dependency |
| Tab state | `hidden` attribute + `aria-selected` | Semantically correct; avoids CSS-only visibility tricks |
| Escape suppression | `cancel` event `preventDefault()` | Prevents accidental dismissal; dialog must be closed via the Close button |
| TSV format | Three columns (Section / Metric / Value) | Simple, grep-friendly, compatible with spreadsheets |
| Download mechanism | `Blob` + `URL.createObjectURL` + `<a>.click()` | Standard browser download pattern; no server round-trip |

## Risks

- `URL.createObjectURL` / `<a>.click()` is browser-only; tests must mock the DOM and URL API (covered by `jsdom` + Vitest).
- Per-contig and per-broken-CDS rows in the TSV can make the file large for assemblies with many contigs or CDS; no pagination is implemented.
