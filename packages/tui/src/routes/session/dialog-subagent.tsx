import { createMemo } from "solid-js"
import { DialogSelect } from "../../ui/dialog-select"
import { useRoute } from "../../context/route"
import { useLanguage } from "../../context/language"

export function DialogSubagent(props: { sessionID: string }) {
  const language = useLanguage()
  const route = useRoute()

  const options = createMemo(() => {
    language.locale()
    const t = language.t
    return [
      {
        title: t("dialog.subagent.open"),
        value: "subagent.view",
        description: t("dialog.subagent.open_desc"),
        onSelect: (dialog: { clear: () => void }) => {
          route.navigate({
            type: "session",
            sessionID: props.sessionID,
          })
          dialog.clear()
        },
      },
    ]
  })

  return <DialogSelect title={language.t("dialog.subagent.title")} options={options()} />
}