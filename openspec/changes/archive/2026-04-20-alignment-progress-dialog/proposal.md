## Why

The alignment server streams real-time progress events via WebSocket and supports job cancellation via the REST API, but users have no UI to monitor alignment progress or cancel running jobs. A modal progress dialog is needed to display status updates, accumulate a log of messages, and provide cancel/close controls.

## What Changes

- Add alignment progress dialog as a native `<dialog>` modal showing real-time progress
- Subscribe to WebSocket progress stream for the given job and display status messages
- Scrollable log area accumulating all progress messages (anchoring, extending, refining, etc.)
- Cancel button that calls DELETE /api/align/:jobId, with disabled states during the request
- Error handling: failed events show descriptive messages, WebSocket errors show "Connection lost", cancel failures are reported
- Close button shown after terminal events (completed, failed, cancelled)
- Lifecycle callbacks: `onComplete` (for auto-loading XMFA results), `onError`, `onCancel`
- `destroy()` method for cleanup (unsubscribes WebSocket, removes dialog from DOM)
- Escape key prevented from closing the dialog (must use Cancel or Close)

## Capabilities

### New Capabilities

_(none — progress dialog belongs to the existing genome-alignment capability)_

### Modified Capabilities

- `genome-alignment` — Add requirements for the alignment progress dialog UI component

## Impact

- New module: `src/alignment/alignment-progress.ts`
- New types exported from `src/alignment/index.ts`: `AlignmentProgressHandle`, `AlignmentProgressCallbacks`
- Depends on existing `subscribeToProgress()` and `cancelAlignment()` from `src/alignment/api-client.ts`
