# pi-playdate

Pi extension for Playdate game development. Wraps the Playdate SDK (pdc, simulator, pdutil) behind typed tools.

## Entry Point Deviations

- No `enabled` toggle. The extension is always active when installed. There is no use case for installing it but disabling it.
- Uses `node:child_process` directly in `src/lib/sim.ts` for the simulator process. This is the documented exception -- pi.exec() does not support long-lived detached processes with stdout/stderr streaming.
- The `pi-no-node-exec` biome plugin is excluded from this project because of the above.

## Stack

- TypeScript (strict mode), pnpm, Biome, Changesets

## Scripts

- `pnpm typecheck` - Type check
- `pnpm lint` - Lint
- `pnpm format` - Format
- `pnpm gen:schema` - Generate JSON schema from config types
- `pnpm check:schema` - Verify committed schema matches config types
- `pnpm check:lockfile` - Verify lockfile is in sync

## Structure

```
src/
  index.ts           # Extension entry point
  config.ts          # PlaydateConfig / ResolvedPlaydateConfig + ConfigLoader
  lib/
    dap.ts           # DAP client for simulator communication (TCP port 55934)
    dap-queue.ts     # Sentinel key for serializing DAP tool calls
    sdk.ts           # SDK path resolution, version, binary locations
    project.ts       # Project kind detection (lua/c/hybrid), pdxinfo, .pdx discovery
    device.ts        # Serial port scanning, data-disk mode, volume mount
    pdc.ts           # Run pdc, parse diagnostics
    cmake.ts         # CMake configure + build, parse gcc diagnostics
    sim.ts           # Spawn/kill simulator, log ring buffer
    exec.ts          # Thin pi.exec wrapper
    state.ts         # Ephemeral runtime state (sim PID, log buffer, last build)
  tools/
    doctor.ts        # playdate_doctor
    build.ts         # playdate_build
    run_sim.ts       # playdate_run_sim
    stop_sim.ts      # playdate_stop_sim
    sim_log.ts       # playdate_sim_log
    screenshot.ts    # playdate_screenshot
    sim_input.ts     # playdate_sim_input
    sim_eval.ts      # playdate_sim_eval
    run_device.ts    # playdate_run_device
  commands/
    doctor.ts        # /playdate:doctor
    sim.ts           # /playdate:sim
    device.ts        # /playdate:device
    settings.ts      # /playdate:settings (via registerSettingsCommand)
skills/
  playdate/
    SKILL.md
    references/      # SDK API references and project templates
```

## Design Decisions

- Tools parse subprocess output into structured `details`. Raw output is truncated.
- Simulator is the default target everywhere.
- Device deployment always requires `ctx.ui.confirm` -- no flag to skip.
- Project scaffolding is handled by the skill (reference templates), not a tool. The agent reads the templates and creates files with `write`.
- Runtime state (sim PID, log buffer, last build) is ephemeral -- never persisted to disk.
- Clean shutdown in `session_shutdown` kills any tracked simulator process.
- DAP-backed tools (sim_input, sim_eval, screenshot) are serialized via `withFileMutationQueue` with a shared sentinel key. This prevents parallel tool calls from interleaving DAP requests.
- `killSimulator` uses SIGKILL, not SIGTERM. Stuck simulators (e.g. after a Lua crash) ignore SIGTERM.
- `playdate_build` with `clean: true` auto-kills the simulator before building to avoid output directory conflicts.
