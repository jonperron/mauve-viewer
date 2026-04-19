## 1. Server-side alignment types

- [x] Define shared types: AlignmentAlgorithm, AlignmentParams, AlignmentRequest, AlignmentJobStatus, etc.
- [x] Define server-specific types: AlignmentJobStatusResponse, AlignmentProgressEvent

## 2. Command builder

- [x] Implement buildCommand() dispatching to mauveAligner or progressiveMauve builder
- [x] Implement mauveAligner command construction with all parameter flags
- [x] Implement progressiveMauve command construction with all parameter flags
- [x] Add unit tests for command builder

## 3. Job manager

- [x] Implement JobManager class with submit, getStatus, cancel, getResult, cleanup
- [x] Implement concurrency-limited queue (FIFO)
- [x] Implement progress broadcasting to listeners
- [x] Implement filename sanitization for path traversal prevention
- [x] Inject I/O for testability (spawn, mkdir, writeFile, readFile, rm)
- [x] Add unit tests for job manager

## 4. REST API routes

- [x] Implement POST /api/align with input validation
- [x] Implement GET /api/align/:jobId/status
- [x] Implement DELETE /api/align/:jobId
- [x] Implement GET /api/align/:jobId/result
- [x] Add unit tests for routes

## 5. WebSocket progress endpoint

- [x] Register GET /api/align/:jobId/progress as WebSocket endpoint
- [x] Stream progress events as JSON to connected clients
- [x] Auto-close on terminal job states
- [x] Handle unknown jobId with close code 4004
- [x] Add unit tests for WebSocket endpoint

## 6. Server integration

- [x] Register alignment routes in server/app.ts conditionally
- [x] Register @fastify/websocket plugin
- [x] Add @fastify/websocket dependency

## 7. Client-side alignment API

- [x] Define client-side types (mirroring server types)
- [x] Implement submitAlignment(), getAlignmentStatus(), cancelAlignment(), getAlignmentResult()
- [x] Implement subscribeToProgress() with WebSocket
- [x] Export all functions and types from src/alignment/index.ts
- [x] Add unit tests for API client
