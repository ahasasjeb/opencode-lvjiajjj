import * as i18n from "@solid-primitives/i18n"
import { createMemo, createResource } from "solid-js"
import { createSimpleContext } from "./helper"
import { useKV } from "./kv"
import en from "../i18n/en.json"
import zh from "../i18n/zh.json"
import type { I18nKey } from "../i18n/types"
import type { Translator } from "../i18n/translate"

export type TuiLocale = "en" | "zh"

type Dictionary = i18n.Flatten<typeof en>

const LOCALES: readonly TuiLocale[] = ["en", "zh"]

const INTL: Record<TuiLocale, string> = {
  en: "en",
  zh: "zh-Hans",
}

const LABEL_KEY: Record<TuiLocale, I18nKey> = {
  en: "language.en",
  zh: "language.zh",
}

const base = i18n.flatten(en)
const dicts = new Map<TuiLocale, Dictionary>([
  ["en", base],
  ["zh", { ...base, ...i18n.flatten(zh as Record<string, string>) } as Dictionary],
])

function loadDict(locale: TuiLocale) {
  return Promise.resolve(dicts.get(locale) ?? base)
}

const localeMatchers: Array<{ locale: TuiLocale; match: (language: string) => boolean }> = [
  { locale: "en", match: (language) => language.startsWith("en") },
  { locale: "zh", match: (language) => language.startsWith("zh") },
]

function detectLocale(): TuiLocale {
  const env = process.env.OPENCODE_LOCALE ?? process.env.LANG ?? process.env.LC_ALL
  if (!env) return "en"
  const language = env.split(".")[0]?.toLowerCase() ?? ""
  const match = localeMatchers.find((entry) => entry.match(language))
  if (match) return match.locale
  return "en"
}

export function normalizeLocale(value: string): TuiLocale {
  return LOCALES.includes(value as TuiLocale) ? (value as TuiLocale) : "en"
}

export const { use: useLanguage, provider: LanguageProvider } = createSimpleContext({
  name: "Language",
  init: (props: { locale?: TuiLocale }) => {
    const kv = useKV()
    const initial = props.locale ?? detectLocale()
    if (kv.get("locale") === undefined) kv.set("locale", initial)
    const locale = createMemo<TuiLocale>(() => normalizeLocale(String(kv.get("locale", initial))))
    const intl = createMemo(() => INTL[locale()])

    const [dict] = createResource(locale, loadDict, {
      initialValue: dicts.get(locale()) ?? base,
    })

    const t = i18n.translator(() => dict() ?? base, i18n.resolveTemplate) as (
      key: I18nKey,
      params?: Record<string, string | number | boolean>,
    ) => string

    const label = (value: TuiLocale) => t(LABEL_KEY[value])

    const translate: Translator = (key, params) => t(key as I18nKey, params)

    return {
      locale,
      intl,
      locales: LOCALES,
      label,
      t: translate,
      setLocale(next: TuiLocale) {
        kv.set("locale", normalizeLocale(next))
      },
    }
  },
})