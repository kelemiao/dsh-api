# dsh-api

Local HTTP API for DeepSeek Harness (DSH). Other AI agents use it to control
DSH through plain HTTP instead of the GUI.

Milestone one covers session control: list and create sessions, read history,
send prompts, stream replies, and cancel turns. Everything else remains
available through the raw `/api/*` passthrough.

## Install

Install the plugin into a DSH web profile:

```bash
dsh plugin --profile web add link:C:/path/to/dsh-api
```

Enable it in the profile cordis patch:

```jsonc
{
  "plugins": {
    "dsh-api": {}
  }
}
```

Settings live in the GUI Settings page under `dsh-api` and apply immediately.

## Settings

| Field   | Type   | Default               | Notes                  |
|---------|--------|-----------------------|------------------------|
| enabled | bool   | true                  | server on/off          |
| port    | int    | 4777                  | 1-65535, loopback only |
| token   | secret | generated on first run | fixed bearer token     |

## Endpoints

| Method | Path                      | Purpose                                        |
|--------|---------------------------|------------------------------------------------|
| GET    | `/health`                 | Public health check.                           |
| GET    | `/api/sessions`           | List sessions: `{ items: SessionSummary[] }`.  |
| POST   | `/api/sessions`           | Create session; body `{ cwd?, workspaceId?, agentPreset? }`. |
| GET    | `/api/sessions/:id/history` | Read history; query `beforeSeq?`, `maxMessages?`. |
| POST   | `/api/sessions/:id/prompt` | Send prompt; body `{ content, mode? }`.        |
| POST   | `/api/sessions/:id/cancel` | Cancel the running turn.                       |
| GET    | `/api/sessions/:id/stream` | SSE stream filtered to this session.           |
| POST   | `/api/*`                  | Raw official ApiProxy JSON RPC passthrough.    |
| GET    | `/api/events.mux`         | Raw official aggregated SSE stream.            |

Convenience routes win over the passthrough; any other request whose path
starts with `/api/` is forwarded verbatim to the official ApiProxy transport.

## Authentication

All routes except `/health` require `Authorization: Bearer <token>`. The
server binds `127.0.0.1` only. Missing or wrong tokens get `401`.

## SSE

```bash
curl -N -H "Authorization: Bearer $DSH_API_TOKEN" \
  http://127.0.0.1:4777/api/sessions/<sessionId>/stream
```

Frames are official MuxFrame objects, filtered by session id. A prompt whose
single text block starts with `/` runs as a slash command, like the GUI.

## Smoke test

With the plugin enabled in a running DSH:

```bash
DSH_API_TOKEN=<token> node scripts/smoke.mjs
```

`DSH_API_URL` defaults to `http://127.0.0.1:4777`.

## Scope

Out of milestone one: ergonomic wrappers for approvals, subagents, goals,
jobs, settings, credentials, and workspace mutation; TLS; remote bind;
multi-user tokens.
