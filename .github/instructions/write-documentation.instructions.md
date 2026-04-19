---
description: "Use when writing or updating product documentation in doc/. Covers structure, audience, tone, formatting, and content guidelines for end-user and developer documentation."
---
# Documentation Purpose

- Product documentation lives in `doc/`
- Target audience: bioinformaticians and developers using Mauve Viewer
- Goal: explain what the tool does, how to use it, and how to extend it
- Specs (`openspec/specs/`) describe intent; docs describe usage and behavior

# Structure

- One markdown file per major topic (e.g., `getting-started.md`, `file-formats.md`, `viewer.md`)
- Each file starts with a single `#` title, followed by a brief summary paragraph
- Use a flat structure in `doc/` — avoid nested folders unless a topic has multiple sub-pages

# Tone and Style

- Keep your language simple and understandable
- Clear, concise, direct — no filler or marketing language
- Present tense, active voice
- Second person ("you") for instructions, third person for describing behavior
- No emojis
- Spell out acronyms on first use (e.g., "Locally Collinear Block (LCB)")

# Formatting

- Use markdown formatting
- Use tables for structured comparisons (formats, options, parameters)
- Use ordered lists for step-by-step instructions
- Use unordered lists for feature enumerations
- Link to other doc pages with relative paths: `[File Formats](file-formats.md)`

# Content Guidelines

- Only mention what the user can do, not how the code works internally
- Use screenshots frequently, and annotate them when necessary to clarify UI elements
- Document supported file formats with brief descriptions and limitations
- Document keyboard shortcuts and UI interactions
- Keep API documentation close to the code (TSDoc); doc/ is for user-facing guides
- When a feature has caveats or known limitations, state them explicitly

# Maintenance

- Update docs when adding, changing, or removing user-facing features
- Remove references to features that no longer exist
- Keep the table of contents in `doc/README.md` current
