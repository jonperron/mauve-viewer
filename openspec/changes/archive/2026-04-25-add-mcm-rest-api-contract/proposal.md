## Why

The contig reordering feature now includes a TypeScript REST API client for Mauve Contig Mover (MCM) job submission, status polling, result retrieval, and cancellation. The current contig reordering specification documents algorithmic behavior, file outputs, and GUI/CLI workflows but does not define the web API contract consumed by the client.

Without a normative API contract in OpenSpec, endpoint paths, request/response payload shapes, and lifecycle states can drift between client and server implementations.

## What Changes

- Add API contract requirements to the existing `contig-reordering` capability.
- Specify the four REST endpoints used by the MCM client:
  - `POST /api/reorder`
  - `GET /api/reorder/:jobId/status`
  - `GET /api/reorder/:jobId/result`
  - `DELETE /api/reorder/:jobId`
- Define normative request/response schemas and status enum values.
- Document behavior for iteration progress metadata and parsed reorder results.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `contig-reordering` — add REST API client contract requirements and response schemas.

## Impact

- Specs affected: `openspec/specs/contig-reordering/spec.md`
- No breaking changes to implementation behavior; this is a specification synchronization update.
- Improves consistency between `src/contig-reorder/api-client.ts`, `src/contig-reorder/types.ts`, and server API expectations.
