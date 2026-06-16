import { createMemo } from "solid-js"
import { useLocal } from "../context/local"
import { DialogSelect } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"
import { useLanguage } from "../context/language"

export function DialogVariant() {
  const language = useLanguage()
  const local = useLocal()
  const dialog = useDialog()

  const options = createMemo(() => {
    return [
      {
        value: "default",
        title: language.t("dialog.variant.default"),
        onSelect: () => {
          dialog.clear()
          local.model.variant.set(undefined)
        },
      },
      ...local.model.variant.list().map((variant) => ({
        value: variant,
        title: variant,
        onSelect: () => {
          dialog.clear()
          local.model.variant.set(variant)
        },
      })),
    ]
  })

  return (
    <DialogSelect<string>
      options={options()}
      title={language.t("dialog.variant.title")}
      current={local.model.variant.selected()}
      flat={true}
    />
  )
}