---
name: backend-realtime-and-caching
description: Server rules for SSE streams, publish after commit, an in-process broker, HTTP caching, pagination and stream tests.
type: how-to
area: guide-lines
---

# Backend realtime and caching

Start with [AGENTS.md](../../AGENTS.md). Read [data freshness](data-freshness.md) first. Use push only when that guide says the data is crucial.

## SSE endpoint

- Expose one SSE endpoint per product area.
- Use named events with typed JSON payloads.
- Give each event a monotonic id.
- Send a heartbeat so proxies keep the connection open.
- Honor `Last-Event-ID` on a best effort basis.
- Emit a `resync` event when the server cannot replay what the client missed. The client then refetches.

## Publish after commit

- Publish only after the database commit. Never publish before it.
- Emit one event per committed record.

## Broker

- Use a thread safe in-process broker.
- Give each subscriber a bounded queue. When it is full, drop the oldest event and emit `resync`.
- Cap the number of subscribers.
- Put no secrets and no raw payloads in events. Send ids and small typed fields.
- Cap the event size.

## HTTP caching and pagination

- Send `Cache-Control` and a weak ETag on GET JSON. Answer a matching `If-None-Match` with 304.
- Bound pagination. Allowed page sizes are 10, 30, 50 and 100.

## Process model

- The broker assumes one process.
- With several workers, events reach only the subscribers of the same worker. Move the broker to a shared bus such as Redis pub/sub, and record the change in an ADR.

## SSE shutdown

Uvicorn waits for open connections before it runs lifespan shutdown.
Closing the broker only in that hook can hang the process and a deploy restart.

- During lifespan startup, wrap the `SIGTERM` and `SIGINT` handlers. Save each previous handler.
- Call `broker.close()` first. It must wake every subscriber so each stream generator ends.
- Then call the previous handler when callable. Preserve the signal handler arguments.
- Restore the saved handlers at shutdown. Skip wrapping where signal handlers cannot be set.
- Add `--timeout-graceful-shutdown 10` to the Uvicorn start command.

## Tests

- Keep unit tests bounded. Never leave a real stream open indefinitely.
- Test the broker, the event formatting and the endpoint headers directly. Close or bound any stream you do open.
- Keep a reproducible script for the [real runtime check](data-freshness.md#prove-it-with-the-real-runtime).
  Run migrations first; the application does not migrate on startup.
  Start the real server on a free port, open an SSE stream, then send `SIGTERM`.
  Assert that the process exits within a few seconds. Bound the check and clean up on failure.
  Fake queue tests did not catch the shutdown hang.

## Related

- [Data freshness](data-freshness.md): Rules and decision matrix.
- [Frontend data and loading](frontend-data-and-loading.md): The client that consumes these events.
