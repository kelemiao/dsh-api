import assert from "node:assert/strict"
import test from "node:test"
import { DshApiSettingsSchema, DEFAULT_PORT, resolveSettings, SETTINGS_NAMESPACE_RAW } from "../lib/config.js"

test("defaults port to 4777 and enabled to true", () => {
  const resolved = resolveSettings({})
  assert.equal(resolved.enabled, true)
  assert.equal(resolved.port, DEFAULT_PORT)
  assert.equal(typeof resolved.token, "string")
  assert.ok(resolved.token.length >= 16)
})

test("schema accepts a valid section and rejects a bad port", () => {
  assert.equal(SETTINGS_NAMESPACE_RAW, "dsh-api")
  const value = DshApiSettingsSchema({ enabled: false, port: 5000, token: "0123456789abcdef" })
  assert.equal(value.port, 5000)
  assert.throws(() => DshApiSettingsSchema({ port: 80 }))
})

test("entry token wins over the generated fallback", () => {
  const resolved = resolveSettings({ enabled: true, port: 4777, token: "entry-token-123" })
  assert.equal(resolved.token, "entry-token-123")
})
