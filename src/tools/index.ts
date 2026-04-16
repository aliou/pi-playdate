import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { ResolvedPlaydateConfig } from "../config";
import type { RuntimeState } from "../lib/state";
import { registerBuildTool } from "./build";
import { registerDoctorTool } from "./doctor";
import { registerRunDeviceTool } from "./run_device";
import { registerRunSimTool } from "./run_sim";
import { registerScreenshotTool } from "./screenshot";
import { registerSimAccelTool } from "./sim_accel";
import { registerSimCrankTool } from "./sim_crank";
import { registerSimEvalTool } from "./sim_eval";
import { registerSimGameStateTool } from "./sim_game_state";
import { registerSimInputTool } from "./sim_input";
import { registerSimLogTool } from "./sim_log";
import { registerSimStateTool } from "./sim_state";
import { registerStopSimTool } from "./stop_sim";

export function registerTools(
  pi: ExtensionAPI,
  config: ResolvedPlaydateConfig,
  state: RuntimeState,
) {
  registerDoctorTool(pi, config);
  registerBuildTool(pi, config, state);
  registerRunSimTool(pi, config, state);
  registerStopSimTool(pi, state);
  registerSimLogTool(pi, state);
  registerScreenshotTool(pi, state);
  registerSimInputTool(pi, state);
  registerSimCrankTool(pi, state);
  registerSimAccelTool(pi, state);
  registerSimStateTool(pi, state);
  registerSimGameStateTool(pi, state);
  registerSimEvalTool(pi, state);
  registerRunDeviceTool(pi, config, state);
}
