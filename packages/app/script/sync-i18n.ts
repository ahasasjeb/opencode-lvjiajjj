import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import missing from "./i18n-missing-translations.json"
import missingRest from "./i18n-missing-rest.json"

const overlays = { ...missing, ...missingRest } as Record<string, Record<string, string>>

const root = path.join(import.meta.dir, "../src/i18n")
const en = JSON.parse(await readFile(path.join(root, "en.json"), "utf8")) as Record<string, string>
const enKeys = Object.keys(en)
const locales = [
  "zh",
  "zht",
  "ko",
  "de",
  "es",
  "fr",
  "da",
  "ja",
  "pl",
  "ru",
  "uk",
  "ar",
  "no",
  "br",
  "bs",
  "th",
  "tr",
] as const

for (const locale of locales) {
  const file = path.join(root, `${locale}.json`)
  const current = JSON.parse(await readFile(file, "utf8")) as Record<string, string>
  const overlay = overlays[locale]
  const merged = { ...current, ...overlay }
  const ordered: Record<string, string> = {}
  const missing: string[] = []
  for (const key of enKeys) {
    const value = merged[key] ?? en[key]
    if (!(key in merged)) missing.push(key)
    ordered[key] = value
  }
  await writeFile(file, `${JSON.stringify(ordered, null, 2)}\n`)
  const extra = Object.keys(merged).filter((key) => !(key in en))
  console.log(`${locale}: ${Object.keys(ordered).length} keys, filled ${Object.keys(overlay).length}, missing ${missing.length}, extra ${extra.length}`)
  if (missing.length) console.log(`  still missing: ${missing.join(", ")}`)
  if (extra.length) console.log(`  extra keys: ${extra.join(", ")}`)
}