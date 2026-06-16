export type Translator = (key: string, params?: Record<string, string | number | boolean>) => string

export function maybeTranslate(t: Translator, value: string | undefined) {
  if (!value) return value
  if (
    value.startsWith("keybind.") ||
    value.startsWith("command.") ||
    value.startsWith("category.") ||
    value.startsWith("home.") ||
    value.startsWith("prompt.") ||
    value.startsWith("dialog.") ||
    value.startsWith("sidebar.")
  )
    return t(value)
  return value
}