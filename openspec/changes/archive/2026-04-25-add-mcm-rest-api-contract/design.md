## Context

The MCM client module in `src/contig-reorder/api-client.ts` now provides typed functions for reorder job lifecycle operations:
- `submitReorder()` for job submission
- `getReorderStatus()` for status polling
- `getReorderResult()` for final parsed result retrieval
- `cancelReorder()` for cancellation

The corresponding data contracts are defined in `src/contig-reorder/types.ts`. The base spec currently covers iterative algorithm behavior and desktop-like workflows, but not the web API boundary consumed by the client.

## Goals

- Define a normative REST contract for MCM reorder operations.
- Keep the contract aligned with the existing client TypeScript interfaces.
- Cover endpoint paths, request payloads, response payloads, and status lifecycle values.

## Non-Goals

- Redesigning server endpoint paths.
- Defining transport-level concerns beyond current JSON request/response semantics.
- Replacing algorithmic requirements already documented in the contig reordering spec.

## Decisions

### D1: Extend existing `contig-reordering` capability
Rather than creating a new capability, add API contract requirements to the existing contig reordering capability so algorithm, workflow, and API contracts remain in one place.

### D2: Specify endpoint contract by operation
Define separate requirements for submit, status, result, and cancel operations so each endpoint has clear normative behavior and scenario coverage.

### D3: Define explicit schema fields and enum states
Use the exact field names from `types.ts` (`ReorderRequest`, `ReorderJobCreated`, `ReorderJobStatusResponse`, `ReorderResult`, `ReorderContigEntry`) and job status values (`queued`, `running`, `completed`, `failed`, `cancelled`) to prevent ambiguity.

### D4: Document iterative metadata in status/result payloads
Status responses include optional `iteration` and `maxIterations` for running jobs; result responses include `iterationsPerformed` and `converged` to expose termination behavior.

## Risks / Trade-offs

- **Risk:** Future server response changes could desynchronize from this contract.
  - **Mitigation:** Keep this spec synchronized whenever `src/contig-reorder/types.ts` changes.
- **Trade-off:** More detailed schema requirements increase spec maintenance cost.
  - **Benefit:** Stronger client/server compatibility and testability.
