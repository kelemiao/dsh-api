import assert from "node:assert/strict"
import test from "node:test"
import { once } from "node:events"
import { createDshApiServer } from "../lib/server.js"

const fakeFetch = async (request) => {
  if (request.url.includes("/api/session.list")) {
    return Response.json({ type: "server-response", rpcId: "rpc-1", result: { ok: true, value: { items: [] } } })
  }
  return new Response("not found", { status: 404 })
}
const fakeApi = {
  sessions: { list: async () => ({ rpcId: "rpc-1", result: { ok: true, value: { items: [] } } }) },
  events: { mux: async function* () { yield { rpcId: "rpc-1", payload: { type: "session/subscribed", sessionId: "s1", lastSeq: -1 } } } }
}

async function request(server, path, token) {
  const address = server.address()
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {}
  })
  const text = await response.text()
  return { status: response.status, text }
}

test("rejects requests without the bearer token", async (t) => {
  const server = createDshApiServer({ api: fakeApi, fetch: fakeFetch, token: "secret-token", port: 0 })
  server.listen(0, "127.0.0.1")
  t.after(() => server.close())
  await once(server, "listening")
  const result = await request(server, "/api/session.list")
  assert.equal(result.status, 401)
})

test("passes authorized /api requests through the fetch handler", async (t) => {
  const server = createDshApiServer({ api: fakeApi, fetch: fakeFetch, token: "secret-token", port: 0 })
  server.listen(0, "127.0.0.1")
  t.after(() => server.close())
  await once(server, "listening")
  const result = await request(server, "/api/session.list", "secret-token")
  assert.equal(result.status, 200)
  assert.match(result.text, /server-response/)
})

test("health is public", async (t) => {
  const server = createDshApiServer({ api: fakeApi, fetch: fakeFetch, token: "secret-token", port: 0 })
  server.listen(0, "127.0.0.1")
  t.after(() => server.close())
  await once(server, "listening")
  const result = await request(server, "/health")
  assert.equal(result.status, 200)
  assert.match(result.text, /"ok":true/)
})

function unwrap(response) {
  const body = JSON.parse(response.text)
  return body
}

test("lists sessions through the official sessions api", async (t) => {
  const api = {
    sessions: { list: async ({ payload }) => ({ rpcId: "rpc-1", result: { ok: true, value: { items: [{ sessionId: payload.cursor ?? "s1" }] } } }) },
    events: { mux: async function* () {} }
  }
  const server = createDshApiServer({ api, fetch: fakeFetch, token: "secret-token", port: 0 })
  server.listen(0, "127.0.0.1")
  t.after(() => server.close())
  await once(server, "listening")
  const result = await request(server, "/api/sessions", "secret-token")
  assert.equal(result.status, 200)
  assert.equal(unwrap(result).items[0].sessionId, "s1")
})

test("prompt maps body text into official prompt content", async (t) => {
  let seen = null
  const api = {
    sessions: { prompt: async (request) => { seen = request; return { rpcId: "rpc-1", result: { ok: true, value: { accepted: true } } } } },
    events: { mux: async function* () {} }
  }
  const server = createDshApiServer({ api, fetch: fakeFetch, token: "secret-token", port: 0 })
  server.listen(0, "127.0.0.1")
  t.after(() => server.close())
  await once(server, "listening")
  const address = server.address()
  const response = await fetch(`http://127.0.0.1:${address.port}/api/sessions/s1/prompt`, {
    method: "POST",
    headers: { authorization: "Bearer secret-token", "content-type": "application/json" },
    body: JSON.stringify({ content: [{ type: "text", text: "hello" }], mode: "queue" })
  })
  assert.equal(response.status, 200)
  assert.deepEqual(seen.payload.content, [{ type: "text", text: "hello" }])
  assert.equal(seen.payload.mode, "queue")
})

test("stream filters mux frames by session id", async (t) => {
  const api = {
    sessions: {},
    events: { mux: async function* () {
      yield { rpcId: "rpc-1", payload: { type: "session/subscribed", sessionId: "s1", lastSeq: -1 } }
      yield { rpcId: "rpc-2", payload: { type: "session/subscribed", sessionId: "s2", lastSeq: -1 } }
    } }
  }
  const server = createDshApiServer({ api, fetch: fakeFetch, token: "secret-token", port: 0 })
  server.listen(0, "127.0.0.1")
  t.after(() => server.close())
  await once(server, "listening")
  const address = server.address()
  const response = await fetch(`http://127.0.0.1:${address.port}/api/sessions/s1/stream`, {
    headers: { authorization: "Bearer secret-token" }
  })
  const text = await response.text()
  assert.match(text, /"sessionId":"s1"/)
  assert.doesNotMatch(text, /"sessionId":"s2"/)
})
