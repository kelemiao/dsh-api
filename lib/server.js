import { createServer } from "node:http"
import { randomUUID } from "node:crypto"
import { RpcId } from "@deepseek-ai/dsh-host-apiproxy"
import { nodeToRequest, writeFetchResponse } from "./http-adapter.js"

const BASE = "http://127.0.0.1"

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", (chunk) => { data += chunk })
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")) } catch (e) { reject(e) } })
    req.on("error", reject)
  })
}

function authorize(req, token) {
  const header = req.headers.authorization ?? ""
  return header === `Bearer ${token}`
}

export function createDshApiServer({ api, fetch, token, port }) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, BASE)
    try {
      if (url.pathname === "/health") {
        json(res, 200, { ok: true, dshApi: true })
        return
      }
      if (!authorize(req, token)) {
        json(res, 401, { ok: false, error: { code: "unauthorized", message: "missing or invalid bearer token" } })
        return
      }
      if (url.pathname.startsWith("/api/") || url.pathname === "/api/events.mux") {
        await writeFetchResponse(res, await fetch(nodeToRequest(req, BASE)))
        return
      }
      json(res, 404, { ok: false, error: { code: "not-found", message: `unknown route ${url.pathname}` } })
    } catch (error) {
      json(res, 500, { ok: false, error: { code: "internal", message: String(error) } })
    }
  })
}
