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
      'Lua expression or code to evaluate. Bare expressions are pretty-printed via inspect (e.g. "playdate.readAccelerometer()" returns "(0.5, 0, 0)"). Prefix with "p " to get raw value, or "eval " to run statements (print() output is captured and returned).',
  }),
});

interface SimEvalParams {
  expression: string;
}

// Playdate's REPL binds `print` per-chunk, so a helper function defined in a
// prior `eval` call can't intercept print() in a later chunk. We solve this
// by inlining a single-chunk wrap that defines and uses the override in the
// same evaluation.
function buildCaptureWrap(body: string): string {
  return `p (function()
  local __pd_buf = {}
  local __pd_orig = print
  print = function(...)
    local parts = {}
    for i = 1, select("#", ...) do parts[i] = tostring((select(i, ...))) end
    __pd_buf[#__pd_buf+1] = table.concat(parts, "\\t")
  end
  local __pd_ok, __pd_err = pcall(function() ${body} end)
  print = __pd_orig
  if not __pd_ok then error(__pd_err) end
  return table.concat(__pd_buf, "\\n")
end)()`;
}

function normalizeExpression(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("p ") || trimmed === "p") {
    return trimmed;
  }
  if (trimmed.startsWith("eval ") || trimmed === "eval") {
    const body = trimmed.replace(/^eval\s*/, "");
    if (!body) return trimmed;
    return buildCaptureWrap(body);
  }
  return `p __pd_dump(${trimmed})`;
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
      "Evaluate Lua expressions in the running Playdate Simulator. Bare expressions are auto-inspected. Prefix with 'p ' for raw value, 'eval ' for statements.",
    promptSnippet: "Evaluate Lua in the Playdate Simulator",
    promptGuidelines: [
      "Prefer playdate_sim_state for reading hardware state (crank, accel, buttons). Use playdate_sim_eval only for game-specific state or debugging.",
      'playdate_sim_eval auto-inspects bare expressions: "playdate.readAccelerometer()" returns "(0.5, 0, 0)".',
      'playdate_sim_eval with "p <expr>" returns the raw value (tab-separated for multi-returns).',
      'playdate_sim_eval with "eval <code>" runs statements and returns captured print() output.',
      'Use inspect(value) directly in expressions to pretty-print tables: "inspect(_G.game.board)".',
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
        const sent = normalizeExpression(params.expression);
        const result = await dap.evaluate(sent, signal);

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
