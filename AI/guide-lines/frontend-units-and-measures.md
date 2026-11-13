---
name: frontend-units-and-measures
description: Display measures and collect input without leaking display units into application data.
type: reference
area: guide-lines
---

# Frontend units and measures

Start with [AGENTS.md](../../AGENTS.md). Read [units and measures](units-and-measures.md) first.
Use this guide when a screen displays, charts or edits a measured value.

## Components and formatting

Pass `measure` and a value in base units to `LvgsMeter`, `LvgsStat` and `LvgsMeasureValue`.
Chart series also declare their measure and carry values in base units.
Let the library apply the display unit and the registry precision.
Never write a unit symbol or a number of decimals in a screen.
Never override decimals through a prop.

Use `formatMeasure` when formatting outside a component requires text.
Use the same registry policy for chart axes, legends and tooltips.
Keep the locale rules from [frontend data and loading](frontend-data-and-loading.md#formatting).
Money also carries its ISO currency code. Use the currency component for its presentation.

## API adapter

Map SI and legacy API fields into one internal SI model at the boundary.
Delete the legacy branch when the API drops those fields.
Follow the [backend rollout](backend-units-and-measures.md#si-on-the-api-now-database-later).
Derive legacy factors from how the sensor measured the value, never from the registry's display ladder.
This keeps display policy from changing the meaning of old data.

Convert strings carrying energy or money with exact decimal arithmetic.
Use scaled integers or `BigInt`, never `Number`, to avoid precision loss.
Keep absence as `null` until render time. Put the placeholder dash only in the view.
Grouping and sums must explicitly skip null values so missing samples do not become zeroes.

## Gauges and inputs

Define gauge thresholds in base units, just like the gauge value.
Changing a display unit must not change the state or colour of a gauge.

Use `LvgsInput` with `kind="number"`, `measure` and `displayUnit` for measured input.
The user enters the display unit. The input emits a base value.
Convert before the value leaves the form or reaches the API.
Do not convert the emitted value a second time.
Keep form output, query data and mutation payloads in base units.

## Tests

Assert on base values in form output, component callbacks and API payloads.
Test a change of display unit without changing the underlying base value.
Check gauge thresholds in base units.
Cover temperature offsets and percentage ratios at the conversion boundary.
Check formatted text separately through the registry policy.

## Related

- [Units and measures](units-and-measures.md): Registry, fixed decimals and special cases.
- [Backend units and measures](backend-units-and-measures.md): The API contract this client consumes.
- [Frontend data and loading](frontend-data-and-loading.md): Locale and data handling rules.
- [UI design standard](ui-design-standard.md): Visual hierarchy for measured values.
