---
name: playdate
description: Develop games for the Panic Playdate handheld using the pi-playdate extension. Use when the user wants to create, build, run, or debug a Playdate game in Lua or C, work with .pdx bundles, run the Simulator, take screenshots of a running game, or deploy to a connected Playdate device over USB.
---

# Playdate Development

This skill teaches you how to develop games for the Panic Playdate using the `pi-playdate` extension. All Playdate operations go through the `playdate_*` tools -- never shell out to `pdc`, `pdutil`, `cmake`, or any SDK binary directly.

## Available Tools

| Tool | Purpose |
|---|---|
| `playdate_doctor` | Check SDK installation and environment health |
| `playdate_build` | Compile project to .pdx bundle |
| `playdate_run_sim` | Launch the Playdate Simulator |
| `playdate_stop_sim` | Stop the running simulator |
| `playdate_sim_log` | Read simulator log output |
| `playdate_screenshot` | Capture simulator screenshot |
| `playdate_sim_input` | Send D-pad/A/B/menu input to the simulator |
| `playdate_sim_eval` | Evaluate Lua in the running simulator (read state, run code) |
| `playdate_run_device` | Deploy to a connected Playdate device |

## Creating a New Project

There is no scaffolding tool. Create project files directly using `write`.

Read the appropriate template reference before creating:

- **Lua project**: Read [references/templates-lua.md](references/templates-lua.md) for the required files and their contents.
- **C project**: Read [references/templates-c.md](references/templates-c.md) for the required files, CMakeLists.txt setup, and C API boilerplate.

Every project needs a `Source/pdxinfo` file. See [references/project-layout.md](references/project-layout.md) for the format.

## Typical Workflows

### New game (Lua)

1. Read `references/templates-lua.md`
2. Create `Source/main.lua` and `Source/pdxinfo` using `write`
3. `playdate_build`
4. `playdate_run_sim`
5. `playdate_screenshot` to check visuals
6. `playdate_sim_input` to interact with the game (D-pad, A, B buttons)
7. Edit code, rebuild, repeat

### New game (C)

1. Read `references/templates-c.md`
2. Create `src/main.c`, `Source/pdxinfo`, and `CMakeLists.txt` using `write`
3. `playdate_build` (auto-detects C project and uses CMake)
4. `playdate_run_sim`

### Debug loop

1. `playdate_build` -- check `details.errors` for issues
2. If errors, fix the source files and rebuild
3. `playdate_run_sim` to test
4. `playdate_sim_log` to check runtime output
5. `playdate_screenshot` to verify visuals
6. `playdate_sim_eval` to inspect game state at runtime
7. Iterate

### Deploy to device

1. `playdate_build` with target "device"
2. `playdate_run_device` (always prompts user for confirmation)

### Interacting with a running game

1. `playdate_sim_input` sends button input directly to the Lua game
2. `playdate_screenshot` reads the current display (clean 400x240, no chrome)
3. `playdate_sim_eval` reads or modifies game state at runtime

`playdate_sim_input` supports these buttons: `up`, `down`, `left`, `right`, `a`, `b`, `menu`.

`playdate_sim_input` supports these actions:
- `press` -- tap a button once
- `hold` -- press and briefly hold a button
- `release` -- release a held button

Use `repeat` with `playdate_sim_input` for repeated taps, such as moving a cursor several cells.

`playdate_sim_input`, `playdate_screenshot`, and `playdate_sim_eval` all require DAP (Debug Adapter Protocol). DAP connects automatically when the simulator starts a Lua game. These tools only work with Lua games -- C games do not support DAP.

### Playing a game autonomously

For visual play:

1. Use `playdate_screenshot` to read the current screen
2. Decide the next move
3. Use `playdate_sim_input` to send that move
4. Use `playdate_screenshot` again to verify the result
5. Repeat until the game ends

For state-driven play without vision:

1. Use `playdate_sim_eval` to inspect the current state
2. Decide the next move from the returned values
3. Use `playdate_sim_input` to send that move
4. Use `playdate_sim_eval` again to confirm the new state
5. Repeat until the game ends

Common `playdate_sim_input` examples:
- move cursor right: `button: "right"`
- move cursor down twice: `button: "down", repeat: 2`
- confirm/select: `button: "a"`
- cancel/back: `button: "b"`
- open menu: `button: "menu"`

### Reading game state without vision

For models without vision or when you need structured data:

- Use `playdate_sim_eval` with `p <expression>` to read values: `p score`, `p playerX`
- Use `__pd_inspect(table)` to pretty-print tables: `p __pd_inspect(board)`
- `__pd_inspect` is injected automatically by the extension -- no game code changes needed

For richer state access, add a `getState()` global to the game during scaffolding:

```lua
-- Expose game state for the agent
function getState()
  return {
    board = board,
    cursor = { x = cursorX, y = cursorY },
    currentPlayer = currentPlayer,
    gameOver = gameOver,
    score = score,
  }
end
```

Then read it with: `playdate_sim_eval` expression `p __pd_inspect(getState())`

Note: Lua `local` variables are not directly accessible via `playdate_sim_eval`. Only globals and values reachable from globals can be read. When writing game code, expose any state the agent needs to inspect as a global or via `getState()`.

## Environment Setup

Run `playdate_doctor` first to verify the SDK is installed and configured. If the SDK path is not auto-detected, the user can set it via `/playdate:settings`.

## Reference Files

For API details, read the reference files in this skill's `references/` directory:

- `project-layout.md` -- Playdate project structure and pdxinfo format
- `templates-lua.md` -- Lua project template with minimal playdate.update()
- `templates-c.md` -- C project template with CMakeLists.txt and event handler
- `lua-api.md` -- Lua API quick reference
- `c-api.md` -- C API quick reference
- `corelibs.md` -- Standard Lua libraries (sprites, graphics, timers, etc.)
- `performance.md` -- Performance tips for the Playdate hardware
- `patterns.md` -- Common game patterns and idioms

## DAP (Debug Adapter Protocol)

The Playdate Simulator exposes a DAP server on TCP port 55934 for Lua games. The extension connects automatically after `playdate_run_sim`. DAP enables:

- Evaluating Lua expressions (`playdate_sim_eval`)
- Clean screenshots via `playdate.simulator.writeToFile()` (`playdate_screenshot`)
- Direct button callbacks instead of OS keyboard simulation (`playdate_sim_input`)
- Injected `__pd_inspect()` helper for table serialization

DAP is only available for Lua games. C games can still be built and run, but interactive tools (screenshot, input, eval) require DAP and will not work.
