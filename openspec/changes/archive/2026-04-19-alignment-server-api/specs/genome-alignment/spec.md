## MODIFIED Requirements

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

## ADDED Requirements

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
