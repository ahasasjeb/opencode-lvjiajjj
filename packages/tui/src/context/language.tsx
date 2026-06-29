import * as i18n from "@solid-primitives/i18n"
import { createMemo, createResource } from "solid-js"
import { createSimpleContext } from "./helper"
import { useKV } from "./kv"
import en from "../i18n/en.json"
import zh from "../i18n/zh.json"
import zht from "../i18n/zht.json"
import ko from "../i18n/ko.json"
import de from "../i18n/de.json"
import es from "../i18n/es.json"
import fr from "../i18n/fr.json"
import da from "../i18n/da.json"
import ja from "../i18n/ja.json"
import pl from "../i18n/pl.json"
import ru from "../i18n/ru.json"
import uk from "../i18n/uk.json"
import ar from "../i18n/ar.json"
import no from "../i18n/no.json"
import br from "../i18n/br.json"
import bs from "../i18n/bs.json"
import th from "../i18n/th.json"
import tr from "../i18n/tr.json"
import type { I18nKey } from "../i18n/types"
import type { Translator } from "../i18n/translate"

const LOCALES = [
  "en",
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

export type TuiLocale = (typeof LOCALES)[number]

type Dictionary = i18n.Flatten<typeof en>

const INTL: Record<TuiLocale, string> = {
  en: "en",
  zh: "zh-Hans",
  zht: "zh-Hant",
  ko: "ko",
  de: "de",
  es: "es",
  fr: "fr",
  da: "da",
  ja: "ja",
  pl: "pl",
  ru: "ru",
  uk: "uk",
  ar: "ar",
  no: "nb",
  br: "pt-BR",
  bs: "bs",
  th: "th",
  tr: "tr",
}

const LABEL_KEY: Record<TuiLocale, I18nKey> = {
  en: "language.en",
  zh: "language.zh",
  zht: "language.zht",
  ko: "language.ko",
  de: "language.de",
  es: "language.es",
  fr: "language.fr",
  da: "language.da",
  ja: "language.ja",
  pl: "language.pl",
  ru: "language.ru",
  uk: "language.uk",
  ar: "language.ar",
  no: "language.no",
  br: "language.br",
  bs: "language.bs",
  th: "language.th",
  tr: "language.tr",
}

const base = i18n.flatten(en)
const dicts = new Map<TuiLocale, Dictionary>([
  ["en", base],
  ["zh", { ...base, ...i18n.flatten(zh as Record<string, string>) } as Dictionary],
  ["zht", { ...base, ...i18n.flatten(zht) } as Dictionary],
  ["ko", { ...base, ...i18n.flatten(ko) } as Dictionary],
  ["de", { ...base, ...i18n.flatten(de) } as Dictionary],
  ["es", { ...base, ...i18n.flatten(es) } as Dictionary],
  ["fr", { ...base, ...i18n.flatten(fr) } as Dictionary],
  ["da", { ...base, ...i18n.flatten(da) } as Dictionary],
  ["ja", { ...base, ...i18n.flatten(ja) } as Dictionary],
  ["pl", { ...base, ...i18n.flatten(pl) } as Dictionary],
  ["ru", { ...base, ...i18n.flatten(ru) } as Dictionary],
  ["uk", { ...base, ...i18n.flatten(uk) } as Dictionary],
  ["ar", { ...base, ...i18n.flatten(ar) } as Dictionary],
  ["no", { ...base, ...i18n.flatten(no) } as Dictionary],
  ["br", { ...base, ...i18n.flatten(br) } as Dictionary],
  ["bs", { ...base, ...i18n.flatten(bs) } as Dictionary],
  ["th", { ...base, ...i18n.flatten(th) } as Dictionary],
  ["tr", { ...base, ...i18n.flatten(tr) } as Dictionary],
])

function loadDict(locale: TuiLocale) {
  return Promise.resolve(dicts.get(locale) ?? base)
}

const localeMatchers: Array<{ locale: TuiLocale; match: (language: string) => boolean }> = [
  {
    locale: "zht",
    match: (language) =>
      language.startsWith("zh-tw") || language.startsWith("zh-hk") || language.startsWith("zh-hant"),
  },
  { locale: "en", match: (language) => language.startsWith("en") },
  { locale: "zh", match: (language) => language.startsWith("zh") },
  { locale: "ko", match: (language) => language.startsWith("ko") },
  { locale: "de", match: (language) => language.startsWith("de") },
  { locale: "es", match: (language) => language.startsWith("es") },
  { locale: "fr", match: (language) => language.startsWith("fr") },
  { locale: "da", match: (language) => language.startsWith("da") },
  { locale: "ja", match: (language) => language.startsWith("ja") },
  { locale: "pl", match: (language) => language.startsWith("pl") },
  { locale: "ru", match: (language) => language.startsWith("ru") },
  { locale: "uk", match: (language) => language.startsWith("uk") },
  { locale: "ar", match: (language) => language.startsWith("ar") },
  {
    locale: "no",
    match: (language) => language.startsWith("no") || language.startsWith("nb") || language.startsWith("nn"),
  },
  { locale: "br", match: (language) => language.startsWith("pt") },
  { locale: "bs", match: (language) => language.startsWith("bs") },
  { locale: "th", match: (language) => language.startsWith("th") },
  { locale: "tr", match: (language) => language.startsWith("tr") },
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
