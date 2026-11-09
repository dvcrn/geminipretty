const clc = require("cli-color");

function collapseWhitespace(str) {
  return String(str).replace(/\s+/g, " ").trim();
}

function truncate(str, maxLen = 100) {
  const clean = collapseWhitespace(str);
  return clean.length > maxLen ? `${clean.substring(0, maxLen)}...` : clean;
}

function formatInit(obj) {
  const init = obj.init || {};
  const sessionId = obj.conversation_id
    ? obj.conversation_id.substring(0, 8)
    : "unknown";
  const toolCount = Array.isArray(init.tools) ? init.tools.length : 0;
  const modelSuffix = init.model ? ` (${init.model})` : "";
  return clc.blue(
    `[SYSTEM] Session ${sessionId} started with ${toolCount} tools${modelSuffix}`,
  );
}

function formatToolStep(step) {
  const toolName = step.tool_name || step.tool_info?.name || "tool";
  const info = step.tool_info || {};

  if (info.error || step.state === "ERROR" || step.state === "FAILED") {
    const errMsg =
      info.error?.message || info.error?.type || info.output || "Tool failed";
    return clc.red.bold(
      `[TOOL] [${toolName} ERROR: ${collapseWhitespace(errMsg)}]`,
    );
  }

  if (step.state === "ACTIVE") {
    const params =
      info.parameters && Object.keys(info.parameters).length > 0
        ? `: ${JSON.stringify(info.parameters)}`
        : "";
    return clc.green(`[ASSISTANT] [${toolName}${params}]`);
  }

  if (typeof info.output === "string" && info.output.trim()) {
    return clc.cyan(`[TOOL] [${toolName} result: ${truncate(info.output)}]`);
  }

  return clc.cyan(`[TOOL] [${toolName} done]`);
}

function formatStepUpdate(step) {
  if (!step || typeof step !== "object") return null;

  switch (step.step_type) {
    case "user_input": {
      const text = step.text_delta?.trim();
      // agy emits a bare user_input DONE event without text at the start of each turn
      if (!text) return null;
      return clc.cyan(`[USER] ${text}`);
    }

    case "agent_response": {
      const text = step.text_delta?.trim();
      // agy emits a trailing DONE update with only a newline and token usage
      if (!text) return null;
      return clc.green(`[ASSISTANT] ${text}`);
    }

    case "thinking": {
      const text = step.text_delta?.trim();
      if (!text) return null;
      return clc.blackBright(`[THINKING] ${text}`);
    }

    case "tool":
      return formatToolStep(step);

    case "subagent": {
      const subagents = step.subagent_info?.subagents || [];
      const labels = subagents
        .map((s) => s.role || s.type_name || s.conversation_id?.substring(0, 8))
        .filter(Boolean);
      const detail = labels.length > 0 ? `${labels.join(", ")} ` : "";
      return clc.magenta(`[SUBAGENT] ${detail}(${step.state || "ACTIVE"})`);
    }

    case "workflow":
      return clc.magenta(`[WORKFLOW] (${step.state || "ACTIVE"})`);

    case "error": {
      const msg =
        step.text_delta?.trim() ||
        step.tool_info?.error?.message ||
        "Step error";
      return clc.red.bold(`[ERROR] ${collapseWhitespace(msg)}`);
    }

    default: {
      const text = step.text_delta?.trim();
      if (text) {
        return `[${(step.step_type || "STEP").toUpperCase()}] ${text}`;
      }
      return null;
    }
  }
}

function formatResult(res) {
  if (!res || typeof res !== "object") {
    return clc.yellow("[RESULT] unknown");
  }

  const isError = res.status === "ERROR" || Boolean(res.error);
  const status = res.status || (isError ? "ERROR" : "SUCCESS");
  const duration =
    typeof res.duration_seconds === "number"
      ? `${res.duration_seconds.toFixed(2)}s`
      : "unknown";
  const tokens =
    res.usage?.total_tokens != null ? `${res.usage.total_tokens}` : "unknown";

  const parts = [`Duration: ${duration}`, `Tokens: ${tokens}`];
  if (res.num_turns != null) {
    parts.push(`Turns: ${res.num_turns}`);
  }
  if (res.error) {
    parts.push(`Error: ${collapseWhitespace(res.error)}`);
  }

  const text = `[RESULT] ${status} - ${parts.join(", ")}`;
  return isError ? clc.red.bold(text) : clc.yellow(text);
}

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const obj = JSON.parse(trimmed);

    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      if (obj.event) {
        switch (obj.event) {
          case "init":
            return formatInit(obj);

          case "step_update":
            return formatStepUpdate(obj.step_update);

          case "result":
            return formatResult(obj.result);

          case "command":
            return clc.blue(`[COMMAND] ${obj.command?.name || "unknown"}`);

          default:
            return clc.blue(`[EVENT] ${obj.event}`);
        }
      }

      if (obj.short_error) {
        const reason = obj.reason ? ` (${obj.reason})` : "";
        return clc.red.bold(`[ERROR] ${obj.short_error}${reason}`);
      }

      return Object.entries(obj)
        .map(([k, v]) => {
          if (typeof v === "object" && v !== null) {
            return `${k}: ${JSON.stringify(v)}`;
          }
          return `${k}: ${v}`;
        })
        .join(", ");
    }

    return JSON.stringify(obj);
  } catch {
    return null;
  }
}

function parse(input) {
  return input
    .split(/\r?\n/)
    .map(parseLine)
    .filter((line) => line !== null);
}

module.exports = { parse, parseLine };
