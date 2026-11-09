const assert = require("node:assert");
const { parse, parseLine } = require("./parser");

function stripColors(str) {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: needed for ANSI color stripping in tests
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

describe("parse()", () => {
  it("should format an init event into one line", () => {
    const input = JSON.stringify({
      event: "init",
      conversation_id: "468b9a68-f7d1-4f5e-86be-1c4d927f2736",
      init: {
        model: "Gemini 3.8 Flash (Low)",
        cwd: "/Users/david/src/geminipretty",
        tools: ["run_command", "view_file"],
        permission_mode: "request-review",
      },
    });
    const expected = [
      "[SYSTEM] Session 468b9a68 started with 2 tools (Gemini 3.8 Flash (Low))",
    ];
    assert.deepStrictEqual(parse(input).map(stripColors), expected);
  });

  it("should format a full agy stream-json turn and skip empty step updates", () => {
    const lines = [
      JSON.stringify({
        event: "init",
        conversation_id: "a45d27f1-3c4b-4c81-b684-5cdaf4f2e353",
        init: { model: "Gemini 3.8 Flash (Low)", tools: ["run_command"] },
      }),
      JSON.stringify({
        event: "step_update",
        step_update: {
          conversation_id: "a45d27f1-3c4b-4c81-b684-5cdaf4f2e353",
          step_index: 0,
          state: "DONE",
          step_type: "user_input",
        },
      }),
      JSON.stringify({
        event: "step_update",
        step_update: {
          conversation_id: "a45d27f1-3c4b-4c81-b684-5cdaf4f2e353",
          step_index: 1,
          state: "DONE",
          step_type: "agent_response",
          duration_seconds: 5.54,
          usage: { total_tokens: 5575 },
        },
      }),
      JSON.stringify({
        event: "step_update",
        step_update: {
          conversation_id: "a45d27f1-3c4b-4c81-b684-5cdaf4f2e353",
          step_index: 2,
          state: "ACTIVE",
          step_type: "tool",
          tool_name: "run_command",
          tool_info: {
            name: "run_command",
            parameters: { CommandLine: "ls -la" },
          },
        },
      }),
      JSON.stringify({
        event: "step_update",
        step_update: {
          conversation_id: "a45d27f1-3c4b-4c81-b684-5cdaf4f2e353",
          step_index: 2,
          state: "DONE",
          step_type: "tool",
          tool_name: "run_command",
          duration_seconds: 0.11,
          tool_info: {
            name: "run_command",
            parameters: { CommandLine: "ls -la" },
            output:
              "Command exited with code 0.\n\nCommand output:\ntotal 0\r\n",
          },
        },
      }),
      JSON.stringify({
        event: "step_update",
        step_update: {
          conversation_id: "a45d27f1-3c4b-4c81-b684-5cdaf4f2e353",
          step_index: 3,
          state: "ACTIVE",
          step_type: "agent_response",
          text_delta: "done.",
        },
      }),
      JSON.stringify({
        event: "step_update",
        step_update: {
          conversation_id: "a45d27f1-3c4b-4c81-b684-5cdaf4f2e353",
          step_index: 3,
          state: "DONE",
          step_type: "agent_response",
          text_delta: "\n",
          duration_seconds: 4.32,
          usage: { total_tokens: 5756 },
        },
      }),
      JSON.stringify({
        event: "result",
        result: {
          conversation_id: "a45d27f1-3c4b-4c81-b684-5cdaf4f2e353",
          status: "SUCCESS",
          response: "done.\n",
          duration_seconds: 14.229,
          num_turns: 1,
          usage: { total_tokens: 11331 },
        },
      }),
    ].join("\n");

    const expected = [
      "[SYSTEM] Session a45d27f1 started with 1 tools (Gemini 3.8 Flash (Low))",
      '[ASSISTANT] [run_command: {"CommandLine":"ls -la"}]',
      "[TOOL] [run_command result: Command exited with code 0. Command output: total 0]",
      "[ASSISTANT] done.",
      "[RESULT] SUCCESS - Duration: 14.23s, Tokens: 11331, Turns: 1",
    ];
    assert.deepStrictEqual(parse(lines).map(stripColors), expected);
  });

  it("should skip blank lines and invalid JSON", () => {
    const input =
      '\n  {"event":"command","command":{"name":"models"}}  \n{invalid}\n';
    const expected = ["[COMMAND] models"];
    assert.deepStrictEqual(parse(input).map(stripColors), expected);
  });
});

describe("parseLine()", () => {
  it("should return null for empty lines or invalid JSON", () => {
    assert.strictEqual(parseLine(""), null);
    assert.strictEqual(parseLine("   "), null);
    assert.strictEqual(parseLine("{invalid json}"), null);
  });

  it("should format tool errors", () => {
    const line = JSON.stringify({
      event: "step_update",
      step_update: {
        step_index: 1,
        state: "DONE",
        step_type: "tool",
        tool_name: "view_file",
        tool_info: {
          error: { type: "NOT_FOUND", message: "File does not exist" },
        },
      },
    });
    assert.strictEqual(
      stripColors(parseLine(line)),
      "[TOOL] [view_file ERROR: File does not exist]",
    );
  });

  it("should truncate long tool results to 100 characters", () => {
    const longOutput = "a".repeat(120);
    const line = JSON.stringify({
      event: "step_update",
      step_update: {
        step_index: 1,
        state: "DONE",
        step_type: "tool",
        tool_name: "view_file",
        tool_info: { output: longOutput },
      },
    });
    assert.strictEqual(
      stripColors(parseLine(line)),
      `[TOOL] [view_file result: ${"a".repeat(100)}...]`,
    );
  });

  it("should format error results", () => {
    const line = JSON.stringify({
      event: "result",
      result: {
        status: "ERROR",
        error: "Quota exceeded",
        duration_seconds: 1.5,
      },
    });
    assert.strictEqual(
      stripColors(parseLine(line)),
      "[RESULT] ERROR - Duration: 1.50s, Tokens: unknown, Error: Quota exceeded",
    );
  });

  it("should format top-level structured agent errors", () => {
    const line = JSON.stringify({
      short_error: "Authentication required",
      reason: "UNAUTHENTICATED",
    });
    assert.strictEqual(
      stripColors(parseLine(line)),
      "[ERROR] Authentication required (UNAUTHENTICATED)",
    );
  });

  it("should stringify JSON arrays and unknown objects", () => {
    assert.strictEqual(stripColors(parseLine("[1, 2, 3]")), "[1,2,3]");
    assert.strictEqual(
      stripColors(parseLine('{"foo":"bar","count":2}')),
      "foo: bar, count: 2",
    );
  });
});
