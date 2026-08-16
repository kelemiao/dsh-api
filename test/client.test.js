import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import vm from "node:vm"

const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8")

test("registers a DSH settings section named dsh-api", () => {
  const registrations = []
  const window = {
    __ModuleLoader__: { load(def) {
      const plugin = def.factory((id) => {
        if (id === "react") return { useSyncExternalStore: () => ({ enabled: true, port: 4777 }) }
        if (id === "@deepseek-ai/dsh-client-runtime/client") return { defineStore: (def) => ({ getState: def.init, actions: def.actions }) }
        return {}
      })
      plugin.apply({
        slots: { inject(name, callback) { callback() }, register(meta) { registrations.push(meta); return null } },
        get() { return { bind: () => ({ subscribe: () => () => {}, getSnapshot: () => ({}) }) } }
      })
    } }
  }
  vm.runInNewContext(source, { window, MutationObserver: class {}, setTimeout, clearTimeout })
  assert.equal(registrations[0].id, "dsh-api")
  assert.equal(registrations[0].name, "settings.section")
  assert.match(source, /"dsh-api"/)
})
