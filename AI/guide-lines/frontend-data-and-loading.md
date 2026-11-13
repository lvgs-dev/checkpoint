---
name: frontend-data-and-loading
description: React rules for data fetching, caching, loading states, formatting and gauge colours with TanStack Query and the component library.
type: how-to
area: guide-lines
---

# Frontend data and loading

Start with [AGENTS.md](../../AGENTS.md). Read [data freshness](data-freshness.md) first for the rules and the decision matrix. This guide shows how to apply them in React.

## TanStack Query is the standard

- Set `QueryClient` defaults to `staleTime` 5 minutes and `gcTime` 30 minutes. Override per query only with a reason.
- Build keys in one key factory. Never write a key inline.
- Build each query as an option factory (`queryOptions`). Share it between hooks, prefetch and `setQueryData`.
- Use `isPending` for the first load and drive skeletons with it. Use `isFetching` for background refresh and drive a quiet indicator with it.
- Update cached data from stream events with `setQueryData`. Invalidate related keys with `invalidateQueries`.
- Call `invalidateQueries` on a manual refresh.
- Prefetch on hover and focus with `prefetchQuery`.
- Split code per route with `React.lazy` and `Suspense`. Lazy load the chart library the same way.

## Loading and updates

- Show a skeleton or loading animation whenever a page, route, lazy chunk or component waits for data or code. Never show bare loading words such as "Carregando" or "Loading".
- Prefer a skeleton with the same layout and sizes as the loaded state. Reserve space so nothing shifts.
- Give each route a `Suspense` fallback with a page skeleton: shell, header and the same card layout. Use skeleton fallbacks for lazy chunks too.
- Use the `loading` props of the library components. Do not draw custom skeletons.
- Animate value changes. Bars and gauges transition, they do not jump.
- Truncate long text to one line and show the full text in a tooltip. See the [UI design standard](ui-design-standard.md).
- Write no hard-coded spacing. Use library tokens.

## Loading checks

- Search frontend source for loading words used as indicators, including "Carregando" and "Loading". Replace text-only indicators with the states above.
- Test fallbacks while data and lazy code remain pending. Assert that no fallback renders only text and that each route shows its skeleton fallback.

## Formatting

- Format numbers and money in pt-BR through the library components. Use `LvgsCurrency` for money.
- Never format with ad hoc string code.

## Gauge colour by context

- Green is good, yellow is medium, red is critical.
- A high value is bad for RAM, temperature, disk and CPU use. Colour rises toward red as the value rises.
- A metric with no good or bad direction, such as clock frequency, stays a fixed calm green.

## Related

- [Data freshness](data-freshness.md): Rules and decision matrix.
- [Backend realtime and caching](backend-realtime-and-caching.md): The events this client consumes.
- [UI design standard](ui-design-standard.md): How screens look.
