import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("package files ship the full host implementation", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))
  assert.ok(pkg.files.includes("lib"), "files must include the lib directory")
})

test("package declares an official dsh bundle patch", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))
  const patch = pkg.dsh?.bundle?.patch
  assert.equal(patch, "./cordis.patch.yml", "dsh.bundle.patch must point at the patch file")
  assert.ok(pkg.files.some((f) => f.replace(/^\.\//, "") === patch.replace(/^\.\//, "")), "files must ship the patch file")
  const content = await readFile(new URL("../cordis.patch.yml", import.meta.url), "utf8")
  assert.match(content, /id: dsh-api/, "patch must insert the dsh-api row")
  assert.match(content, /name: '@kelemiao\/dsh-api'/, "patch row must resolve the scoped package")
})
