## Purpose

Defines the Mauve Contig Mover (MCM) which reorders draft genome contigs relative to a reference genome through an iterative alignment-and-reorder process, with GUI and command-line interfaces.
## Requirements
### Requirement: Iterative contig reordering
The Mauve Contig Mover (MCM) SHALL reorder draft genome contigs relative to a reference genome through an iterative process. The system aligns draft against reference using progressiveMauve, reorders contigs based on the alignment, and repeats until the order converges or a maximum of 15 iterations is reached.

#### Scenario: Reorder draft contigs via GUI
- **WHEN** user selects Tools → Order Contigs, specifies an output directory, provides a reference genome and a draft genome
- **THEN** system iteratively aligns and reorders contigs, producing alignment output in numbered subdirectories (alignment1/, alignment2/, ...) until the order stabilizes

#### Scenario: Convergence detection
- **WHEN** a contig ordering repeats a previously seen arrangement
- **THEN** system terminates the iterative process and reports completion

#### Scenario: Maximum iterations reached
- **WHEN** the ordering process reaches 15 iterations without convergence
- **THEN** system terminates and uses the last ordering as the final result

### Requirement: Two-sequence input constraint
The MCM SHALL accept exactly two sequences: the reference genome (first) and the draft genome (second). Only the second genome is reordered.

#### Scenario: Valid input
- **WHEN** user provides exactly one reference and one draft genome
- **THEN** system proceeds with reordering

### Requirement: Draft format constraint
The draft genome SHALL be provided in FASTA or GenBank format. If GenBank format is used, each contig SHALL have a unique identifier in the LOCUS tag.

#### Scenario: GenBank draft input
- **WHEN** user provides a GenBank file as draft with unique LOCUS tags per contig
- **THEN** system preserves and adjusts annotation coordinates through reordering

### Requirement: Contig grouping
The system SHALL group contigs based on proximity in the reference (max distance = 50 positions) and minimum length ratio (0.01), detecting inversions and ordering conflicts.

#### Scenario: Group adjacent contigs
- **WHEN** multiple contigs align to proximate regions of the reference
- **THEN** system groups them into a ContigGroup and orders them together

### Requirement: Output file generation
For each iteration, the system SHALL produce: standard Mauve alignment files, a contig ordering tab file (*_contigs.tab) with three sections (contigs to reverse, ordered contigs, contigs with conflicting order information), and if GenBank input, a features tab file (*_features.tab) with adjusted annotations.

#### Scenario: Generate contig tab file
- **WHEN** an iteration of reordering completes
- **THEN** system produces a *_contigs.tab file listing reversed contigs, ordered contigs with pseudocoordinates, and contigs with conflicting placement

#### Scenario: Preserve GenBank annotations
- **WHEN** draft genome was input as GenBank
- **THEN** system outputs a *_features.tab file with adjusted orientation and coordinates for each annotation

### Requirement: Command-line operation
The MCM SHALL support batch command-line operation via `java -cp Mauve.jar org.gel.mauve.contigs.ContigOrderer -output <dir> -ref <reference> -draft <draft>`.

#### Scenario: CLI contig reordering
- **WHEN** user runs the ContigOrderer from the command line with -output, -ref, and -draft arguments
- **THEN** system performs the full iterative reordering without GUI interaction

### Requirement: Cancellation support
The MCM SHALL allow cancellation at any point. If cancelled after the first iteration, intermediate reordered FASTA is available in the corresponding output directory.

#### Scenario: Cancel mid-process
- **WHEN** user cancels the reordering process after two iterations
- **THEN** system stops, and alignment1/ and alignment2/ contain usable results

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

