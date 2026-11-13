---
name: data-freshness
description: How a UI over an API keeps data fresh, fast and calm. Choose the simplest option, cache by default, push only crucial data.
type: how-to
area: guide-lines
---

# Data freshness

Start with [AGENTS.md](../../AGENTS.md). This guide applies to any project with a UI over an API.
Stack rules live in [frontend data and loading](frontend-data-and-loading.md) and [backend realtime and caching](backend-realtime-and-caching.md).

## The decision rule

Take the simplest option that meets the requirement and keeps good performance.
Write down the decision and the reason. Use an ADR line or the PR description.

- Choose Server-Sent Events over WebSocket when the traffic is one way.
- Choose a TTL cache before push.
- Choose push only for crucial data that must update instantly.

## Decision matrix

Not everything is real time. Pick the row that matches the data.

| Data                                 | Strategy                                       |
| ------------------------------------ | ---------------------------------------------- |
| Static or rarely changing            | Long TTL cache.                                |
| User driven (filters, pages, search) | Fetch on demand, cached by key.                |
| Periodic samples                     | Poll. Use push when an instant update matters. |
| Crucial and instant                  | Push.                                          |

## Cache rules

- Use one cache key per query. The key holds every parameter that changes the result.
- The default TTL is 5 minutes.
- Use a shorter TTL for data that changes within minutes and where a stale value misleads. Use a longer TTL for data that changes by hour, day or release.
- Serve stale data while you revalidate in the background.
- Send no new request and show no loading state when the user navigates or filters back to cached data.
- Invalidate on a mutation, on a server event, on a manual refresh, and on an hour or day boundary.
- Prefetch on user intent: hover, focus, next page.
- Lazy load by route and for heavy components such as charts.

## Loading rules

- Follow [frontend loading rules](frontend-data-and-loading.md#loading-and-updates) for pending data and code.
- Show a skeleton only on the first load of a query.
- Keep the data on screen during later refreshes. Animate the change: a bar grows, it does not jump.
- Never shift the layout. Reserve space. Truncate long text to one line and put the full text in a tooltip.

## Real time rules

- The server emits an event after each committed record.
- The client updates the cached data from the event and invalidates the rest.
- Reconnect with backoff. Use a heartbeat. Resync when events were lost.
- Pause the stream when the tab is hidden. Refresh on return.
- Fall back to the TTL when the stream is down.

## Prove it with the real runtime

Prove process-dependent behaviour by running the real server and measuring it.
Fakes cannot prove streaming, shutdown, signals, proxy behaviour or buffering.
Include the relevant proxy when measuring its effects.
Record the command and measured result in the PR.
For SSE shutdown, use the [bounded server check](backend-realtime-and-caching.md#tests).

## Related

- [Frontend data and loading](frontend-data-and-loading.md): Client implementation.
- [Backend realtime and caching](backend-realtime-and-caching.md): Server implementation.
- [UI design standard](ui-design-standard.md): How loading and updates look.

- [Units and measures](units-and-measures.md): Canonical units and shared precision.
- [Frontend units and measures](frontend-units-and-measures.md): Display and input conversions.
- [Backend units and measures](backend-units-and-measures.md): Base units in storage and APIs.
