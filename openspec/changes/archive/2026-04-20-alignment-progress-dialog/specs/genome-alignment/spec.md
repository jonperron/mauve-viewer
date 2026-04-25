## ADDED Requirements

### Requirement: Alignment progress dialog
The system SHALL provide a modal dialog that displays real-time alignment progress for a running job. The dialog SHALL be implemented as a native HTML `<dialog>` element opened via `showModal()`. It SHALL accept a container element, an `AlignmentClientConfig`, a `jobId`, and `AlignmentProgressCallbacks`, and return an `AlignmentProgressHandle` with `element` and `destroy()` for lifecycle control.

#### Scenario: Open progress dialog for a running job
- **WHEN** `createAlignmentProgress()` is called with a valid container, config, jobId, and callbacks
- **THEN** the system SHALL create a `<dialog>` with class `alignment-progress-dialog`, append it to the container, and open it as a modal with `showModal()`

#### Scenario: Display initial status
- **WHEN** the progress dialog opens
- **THEN** it SHALL show the status message "Starting alignment...", a progress indicator, a scrollable log area, and an enabled Cancel button

### Requirement: Real-time progress display via WebSocket
The progress dialog SHALL subscribe to the WebSocket progress stream for the given job via `subscribeToProgress()` and update the status message and log area as events arrive. Each progress event with a message SHALL update the status text and append an entry to the scrollable log.

#### Scenario: Receive progress event with message
- **WHEN** a progress event with message "Anchoring matches..." arrives via WebSocket
- **THEN** the status text SHALL update to "Anchoring matches..." and a log entry SHALL be appended

#### Scenario: Receive progress event without message
- **WHEN** a progress event arrives with no message
- **THEN** the status text and log SHALL remain unchanged

#### Scenario: Accumulate multiple progress messages
- **WHEN** multiple progress events arrive (e.g., "Anchoring...", "Extending LCBs...", "Refining alignment...")
- **THEN** each message SHALL be appended as a separate log entry and the log SHALL auto-scroll to the latest entry

### Requirement: Terminal event handling
The progress dialog SHALL handle terminal events (completed, failed, cancelled) by updating the status, disabling the Cancel button, and showing a Close button. Terminal events SHALL invoke the appropriate lifecycle callback.

#### Scenario: Alignment completed
- **WHEN** a "completed" event arrives
- **THEN** the status SHALL show "Alignment completed", the Cancel button SHALL be disabled, a Close button SHALL appear, and the `onComplete` callback SHALL be invoked with the jobId

#### Scenario: Alignment failed with message
- **WHEN** a "failed" event arrives with message "Out of memory"
- **THEN** the status SHALL show "Alignment failed: Out of memory", the Cancel button SHALL be disabled, a Close button SHALL appear, and the `onError` callback SHALL be invoked with the error message

#### Scenario: Alignment failed without message
- **WHEN** a "failed" event arrives with no message
- **THEN** the status SHALL show "Alignment failed" and the `onError` callback SHALL be invoked with "Alignment failed"

#### Scenario: Alignment cancelled
- **WHEN** a "cancelled" event arrives
- **THEN** the status SHALL show "Alignment cancelled", the Cancel button SHALL be disabled, a Close button SHALL appear, and the `onCancel` callback SHALL be invoked

### Requirement: Cancel button behavior
The Cancel button SHALL call `cancelAlignment()` with the current config and jobId when clicked. While the cancellation request is in flight, the button SHALL be disabled. If the request fails, the button SHALL be re-enabled and the status SHALL show the error. After a terminal event, the Cancel button SHALL be permanently disabled and cancel clicks SHALL be ignored.

#### Scenario: Click cancel for a running job
- **WHEN** the user clicks the Cancel button while the job is running
- **THEN** the system SHALL call `cancelAlignment()` with the config and jobId, and disable the Cancel button during the request

#### Scenario: Cancel request fails
- **WHEN** the cancellation API request fails with a network error
- **THEN** the Cancel button SHALL be re-enabled and the status SHALL show "Cancel failed: <error message>"

#### Scenario: Cancel request fails with non-Error rejection
- **WHEN** the cancellation API request rejects with a non-Error value
- **THEN** the status SHALL show "Cancel failed: Unknown error"

#### Scenario: Click cancel after terminal event
- **WHEN** the user clicks the Cancel button after a terminal event has occurred
- **THEN** `cancelAlignment()` SHALL NOT be called

### Requirement: WebSocket error handling
The progress dialog SHALL handle WebSocket connection errors by displaying "Connection lost" in the status and log. If the connection is lost after a terminal event has already been received, the error SHALL be ignored.

#### Scenario: WebSocket connection error
- **WHEN** the WebSocket connection encounters an error before any terminal event
- **THEN** the status SHALL show "Connection lost" and a log entry SHALL be appended

#### Scenario: WebSocket error after terminal event
- **WHEN** the WebSocket connection encounters an error after a terminal event (completed/failed/cancelled) has been received
- **THEN** the status SHALL remain unchanged (showing the terminal event status)

### Requirement: Escape key prevention
The progress dialog SHALL prevent the Escape key from closing the dialog. Users MUST use the Cancel button (during alignment) or the Close button (after a terminal event) to dismiss the dialog.

#### Scenario: Press Escape while alignment is running
- **WHEN** the user presses Escape while the progress dialog is open
- **THEN** the dialog SHALL NOT close (the cancel event SHALL be prevented)

### Requirement: Dialog cleanup and destruction
The `destroy()` method on the `AlignmentProgressHandle` SHALL unsubscribe from the WebSocket progress stream, close the dialog if open, and remove it from the DOM. The Close button shown after terminal events SHALL invoke `destroy()`.

#### Scenario: Destroy dialog programmatically
- **WHEN** the caller invokes `destroy()` on the progress handle
- **THEN** the WebSocket subscription SHALL be cleaned up, the dialog SHALL be closed and removed from the DOM

#### Scenario: Close via Close button after completion
- **WHEN** the user clicks the Close button after a terminal event
- **THEN** the dialog SHALL be destroyed (WebSocket unsubscribed, dialog removed)
