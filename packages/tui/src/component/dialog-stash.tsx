import { useDialog } from "../ui/dialog"
import { DialogSelect } from "../ui/dialog-select"
import { createMemo, createSignal } from "solid-js"
import { Locale } from "../util/locale"
import { useTheme } from "../context/theme"
import { usePromptStash, type StashEntry } from "./prompt/stash"
import { useCommandShortcut } from "../keymap"
import { useLanguage } from "../context/language"
import type { Translator } from "../i18n/translate"

function getRelativeTime(timestamp: number, t: Translator): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return t("dialog.stash.just_now")
  if (minutes < 60) return t("dialog.stash.minutes_ago", { minutes })
  if (hours < 24) return t("dialog.stash.hours_ago", { hours })
  if (days < 7) return t("dialog.stash.days_ago", { days })
  return Locale.datetime(timestamp)
}

function getStashPreview(input: string, maxLength: number = 50): string {
  const firstLine = input.split("\n")[0].trim()
  return Locale.truncate(firstLine, maxLength)
}

export function DialogStash(props: { onSelect: (entry: StashEntry) => void }) {
  const language = useLanguage()
  const dialog = useDialog()
  const stash = usePromptStash()
  const { theme } = useTheme()

  const [toDelete, setToDelete] = createSignal<number>()
  const deleteHint = useCommandShortcut("stash.delete")

  const options = createMemo(() => {
    const entries = stash.list()
    return entries
      .map((entry, index) => {
        const isDeleting = toDelete() === index
        const lineCount = (entry.input.match(/\n/g)?.length ?? 0) + 1
        return {
          title: isDeleting
            ? language.t("dialog.confirm.delete", { shortcut: deleteHint() })
            : getStashPreview(entry.input),
          bg: isDeleting ? theme.error : undefined,
          value: index,
          description: getRelativeTime(entry.timestamp, language.t),
          footer: lineCount > 1 ? language.t("dialog.stash.lines", { count: lineCount }) : undefined,
        }
      })
      .toReversed()
  })

  return (
    <DialogSelect
      title={language.t("dialog.stash.title")}
      options={options()}
      onMove={() => {
        setToDelete(undefined)
      }}
      onSelect={(option) => {
        const entries = stash.list()
        const entry = entries[option.value]
        if (entry) {
          stash.remove(option.value)
          props.onSelect(entry)
        }
        dialog.clear()
      }}
      actions={[
        {
          command: "stash.delete",
          title: language.t("action.delete"),
          onTrigger: (option) => {
            if (toDelete() === option.value) {
              stash.remove(option.value)
              setToDelete(undefined)
              return
            }
            setToDelete(option.value)
          },
        },
      ]}
    />
  )
}