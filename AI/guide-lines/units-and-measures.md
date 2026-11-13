---
name: units-and-measures
description: Define canonical storage units, shared conversions and fixed display precision.
type: reference
area: guide-lines
---

# Units and measures

Start with [AGENTS.md](../../AGENTS.md). Read this guide when a value has a unit or display precision.
These are required practices for projects that use `@lvgs-dev/ui`.
Keep unit strings and decimal counts out of screens. Keep conversions in one place.

## Concepts and registry

- A **measure** describes what a value measures, such as mass or temperature.
- A **unit** defines how to express that measure, such as kilogram or kelvin.
- The **base unit** is the canonical storage unit. Always use SI for physical measures.
- The **display unit** is the unit the user sees or enters.
- **Fixed decimals** define the number of decimal places shown for a measure.

The registry `LVGS_MEASURES: Record<LvgsMeasure, LvgsMeasureConfig>` in `@lvgs-dev/ui` is the single source of truth.
Each configuration defines units with a `factor` and an optional `offset`.
It also defines `defaultUnit`, `decimals` and an optional `ladder` for automatic scaling.
Keep conversion logic beside this registry.

Decimals are fixed per measure. A component prop must never override them.
Percentage uses 3 decimals. Money uses 2 decimals. Mass and length use 6 decimals.
Changing the display unit does not change that precision policy.

## Three rules

1. The database and the API always carry values in the base unit.
2. Convert only at the edge: for display and from user input. Convert input to base units before it leaves the form or reaches the API.
3. Never convert twice. Never store a display value.

Keep full precision through storage and calculation. Round only for display.
Apply the [data freshness decision rule](data-freshness.md#the-decision-rule).
Choose the simplest option that works and meets performance needs. Record the reason.

## Special cases

- Temperature needs an offset as well as a factor. Store kelvin. Use the registry conversion for Celsius or Fahrenheit.
- Percentage is a dimensionless ratio from 0 to 1 in storage and the API. Display it as %. For example, a base value of 0.125 displays as 12.500% before locale formatting.
- Money is an amount plus an ISO currency code. Currency has no SI unit. Keep the amount in its currency. Never use a static currency conversion factor. A rate service with dated rates owns any currency conversion.

## Field names

Name numeric fields with their canonical unit suffix. Use the same names in storage and API schemas.

| Field         | Stored unit         |
| ------------- | ------------------- |
| `cpu_freq_hz` | hertz               |
| `net_rx_bps`  | bits per second     |
| `cpu_temp_k`  | kelvin              |
| `ram_ratio`   | dimensionless ratio |
| `energy_j`    | joule               |
| `power_w`     | watt                |
| `voltage_v`   | volt                |
| `duration_s`  | second              |

## Related

- [Frontend units and measures](frontend-units-and-measures.md): Display and input boundaries.
- [Backend units and measures](backend-units-and-measures.md): Storage, ingestion and migration rules.
- [Data freshness](data-freshness.md): Choose the simplest suitable design.
