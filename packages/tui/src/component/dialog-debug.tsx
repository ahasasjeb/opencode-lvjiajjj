import { TextAttributes } from "@opentui/core"
import { createMemo, createSignal, For } from "solid-js"
import { InstallationChannel, InstallationVersion } from "@opencode-ai/core/installation/version"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { useRoute } from "../context/route"
import { useLocal } from "../context/local"
import { useClipboard } from "../context/clipboard"
import { useLanguage } from "../context/language"
import { useToast } from "../ui/toast"
import { useBindings } from "../keymap"
import { describeOS, describeTerminal } from "../util/system"

export function DialogDebug() {
  const { theme } = useTheme()
  const dialog = useDialog()
  const route = useRoute()
  const local = useLocal()
  const clipboard = useClipboard()
  const language = useLanguage()
  const toast = useToast()
  const [copied, setCopied] = createSignal(false)

  dialog.setSize("large")

  const entries = createMemo(() => {
    const model = local.model.current()
    return [
      { label: language.t("dialog.debug.version"), value: `${InstallationVersion} (${InstallationChannel})` },
      { label: language.t("dialog.debug.date"), value: new Date().toISOString() },
      { label: language.t("dialog.debug.os"), value: describeOS() },
      { label: language.t("dialog.debug.terminal"), value: describeTerminal() },
      {
        label: language.t("dialog.debug.session_id"),
        value: route.data.type === "session" ? route.data.sessionID : language.t("dialog.debug.not_available"),
      },
      {
        label: language.t("dialog.debug.model"),
        value: model ? `${model.providerID}/${model.modelID}` : language.t("dialog.debug.not_available"),
      },
    ]
  })

  const copy = () => {
    const text = entries()
      .map((entry) => `${entry.label}: ${entry.value}`)
      .join("\n")
    void clipboard
      .write?.(text)
      .then(() => {
        setCopied(true)
        toast.show({ message: language.t("toast.debug_copied"), variant: "info" })
      })
      .catch(toast.error)
  }

  useBindings(() => ({
    bindings: [
      {
        key: "return",
        desc: language.t("dialog.debug.copy_keybind"),
        group: language.t("category.dialog"),
        cmd: copy,
      },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          {language.t("dialog.debug.title")}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      {/* No click-to-copy here: releasing a mouse selection must trigger the
          global copy-on-select so users can copy a single value, e.g. the session id. */}
      <box>
        <For each={entries()}>
          {(entry) => (
            <box flexDirection="row" gap={1}>
              <text flexShrink={0} fg={theme.textMuted}>
                {entry.label.padEnd(10)}
              </text>
              <text fg={theme.text} wrapMode="word">
                {entry.value}
              </text>
            </box>
          )}
        </For>
      </box>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.textMuted}>{language.t("dialog.debug.share_hint")}</text>
        <text onMouseUp={copy}>
          <span style={{ fg: copied() ? theme.success : theme.text }}>
            <b>{copied() ? `✓ ${language.t("dialog.debug.copied")}` : language.t("dialog.debug.copy")}</b>{" "}
          </span>
          <span style={{ fg: theme.textMuted }}>enter</span>
        </text>
      </box>
    </box>
  )
}
