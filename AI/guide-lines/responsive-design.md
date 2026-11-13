---
name: responsive-design
description: Who owns responsive frontend behaviour, and how to check layout, performance and security.
type: reference
area: guide-lines
---

# Responsive design

Start with [AGENTS.md](../../AGENTS.md).
Read this note when you build, change or review responsive frontend behaviour.
All responsive presentation lives in the shared component library, `lvgs-ui` (`@lvgs-dev/ui`).
Apps such as `game-list` only choose app-level data policy.
These are required practices, not a claim about the current library API.
Verify actual exports before use.
Ship missing behaviour in a library release before an app adopts it.
Report a library gap rather than adding a local layout workaround.

## Layout and component contract

1. Put page-shell and global-navigation media queries in the library.
   Use container queries for reusable components.
2. Set `container-type: inline-size` on the intended library query boundary.
   Use `@container` to style its descendants.
   A size query cannot query the styled element itself.
   Use a matching `container-name` when a specific ancestor is required.
   Test intrinsic sizing in flex and grid layouts.
3. Add a query container only when a descendant queries it.
   Document and test each nested boundary.
   Do not use JavaScript breakpoints for layout or visibility.
4. Expose a small prop API with named choices.
   Apps add no queries, width listeners, layout thresholds or styles.
5. Define fluid type and spacing tokens in the library.
   Check compatible `clamp()` units and ordered bounds.
   Test text resizing to 200% without content or function loss.
6. Test each component transition immediately below, at and above its threshold.
   Also test at container widths of 280 px and 1200 px.
   Include a narrow sidebar inside a wide page.
7. At 320 CSS px, preserve information and functionality without two-dimensional scrolling.
   Test 400% browser zoom from a 1280 CSS px viewport.
   Check clipped content, focus and access to hidden fields.
   A page-width assertion alone does not prove WCAG 1.4.10 reflow.

## Tables and data policy

1. Follow the existing table-scroll rules in [thin React applications](frontend-thin-app.md#behaviour-the-library-owns)
   and [UI design standard](ui-design-standard.md#showing-data).
   The library wraps cells or stacks rows.
   Keep table data available without horizontal scrolling.
2. Apps supply data priorities and optional column-visibility thresholds in CSS px through the library data-policy API.
   A column threshold applies only to that column.
   The library evaluates it against table container width.
3. The app identifies required fields through data policy.
   The library keeps those fields available in every mode.
   Provide a keyboard-accessible detail view or column selector for omitted fields.
   Preserve labels and header associations in stacked views.
4. At a fixed viewport width, change only the table container width.
   Assert that column visibility follows the declared data policy.
5. Announce which columns become hidden or visible to screen readers.
   Test the announcement mechanism and avoid repeated announcements on resize.
6. Test dense tables with long values and header associations.

## Other components

1. Keep dialog and drawer actions reachable with the software keyboard open.
   Preserve focus across presentation changes.
2. Stack form fields without changing reading order.
3. Keep navigation actions available without hover.
4. Keep chart labels and accessible data alternatives available at narrow widths.
5. Apply safe-area insets in library shells.
6. Test light mode, dark mode and reduced motion.
   Disable non-essential motion when reduced motion is requested.

## Target sizes

1. SC 2.5.8 requires targets of at least 24 × 24 CSS px, subject to its exceptions.
   For the spacing exception, center a 24 CSS px diameter circle on each undersized target.
   The circle must not intersect another target or another undersized target’s circle.
   SC 2.5.5 requires 44 × 44 CSS px, subject to its exceptions.
   The library target-size policy is separate from WCAG conformance.
2. Use library target tokens of at least 44 × 44 CSS px when `any-pointer: coarse` matches.
   Use at least 24 × 24 CSS px otherwise.
   Test a device with both fine and coarse pointers.
3. Check the interactive area, not just the visible icon.
   Include custom-styled native controls.

## Performance

1. Reserve image, media and loading-placeholder sizes to prevent layout shifts.
2. Do not alternate geometry reads and style writes in resize loops.
3. Enable `content-visibility: auto` only after measuring a rendering benefit.
   Reserve skipped space with stable sizing or `contain-intrinsic-size`.
   Test focus, find-in-page, screen readers and scroll stability.
   Do not use `content-visibility: hidden` as an offscreen performance substitute.
4. Provide image dimensions and suitable `sizes` and `srcset` values.
   Check downloads at phone and desktop widths.

## Security

1. Add no inline script or style that blocks a strict Content Security Policy (CSP).
   Check library-generated styles under the deployed policy too.
2. Do not use `dangerouslySetInnerHTML`.
3. Keep secrets out of browser bundles, markup and logs.
   Do not persist authentication tokens in local storage or session storage.
   Verify the server session and secure cookie design before choosing token storage.
4. Pin dependency versions and commit the lockfile.
   Review dependency changes before adoption.

## Test method

1. Run Playwright at 320, 390, 768, 1024 and 1440 CSS px.
   Include loading, long values, menus and table visibility changes.
2. Run the component, reflow, data-policy and target-size checks above.
3. Assert no page horizontal scroll at each width.
   Use `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
   Also check tables and their ancestors for scrolling or clipping.
4. Run axe at each width and after interactions.
   Combine automated results with keyboard and screen-reader checks.
5. Run the performance and security checks above.
6. Record each required check as pass, fail or not applicable.
   Explain each not-applicable result.
   Record failed required checks as blockers.
   Record commands and library gaps.
   Fix failures in the library and adopt its release in the app.

## Related

- [Thin React applications](frontend-thin-app.md): Keep layout and CSS in the library.
- [UI design standard](ui-design-standard.md): Compose and audit screens.
- [Frontend data and loading](frontend-data-and-loading.md): Use shared loading states.
- [Practices index](index.md): Select guidance for the task.
