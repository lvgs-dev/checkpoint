---
name: backend-units-and-measures
description: Preserve canonical units across storage, ingestion, API contracts and migrations.
type: reference
area: guide-lines
---

# Backend units and measures

Start with [AGENTS.md](../../AGENTS.md). Read [units and measures](units-and-measures.md) first.
Use this guide when storing, collecting, validating or serving measured values.

## Storage and API

Store canonical base units in numeric columns. Name each column with its unit suffix.
The API carries base units only. Document the measure of each field in its schema.
Keep full precision in the database. Round only at display.
Choose numeric types that preserve the required precision and range.

The backend keeps no conversion tables. It never converts values for a screen.
Keep a field-to-measure map for the API contract.
Add a contract test that compares this map with the registry exported by `exportMeasures()` from `@lvgs-dev/ui`.
Check that each field maps to a registered measure with the expected base unit.
The exported registry validates the contract. It does not create a second conversion registry.

## SI on the API now, database later

Use a temporary `units.py` adapter to convert stored legacy units on the way out.
Add SI fields next to legacy API fields so existing clients can transition.
Keep ingestion unchanged in this step. Delete the adapter when the columns migrate.
Use the [frontend adapter](frontend-units-and-measures.md#api-adapter) during the transition.
This staged exception to the base-unit contract avoids rewriting stored data in the API step.

Before choosing a legacy conversion factor, read the divisor in the collector code.
A network rate named `kbps` was KiB/s: multiply by 1024, not 1000, and do not treat it as bits.

A composite rate such as money per energy is a deliberate non-SI exception.
Keep the currency and energy unit in the field name or a `rate_unit` field.
Follow the shared [money rules](units-and-measures.md#special-cases) for currency handling.

## Ingestion and aggregates

Agents and collectors convert at the source before sending values.
For example, a sensor that reads MHz sends Hz.
Ingest validates ranges in base units.
Aggregates stay in base units. Document the output measure when a calculation changes the dimension.
Never aggregate rounded display values.
Apply an offset once per sample when converting accumulated sums.
For a Celsius sum, add `273.15 * count` to obtain the Kelvin sum, never just `273.15`.

## Changing a stored unit

Before code that rewrites stored data, have a read-only reviewer produce a PLAN.
Include a per-column inventory, expand/contract steps, risks, rollback and the PR split.
Get the owner's approval of that plan before implementation. This exposes data risks before writes.

Use an expand/contract migration. Never convert values in place in a deploy migration.
The shared deploy engine refuses migrations with `DELETE`, `UPDATE`, `DROP` or `RENAME`.

1. Add new columns for the new canonical unit. Keep the deploy migration additive.
2. Dual write old and new columns. Convert each source value once for each target unit.
3. Have the owner run a batched, resumable and idempotent backfill outside the deploy migration.
4. Verify row counts and checksums against the expected converted values. Check that retries leave the same result.
5. Switch reads to the new columns after verification passes.
6. Retire old writes when consumers have switched. Have the owner run a later destructive migration to remove old columns. Verify the final schema and base-unit contract.

Keep backfill progress and verification evidence with the migration task.
Do not hide a backfill or a destructive operation inside deployment.

## Related

- [Units and measures](units-and-measures.md): Canonical units, field names and special cases.
- [Frontend units and measures](frontend-units-and-measures.md): Conversion at display and input boundaries.
- [Backend realtime and caching](backend-realtime-and-caching.md): Server data delivery rules.
- [CI and CD](ci-cd.md): Shared deployment engine and release rules.
