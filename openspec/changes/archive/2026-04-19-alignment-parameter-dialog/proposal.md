## Why

The alignment server API and client functions exist but users have no UI to configure alignment parameters and submit jobs. A modal dialog is needed to let users select algorithms, tune parameters, manage input sequences, and launch alignments.

## What Changes

- Add alignment parameter dialog as a native `<dialog>` modal
- Dialog provides algorithm selection (mauveAligner / progressiveMauve)
- Shared parameters: seed weight (auto/custom), min LCB weight, collinear genomes, full alignment
- Algorithm-specific options: extend LCBs (mauveAligner); seed families, iterative refinement, sum-of-pairs scoring (progressiveMauve)
- Sequence management: pre-loaded sequences, drag-and-drop file addition, format detection from extension, per-sequence format override, sequence removal
- Submit validation: requires 2+ sequences
- Dialog returns structured `AlignmentDialogResult` with sequences and parameters

## Capabilities

### New Capabilities

_(none — dialog belongs to the existing genome-alignment capability)_

### Modified Capabilities

- `genome-alignment` — Add requirements for the alignment parameter dialog UI

## Impact

- New module: `src/alignment/alignment-dialog.ts`
- New types exported from `src/alignment/index.ts`: `AlignmentDialogHandle`, `AlignmentDialogResult`, `LoadedSequence`
- CSS additions in `index.html` for `.alignment-dialog` and related classes
