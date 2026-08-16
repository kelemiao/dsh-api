const base = process.env.DSH_API_URL ?? "http://127.0.0.1:4777"
const token = process.env.DSH_API_TOKEN
if (!token) throw new Error("set DSH_API_TOKEN")

async function rpc(path, init = {}) {
  const response = await fetch(base + path, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.headers || {}) } })
  const text = await response.text()
  console.log(path, response.status, text.slice(0, 200))
  return { response, text }
}

const list = await rpc("/api/sessions")
const created = await rpc("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) })
const sessionId = JSON.parse(created.text).sessionId
await rpc(`/api/sessions/${sessionId}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: [{ type: "text", text: "Say OK" }] }) })
const stream = await fetch(`${base}/api/sessions/${sessionId}/stream`, { headers: { authorization: `Bearer ${token}` } })
for await (const chunk of stream.body) console.log(new TextDecoder().decode(chunk))
