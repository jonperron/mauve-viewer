---
description: "Use when writing or modifying OpenAPI specifications. Covers structure, naming, versioning, and documentation conventions for REST API definitions."
applyTo: ["**/*openapi*.yaml", "server/**/routes.ts"]
---
# OpenAPI Specification

- Use OpenAPI 3.0.3 format
- Single source of truth for all REST API endpoints
- Keep in `server/openapi.yaml`

# Structure

- Group endpoints by tag matching feature domains
- Use `$ref` for shared schemas — define once in `components/schemas`
- No inline schema duplication across endpoints

# Naming

- Use kebab-case for URL paths: `/api/align/{jobId}/status`
- Use camelCase for schema properties: `jobId`, `seedWeight`
- Use PascalCase for schema names: `AlignmentRequest`, `JobStatusResponse`

# Schemas

- Mark required fields explicitly
- Use `readOnly` / `writeOnly` where applicable
- Prefer `enum` for fixed value sets (algorithms, formats, statuses)
- Include `example` values for non-trivial fields
- Use `format` for well-known types: `uuid`, `date-time`, `uri`

# Responses

- Document all possible status codes per endpoint
- Include error response schema with `error` string field
- Use `4xx` for client errors, `5xx` for server errors

# Documentation

- Every endpoint must have `summary` (short) and `description` (detailed)
- Every parameter must have `description`
- Every schema property must have `description`
- Use `tags` to group endpoints by feature area

# Versioning

- No version prefix in URL paths — use header-based versioning if needed

# Validation

- Ensure spec matches actual route implementations in `server/alignment/routes.ts`
- Keep spec and TypeScript types in sync — generate types from spec or vice versa
