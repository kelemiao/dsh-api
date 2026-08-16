# dsh-api

dsh-api is a DeepSeek Harness (DSH) host plugin that exposes a local HTTP API
so other AI agents can control DSH without touching the GUI. It listens on
`127.0.0.1` only and allows agents to list sessions, create sessions, read
history, send messages, receive a streaming reply, and cancel a running turn.

All GUI capabilities are available to host plugins through the official
`ApiProxy` service. dsh-api wraps that service with the official
`toFetchHandler` transport and adds a small convenience layer. The raw
transport stays available so later milestones can expose more domains without
changing the plugin architecture.

## Install

Install the plugin into a DSH web profile and enable it via a cordis patch:

```bash
dsh plugin --profile web add link:.
```

```jsonc
{
  "plugins": {
    "dsh-api": {}
  }
}
```

The plugin registers a settings namespace named `dsh-api` and starts its
server from those resolved settings. Settings changes apply live.

## Settings

| field   | type   | default             | notes                    |
|---------|--------|---------------------|--------------------------|
| enabled | bool   | true                | server on/off            |
| port    | int    | 4777                | 1-65535, loopback only   |
| token   | secret | generated on first run | fixed bearer token    |

## Endpoints

### Raw official transport

| Method | Path              | Purpose                                        |
|--------|-------------------|------------------------------------------------|
| POST   | `/api/*`          | Forwards the official JSON RPC envelope.       |
| GET    | `/api/events.mux` | Forwards the official aggregated SSE stream.   |

This is the long-term extension point. New domains become available as soon
as the official `ApiProxy` grows them.

### Session endpoints

| Method | Path                       | Purpose and shape                                             |
|--------|----------------------------|---------------------------------------------------------------|
| GET    | `/api/sessions`            | Returns `{ items: SessionSummary[] }`.                        |
| POST   | `/api/sessions`            | Body `{ cwd?, workspaceId?, agentPreset? }`; returns `{ sessionId, agentPreset? }`. |
| GET    | `/api/sessions/:id/history`| Query `beforeSeq?`, `maxMessages?`; returns the official history page. |
| POST   | `/api/sessions/:id/prompt` | Body `{ content: [{ type: 'text', text }], mode?: 'queue' | 'steer' }`; returns `{ accepted: true }`. |
| POST   | `/api/sessions/:id/cancel` | Returns `{ accepted: true }`.                                 |
| GET    | `/api/sessions/:id/stream` | Server-sent events filtered to the requested session.         |
| GET    | `/health`                  | Returns `{ ok: true, dshApi: true }` without authentication.  |

A prompt whose single text block starts with `/` is treated by DSH as a
slash command, matching GUI behavior.

## Authentication

Send `Authorization: Bearer <token>` on every request except `/health`.
Missing or wrong tokens receive `401` with a JSON error body. The server
binds `127.0.0.1` only; the settings schema rejects empty tokens and ports
outside 1-65535.

## SSE usage

Open a stream and read `data:` lines to follow one session:

```bash
curl -N -H "Authorization: Bearer $DSH_API_TOKEN" \
  http://127.0.0.1:4777/api/sessions/<sessionId>/stream
```

The plugin opens the official mux stream and forwards only frames whose
`sessionId` equals the requested session. Each forwarded frame is the
official `MuxFrame` union: `session/event`, `session/subscribed`,
`session/queue`, `session/jobs`, `session/projection`, approvals, questions,
and `stream/error`. A prompt and its streaming reply follow a flow of
prompt, stream, then either close the stream or cancel.

## Smoke test

Against a running DSH with the plugin enabled, set the token and run:

```bash
DSH_API_TOKEN=<token> node scripts/smoke.mjs
```

`DSH_API_URL` defaults to `http://127.0.0.1:4777`.

## Milestone scope

Milestone one delivers the session-control core: list sessions, create
sessions, read history, send messages, receive a streaming reply, and cancel
a running turn.

Out of scope for milestone one:

- Convenience endpoints for approvals, subagents, goals, jobs, settings,
  credentials, and workspace mutation. The raw passthrough exposes them, but
  documented ergonomic wrappers come later.
- TLS, remote bind, and multi-user tokens.
- Long-running background job management.
