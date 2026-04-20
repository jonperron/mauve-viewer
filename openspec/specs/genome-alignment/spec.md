## Purpose

Defines how Mauve aligns two or more genome sequences using the mauveAligner (original) and progressiveMauve algorithms, including alignment execution, parameter tuning, and LCB weight-based filtering.
## Requirements
### Requirement: Multiple genome alignment with mauveAligner
The system SHALL align two or more genome sequences using the original mauveAligner algorithm, which uses anchored alignment with seed-and-extend multi-genome unique match detection, greedy breakpoint elimination for LCB selection, and ClustalW or MUSCLE for gapped global alignment within each LCB.

#### Scenario: Align two closely related bacterial genomes
- **WHEN** user provides two genome sequences (e.g., E. coli and Salmonella) and selects "Align sequences" from the File menu
- **THEN** system launches the native mauveAligner binary, produces an XMFA alignment file, and loads the result into the viewer

#### Scenario: Align with custom seed weight
- **WHEN** user sets a custom match seed weight in the alignment dialog
- **THEN** system uses the specified seed weight for anchor detection instead of the auto-calculated default

#### Scenario: Align with custom LCB weight
- **WHEN** user sets a minimum LCB weight in the alignment dialog
- **THEN** system applies greedy breakpoint elimination using the specified weight threshold to filter spurious rearrangements

#### Scenario: Align collinear genomes
- **WHEN** user selects "Assume collinear genomes" in the alignment dialog
- **THEN** system skips rearrangement detection and aligns genomes as a single collinear block

#### Scenario: Align without full alignment
- **WHEN** user deselects the "Full alignment" option
- **THEN** system identifies LCBs but does not perform recursive anchor search or gapped alignment

### Requirement: Progressive multiple genome alignment with progressiveMauve
The system SHALL align two or more genome sequences using the progressiveMauve algorithm, which aligns regions conserved among any subset of the input genomes (pan-genome), uses three palindromic spaced seed patterns, computes a guide tree from pairwise genome content distances, applies adaptive breakpoint penalties, and rejects forced alignment of unrelated sequence via an HMM.

#### Scenario: Align divergent genomes
- **WHEN** user provides genomes with as little as 50% nucleotide identity and selects "Align with progressiveMauve" from the File menu
- **THEN** system produces an alignment that includes regions conserved among subsets of the input genomes

#### Scenario: Use seed families for improved sensitivity
- **WHEN** user enables "Use seed families" in the progressiveMauve alignment dialog
- **THEN** system uses three spaced seed patterns instead of one for match detection

#### Scenario: Apply iterative refinement
- **WHEN** user enables "Iterative Refinement"
- **THEN** system applies MUSCLE tree-independent iterative refinement to avoid biasing phylogenetic inference with a single guide tree

#### Scenario: Sum-of-pairs LCB scoring
- **WHEN** user leaves "Sum-of-pairs LCB scoring" enabled (default)
- **THEN** system applies breakpoint penalties among all pairs of extant sequences during LCB computation

### Requirement: Alignment execution as external process
The system SHALL launch native alignment binaries (mauveAligner, progressiveMauve) as external processes via Node.js `child_process.spawn()`, manage process I/O via stdout/stderr streaming, and report progress to connected clients via WebSocket events. A command builder SHALL translate typed alignment parameters into CLI argument arrays for each binary, mirroring the legacy Java `MauveAlignFrame.makeAlignerCommand()` and `ProgressiveMauveAlignFrame.makeAlignerCommand()` logic.

#### Scenario: Build mauveAligner command with default seed weight
- **WHEN** an alignment request specifies algorithm `mauveAligner` with seedWeight `auto` and fullAlignment `true`
- **THEN** the command builder SHALL produce a command array starting with the `mauveAligner` binary path, include `--output`, `--output-guide-tree`, `--id-matrix`, and `--output-alignment` flags, and append all sequence file paths

#### Scenario: Build mauveAligner command with custom parameters
- **WHEN** an alignment request specifies algorithm `mauveAligner` with a numeric seedWeight, collinear `true`, and extendLcbs `false`
- **THEN** the command builder SHALL include `--seed-size=<value>`, `--collinear`, and `--no-lcb-extension` flags

#### Scenario: Build progressiveMauve command with seed families
- **WHEN** an alignment request specifies algorithm `progressiveMauve` with seedFamilies `true` and iterativeRefinement `true`
- **THEN** the command builder SHALL produce a command array starting with the `progressiveMauve` binary path and include `--seed-family`, `--output`, `--output-guide-tree`, and `--backbone-output` flags

#### Scenario: Build progressiveMauve command with ancestral scoring
- **WHEN** an alignment request specifies algorithm `progressiveMauve` with sumOfPairsScoring `false`
- **THEN** the command builder SHALL include `--scoring-scheme=ancestral` in the command array

### Requirement: Alignment parameter auto-tuning
The system SHALL auto-select alignment parameters appropriate for the genome sizes when "Default seed weight" is enabled. The default seed size is approximately 11 for 1MB genomes and 15 for 5MB genomes, scaling with genome size.

#### Scenario: Auto-select seed weight
- **WHEN** user leaves "Default seed weight" enabled
- **THEN** system calculates a seed weight appropriate for the lengths of the input sequences

### Requirement: LCB weight-based filtering
The system SHALL support dynamic filtering of LCBs by minimum weight via a slider control. Adjusting the slider applies greedy breakpoint elimination to remove LCBs below the threshold, updating the visualization in real time.

#### Scenario: Increase LCB weight threshold
- **WHEN** user moves the LCB weight slider to a higher value
- **THEN** system removes LCBs with weight below the threshold and updates the display to show only the remaining LCBs

### Requirement: REST API for alignment job submission
The server SHALL expose a `POST /api/align` endpoint that accepts a JSON body with `sequences` (array of at least 2 items, each with `name`, `content`, and `format`) and `params` (with `algorithm` and alignment-specific options). On valid input, it SHALL create a job, return HTTP 201 with `{ jobId, status: "queued" }`. On invalid input, it SHALL return HTTP 400 with an error message.

#### Scenario: Submit a valid alignment request
- **WHEN** a client sends POST /api/align with 2+ sequences and a valid algorithm
- **THEN** the server SHALL return HTTP 201 with a unique jobId and status "queued"

#### Scenario: Submit with fewer than two sequences
- **WHEN** a client sends POST /api/align with fewer than 2 sequences
- **THEN** the server SHALL return HTTP 400 with error "At least two sequences are required"

#### Scenario: Submit with invalid algorithm
- **WHEN** a client sends POST /api/align with an algorithm other than "mauveAligner" or "progressiveMauve"
- **THEN** the server SHALL return HTTP 400 with error "Invalid algorithm"

#### Scenario: Submit with invalid sequence format
- **WHEN** a client sends POST /api/align with a sequence format not in [fasta, genbank, embl, raw]
- **THEN** the server SHALL return HTTP 400 with the invalid format identified in the error

### Requirement: REST API for alignment job status
The server SHALL expose a `GET /api/align/:jobId/status` endpoint that returns the current job status object with `jobId`, `status` (one of queued, running, completed, failed, cancelled), optional `progress` text, and optional `error` message. If the job does not exist, it SHALL return HTTP 404.

#### Scenario: Query status of an existing job
- **WHEN** a client sends GET /api/align/:jobId/status for a valid jobId
- **THEN** the server SHALL return the current status object

#### Scenario: Query status of a non-existent job
- **WHEN** a client sends GET /api/align/:jobId/status for an unknown jobId
- **THEN** the server SHALL return HTTP 404 with error "Job not found"

### Requirement: REST API for alignment job cancellation
The server SHALL expose a `DELETE /api/align/:jobId` endpoint that cancels a queued or running job by sending SIGTERM to the child process (if running) and removing it from the queue (if queued). On success, it SHALL return HTTP 204. If the job cannot be cancelled (not found or already terminal), it SHALL return HTTP 409.

#### Scenario: Cancel a running job
- **WHEN** a client sends DELETE /api/align/:jobId for a running job
- **THEN** the server SHALL kill the process with SIGTERM, set job status to "cancelled", and return HTTP 204

#### Scenario: Cancel an already completed job
- **WHEN** a client sends DELETE /api/align/:jobId for a completed or failed job
- **THEN** the server SHALL return HTTP 409 with error "Job cannot be cancelled"

### Requirement: REST API for alignment result retrieval
The server SHALL expose a `GET /api/align/:jobId/result` endpoint that returns the XMFA alignment output as `text/plain` for completed jobs. If the job is not completed or does not exist, it SHALL return HTTP 404.

#### Scenario: Retrieve result of a completed job
- **WHEN** a client sends GET /api/align/:jobId/result for a completed job
- **THEN** the server SHALL return the XMFA content with Content-Type text/plain

#### Scenario: Retrieve result of an incomplete job
- **WHEN** a client sends GET /api/align/:jobId/result for a job that is not completed
- **THEN** the server SHALL return HTTP 404 with error "Result not available"

### Requirement: WebSocket progress streaming
The server SHALL expose a WebSocket endpoint at `GET /api/align/:jobId/progress` that streams real-time progress events to connected clients. Each event SHALL be a JSON object with `jobId`, `type` (one of progress, completed, failed, cancelled), and optional `message`. The connection SHALL close automatically when the job reaches a terminal state (completed, failed, cancelled). If the job does not exist, the server SHALL close the socket with code 4004.

#### Scenario: Receive progress events during alignment
- **WHEN** a client opens a WebSocket to /api/align/:jobId/progress for a running job
- **THEN** the server SHALL send JSON progress events as the alignment binary writes to stdout/stderr

#### Scenario: Connection closes on job completion
- **WHEN** a job completes while a WebSocket is connected
- **THEN** the server SHALL send a final event with type "completed" and close the connection with code 1000

#### Scenario: Connect to non-existent job
- **WHEN** a client opens a WebSocket to /api/align/:jobId/progress for an unknown jobId
- **THEN** the server SHALL close the socket with code 4004 and reason "Job not found"

### Requirement: Alignment job queue with concurrency control
The server SHALL maintain a job queue that limits the number of concurrently running alignment processes to a configurable maximum (`maxConcurrent`). Jobs submitted beyond the limit SHALL be queued with status "queued" and started in FIFO order as running jobs complete or are cancelled.

#### Scenario: Exceed concurrent job limit
- **WHEN** the server has `maxConcurrent` jobs running and a new job is submitted
- **THEN** the new job SHALL be queued with status "queued" and started when a running job finishes

#### Scenario: Queued job starts after cancellation
- **WHEN** a running job is cancelled and there are queued jobs waiting
- **THEN** the next queued job SHALL be started immediately

### Requirement: Input validation and path traversal prevention
The server SHALL validate all alignment request inputs: sequences MUST have non-empty `name`, `content`, and a valid `format`; algorithm MUST be one of the supported values. Sequence filenames written to disk SHALL be sanitized by replacing any character not in `[a-zA-Z0-9._-]` with underscore to prevent path traversal attacks.

#### Scenario: Sanitize sequence filename with path traversal attempt
- **WHEN** a sequence name contains path traversal characters (e.g., `../../etc/passwd`)
- **THEN** the system SHALL sanitize the name to `______etc_passwd` before writing to disk

#### Scenario: Reject sequence with missing fields
- **WHEN** a sequence in the request has an empty name or missing content
- **THEN** the server SHALL return HTTP 400 with an error identifying the missing field

### Requirement: Client-side alignment API
The client SHALL provide typed functions for interacting with the alignment server API: `submitAlignment()` for POST /api/align, `getAlignmentStatus()` for GET status, `cancelAlignment()` for DELETE cancel, `getAlignmentResult()` for GET result, and `subscribeToProgress()` for WebSocket progress streaming. All functions SHALL use `encodeURIComponent` on jobId path parameters. Error responses SHALL be parsed and thrown as Error objects with the server's error message.

#### Scenario: Submit alignment via client
- **WHEN** the client calls `submitAlignment()` with a valid request
- **THEN** it SHALL POST to /api/align and return the AlignmentJobCreated response

#### Scenario: Subscribe to progress events
- **WHEN** the client calls `subscribeToProgress()` with a jobId and callback
- **THEN** it SHALL open a WebSocket connection and invoke the callback for each parsed progress event, returning a cleanup function to close the connection

#### Scenario: Handle server error response
- **WHEN** any client API function receives a non-OK HTTP response with a JSON error body
- **THEN** it SHALL throw an Error with the server's error message extracted from the response body

### Requirement: Alignment parameter dialog
The system SHALL provide a modal dialog for configuring genome alignment parameters. The dialog SHALL be implemented as a native HTML `<dialog>` element opened via `showModal()`. It SHALL accept pre-loaded sequences and an `onConfirm` callback, and return a handle with `element` and `destroy()` for lifecycle control.

#### Scenario: Open alignment dialog
- **WHEN** the user triggers the alignment action
- **THEN** the system SHALL display a modal dialog titled "Align Sequences" with fields for algorithm selection, parameters, and sequence input

#### Scenario: Close dialog via Cancel button
- **WHEN** the user clicks the Cancel button
- **THEN** the dialog SHALL close and be removed from the DOM without invoking the confirm callback

#### Scenario: Close dialog via backdrop click
- **WHEN** the user clicks the dialog backdrop (outside the dialog content)
- **THEN** the dialog SHALL close and be removed from the DOM without invoking the confirm callback

#### Scenario: Close dialog via Escape key
- **WHEN** the user presses Escape while the dialog is open
- **THEN** the dialog SHALL close and be removed from the DOM without invoking the confirm callback

#### Scenario: Destroy dialog programmatically
- **WHEN** the caller invokes `destroy()` on the dialog handle
- **THEN** the dialog SHALL close (if open) and be removed from the DOM

### Requirement: Algorithm selection in dialog
The dialog SHALL provide a select control for choosing the alignment algorithm. The options SHALL be `progressiveMauve` (default) and `mauveAligner`. Selecting an algorithm SHALL show only the parameter fieldset relevant to that algorithm.

#### Scenario: Select mauveAligner algorithm
- **WHEN** the user selects "mauveAligner" from the algorithm dropdown
- **THEN** the dialog SHALL show the mauveAligner options (Extend LCBs) and hide the progressiveMauve options

#### Scenario: Select progressiveMauve algorithm
- **WHEN** the user selects "progressiveMauve" from the algorithm dropdown
- **THEN** the dialog SHALL show the progressiveMauve options (seed families, iterative refinement, sum-of-pairs scoring) and hide the mauveAligner options

### Requirement: Shared alignment parameter controls
The dialog SHALL provide controls for shared alignment parameters: seed weight mode (auto checkbox and numeric input, range 3–21), minimum LCB weight (text input accepting "default" or a positive integer), collinear genomes toggle (checkbox, unchecked by default), and full alignment toggle (checkbox, checked by default).

#### Scenario: Toggle custom seed weight
- **WHEN** the user unchecks "Default seed weight"
- **THEN** the dialog SHALL reveal a numeric input for seed weight with min 3, max 21

#### Scenario: Keep default seed weight
- **WHEN** the user leaves "Default seed weight" checked
- **THEN** the dialog SHALL hide the seed weight input and use `auto` in the result

#### Scenario: Set custom min LCB weight
- **WHEN** the user enters a numeric value in the min LCB weight field
- **THEN** the result params SHALL include the parsed integer as `minLcbWeight`

#### Scenario: Leave default min LCB weight
- **WHEN** the user leaves the min LCB weight field as "default" or empty
- **THEN** the result params SHALL omit `minLcbWeight` (undefined)

### Requirement: Algorithm-specific parameter controls
The dialog SHALL provide algorithm-specific checkboxes. For mauveAligner: "Extend LCBs" (checked by default). For progressiveMauve: "Use seed families" (unchecked by default), "Iterative refinement" (checked by default), "Sum-of-pairs LCB scoring" (checked by default).

#### Scenario: Configure mauveAligner options
- **WHEN** the user selects mauveAligner and modifies the "Extend LCBs" checkbox
- **THEN** the result params SHALL reflect the checkbox state in `extendLcbs`

#### Scenario: Configure progressiveMauve options
- **WHEN** the user selects progressiveMauve and modifies seed families, iterative refinement, or sum-of-pairs checkboxes
- **THEN** the result params SHALL reflect each checkbox state in `seedFamilies`, `iterativeRefinement`, and `sumOfPairsScoring`

### Requirement: Sequence input management
The dialog SHALL display pre-loaded sequences in a list showing name, format selector, and a remove button for each. Users SHALL be able to add sequences via drag-and-drop or file browser (click on drop zone). Supported file extensions SHALL be detected to set format: `.gbk`/`.gb`/`.genbank` → genbank, `.embl` → embl, `.fasta`/`.fa`/`.fna`/`.fas` → fasta; unknown extensions default to fasta. Each sequence's format SHALL be individually overridable via a select control.

#### Scenario: Display pre-loaded sequences
- **WHEN** the dialog opens with pre-loaded sequences
- **THEN** each sequence SHALL appear in the list with its name, detected format, and a remove button

#### Scenario: Add sequences via drag-and-drop
- **WHEN** the user drops files onto the drop zone
- **THEN** the dialog SHALL read each file, detect its format from extension, and add it to the sequence list

#### Scenario: Add sequences via file browser
- **WHEN** the user clicks the drop zone and selects files
- **THEN** the dialog SHALL read each file, detect its format from extension, and add it to the sequence list

#### Scenario: Remove a sequence
- **WHEN** the user clicks the remove button on a sequence
- **THEN** the sequence SHALL be removed from the list and the count updated

#### Scenario: Override sequence format
- **WHEN** the user changes the format selector for a sequence
- **THEN** the sequence's format SHALL be updated in the internal state

#### Scenario: Detect GenBank format from extension
- **WHEN** a file named "genome.gbk" is added
- **THEN** the format SHALL be set to "genbank"

### Requirement: Submit validation
The dialog submit button SHALL be disabled when fewer than 2 sequences are loaded. Clicking submit with 2 or more sequences SHALL invoke the `onConfirm` callback with an `AlignmentDialogResult` containing the configured sequences and parameters, then close the dialog.

#### Scenario: Submit disabled with fewer than 2 sequences
- **WHEN** fewer than 2 sequences are loaded
- **THEN** the Align button SHALL be disabled

#### Scenario: Submit enabled with 2+ sequences
- **WHEN** 2 or more sequences are loaded
- **THEN** the Align button SHALL be enabled

#### Scenario: Confirm alignment
- **WHEN** the user clicks Align with 2+ sequences loaded
- **THEN** the dialog SHALL invoke `onConfirm` with the structured result and close

