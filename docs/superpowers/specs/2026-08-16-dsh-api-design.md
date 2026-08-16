# dsh-api design

Date: 2026-08-16
Status: approved by the project owner on 2026-08-16

## Purpose

dsh-api is a DeepSeek Harness host plugin that exposes a local HTTP API so
other AI agents can control DSH without touching the GUI. The first milestone
covers the session-control core: list sessions, create sessions, read history,
send messages, receive a streaming reply, and cancel a running turn.

All GUI capabilities are already available to host plugins through the
official `ApiProxy` service. dsh-api wraps that service with the official
`toFetchHandler` transport and adds a small convenience layer. The raw
transport stays available so later milestones can expose tool approvals,
goals, jobs, settings, and other domains without changing the plugin
architecture.

## Constraints

- The plugin is a separate repository from dsh-animation-optimization.
- The API listens on 127.0.0.1 only.
- Every request except `/health` requires a fixed bearer token.
- The port and token are configured in the DSH Settings GUI and apply live.
- The implementation uses official DSH packages. No reverse engineering of
  the GUI or private internals.
- The first milestone does not add convenience endpoints for tool approvals,
  subagents, goals, or jobs. The raw passthrough still exposes those domains.

## Architecture

```
Browser DSH GUI
      |
      | ctx.apiProxy (official host service)
      v
dsh-api host plugin
      |
      | toFetchHandler(apiProxy)  -> official RPC + SSE transport
      v
node:http server bound to 127.0.0.1:<port>
      |
      | Authorization: Bearer <token>
      v
Other local agents (curl, scripts, AI clients)
```

The host plugin:

1. Injects the official ApiProxy service and the settings service.
2. Registers a settings namespace named `dsh-api`.
3. Reads the resolved settings and starts the HTTP server.
4. Watches the settings scope and restarts the server when the enabled flag,
   port, or token changes.
5. Wraps `toFetchHandler(ctx.apiProxy).fetch` as the raw API layer.
6. Adds convenience session endpoints that call `ctx.apiProxy.sessions` and
   `ctx.apiProxy.events` directly.

## Settings

Namespace: `dsh-api`

| field   | type   | default                  | notes                          |
|---------|--------|--------------------------|--------------------------------|
| enabled | bool   | true                     | server on/off                  |
| port    | int    | 4777                     | 1-65535, loopback only         |
| token   | secret | generated on first run   | fixed bearer token             |

The host registers the namespace through `ctx.settings.register` with
`applies: 'live'`. The token default is generated once and persisted through
the normal settings write path. The client settings page uses the official
`SettingsScopeBinder` from `@deepseek-ai/dsh-client-ui-settings`, so values
live in the DSH settings document rather than browser localStorage.

## HTTP surface

### Raw official transport

- `POST /api/*` forwards the official JSON RPC envelope to
  `toFetchHandler(apiProxy)`.
- `GET /api/events.mux` forwards the official aggregated SSE stream.

This is the long-term extension point. New domains become available as soon
as the official ApiProxy grows them.

### Convenience session endpoints

All request and response bodies are JSON unless noted otherwise.

- `GET /api/sessions`
  returns `{ items: SessionSummary[] }`.

- `POST /api/sessions`
  body `{ cwd?: string, workspaceId?: string, agentPreset?: string }`
  returns `{ sessionId, agentPreset? }`.

- `GET /api/sessions/:id/history`
  query `beforeSeq?`, `maxMessages?`
  returns the official history page `{ events, hasMore, projections? }`.

- `POST /api/sessions/:id/prompt`
  body `{ content: [{ type: 'text', text }], mode?: 'queue' | 'steer' }`
  returns `{ accepted: true }`.
  A prompt whose single text block starts with `/` is treated by DSH as a
  slash command, matching GUI behavior.

- `POST /api/sessions/:id/cancel`
  returns `{ accepted: true }`.

- `GET /api/sessions/:id/stream`
  Server-sent events. The plugin opens the official mux stream and forwards
  only frames whose `sessionId` equals the requested session. Frame shape is
  the official `MuxFrame` union: `session/event`, `session/subscribed`,
  `session/queue`, `session/jobs`, `session/projection`, approvals, questions,
  and `stream/error`.

- `GET /health`
  returns `{ ok: true, dshApi: true }` without authentication.

### Authentication

The client sends `Authorization: Bearer <token>` on every request except
`/health`. Missing or wrong tokens receive `401` with a JSON error body.
The server binds `127.0.0.1` only; the settings schema rejects empty tokens
and ports outside 1-65535.

## Data flow for one prompt

1. Agent sends `POST /api/sessions/:id/prompt`.
2. Plugin validates the token and payload, then calls
   `ctx.apiProxy.sessions.prompt`.
3. DSH admits the message and starts the turn.
4. Agent opens `GET /api/sessions/:id/stream`.
5. The plugin subscribes to `ctx.apiProxy.events.mux` and forwards matching
   frames as SSE `data:` lines.
6. Agent closes the stream or sends `POST /api/sessions/:id/cancel` to stop.

## Error handling

- Authentication and validation errors are returned directly by dsh-api.
- Official business errors are passed through in the official RPC error
  shape with their domain error codes.
- SSE forwarding emits the official `stream/error` frame and closes only on
  infrastructure failure; ordinary turn errors arrive as DSH events.

## Testing

- Host unit tests with a fake `ctx.apiProxy`: routing, token checks, session
  convenience mapping, SSE filtering, settings watcher restart.
- Client unit tests for the settings section rendering and field writes.
- One manual smoke test against a running DSH: list sessions, create a
  session, send a prompt, read SSE frames, cancel.
- The raw passthrough is tested by asserting that POST `/api/...` calls the
  injected fetch handler without transformation.

## Out of scope for milestone one

- Convenience endpoints for approvals, subagents, goals, jobs, settings,
  credentials, and workspace mutation. The raw passthrough exposes them, but
  documented ergonomic wrappers come later.
- TLS, remote bind, and multi-user tokens.
- Long-running background job management.
