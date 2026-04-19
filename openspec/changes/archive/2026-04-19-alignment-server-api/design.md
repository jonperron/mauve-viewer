## Context

Mauve Viewer is a web reimplementation of the Java Swing Mauve desktop application. Genome alignment requires executing native binaries (mauveAligner, progressiveMauve) which cannot run in the browser. The existing Fastify server is extended with alignment-specific endpoints.

## Goals

- Provide a complete REST API for alignment job lifecycle management
- Stream real-time progress via WebSocket during alignment execution
- Translate typed alignment parameters to CLI arguments matching legacy Java behavior
- Ensure secure handling of user-supplied filenames and inputs
- Provide a typed client-side API module for frontend consumption

## Non-Goals

- Alignment UI dialogs (separate feature)
- Binary distribution or installation of mauveAligner/progressiveMauve
- Authentication or multi-user job isolation
- Persistent job storage across server restarts

## Decisions

### D1: Fastify with WebSocket plugin
The server uses Fastify with `@fastify/websocket` for HTTP and WebSocket on the same port. Alignment routes are registered conditionally when alignment config is provided.

### D2: Job Manager with injected I/O
`JobManager` accepts injected I/O functions (`spawn`, `mkdir`, `writeFile`, `readFile`, `rm`) for testability. Jobs are stored in-memory with a FIFO queue for concurrency control.

### D3: Command builder mirrors legacy Java
`buildCommand()` produces CLI argument arrays matching the legacy `MauveAlignFrame.makeAlignerCommand()` and `ProgressiveMauveAlignFrame.makeAlignerCommand()` methods. Each algorithm has a dedicated builder function.

### D4: Filename sanitization
Sequence filenames are sanitized by replacing non-alphanumeric characters (except `.`, `-`, `_`) with underscores to prevent path traversal.

### D5: Client module with encodeURIComponent
All client API functions encode jobId in URL paths via `encodeURIComponent`. WebSocket URL is derived from the HTTP base URL by replacing the scheme.

## Risks

- **Binary availability**: The alignment binaries must be pre-installed and accessible on the server. No auto-detection or download is implemented.
- **In-memory state**: Job state is lost on server restart. Acceptable for the current scope; persistent storage can be added later.
