import assert from "node:assert/strict"
import test from "node:test"
import { apply, name, inject } from "../lib/index.js"

function makeCtx(apiProxy) {
  const effects = []
  return {
    ctx: {
      apiProxy,
      inject(services, callback) {
        if (services.includes("settings")) return
      },
      effect(run) {
        effects.push(run)
        return () => {}
      }
    },
    effects
  }
}

test("host plugin declares the official name and apiProxy injection", () => {
  assert.equal(name, "dsh-api")
  assert.deepEqual(inject, ["apiProxy"])
})

test("apply with enabled=false installs the lifecycle effect and starts no server", async () => {
  const { ctx, effects } = makeCtx({ sessions: {}, events: {} })
  apply(ctx, { enabled: false, port: 0, token: "test-token-123456" })
  assert.equal(effects.length, 1)
  const dispose = await effects[0]()
  assert.equal(typeof dispose, "function")
})

test("apply with enabled=true runs the effect, returns a disposer, and disposing does not throw", async () => {
  const { ctx, effects } = makeCtx({ sessions: {}, events: {} })
  apply(ctx, { enabled: true, port: 0, token: "test-token-123456" })
  assert.equal(effects.length, 1)
  const dispose = await effects[0]()
  await new Promise((resolve) => setTimeout(resolve, 150))
  assert.equal(typeof dispose, "function")
  assert.doesNotThrow(() => dispose())
})
