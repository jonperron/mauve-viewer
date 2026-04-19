## 1. Dialog module

- [x] Create `src/alignment/alignment-dialog.ts` with `createAlignmentDialog()` function
- [x] Define `AlignmentDialogResult`, `AlignmentDialogHandle`, `LoadedSequence` types
- [x] Implement native `<dialog>` modal with `showModal()`

## 2. Algorithm selection and parameter controls

- [x] Add algorithm select (progressiveMauve / mauveAligner) with fieldset toggling
- [x] Add shared parameter controls: seed weight, min LCB weight, collinear, full alignment
- [x] Add mauveAligner-specific controls: extend LCBs
- [x] Add progressiveMauve-specific controls: seed families, iterative refinement, sum-of-pairs

## 3. Sequence management

- [x] Display pre-loaded sequences with name, format, remove button
- [x] Implement drag-and-drop file addition with format detection
- [x] Implement file browser addition via click on drop zone
- [x] Implement per-sequence format override
- [x] Implement sequence removal

## 4. Validation and submission

- [x] Disable submit button when fewer than 2 sequences
- [x] Build `AlignmentDialogResult` from form state on confirm
- [x] Close and remove dialog on cancel, backdrop click, or Escape

## 5. Exports and CSS

- [x] Export `createAlignmentDialog`, `AlignmentDialogHandle`, `AlignmentDialogResult`, `LoadedSequence` from `src/alignment/index.ts`
- [x] Add CSS styles for `.alignment-dialog` and related classes in `index.html`

## 6. Tests

- [x] Write 47 tests covering dialog behavior in `src/alignment/alignment-dialog.test.ts`
