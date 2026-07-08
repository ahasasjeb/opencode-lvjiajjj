import { commandDescriptionKey } from "../config/keybind"

export type Translator = (key: string, params?: Record<string, string | number | boolean>) => string

const I18N_PREFIXES = ["keybind.", "command.", "category.", "home.", "prompt.", "dialog.", "sidebar.","plugin."] as const

const CATEGORY_ALIASES: Record<string, string> = {
  Session: "category.session",
  Prompt: "category.prompt",
  System: "category.system",
  Dialog: "category.dialog",
  VCS: "category.vcs",
  Plugins: "category.plugins",
  Autocomplete: "category.autocomplete",
  Question: "category.question",
  Permission: "category.permission",
  Agent: "category.agent",
  Provider: "category.provider",
  Workspace: "category.workspace",
  Language: "category.language",
}

function isI18nKey(value: string) {
  return I18N_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export function maybeTranslate(t: Translator, value: string | undefined) {
  if (!value) return value
  if (isI18nKey(value)) return t(value)
  return value
}

export function resolvePaletteCategory(t: Translator, value: string | undefined) {
  if (!value) return value
  const key = CATEGORY_ALIASES[value] ?? value
  return maybeTranslate(t, key) ?? value
}

export function resolvePaletteTitle(
  t: Translator,
  input: { name: string; title?: string; desc?: string },
) {
  if (typeof input.title === "string") {
    if (isI18nKey(input.title)) return t(input.title)
    const fromTitle = maybeTranslate(t, input.title)
    if (fromTitle && fromTitle !== input.title) return fromTitle
  }
  const key = commandDescriptionKey(input.name)
  if (key) return t(key)
  if (typeof input.desc === "string" && isI18nKey(input.desc)) return t(input.desc)
  if (typeof input.title === "string") return input.title
  return input.name
}

export function resolvePaletteDescription(t: Translator, input: { title?: string; desc?: string }) {
  if (typeof input.desc === "string") return maybeTranslate(t, input.desc)
  return undefined
}
