---
name: formatting
description: Let a formatter lay out code. Agents write code, then run format and format:check.
type: reference
area: guide-lines
---

# Formatting

Start with [AGENTS.md](../../AGENTS.md). Read this note for every task that writes or changes code, config or Markdown.

**Owner rule. It applies to every agent and subagent, from every provider.**

## The rule

1. Do not spend effort or tokens on carefully formatted code.
2. Do not hand-align, hand-indent or hand-wrap code beyond what the language requires.
3. Write the code first. Then run `format`. The formatter sets the layout.
4. Every application installs and configures a formatter. It has two commands: `format` rewrites files, and `format:check` fails when a file is not formatted.
5. The `check` gate includes `format:check`. Where indentation is syntax (Python blocks, YAML, Makefile tabs, Markdown code fences, shell heredocs), write valid indentation. The formatter still runs afterwards.

## Formatter per file type

| Language or file type                   | Formatter                                      | Config file                             | `format`                            | `format:check`                        |
| --------------------------------------- | ---------------------------------------------- | --------------------------------------- | ----------------------------------- | ------------------------------------- |
| JS, TS, JSON, CSS, HTML, Markdown, YAML | Prettier                                       | `.prettierrc.json`, `.prettierignore`   | `pnpm format`                       | `pnpm format:check`                   |
| Python                                  | Ruff (`ruff format`)                           | `pyproject.toml`, section `[tool.ruff]` | `make format`                       | `make format-check`                   |
| Shell                                   | shfmt                                          | `.editorconfig` (shfmt reads it)        | `make format` (runs `shfmt -w`)     | `make format-check` (runs `shfmt -d`) |
| SQL (PostgreSQL)                        | sqlfluff (dialect `postgres`)                  | `.sqlfluff`                             | `sqlfluff fix --dialect postgres .` | `sqlfluff lint --dialect postgres .`  |
| Go                                      | gofmt                                          | None                                    | `gofmt -w .`                        | `test -z "$(gofmt -l .)"`             |
| Rust                                    | rustfmt                                        | `rustfmt.toml` (optional)               | `cargo fmt`                         | `cargo fmt --check`                   |
| Dockerfile, Compose                     | No formatter. Keep the layout of the template. | None                                    | None                                | None                                  |

## Agent workflow

1. Write the code.
2. Run `format` for the file type.
3. Run the rest of the checks. Run `format:check` inside the gate.

Rules for this workflow:

- Never fix a `format:check` failure by hand. Run `format`.
- Do not put format-only changes in a separate task unless a task needs them.
- A formatting diff in files you did not change means the formatter config is wrong. Report it. Do not hand-edit those files.

## Style standard

The style follows Robert C. Martin, _Clean Code_, chapter 5 "Formatting". Its points:

- (a) One single formatting style for the whole team. The tool enforces it.
- (b) No horizontal alignment of declarations or values.
- (c) Short lines. Hard ceiling 120 characters. Project limit 100.
- (d) Newspaper metaphor: a file reads top down, from high level to detail. Callers sit above callees.
- (e) Vertical openness: one blank line between distinct concepts.
- (f) Vertical density: related lines stay together, with no blank line.
- (g) Vertical distance: declare a name near its first use. Keep related code close.
- (h) Small files.

The formatters enforce (a) to (c) and the layout. The agent follows (d) to (h) while it writes.
Indentation width 2 is the owner and project choice. It is not a quote from the book.

## This repository

Subharness uses its own formatter: `bash scripts/format.sh write` rewrites the files, and `bash scripts/format.sh check` fails on any file that would change. The `check-all` gate runs `check` as the `format` step.

The script runs Ruff for Python, shfmt for shell, and Prettier for JSON, YAML, JS and Markdown. Each tool resolves in this order, and the script prints the source it used (for example `format: ruff 0.17.5 (cache)`):

1. A binary in `PATH` whose version equals the pinned version. A wrong version is skipped with a warning.
2. A pinned install in `${XDG_CACHE_HOME:-$HOME/.cache}/lvgs-format/<tool>-<version>/`, created on first use: a Python venv for Ruff, `npm install` (or the registry tarball) for Prettier, an official Node tarball when `node` is missing, and the release binary for shfmt (x86_64 Linux only, checked against a pinned sha256 and refused on mismatch). If venv or pip is missing, Ruff comes from its checksum-verified release tarball. The cache has mode 700, sits outside the repository, is filled by an atomic rename, and is never deleted by the script.
3. The pinned Docker image, with one CPU and 1 GB of memory. This is the last resort.

A CI runner needs no Docker and no node. It needs only `bash`, `python3`, `curl` and `tar` on a x86_64 Linux host. When `node` (version 20 or newer) is missing from `PATH`, the script installs the official Node v24.22.3 into `<cache>/node-v24.22.3/` from nodejs.org, checked against a pinned sha256 and refused on mismatch, and prints `format: node v24.22.3 (cache)`. `npm install` is used only when both `node` and `npm` are in `PATH`. Otherwise Prettier comes from the registry tarball `prettier-3.10.1.tgz`, checked against the pinned sha512 integrity value, refused on mismatch, and run as `<node> <cache>/prettier-3.10.1/package/bin/prettier.cjs`. If no path works, the script exits with a one-line error.

`.editorconfig` and `.prettierrc.json` are the shared style. Every project gets the same two files from the baseline. The sync replaces them wholesale and never merges them.

## Application setup

1. Add the formatter as a dev dependency. Use `pnpm add -D prettier` for node, or add `ruff` to the dev extras for Python.
2. Commit the formatter config file.
3. Add the `format` and `format:check` commands. Use pnpm scripts or Makefile targets.
4. Add `format:check` to `check`, and run it in CI.
5. Optional: a pre-commit hook runs `format` on the staged files only.

Static site (the site brings its own `package.json`). Scaffolding prints these steps. Add the scripts:

```json
"scripts": {
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

## Rules for agents

1. Run `format` after you write or change a file.
2. Do not hand-align, hand-indent or hand-wrap code beyond the language syntax.
3. Never fix a `format:check` failure by hand. Run `format`.
4. Run `format:check` in the `check` gate before you report done. Quote its result.
5. Use the formatter from the table for the file type. Do not add a second formatter for the same type.
6. Do not make a separate task or commit for format-only changes unless a task needs them.
7. Report a formatting diff in files you did not change as a formatter config problem.
8. Keep indentation that the syntax needs: Python blocks, YAML, Makefile tabs, Markdown code fences and shell heredocs.

## Related

- [Agent practices](agent-practices.md): Required rules for how agents write, verify and review code.
- [Practices index](index.md): Select the other development rules.
- [Documentation rules](documentation.md): Format and validate notes.
