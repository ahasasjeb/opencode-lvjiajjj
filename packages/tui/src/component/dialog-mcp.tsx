import { createMemo, createSignal } from "solid-js"
import { useLocal } from "../context/local"
import { useSync } from "../context/sync"
import { map, pipe, entries, sortBy } from "remeda"
import { DialogSelect, type DialogSelectRef, type DialogSelectOption } from "../ui/dialog-select"
import { useTheme } from "../context/theme"
import { TextAttributes } from "@opentui/core"
import { useSDK } from "../context/sdk"
import { useLanguage } from "../context/language"

function Status(props: { enabled: boolean; loading: boolean }) {
  const { theme } = useTheme()
  const language = useLanguage()
  if (props.loading) {
    return <span style={{ fg: theme.textMuted }}>{language.t("dialog.mcp.loading")}</span>
  }
  if (props.enabled) {
    return <span style={{ fg: theme.success, attributes: TextAttributes.BOLD }}>{language.t("dialog.mcp.enabled")}</span>
  }
  return <span style={{ fg: theme.textMuted }}>{language.t("dialog.mcp.disabled")}</span>
}

export function DialogMcp() {
  const language = useLanguage()
  const local = useLocal()
  const sync = useSync()
  const sdk = useSDK()
  const [, setRef] = createSignal<DialogSelectRef<unknown>>()
  const [loading, setLoading] = createSignal<string | null>(null)

  const options = createMemo(() => {
    const mcpData = sync.data.mcp
    const loadingMcp = loading()

    return pipe(
      mcpData ?? {},
      entries(),
      sortBy(([name]) => name),
      map(([name, status]) => ({
        value: name,
        title: name,
        description: status.status === "failed" ? "failed" : status.status,
        footer: <Status enabled={local.mcp.isEnabled(name)} loading={loadingMcp === name} />,
        category: undefined,
      })),
    )
  })

  const actions = createMemo(() => [
    {
      command: "dialog.mcp.toggle",
      title: language.t("action.toggle"),
      onTrigger: async (option: DialogSelectOption<string>) => {
        if (loading() !== null) return

        setLoading(option.value)
        try {
          await local.mcp.toggle(option.value)
          const status = await sdk.client.mcp.status()
          if (status.data) {
            sync.set("mcp", status.data)
          } else {
            console.error("Failed to refresh MCP status: no data returned")
          }
        } catch (error) {
          console.error("Failed to toggle MCP:", error)
        } finally {
          setLoading(null)
        }
      },
    },
  ])

  return (
    <DialogSelect
      ref={setRef}
      title={language.t("dialog.mcp.title")}
      options={options()}
      actions={actions()}
      onSelect={(_option) => {}}
    />
  )
}