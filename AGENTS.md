# Mauve Viewer

Mauve Viewer is a modern web-based reimplementation of the Mauve genome alignment visualization platform. It provides interactive visualization and analysis of multi-genome alignments, including rearrangement detection, sequence navigation, annotation display, and export capabilities.

The original Mauve is a Java Swing desktop application. This project rebuilds it as a web application while preserving the full feature set described in the [specifications](openspec/specs/).

## Specifications

Feature specifications live in `openspec/specs/`. Each subfolder contains a `spec.md` describing a functional area:

Always read the relevant spec before implementing or modifying a feature.

## Tech Stack

- Node.js 24
- Vite for bundling and development server
- Vitest for testing

## Coding Rules

Coding rules are defined in `.github/instructions/` and loaded automatically by file pattern or on-demand:

- [coding-style.instructions.md](.github/instructions/coding-style.instructions.md) — File organization, immutability, error handling (applied to `**/*.ts`)
- [testing.instructions.md](.github/instructions/testing.instructions.md) — TDD workflow, coverage targets (applied to test files)
- [security.instructions.md](.github/instructions/security.instructions.md) — Secrets, input validation, CSRF (loaded on-demand)
- [compare-with-legacy.instructions.md](.github/instructions/compare-with-legacy.instructions.md) - Feature comparison with legacy (applied to `**/*.ts`)
- [commit-messages.instructions.md](.github/instructions/commit-messages.instructions.md) - Commit message instruction (loaded on-demand)
- [write-documentation.instructions.md](.github/instructions/write-documentation.instructions.md) - Product documentation guidelines for `doc/` (loaded on-demand)


## Subagents

When completing a task, delegate to subagents for quality assurance:

- **Review** — Use the review agent (`.github/agents/typescript-reviewer.agent.md`) to validate changes against specs and project conventions before finishing
- **Linter** — Use the linter agent (`.github/agents/linter.agent.md`) to check code style and catch issues
- **Test** — Use the test agent (`.github/agents/test.agent.md`) to verify that changes are covered by tests and tests pass
- **Security** — Use the security agent (`.github/agents/security.agent.md`) to check for vulnerabilities when handling user input, file parsing, or external data
- **OpenSpec** — Use the openspec agent (`.github/agents/openspec.agent.md`) to update specifications after implementing or modifying features
- **Documentation** — Use the documentation agent (`.github/agents/documentation.agent.md`) to review product documentation in `doc/` for accuracy, completeness, and adherence to guidelines

Specifications must always be up to date at the end of any task that adds, changes, or removes functionality. After completing implementation work, run the OpenSpec subagent to synchronize `openspec/specs/` with the current state of the code.
