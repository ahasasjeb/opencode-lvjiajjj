import { expect, test } from "bun:test"
import path from "node:path"
import { tmpdir } from "./fixture/tmpdir"

test("bundled filesystem nodes can initialize when search loads first", async () => {
  await using tmp = await tmpdir()
  const entry = path.join(tmp.path, "entry.ts")
  await Bun.write(
    entry,
    [
      `import { FileSystemSearch } from ${JSON.stringify(path.resolve(import.meta.dir, "../src/filesystem/search.ts"))}`,
      `import { FileSystem } from ${JSON.stringify(path.resolve(import.meta.dir, "../src/filesystem.ts"))}`,
      `if (!FileSystem.node.dependencies.includes(FileSystemSearch.node)) throw new Error("Missing filesystem search dependency")`,
    ].join("\n"),
  )
  const result = await Bun.build({
    entrypoints: [entry],
    target: "bun",
    outdir: tmp.path,
    minify: true,
  })
  expect(result.success).toBe(true)
  const child = Bun.spawn([process.execPath, path.join(tmp.path, "entry.js")], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [code, error] = await Promise.all([child.exited, new Response(child.stderr).text()])
  expect(error).toBe("")
  expect(code).toBe(0)
})
