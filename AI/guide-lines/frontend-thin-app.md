---
name: frontend-thin-app
description: Keep React screens as library compositions and check remaining application markup and CSS.
type: how-to
area: guide-lines
---

# Thin React applications

Read this guide for every task that writes or changes React screens.
An app screen composes components from `@lvgs-dev/ui` (lvgs/ui).
The library owns all HTML layout and CSS.

## Compose through the library

- Use library components for every screen element.
- Write no raw layout HTML in the app.
  This includes `div`, `span`, `section`, `main`, `header`, `nav`, `strong`, `em`, `p`, `a`, `ul` and `table`.
- Add no app CSS file.
- Use no `className` for layout and no inline `style=`.
- Import CSS only once for the library stylesheet or tokens.
- Get spacing, colour, size and tone only from library props and tokens.
- Let library components own loading, disabled, scroll and wrap behaviour.

A page uses the library page component with cards.
Conceptual example: `<LvgsPage>` with cards, never `<main className="page">`.
`LvgsPage` is a sketch name here.
It does not claim that the library exports that component today.

## Behaviour the library owns

- **One colour theme, chosen once.** The app picks its colour theme and its light or dark mode in a single config file, `lvgs.config.ts`, with `defineLvgsConfig`. The theme applies to the whole app from the document root. No component, page or subtree takes its own theme, and no component accepts a colour, a palette or a theme prop. The app never writes the theme attribute itself.
- **Tables never scroll horizontally.** Cells wrap, rows stack in narrow containers, and the app never wraps a table in a scroll container. See [UI design standard](ui-design-standard.md).
- **A new screen opens at the top.** Use the library screen-change hook with a key that is the identity of the screen, never the whole URL. Filters, pagination, tabs and controls of the same screen do not scroll.
- **Loading is a skeleton or an animation, never a word.** See [frontend data and loading](frontend-data-and-loading.md#loading-checks).

## Close a library gap first

1. Check the library API for the required behaviour.
2. Open a task in `lvgs-ui` if the library lacks it.
3. Add the capability there through a closed visual prop.
   Offer named choices rather than arbitrary CSS values.
4. Ship a new library version.
5. Adopt that version and compose the screen through its components.
6. Run the checker and visual audit below.

Do not add an app wrapper or CSS while waiting for the library.
This rule covers page containers, shells, top navigation and grid minimum sizes.
It also covers text emphasis, tone, loading, disabled states, scrolling and wrapping.
It covers gaps between icons and labels too.
If the library approach is truly impossible, stop and ask the owner.
Never make a silent exception.

## Library gaps found

These needs require library work before an app can use them.
Confirm the current release before opening duplicate tasks.

| Need | Required library capability |
| --- | --- |
| Page container | Width, gutters and vertical rhythm. |
| App shell | Top navigation. Navigation currently has sidebar and bottom presentations only. |
| Global base styles | Ship body margin, font and background in the library stylesheet. |
| Grid minimum size | Expose a closed prop. |
| Label emphasis and tone | Strong emphasis and identity colour. |
| Segmented and pagination controls | Expose `loading` and `disabled`. |
| Cell hint | Provide a tooltip or info button. |
| Icon and label spacing | Use equal gaps in rows and inline currency. |
| Screen change | One hook that scrolls to the top and moves focus when the screen changes. |

## Check the boundary

Run from the repository root:

```bash
node scripts/check-thin-frontend.mjs <frontend-src-dir>
node scripts/check-thin-frontend.mjs <frontend-src-dir> --json --ratchet
```

The checker scans `.tsx`, `.jsx` and `.css` files recursively.
It ignores tests, stories and `node_modules`.
It counts opening raw HTML tags, `className=` and `style=` attributes.
It counts non-blank CSS lines after removing block comments.
It prints counts per file and totals.
Use `--tags div,span` to replace the default raw tag list.
The scan is lexical and does not parse JSX syntax.
Review findings that contain source strings or unusual syntax.
The checker counts all `className` attributes conservatively.
It cannot check the origin or number of stylesheet imports.
Review that the sole CSS import comes from the library.

The default budget is zero for every count.
An existing project can place `thin-frontend.budget.json` in the source directory:

```json
{"tags": 0, "attributes": 0, "cssLines": 0}
```

A temporary budget can record existing debt.
Never increase it.
`--ratchet` fails when a budget exceeds the measured count.
Lower the budget to the measured count and rerun until it passes.
The checker does not rewrite the budget file.
Review budget changes to enforce the historical downward rule.

Run the [UI audit](ui-design-standard.md#verify-with-programs-not-only-with-eyes) at desktop and phone widths.
Use interaction steps for menus and controls.
Resolve audit findings in the library and adopt the release.

## Related

- [UI design standard](ui-design-standard.md): Compose and audit screens.
- [Frontend data and loading](frontend-data-and-loading.md): Use library loading and formatting states.
- [Practices index](index.md): Select rules for the task.
