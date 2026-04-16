# Lua injections

This document describes the Lua code injected into the simulator DAP REPL.

## Why we inject Lua

The Playdate DAP REPL can evaluate Lua, but raw results are not ergonomic enough on their own.

We inject helpers to make:

- table inspection readable
- multi-return expressions readable
- common hardware state available in one call

## Files

- `lua/inspect.lua` -- vendored `kikito/inspect.lua`
- `lua/helpers.lua` -- extension-specific helpers

These files are read by `src/lib/dap.ts` and evaluated after DAP connect.

## Vendored inspect.lua

We vendor `inspect.lua` rather than embedding a tiny custom inspector in TS strings.

Reasons:

- better output for tables and strings
- explicit source, easy to audit
- stable behavior
- easier maintenance than inline template-string Lua

`dap.ts` loads it as a chunk and assigns the returned module to a global:

```lua
inspect = (function()
  ... inspect.lua contents ...
end)()
```

## Helper functions

### `__pd_dump(...)`

Varargs-safe pretty printer.

Why it exists:

`inspect(value)` expects one root value. But many Playdate APIs, like `playdate.readAccelerometer()`, return multiple values. Passing them straight into `inspect(...)` breaks because the extra values are interpreted as optional parameters.

`__pd_dump(...)` adapts that:

- zero returns -> `"nil"`
- one return -> `inspect(value)`
- multiple returns -> `(inspect(v1), inspect(v2), ...)`

That is why bare `playdate_sim_eval` expressions can show:

```text
(0.1, 0.2, 0.3)
```

### `__pd_state()`

Returns a compact `key=value|...` string containing common hardware/runtime state:

- crank position / change / docked
- accelerometer x / y / z
- button pressed state
- fps
- elapsed time
- current time ms
- battery percentage

`playdate_sim_state` parses this into structured JSON details.

## Eval ergonomics

`playdate_sim_eval` normalizes user input before sending it to DAP:

- bare expression -> wrapped in `p __pd_dump(...)`
- `p <expr>` -> passed through raw
- `eval <code>` -> wrapped in a single-chunk print-capture expression

## Why print capture is not in helpers.lua

Playdate's REPL binds `print` per evaluated chunk. A helper function defined in one eval call cannot reliably intercept `print()` from another later eval call.

So print capture is generated inline in `src/tools/sim_eval.ts` as a one-off wrapped expression, where the `print` override and the user code run in the same chunk.
