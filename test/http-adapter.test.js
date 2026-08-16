import assert from "node:assert/strict"
import test from "node:test"
import { nodeToRequest } from "../lib/http-adapter.js"
import { Readable } from "node:stream"

test("converts a GET request without touching the body", () => {
  const req = new Readable({ read() {} })
  req.method = "GET"
  req.url = "/health"
  req.headers = { authorization: "Bearer abc" }
  req.push(null)
  const request = nodeToRequest(req, "http://127.0.0.1")
  assert.equal(request.url, "http://127.0.0.1/health")
  assert.equal(request.headers.get("authorization"), "Bearer abc")
  assert.equal(request.body, null)
})

test("streams a POST body into the WHATWG request", async () => {
  const req = new Readable({ read() {} })
  req.method = "POST"
  req.url = "/api/session.prompt"
  req.headers = { "content-type": "application/json" }
  const request = nodeToRequest(req, "http://127.0.0.1")
  assert.notEqual(request.body, undefined)
  req.push("hello")
  req.push(null)
  const text = await request.text()
  assert.equal(text, "hello")
})
