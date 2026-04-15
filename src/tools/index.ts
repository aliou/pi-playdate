import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { ResolvedPlaydateConfig } from "../config";
import type { RuntimeState } from "../lib/state";
import { registerBuildTool } from "./build";
import { registerDoctorTool } from "./doctor";
import { registerRunDeviceTool } from "./run_device";
import { registerRunSimTool } from "./run_sim";
import { registerScreenshotTool } from "./screenshot";
import { registerSimEvalTool } from "./sim_eval";
import { registerSimInputTool } from "./sim_input";
import { registerSimLogTool } from "./sim_log";
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
  registerSimEvalTool(pi, state);
  registerRunDeviceTool(pi, config, state);
}
