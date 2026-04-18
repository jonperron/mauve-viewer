## Why

The existing CDS error detection spec only described frameshift detection with a single scenario. The full implementation is now complete with frameshift detection, premature stop codon detection, amino acid substitution cataloging, insertion stop detection, gap segment reporting, and TSV export — all needing to be reflected in the spec.

## What Changes

- Expand the CDS error detection requirement from a single-scenario stub to a complete specification covering all implemented error types
- Document the TSV output format with its 10 columns
- Document the UI integration (Export CDS Errors button visibility conditions)
- Document the 2-genome alignment and GenBank annotation prerequisites

## Capabilities

### New Capabilities

### Modified Capabilities
- `analysis-export`: Expand the CDS error detection requirement to cover all error types, output format, and UI integration

## Impact

- `src/export/cds-errors/cds-error-detection.ts` — Core detection and formatting logic
- `src/export/index.ts` — Re-exports CDS error types and functions
- `src/viewer/toolbar/options/options-panel.ts` — Export CDS Errors button
- `src/viewer/alignment-viewer.ts` — Wires export callback with visibility condition
