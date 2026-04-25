## Context

The alignment server already provides WebSocket progress streaming (`GET /api/align/:jobId/progress`) and job cancellation (`DELETE /api/align/:jobId`). The client-side API module (`src/alignment/api-client.ts`) exposes `subscribeToProgress()` and `cancelAlignment()`. The alignment parameter dialog (`src/alignment/alignment-dialog.ts`) establishes the pattern of native `<dialog>` modals with handle-based lifecycle. This change adds the missing UI layer that connects the existing APIs to a user-visible progress experience.

## Goals

- Show real-time alignment progress in a modal dialog
- Allow users to cancel running alignments
- Provide lifecycle callbacks for integration with the alignment workflow
- Follow the same dialog pattern established by the alignment parameter dialog

## Non-Goals

- Progress percentage or determinate progress bars (server sends text messages, not numeric progress)
- Retry or restart functionality after failure
- Multiple simultaneous progress dialogs

## Decisions

### D1: Native `<dialog>` element
Same approach as the alignment parameter dialog. Uses `showModal()` for modal behavior and accessibility.

### D2: Escape key prevention
Unlike the parameter dialog (which closes on Escape), the progress dialog prevents Escape to avoid accidentally dismissing an active alignment. Users must explicitly cancel or close.

### D3: Cancel button state machine
The cancel button has three states: enabled (default), disabled during cancellation request, re-enabled on failure. After any terminal event, it is permanently disabled. This prevents race conditions between cancel requests and terminal events.

### D4: Close button appears only after terminal events
The Close button is dynamically added after completed/failed/cancelled events, keeping the interface clean during active alignment.

### D5: WebSocket error suppression after terminal events
If the WebSocket connection drops after a terminal event has been processed, the error is silently ignored since the job is already in a final state.

## Risks

- **WebSocket disconnection during alignment**: Mitigated by showing "Connection lost" status. The alignment continues server-side; user can check status via other means.
- **Cancel race condition**: If a cancel request is in flight when a terminal event arrives, the cancel button is already disabled by the terminal event handler. The cancel API call may fail with 409 but the error is suppressed since `terminated` is already true.
