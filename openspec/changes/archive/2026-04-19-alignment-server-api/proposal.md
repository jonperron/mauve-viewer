## Why

The web-based Mauve Viewer needs to execute genome alignments server-side, since the mauveAligner and progressiveMauve native binaries cannot run in the browser. A REST API with WebSocket progress streaming is required to submit, monitor, cancel, and retrieve alignment jobs.

## What Changes

- **New**: REST API endpoints for alignment job lifecycle (submit, status, cancel, result)
- **New**: WebSocket endpoint for real-time alignment progress streaming
- **New**: Server-side job queue with configurable max concurrency
- **New**: Command builder that translates alignment parameters into CLI arguments for mauveAligner and progressiveMauve binaries
- **New**: Client-side API module (`src/alignment/`) with typed functions for all endpoints
- **New**: Input validation (sequences, algorithm, format) and path traversal prevention

## Capabilities

### New Capabilities

_(none — this extends the existing genome-alignment capability)_

### Modified Capabilities

- `genome-alignment` — Adds server API requirements: REST endpoints, WebSocket progress, job queue management, command-line construction, input validation, and client-side API

## Impact

- **Server**: New routes registered in `server/app.ts`; depends on `@fastify/websocket`
- **Client**: New `src/alignment/` module exports typed API client functions
- **Dependencies**: `@fastify/websocket` added to server dependencies
- **APIs**: New endpoints under `/api/align`
