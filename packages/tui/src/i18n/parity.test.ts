import { describe, expect, test } from "bun:test"
import en from "./en.json"
import zh from "./zh.json"
import zht from "./zht.json"
import ko from "./ko.json"
import de from "./de.json"
import es from "./es.json"
import fr from "./fr.json"
import da from "./da.json"
import ja from "./ja.json"
import pl from "./pl.json"
import ru from "./ru.json"
import uk from "./uk.json"
import ar from "./ar.json"
import no from "./no.json"
import br from "./br.json"
import bs from "./bs.json"
import th from "./th.json"
import tr from "./tr.json"

const keys = ["command.language.list", "prompt.placeholder.normal", "home.tip.plugins"] as const
const languageKeys = [
  "category.language",
  "command.language.cycle",
  "command.language.set",
  "toast.language.description",
  "toast.language.title",
  "dialog.language.title",
  "command.language.list",
] as const
const locales = [zh, zht, ko, de, es, fr, da, ja, pl, ru, uk, ar, no, br, bs, th, tr]

describe("i18n parity", () => {
  test("zh locale translates targeted keys", () => {
    for (const key of keys) {
      expect(zh[key]).toBeDefined()
      expect(zh[key]).not.toBe(en[key])
    }
  })

  test("LLM CNY keys exist in both locales", () => {
    const enKeys = Object.keys(en).filter((key) => key.startsWith("plugin.llmCny."))
    const zhKeys = Object.keys(zh).filter((key) => key.startsWith("plugin.llmCny."))
    expect(zhKeys.sort()).toEqual(enKeys.sort())
  })

  test("non-English locales translate the language command", () => {
    for (const locale of locales) {
      for (const key of languageKeys) {
        expect(locale[key]).toBeDefined()
        expect(locale[key]).not.toBe(en[key])
      }
    }
  })
})
