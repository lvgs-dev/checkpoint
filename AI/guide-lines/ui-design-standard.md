---
name: ui-design-standard
description: How to design screens and dashboards from a component library so they look rich, elegant and minimalist. Read it before you build or review any screen.
type: how-to
area: guide-lines
---

# UI design standard

Start with [AGENTS.md](../../AGENTS.md). This standard applies to every project that builds screens from a component library, such as `@lvgs-dev/ui`.

A screen is a composition. It is not a list of fields. A screen that shows every requested value correctly but looks flat is not done.
You decide how the composition reads. The owner gives goals and examples. Do not copy a request one to one: ask what the eye must see first.

For every task that writes or changes React screens, follow [thin React applications](frontend-thin-app.md).

## The six levers

Use these in this order. Use the weaker ones before you reach for colour.

1. **Hierarchy.** In each block, the main value is the largest and strongest. The label is bold or muted. Support text is small. A reader must know what matters in one glance.
2. **Typography.** Weight, italic and size carry identity. Use the display face for page titles and for the main values. Use bold labels where they guide reading. Align numbers.
3. **Dividers and structure.** Thin rules, title and subtitle pairs and consistent card chrome separate ideas without noise.
4. **Icons.** Use them often, but never in excess. An icon sits next to a label when it speeds recognition: a metric, an action, a state. Use one minimalist line set with one stroke weight. Never use emoji. Never use an icon that only decorates.
5. **Spacing.** Use the library tokens only. Never write a pixel or rem value in a screen. If a gap looks wrong, the component is composed wrong: fix the composition, not the number.
6. **Colour.** Colour is a budget. See the next section.

## The colour budget

Colour needs a reason. Three colours on a page is a ceiling, not a target. A reason is one of three things:

- **State.** Good, warning, bad. The colour follows a threshold.
- **Identity.** One entity keeps one colour on the whole screen: a server in its card, its chart line, its legend and its tooltip.
- **The main datum.** The one number the screen exists to show.

Three colours in a block is also a ceiling. Using more than one colour because you have three things to show is wrong.
Decide the colour story of the whole screen first. A page with seven cards, three lists, two charts and two text blocks might give colour to the two charts (identity) and to one list (state). The other five cards get their identity from bold and italic type, rules, titles, subtitles and icons. They stay calm, and they still read at a glance.

## Page anatomy

- **Page header.** Large title, description close under it, and up to three actions on the right. An action is text, an icon with an aria-label, or both. When the actions do not fit, all of them collapse into one vertical three-dots icon. It opens a floating balloon with the list.
- **Card.** A header (title, optional subtitle, optional actions), an optional toolbar above the body, the body, and an optional footer. The body stays simple. The toolbar and the footer belong to the card, so every card behaves alike.
- **Card header row.** The header is one row: `[icon] Title ........ [meta tag]`. The identity icon and the name sit on the left. The status tag is pinned right. Never show the name twice.
- **Changing status text.** A status sentence that changes must not move the layout. Keep it on one line, truncate it, and put the full text in a tooltip.
- **Switches.** A switch is an iPhone style sliding toggle, never a tiny button. A segmented switch can fill the width of its column.
- **Filters and options.** One filter icon in the card header opens a balloon, a sheet or a modal. Never stack two switches. A single multi-choice switch above the body is fine when the choices change the whole body (for example hour, day, week, month).
- **Pagination.** One component, aligned to the right, previous and next as icons, the page size as a dropdown or a switch.
- **Page settings.** Choices that apply to the whole page (for example which servers to show) live in a settings sheet opened from the page header, and persist in the URL.

## Showing data

- **Comparing entities.** Use one table with an item column and one column per entity, side by side. Do not repeat the entity name on every row. Put the identity colour and icon in the column headers. Do not repeat the names in a row above the table. Put an icon and a bold label on each item.
- **Tables and lists.** A table, list or any tabular view never scrolls horizontally, at any width. Cells wrap and long unbroken text breaks. Rows stack in narrow containers. Never wrap a table in an `overflow-x` container or hide the problem with a scroll area.
- **Redundant words.** Remove a word when an icon or a unit already says it. A battery bar with a bolt icon does not also say "plugged in".
- **Money.** Show a money value with the currency component and its flag. Its display-only mode keeps the normal look. See [frontend data and loading](frontend-data-and-loading.md).
- **Gauges and bars.** The bar takes the colour of the state. A small icon beside it takes the same colour. Say the thresholds explicitly, with no gap between ranges. A consolidated gauge per entity, such as total storage across disks, belongs in the "now" block. Show the free amount through the measure component. Colour rules by metric are in [frontend data and loading](frontend-data-and-loading.md).
- **Charts.** Colour means entity, and line style means metric: solid, dashed, dotted. Show both in the legend. The hover balloon is a table with the metrics as rows and the entities as columns. Missing data is a gap, never a zero.
- **Empty and stale states.** Say what is true, in a quiet voice. "No runner on this server" is not an alarm and "no recent data" is not the same message.
- **Loading states.** Follow [frontend loading rules](frontend-data-and-loading.md#loading-and-updates) for skeletons and animations while data or code loads.

Show a value’s unit quieter than its number. Use tabular numbers and fixed decimals so columns align. Follow [frontend units and measures](frontend-units-and-measures.md) for the shared formatting and input rules.

## How to work

1. Build the screen from library components. If one is missing or wrong, fix the library first and release it.
2. Take real screenshots at desktop width and at phone width (390 px).
3. Run a design critique: hierarchy, contrast, density, consistency, rhythm. The `design:design-critique` skill does this.
4. Refine until a reviewer who looks at the screenshots calls it rich, elegant and balanced. "Correct" is not enough.
5. Record any new pattern in the project's architecture notes, so the next agent reuses it.

## Verify with programs, not only with eyes

The build host is headless. Do not rely on your own visual judgment alone. Run the audit script and treat its findings as the first gate:

```bash
scripts/ui-audit/lvgs-ui-audit <url> [steps.json]
```

It runs Playwright in the `lvgs-browser` container at 1280 px and at 390 px and prints JSON. It reports:

- horizontal overflow and elements wider than the viewport; `hscroll` flags overflowing scroll containers and tabular views inside scrolling or clipped ancestors (up to 20 findings per viewport);
- sibling boxes that touch (gap under 4 px), such as a badge row glued to the box below it;
- padding, margin and gap values that are not in the `--lvgs-space-*` token scale. This catches browser default margins on headings and every hard-coded value;
- touch targets under 24 px, icon-only buttons without an accessible name, text contrast under WCAG AA, console errors.

An optional `steps.json` drives interactions: `click`, `press`, `expectVisible`, `expectHidden`, `expectText`, with `postAudit` to audit again after the step. Use it to prove that a menu opens, lists its actions and closes with Escape at 390 px, or that pagination changes the range.
A finding is fixed or explained in the report. A screenshot helps a human. It never replaces the audit.

## Checklist for every screen

- Can I name the one thing each block says? Is that thing the strongest element in it?
- Does every colour have a reason I can state in one sentence?
- Do cards without colour still have identity from type, rules and icons?
- Is every gap a token? Is every icon from the library set?
- Does it hold at 390 px without a horizontal scroll?
- Does it read well in light and in dark?
- Is the audit clean at both widths, with the interaction steps passing?

## Related

- [Agent practices](agent-practices.md): Rules for every code task.
- [Documentation rules](documentation.md): How to write the notes.
- [Data freshness](data-freshness.md): Loading and update behavior that screens must follow.
