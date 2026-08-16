import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("package files ship the full host implementation", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))
  assert.ok(pkg.files.includes("lib"), "files must include the lib directory")
})
