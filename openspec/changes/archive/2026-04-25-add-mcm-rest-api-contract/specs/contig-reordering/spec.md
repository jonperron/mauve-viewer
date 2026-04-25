## ADDED Requirements

### Requirement: REST reorder job submission endpoint
The system SHALL expose `POST /api/reorder` to submit a contig reordering job.

The request body MUST match `ReorderRequest` with:
- `reference` (required): `ReorderSequenceInput` containing `name`, `content`, `format` where `format` MUST be `fasta` or `genbank`
- `draft` (required): `ReorderSequenceInput` containing `name`, `content`, `format` where `format` MUST be `fasta` or `genbank`
- `maxIterations` (optional): integer maximum iteration count

On success, the response MUST match `ReorderJobCreated` with:
- `jobId`: string
- `status`: one of `queued`, `running`, `completed`, `failed`, `cancelled`

#### Scenario: Submit reorder job with iteration limit
- **WHEN** a client posts valid `reference`, `draft`, and `maxIterations` to `POST /api/reorder`
- **THEN** the system SHALL create a reorder job and return `ReorderJobCreated` containing a `jobId` and lifecycle `status`

### Requirement: REST reorder job status endpoint
The system SHALL expose `GET /api/reorder/:jobId/status` to retrieve current job state.

On success, the response MUST match `ReorderJobStatusResponse` with:
- `jobId`: string
- `status`: one of `queued`, `running`, `completed`, `failed`, `cancelled`
- `iteration` (optional): current iteration number
- `maxIterations` (optional): configured iteration limit
- `error` (optional): error detail when status is `failed`

#### Scenario: Poll running job status
- **WHEN** a client requests `GET /api/reorder/:jobId/status` for a running job
- **THEN** the system SHALL return `ReorderJobStatusResponse` with `status` = `running` and include iteration progress metadata when available

### Requirement: REST reorder result endpoint
The system SHALL expose `GET /api/reorder/:jobId/result` to retrieve parsed reorder output for a completed job.

On success, the response MUST match `ReorderResult` with:
- `orderedContigs`: array of `ReorderContigEntry`
- `reversedContigs`: string array
- `conflictingContigs`: string array
- `iterationsPerformed`: integer
- `converged`: boolean

Each `ReorderContigEntry` MUST include:
- `name`: string
- `start`: number
- `end`: number
- `reversed`: boolean
- `conflicting`: boolean

#### Scenario: Retrieve completed reorder result
- **WHEN** a client requests `GET /api/reorder/:jobId/result` for a completed job
- **THEN** the system SHALL return a `ReorderResult` payload containing ordered contig entries, reverse/conflict lists, and convergence metadata

### Requirement: REST reorder cancellation endpoint
The system SHALL expose `DELETE /api/reorder/:jobId` to cancel a running reorder job.

A successful cancellation request MUST return a successful HTTP response with no JSON body requirement.

#### Scenario: Cancel running reorder job
- **WHEN** a client requests `DELETE /api/reorder/:jobId` for a running job
- **THEN** the system SHALL stop further processing and return a successful cancellation response

### Requirement: Client error propagation for reorder API calls
If any reorder API endpoint returns a non-success HTTP status with a JSON body containing `error` as a string, the client-facing contract MUST propagate that message as the operation error.

If the error body is absent or does not contain a string `error`, the client-facing contract MUST produce an operation-specific fallback error message.

#### Scenario: Endpoint returns structured error
- **WHEN** a reorder endpoint responds with non-success status and body `{ "error": "Job not found" }`
- **THEN** the operation SHALL report `Job not found` as the error message
