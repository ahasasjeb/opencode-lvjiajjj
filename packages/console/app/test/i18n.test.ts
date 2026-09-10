import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { dict } from "../src/i18n/en"

const directory = fileURLToPath(new URL("../src/i18n/", import.meta.url))
const keys = Object.keys(dict).sort()

for (const file of new Bun.Glob("*.ts").scanSync({ cwd: directory })) {
  if (file === "index.ts") continue

  test(`${file} covers all messages and preserves template parameters`, async () => {
    const locale: { dict: Record<string, string> } = await import(`../src/i18n/${file}`)
    expect(Object.keys(locale.dict).sort()).toEqual(keys)
    for (const key of keys) {
      expect(parameters(locale.dict[key])).toEqual(parameters(dict[key as keyof typeof dict]))
    }
  })
}

function parameters(value: string) {
  return [...value.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1]).sort()
}
