import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog } from "./dialog"
import { useBindings, useCommandShortcut } from "../keymap"
import { useLanguage } from "../context/language"

export function DialogHelp() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const language = useLanguage()
  const commandShortcut = useCommandShortcut("command.palette.show")

  useBindings(() => ({
    bindings: [
      { key: "return", desc: language.t("help.close"), group: "Dialog", cmd: () => dialog.clear() },
      { key: "escape", desc: language.t("help.close"), group: "Dialog", cmd: () => dialog.clear() },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {language.t("help.title")}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc/enter
        </text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>
          {language.t("help.hint", { shortcut: commandShortcut() })}
        </text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <box paddingLeft={3} paddingRight={3} backgroundColor={theme.primary} onMouseUp={() => dialog.clear()}>
          <text fg={theme.selectedListItemText}>{language.t("help.ok")}</text>
        </box>
      </box>
    </box>
  )
}
