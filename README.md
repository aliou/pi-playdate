# pi-playdate

A pi extension for developing [Playdate](https://play.date) games. Provides typed tools for building, running, and deploying Playdate projects in Lua and C.

## Install

```bash
pi install git:github.com/aliou/pi-playdate
```

## Quick Start

```
> Create a new Playdate game called "Bounce" in Lua
# Agent reads the playdate skill, creates Source/main.lua and Source/pdxinfo

> Build and run it
# Agent calls playdate_build then playdate_run_sim

> Take a screenshot so I can see it
# Agent calls playdate_screenshot, returns the image
```

## Tools

| Tool | Description |
|---|---|
| `playdate_doctor` | Check SDK installation, pdc, simulator, ARM toolchain, device |
| `playdate_build` | Compile Lua or C project to .pdx bundle |
| `playdate_run_sim` | Launch the Playdate Simulator |
| `playdate_stop_sim` | Stop the running simulator |
| `playdate_sim_log` | Read simulator log output (ring buffer) |
| `playdate_screenshot` | Capture simulator screenshot (returned as image) |
| `playdate_sim_input` | Send D-pad/A/B/menu input to the simulator |
| `playdate_sim_eval` | Evaluate Lua expressions in the running simulator |
| `playdate_run_device` | Deploy .pdx to connected Playdate (requires confirmation) |

## Commands

| Command | Description |
|---|---|
| `/playdate:doctor` | Check environment health |
| `/playdate:sim` | Build and run in simulator |
| `/playdate:device` | Build and deploy to device |
| `/playdate:settings` | Configure SDK path, build mode, etc. |

## Settings

Stored at `~/.pi/agent/extensions/playdate.json` (global) and `.pi/extensions/playdate.json` (project).

| Setting | Default | Description |
|---|---|---|
| `sdkPath` | `$PLAYDATE_SDK_PATH` | Override SDK path |
| `defaultTarget` | `"simulator"` | Default build target |
| `buildMode` | `"debug"` | C build mode |
| `armToolchainPath` | auto-detect | ARM toolchain for C device builds |
| `autoOpenSimulator` | `true` | Auto-open simulator after build |
| `simulatorLogLines` | `200` | Simulator log ring buffer size |

## Requirements

- [Playdate SDK](https://play.date/dev/) installed
- `PLAYDATE_SDK_PATH` environment variable set (or configured via settings)
- For C projects: `cmake`, `arm-none-eabi-gcc` (device builds)

## Skill

The extension ships a `playdate` skill with reference docs for the Lua API, C API, CoreLibs, project layout, templates, performance tips, and common patterns. The agent loads these on demand when working on Playdate projects.
