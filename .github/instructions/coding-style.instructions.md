---
description: "Use when writing or modifying TypeScript code. Covers file organization, immutability, naming, error handling, and input validation conventions."
applyTo: "**/*.ts"
---
# Code Organization

- Many small files over few large files
- High cohesion, low coupling
- 200-400 lines typical, 800 max per file
- Organize by feature/domain, not by type

# Code Style

- No emojis in code, comments, or documentation
- Immutability always — never mutate objects or arrays
- No `console.log` in production code
- Proper error handling with try/catch
- Input validation with Zod or similar
