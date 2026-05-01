## Context

Feature tooltips in the viewer panel show GenBank/GFF annotation qualifiers. The `db_xref` qualifier holds references like `GeneID:944742; UniProtKB:P12345` pointing to entries in external biological databases. Previously these were rendered as plain text.

## Goals

- Resolve known `Database:ID` tokens to hyperlinks in feature detail tooltips.
- Support the six most common biological databases encountered in GenBank/GFF annotations.
- Prevent open-redirect attacks by URL-encoding identifiers and using an allowlist of database prefixes.

## Non-Goals

- Supporting every possible `db_xref` database — unrecognised prefixes are silently ignored.
- Fetching or validating that the external resource exists at the resolved URL.

## Decisions

| Decision | Rationale |
|---|---|
| Allowlist of supported databases | Prevents arbitrary URL injection via crafted `db_xref` values |
| `encodeURIComponent` for all IDs | Prevents path-traversal or query-injection in constructed URLs |
| KEGG regex validation (`/^[a-zA-Z0-9][a-zA-Z0-9_-]*:[a-zA-Z0-9][a-zA-Z0-9_-]*$/`) | KEGG URLs use the raw ID in the query string; format must be validated |
| `target="_blank" rel="noopener noreferrer"` | Standard security practice for external links |
| Suppress raw `db_xref` from generic qualifiers | Avoids duplicate / redundant display |

## Risks

- External database URLs may change over time — links can silently go stale.
