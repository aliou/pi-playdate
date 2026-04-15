import { ToolBody, ToolCallHeader } from "@aliou/pi-utils-ui";
import {
  type AgentToolResult,
  type ExtensionAPI,
  type ExtensionContext,
  type Theme,
  type ToolRenderResultOptions,
  truncateTail,
  withFileMutationQueue,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { DAP_QUEUE_KEY } from "../lib/dap-queue";
import { ensureSimulatorDap } from "../lib/sim";
import type { RuntimeState } from "../lib/state";

const parameters = Type.Object({
  expression: Type.String({
    description:
      'Lua expression or code to evaluate. Use "p <expr>" to print a value, or "eval <code>" to execute code.',
  }),
});

interface SimEvalParams {
  expression: string;
}

interface SimEvalDetails {
  success: boolean;
  result?: string;
  expression: string;
}

export function createSimEvalTool(state: RuntimeState) {
  return {
    name: "playdate_sim_eval",
    label: "Playdate Sim Eval",
    description:
      "Evaluate Lua expressions in the running Playdate Simulator. Use 'p <expr>' to read values, 'eval <code>' to execute code.",
    promptSnippet: "Evaluate Lua in the Playdate Simulator",
    promptGuidelines: [
      'playdate_sim_eval can read game state: expression "p variableName" returns its value.',
      'playdate_sim_eval can run code: expression "eval print(someTable)" executes it.',
      "Use __pd_inspect(table) to pretty-print tables instead of getting memory addresses.",
      'Example: "p __pd_inspect(myTable)" returns a readable representation.',
      "The simulator must be running with a Lua game loaded.",
    ],
    parameters,

    async execute(
      _toolCallId: string,
      params: SimEvalParams,
      signal: AbortSignal | undefined,
      _onUpdate: undefined,
      _ctx: ExtensionContext,
    ): Promise<AgentToolResult<SimEvalDetails>> {
      return withFileMutationQueue(DAP_QUEUE_KEY, async () => {
        const dap = await ensureSimulatorDap(state, signal);
        const result = await dap.evaluate(params.expression, signal);

        if (!result.success) {
          return {
            content: [
              { type: "text", text: result.result || "Evaluation failed" },
            ],
            details: {
              success: false,
              result: result.result,
              expression: params.expression,
            },
          };
        }

        const output = result.result || "(no return value)";
        const truncated = truncateTail(output);

        return {
          content: [{ type: "text", text: truncated.content }],
          details: {
            success: true,
            result: output,
            expression: params.expression,
          },
        };
      });
    },

    renderCall(args: SimEvalParams, theme: Theme) {
      return new ToolCallHeader(
        {
          toolName: "Playdate Sim Eval",
          mainArg: args.expression || "",
          optionArgs: [],
          longArgs: [],
        },
        theme,
      );
    },

    renderResult(
      result: AgentToolResult<SimEvalDetails>,
      options: ToolRenderResultOptions,
      theme: Theme,
    ) {
      if (options.isPartial) {
        return new Text(
          theme.fg("muted", "Playdate Sim Eval: evaluating..."),
          0,
          0,
        );
      }

      const { details } = result;
      if (!details) {
        const textBlock = result.content.find((c) => c.type === "text");
        const msg =
          (textBlock?.type === "text" && textBlock.text) || "Eval failed";
        return new ToolBody(
          {
            fields: [
              {
                label: "Error",
                value: theme.fg("error", msg),
                showCollapsed: true,
              },
            ],
          },
          options,
          theme,
        );
      }

      const fields = [
        {
          label: "Expression",
          value: details.expression,
          showCollapsed: true,
        },
      ];

      if (details.result) {
        fields.push({
          label: "Result",
          value: details.result,
          showCollapsed: true,
        });
      }

      return new ToolBody(
        {
          fields,
        },
        options,
        theme,
      );
    },
  };
}

export function registerSimEvalTool(pi: ExtensionAPI, state: RuntimeState) {
  pi.registerTool(createSimEvalTool(state));
}
