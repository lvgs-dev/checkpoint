---
name: documentation
description: Format and validate project documentation and agent guidance.
type: reference
area: guide-lines
---

# Documentation rules

Start with [AGENTS.md](../../AGENTS.md). Use these rules when creating or reconciling project notes.

- Keep notes under the locations allowed by `AGENTS.md`.
- Give new reference notes `name`, `description`, `type`, and `area` frontmatter.
- Use `hub`, `reference`, `how-to`, `explanation`, or `decision` for the note type.
- Keep each note focused on one question. Link it from the relevant index.
- Write in the file language that `AGENTS.md` sets. Use short active sentences and concrete source paths.
- Describe current code separately from required practices and proposed improvements.
- Use relative Markdown links for navigation. Existing wikilinks must resolve to repository files.
- State when to read a linked document. Permit multiple relevant submodules.
- End reference notes with related documents and their purpose.
- Preserve rule meaning when translating existing practice guides.
- Validate local links, source paths, and instruction routing after changes.
- Use an existing documentation validator when available. Otherwise, inspect those checks directly.
- Follow the verification gate in `AGENTS.md` before completion.

## Related

- [Practices index](index.md): Select area-specific development rules.
- [Decision template](../decisions/0000-template.md): Record what changes and why.
