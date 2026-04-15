import { cpSync } from "node:fs";
import { basename, join } from "node:path";
import { ToolBody, ToolCallHeader, ToolFooter } from "@aliou/pi-utils-ui";
import type {
  AgentToolResult,
  AgentToolUpdateCallback,
  ExtensionAPI,
  ExtensionContext,
  Theme,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { type Static, Type } from "@sinclair/typebox";
import type { ResolvedPlaydateConfig } from "../config";
import {
  enterDataDiskMode,
  findDevice,
  findPdutil,
  getDataDiskMountPath,
  runOnDevice,
  waitForVolume,
} from "../lib/device";
import { findPdxBundle } from "../lib/project";
import { resolveSDKPath } from "../lib/sdk";
import type { RuntimeState } from "../lib/state";

const parameters = Type.Object({
  pdxPath: Type.Optional(
    Type.String({
      description:
        "Path to .pdx bundle. Defaults to last build or auto-detect.",
    }),
  ),
});

type RunDeviceParams = Static<typeof parameters>;

interface RunDeviceDetails {
  port: string;
  volumePath: string;
  pdxName: string;
  durationMs: number;
  launched: boolean;
}

export function createRunDeviceTool(
  pi: ExtensionAPI,
  config: ResolvedPlaydateConfig,
  state: RuntimeState,
) {
  return {
    name: "playdate_run_device",
    label: "Playdate Run Device",
    description:
      "Deploy and run a .pdx bundle on a connected Playdate device. Requires user confirmation every time.",
    promptSnippet: "Deploy game to connected Playdate device",
    promptGuidelines: [
      "playdate_run_device always asks for user confirmation before deploying.",
      "playdate_run_device requires a Playdate connected via USB.",
    ],
    parameters,

    async execute(
      _toolCallId: string,
      params: RunDeviceParams,
      signal: AbortSignal | undefined,
      _onUpdate: AgentToolUpdateCallback<RunDeviceDetails> | undefined,
      ctx: ExtensionContext,
    ): Promise<AgentToolResult<RunDeviceDetails>> {
      const start = Date.now();
      const sdkPath = resolveSDKPath(config);
      const pdutilPath = findPdutil(sdkPath);

      let pdxPath = params.pdxPath;
      if (!pdxPath && state.lastBuildResult) {
        pdxPath = state.lastBuildResult.pdxPath;
      }
      if (!pdxPath) {
        pdxPath = findPdxBundle(ctx.cwd) ?? undefined;
      }
      if (!pdxPath) {
        throw new Error(
          "No .pdx bundle found. Build the project first with playdate_build.",
        );
      }

      const pdxName = basename(pdxPath);

      // Find device
      const device = findDevice();
      if (!device.connected || !device.port) {
        throw new Error(
          "No Playdate device connected. Connect via USB and try again.",
        );
      }

      const port = device.port;
      state.lastDevicePort = port;

      // User confirmation required every time
      const confirmed = await ctx.ui.confirm(
        "Install on Playdate?",
        `Upload ${pdxName} to device at ${port}?`,
      );
      if (!confirmed) {
        return {
          content: [{ type: "text", text: "Deployment cancelled by user" }],
          details: {
            port,
            volumePath: "",
            pdxName,
            durationMs: Date.now() - start,
            launched: false,
          },
        };
      }

      // Enter data-disk mode
      ctx.ui.setWidget("playdate", ["Entering data-disk mode..."]);
      await enterDataDiskMode(pi, pdutilPath, port, { signal });

      // Wait for volume mount
      ctx.ui.setWidget("playdate", ["Waiting for volume..."]);
      const volumePath = getDataDiskMountPath();
      await waitForVolume(volumePath, 15000, signal);

      // Copy .pdx bundle
      ctx.ui.setWidget("playdate", [`Copying ${pdxName}...`]);
      const destPath = join(volumePath, "Games", pdxName);
      cpSync(pdxPath, destPath, { recursive: true });

      // Sync
      await pi.exec("sync", [], { signal });

      // Eject/unmount
      if (process.platform === "darwin") {
        await pi.exec("diskutil", ["eject", volumePath], { signal });
      } else if (process.platform === "linux") {
        await pi.exec("umount", [volumePath], { signal });
      }

      // Wait a moment for device to reboot
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Launch game
      ctx.ui.setWidget("playdate", ["Launching..."]);
      await runOnDevice(pi, pdutilPath, port, `/Games/${pdxName}`, { signal });

      ctx.ui.setWidget("playdate", undefined);
      ctx.ui.notify(`${pdxName} deployed and launched`, "info");

      const durationMs = Date.now() - start;

      return {
        content: [
          {
            type: "text",
            text: `Deployed ${pdxName} to device (${durationMs}ms)`,
          },
        ],
        details: {
          port,
          volumePath,
          pdxName,
          durationMs,
          launched: true,
        },
      };
    },

    renderCall(args: RunDeviceParams, theme: Theme) {
      return new ToolCallHeader(
        {
          toolName: "Playdate Run Device",
          mainArg: args.pdxPath || "",
          optionArgs: [],
          longArgs: [],
        },
        theme,
      );
    },

    renderResult(
      result: AgentToolResult<RunDeviceDetails>,
      options: ToolRenderResultOptions,
      theme: Theme,
    ) {
      if (options.isPartial) {
        return new Text(
          theme.fg("muted", "Playdate Run Device: deploying..."),
          0,
          0,
        );
      }

      const { details } = result;
      if (!details?.pdxName) {
        const textBlock = result.content.find((c) => c.type === "text");
        const errorMsg =
          (textBlock?.type === "text" && textBlock.text) || "Deployment failed";
        return new Text(theme.fg("error", errorMsg), 0, 0);
      }

      if (!details.launched) {
        return new Text(theme.fg("muted", "Deployment cancelled"), 0, 0);
      }

      const fields = [
        { label: "Game", value: details.pdxName, showCollapsed: true },
        { label: "Port", value: details.port, showCollapsed: true },
      ];

      const footerItems = [{ label: "time", value: `${details.durationMs}ms` }];

      return new ToolBody(
        {
          fields,
          footer: new ToolFooter(theme, {
            items: footerItems,
            separator: " | ",
          }),
          includeSpacerBeforeFooter: true,
        },
        options,
        theme,
      );
    },
  };
}

export function registerRunDeviceTool(
  pi: ExtensionAPI,
  config: ResolvedPlaydateConfig,
  state: RuntimeState,
) {
  pi.registerTool(createRunDeviceTool(pi, config, state));
}
