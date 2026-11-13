---
name: frontend-start-react-app
description: Step by step guide to start a new React frontend on @lvgs-dev/ui with the theme config, the app frame, the checks and the audit.
type: how-to
area: guide-lines
---

# Start a React frontend

Read this guide when you start a React frontend or add one to a project.
It gives the order of the steps. The rules behind them are in [thin React applications](frontend-thin-app.md).
Server-supply is the working reference. Look at its `frontend/` folder when a step is unclear.

## Before you start

- Choose the library version. Pin one exact version of `@lvgs-dev/ui`. Never use a range.
- The package lives in GitHub Packages. The project `.npmrc` maps the `@lvgs-dev` scope to that registry.
- The lockfile update needs package access. Ask the owner to run it, or run it in a CI job with `packages: read`. See [update a shared library](new-project-roadmap.md#update-a-shared-library-in-each-app).
- Never write a colour, a font, a spacing value or a CSS file in the app. A missing capability becomes a library task.

## Steps

1. **Scaffold.** Create a Vite, React and TypeScript app in `frontend/`. Install `@lvgs-dev/ui`, `@tanstack/react-query` and the project test tools.
2. **Theme config.** Create `src/lvgs.config.ts`. It is the only place that chooses the colour theme and the mode.
   Export `defineLvgsConfig({ colorTheme, appearance: { dark, default } })`. Pick `colorTheme` from the library registry (`codex` or `obsidian`).
   Set `dark: false` when the app has no dark mode. Never write the theme attribute or a colour anywhere else.
3. **Entry point.** In `main.tsx` import only `@lvgs-dev/ui/styles.css`. Call `applyLvgsConfig(config)`, then render `LvgsProvider` at the root with the same config, `QueryClientProvider` inside it and `LvgsToster`.
4. **First paint.** Put the output of `lvgsThemeBootScript(config)` in a `<script>` in the `<head>` of `index.html`, before the module script.
   Add a test that builds the script from the real config and compares it with the HTML. Then the page never flashes the wrong theme and the script cannot drift.
5. **Frame.** Render `LvgsAppShell` with `LvgsNavigation` in the `top` presentation. Pass `onIntent` to prefetch the data of the target screen.
   Put an appearance switch in the `actions` slot: `LvgsToggle` with `presentation="appearance"` and an `aria-label`. The library saves the choice in `localStorage` and restores it on the next load.
6. **Screens.** Each route renders `LvgsPage` with `screenKey` set to the route name. A new screen then opens at the top. Compose cards, grids and tables from the library. Write no `div`, `span`, `main`, `strong` or `className`.
7. **Loading.** Give every route a `Suspense` fallback that is a page skeleton. Show a skeleton only on the first load. Keep the previous data visible while a filter loads. See [frontend data and loading](frontend-data-and-loading.md).
8. **Data and units.** Use TanStack Query with the project defaults. The API sends base SI units. Show values with the library measure components. See [units and measures](units-and-measures.md).
9. **Tests.** Add a guard test that fails when `src/` has a raw layout tag, a `className`, a `style` or a `.css` file. Keep the budget at zero. Add the boot script test from step 4 and render tests for each screen.
10. **Checks.** Run `node scripts/check-thin-frontend.mjs frontend/src` from the subharness checkout. It must print zero tags, zero attributes and zero CSS lines.
11. **Audit.** Run the UI audit on the running app at 1280 and 390 pixels in the light and the dark mode. Fix every finding in the library or in the composition. Do not hide a finding with CSS. See [UI design standard](ui-design-standard.md).
12. **Look.** Open the screens in the headless browser and read the screenshots. A passing audit proves there are no defects. Only a look proves the screen is good.

## Done when

- The thin check prints zero, the tests, the types and the build pass, and the audit is clean in both modes and both widths.
- The theme and the mode come from `lvgs.config.ts` only, and a reload keeps the choice of the user.
- Every route has a skeleton fallback and opens at the top.
- The pull request lists the library gaps you found. Each gap is a task in `lvgs-ui`, not a workaround in the app.

## Related

- [Thin React applications](frontend-thin-app.md): The rules and the checker.
- [UI design standard](ui-design-standard.md): Composition, colour budget and audit.
- [Frontend data and loading](frontend-data-and-loading.md): Skeletons, cache and prefetch.
- [New project roadmap](new-project-roadmap.md): Delivery of the whole project.
