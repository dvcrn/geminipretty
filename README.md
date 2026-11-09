# geminipretty

A CLI tool for pretty-printing streamed JSON output from Antigravity / Gemini CLI (`agy --output-format stream-json`).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

## Installation

```bash
npm install -g geminipretty
```

## Usage

Pipe `agy` streaming JSON output into `geminipretty`:

```bash
agy -p "create a simple todo app" --output-format stream-json | geminipretty
```

## Example Output

Generates this:

```text
[SYSTEM] Session a45d27f1 started with 60 tools (Gemini 3.8 Flash (Low))
[ASSISTANT] [run_command: {"CommandLine":"ls -la /Users/david/src/geminipretty"}]
[TOOL] [run_command result: Command exited with code 0. Command output: total 0 drwxr-xr-x 3 david staff 96 Nov 9 17:06 . drwxr-...]
[ASSISTANT] done.
[RESULT] SUCCESS - Duration: 14.23s, Tokens: 11331, Turns: 1
```

From this:

```json
{"event":"init","conversation_id":"a45d27f1-3c4b-4c81-b684-5cdaf4f2e353","init":{"model":"Gemini 3.8 Flash (Low)","cwd":"/Users/david/src/geminipretty","tools":["..."],"permission_mode":"always-proceed"}}
{"event":"step_update","step_update":{"conversation_id":"a45d27f1-3c4b-4c81-b684-5cdaf4f2e353","step_index":0,"state":"DONE","step_type":"user_input"}}
{"event":"step_update","step_update":{"conversation_id":"a45d27f1-3c4b-4c81-b684-5cdaf4f2e353","step_index":1,"state":"DONE","step_type":"agent_response","duration_seconds":5.549488,"usage":{"input_tokens":5526,"output_tokens":49,"thinking_tokens":0,"cache_read_tokens":16312,"total_tokens":5575}}}
{"event":"step_update","step_update":{"conversation_id":"a45d27f1-3c4b-4c81-b684-5cdaf4f2e353","step_index":2,"state":"ACTIVE","step_type":"tool","tool_name":"run_command","tool_info":{"name":"run_command","parameters":{"CommandLine":"ls -la /Users/david/src/geminipretty"}}}}
{"event":"step_update","step_update":{"conversation_id":"a45d27f1-3c4b-4c81-b684-5cdaf4f2e353","step_index":2,"state":"DONE","step_type":"tool","tool_name":"run_command","duration_seconds":0.114201,"tool_info":{"name":"run_command","parameters":{"CommandLine":"ls -la /Users/david/src/geminipretty"},"output":"Command exited with code 0.\n\nCommand output:\ntotal 0\r\ndrwxr-xr-x 3 david staff 96 Nov 9 17:06 .\r\n..."}}}
{"event":"step_update","step_update":{"conversation_id":"a45d27f1-3c4b-4c81-b684-5cdaf4f2e353","step_index":3,"state":"ACTIVE","step_type":"agent_response","text_delta":"done."}}
{"event":"step_update","step_update":{"conversation_id":"a45d27f1-3c4b-4c81-b684-5cdaf4f2e353","step_index":3,"state":"DONE","step_type":"agent_response","text_delta":"\n","duration_seconds":4.329553,"usage":{"input_tokens":5754,"output_tokens":2,"thinking_tokens":0,"cache_read_tokens":16305,"total_tokens":5756}}}
{"event":"result","result":{"conversation_id":"a45d27f1-3c4b-4c81-b684-5cdaf4f2e353","status":"SUCCESS","response":"done.\n","duration_seconds":14.229163,"num_turns":1,"usage":{"input_tokens":11280,"output_tokens":51,"thinking_tokens":0,"cache_read_tokens":32617,"total_tokens":11331}}}
```

## Requirements

- Node.js 18.0.0+ or Bun
- Used with piped `stream-json` input

## License

MIT © [David Mohl](https://github.com/dvcrn)
