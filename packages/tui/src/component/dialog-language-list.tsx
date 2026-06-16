import { DialogSelect } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"
import { useLanguage } from "../context/language"
import { useToast } from "../ui/toast"

export function DialogLanguageList() {
  const dialog = useDialog()
  const language = useLanguage()
  const toast = useToast()

  const options = language.locales.map((locale) => ({
    title: language.label(locale),
    value: locale,
  }))

  return (
    <DialogSelect
      title={language.t("dialog.language.title")}
      options={options}
      current={language.locale()}
      onSelect={(option) => {
        if (option.value !== language.locale()) {
          language.setLocale(option.value)
          toast.show({
            title: language.t("toast.language.title"),
            message: language.t("toast.language.description", { language: language.label(option.value) }),
            variant: "info",
          })
        }
        dialog.clear()
      }}
    />
  )
}