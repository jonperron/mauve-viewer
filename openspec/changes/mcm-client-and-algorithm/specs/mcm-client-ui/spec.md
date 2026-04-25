## ADDED Requirements

### Requirement: REST API client
The browser client SHALL provide typed wrappers for all MCM REST endpoints: `submitReorder()`, `getReorderStatus()`, `cancelReorder()`, and `getReorderResult()`.

#### Scenario: Submit reorder job
- **WHEN** the client calls `submitReorder()` with a valid `ReorderRequest`
- **THEN** the client POSTs to `/api/reorder` and returns a `ReorderJobCreated` with `jobId` and initial status

#### Scenario: Non-2xx response on submit
- **WHEN** the server responds with a non-2xx status code
- **THEN** `submitReorder()` throws an `Error` whose message is taken from the response `error` field when available, or a fallback message including the HTTP status code

#### Scenario: Poll job status
- **WHEN** the client calls `getReorderStatus()` with a `jobId`
- **THEN** the client GETs `/api/reorder/:jobId/status` and returns a `ReorderJobStatusResponse` with current status, iteration, and maxIterations

#### Scenario: Cancel a job
- **WHEN** the client calls `cancelReorder()` with a `jobId`
- **THEN** the client sends DELETE to `/api/reorder/:jobId` and resolves without a return value

#### Scenario: Download result
- **WHEN** the client calls `getReorderResult()` with a `jobId` for a completed job
- **THEN** the client GETs `/api/reorder/:jobId/result` and returns a `ReorderResult` containing the reordered sequence text and the `*_contigs.tab` content

### Requirement: Contig tab file parser
The client SHALL parse raw `*_contigs.tab` text into a structured `ParsedContigsTab` object containing three arrays: `toReverse`, `ordered`, and `conflicted`.

#### Scenario: Parse complete tab file
- **WHEN** `parseContigsTab()` receives valid `*_contigs.tab` text with all three sections
- **THEN** each section is populated with `ParsedContigEntry` records having `name`, `strand`, `start`, and `end` fields

#### Scenario: Empty section
- **WHEN** a section header is present but contains no data rows
- **THEN** the corresponding array in `ParsedContigsTab` is empty

#### Scenario: Preamble skipped
- **WHEN** the file has a preamble paragraph before the first section header
- **THEN** preamble lines are ignored and do not appear in any parsed section

#### Scenario: Complement strand detection
- **WHEN** a data row has `complement` in the strand column
- **THEN** the parsed entry has `strand: 'complement'`; otherwise `strand: 'forward'`

#### Scenario: Invalid row ignored
- **WHEN** a data row has fewer than six tab-separated columns or non-numeric coordinates
- **THEN** the row is silently skipped

### Requirement: Reorder progress dialog
The client SHALL provide a modal progress dialog (`createReorderProgress`) that polls the job status every 2000 ms and updates a status message and iteration counter.

#### Scenario: Polling while job is queued
- **WHEN** job status is `queued`
- **THEN** the dialog shows "Waiting in queue…" and schedules the next poll after 2000 ms

#### Scenario: Polling while job is running
- **WHEN** job status is `running`
- **THEN** the dialog shows "Aligning and reordering contigs…" and schedules the next poll after 2000 ms

#### Scenario: Job completes
- **WHEN** job status transitions to `completed`
- **THEN** polling stops, the cancel button is disabled, a close button appears, and `onComplete` callback is called with the `jobId`

#### Scenario: Job fails
- **WHEN** job status is `failed`
- **THEN** polling stops, the dialog displays the error message, and `onError` callback is called

#### Scenario: User cancels
- **WHEN** the user clicks the Cancel button while the job is queued or running
- **THEN** `cancelReorder()` is called and `onCancel` callback is invoked

#### Scenario: Job cancelled by server
- **WHEN** job status is `cancelled`
- **THEN** polling stops and `onCancel` callback is called

#### Scenario: Sequential polling
- **WHEN** a status request is in flight
- **THEN** no second request is started until the first resolves (setTimeout-based, not setInterval)

### Requirement: MCM results viewer
The client SHALL provide a modal results dialog (`createResultsViewer`) that displays the three contig sections as HTML tables with strand badges and a summary line.

#### Scenario: Display ordered contigs
- **WHEN** the results viewer opens with a non-empty `ordered` section
- **THEN** a table lists each contig's name, strand badge, start, and end coordinates

#### Scenario: Display reversed contigs
- **WHEN** the `toReverse` section is non-empty
- **THEN** a separate table lists reversed contigs with their strand badges

#### Scenario: Display conflicted contigs
- **WHEN** the `conflicted` section is non-empty
- **THEN** a separate table lists conflicted contigs

#### Scenario: Empty section placeholder
- **WHEN** any section contains zero entries
- **THEN** the section shows a "None" placeholder instead of a table

#### Scenario: Strand badge rendering
- **WHEN** a contig entry has `strand: 'complement'`
- **THEN** it is marked with a `strand-complement` CSS badge; `strand: 'forward'` uses `strand-forward`

#### Scenario: XSS prevention
- **WHEN** a contig name contains HTML special characters
- **THEN** the name is HTML-escaped before being inserted into the DOM

#### Scenario: Load alignment action
- **WHEN** the dialog was created with an `onLoadAlignment` callback and the user clicks "Load Alignment"
- **THEN** `onLoadAlignment` is called with the reordered sequence text and the iteration count

#### Scenario: Close without loading
- **WHEN** the user clicks "Close"
- **THEN** `onClose` callback is called and the dialog is removed from the DOM

### Requirement: Client-side type definitions
The client module SHALL expose type definitions for `ReorderJobStatus`, `ReorderSequenceFormat`, `ReorderRequest`, `ReorderJobCreated`, `ReorderJobStatusResponse`, `ReorderResult`, `ReorderClientConfig`, `ContigStrand`, `ParsedContigEntry`, and `ParsedContigsTab`.

#### Scenario: Job status values
- **WHEN** a `ReorderJobStatus` value is used
- **THEN** it is one of `'queued' | 'running' | 'completed' | 'failed' | 'cancelled'`

#### Scenario: Sequence format values
- **WHEN** a `ReorderSequenceFormat` value is used
- **THEN** it is one of `'fasta' | 'genbank'`
