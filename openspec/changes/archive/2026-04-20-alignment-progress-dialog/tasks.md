## 1. Alignment progress dialog module

- [x] Create `src/alignment/alignment-progress.ts` with `createAlignmentProgress()` factory
- [x] Define `AlignmentProgressCallbacks` interface (onComplete, onError, onCancel)
- [x] Define `AlignmentProgressHandle` interface (element, destroy)
- [x] Build dialog HTML with progress indicator, status, log area, and cancel button
- [x] Open dialog as modal via `showModal()`

## 2. WebSocket progress subscription

- [x] Subscribe to progress stream via `subscribeToProgress()`
- [x] Update status text on progress events with messages
- [x] Append log entries for each progress message
- [x] Handle completed event: update status, disable cancel, show close, invoke callback
- [x] Handle failed event: show error message, disable cancel, show close, invoke callback
- [x] Handle cancelled event: update status, disable cancel, show close, invoke callback

## 3. Cancel and error handling

- [x] Cancel button calls `cancelAlignment()` on click
- [x] Disable cancel button during cancellation request
- [x] Re-enable cancel button and show error on cancel failure
- [x] Ignore cancel clicks after terminal events
- [x] Show "Connection lost" on WebSocket error (before terminal)
- [x] Suppress WebSocket errors after terminal events

## 4. Dialog lifecycle

- [x] Prevent Escape key from closing dialog
- [x] Show Close button after terminal events
- [x] `destroy()` unsubscribes WebSocket, closes dialog, removes from DOM
- [x] Close button invokes destroy

## 5. Exports and tests

- [x] Export types and factory from `src/alignment/index.ts`
- [x] Write comprehensive unit tests in `src/alignment/alignment-progress.test.ts`

## 6. Spec update

- [x] Add alignment progress dialog requirements to genome-alignment spec
