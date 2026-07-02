import type { FirecrawlCreditUsage, ToolCredentialStatus } from "@opencode-ai/sdk/v2"
import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "./builtins"
import { createMemo, Show, createSignal } from "solid-js"

const id = "internal:firecrawl"

function Panel(props: {
  api: TuiPluginApi
  credential: () => ToolCredentialStatus | undefined
  credit: () => FirecrawlCreditUsage | undefined
  creditError: () => boolean
}) {
  const theme = () => props.api.theme.current
  const t = props.api.i18n.t
  const enabled = createMemo(() => props.credential()?.configured === true)
  const source = createMemo(() => {
    const item = props.credential()
    if (!item?.configured) return t("plugin.firecrawl.source_undefined")
    if (item.source === "environment") return t("plugin.firecrawl.source_environment")
    if (item.source === "stored") return t("plugin.firecrawl.source_stored")
    return t("plugin.firecrawl.source_undefined")
  })

  return (
    <box
      border
      borderColor={theme().borderSubtle}
      backgroundColor={theme().backgroundElement}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={1}
      paddingRight={1}
      gap={1}
    >
      <text fg={theme().text}>
        <b>{t("plugin.firecrawl.title")}</b>
      </text>
      <box flexDirection="row" gap={1}>
        <text flexShrink={0} style={{ fg: enabled() ? theme().success : theme().warning }}>
          •
        </text>
        <text fg={theme().text} wrapMode="word">
          {enabled() ? t("plugin.firecrawl.status_enabled") : t("plugin.firecrawl.status_disabled")}{" "}
          <span style={{ fg: theme().textMuted }}>{source()}</span>
        </text>
      </box>
      <Show when={enabled()}>
        <text fg={props.creditError() ? theme().error : theme().textMuted}>
          {props.creditError()
            ? t("plugin.firecrawl.credit_error")
            : props.credit()
              ? t("plugin.firecrawl.credit_usage", {
                  remaining: formatCredit(props.credit()!.remainingCredits, props.api.i18n.locale),
                  plan: formatCredit(props.credit()!.planCredits, props.api.i18n.locale),
                })
              : t("plugin.firecrawl.credit_loading")}
        </text>
      </Show>
      <Show when={!enabled()}>
        <text fg={theme().textMuted}>{t("plugin.firecrawl.missing_prompt")}</text>
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  const [credentials, setCredentials] = createSignal<ToolCredentialStatus[]>([])
  const [credit, setCredit] = createSignal<FirecrawlCreditUsage>()
  const [creditError, setCreditError] = createSignal(false)
  const t = api.i18n.t

  const credential = () => credentials().find((item) => item.id === "firecrawl")

  const loadCredentials = async () => {
    const result = await api.client.tool.credentials(undefined, { throwOnError: true })
    setCredentials(result.data)
    return result.data
  }

  const loadCredit = async () => {
    setCreditError(false)
    const result = await api.client.tool.firecrawlCreditUsage(undefined, { throwOnError: true }).catch(() => undefined)
    if (!result) {
      setCreditError(true)
      return
    }
    setCredit(result.data)
  }

  const save = async (item: ToolCredentialStatus, key: string) => {
    if (!key.trim()) return
    await api.client.auth.set(
      { providerID: item.id, auth: { type: "api", key: key.trim() } },
      { throwOnError: true },
    )
    await api.client.instance.dispose()
    await loadCredentials()
    await loadCredit()
    api.ui.dialog.clear()
    api.ui.toast({ variant: "success", message: t("plugin.firecrawl.credential_saved") })
  }

  const prompt = (item: ToolCredentialStatus) => {
    if (item.source === "environment") {
      api.ui.dialog.replace(() =>
        api.ui.DialogAlert({
          title: t("plugin.firecrawl.title"),
          message: t("plugin.firecrawl.environment_managed", { env: item.env }),
        }),
      )
      return
    }
    api.ui.dialog.replace(() =>
      api.ui.DialogPrompt({
        title: t("plugin.firecrawl.key_title"),
        placeholder: "fc-...",
        description: () => <text fg={api.theme.current.textMuted}>{t("plugin.firecrawl.key_hint")}</text>,
        onConfirm: (value) =>
          void save(item, value).catch((cause) =>
            api.ui.toast({
              variant: "error",
              message: t("plugin.firecrawl.credential_save_failed", { error: errorMessage(cause) }),
            }),
          ),
      }),
    )
  }

  const showCredentials = async () => {
    const list = await loadCredentials().catch(() => credentials())
    api.ui.dialog.replace(() =>
      api.ui.DialogSelect({
        title: t("plugin.firecrawl.credentials_title"),
        options: list.map((item) => ({
          title: item.id === "firecrawl" ? "Firecrawl" : item.id,
          value: item.id,
          description: item.configured
            ? t(`plugin.firecrawl.source_${item.source}`)
            : t("plugin.firecrawl.missing"),
          footer: item.env,
          onSelect: () => prompt(item),
        })),
      }),
    )
  }

  api.slots.register({
    order: 145,
    slots: {
      sidebar_content() {
        return <Panel api={api} credential={credential} credit={credit} creditError={creditError} />
      },
    },
  })

  const initial = await loadCredentials().catch(() => [])
  if (initial.some((item) => item.id === "firecrawl" && item.configured)) void loadCredit()
  if (!initial.some((item) => item.id === "firecrawl" && item.configured)) {
    api.ui.toast({
      variant: "info",
      message: t("plugin.firecrawl.missing_prompt"),
      duration: 8000,
    })
  }

  api.keymap.registerLayer({
    commands: [
      {
        name: "tool.credentials",
        title: "plugin.firecrawl.credentials_command",
        category: "category.system",
        slashName: "tools",
        run: () => void showCredentials(),
      },
      {
        name: "firecrawl.credits",
        title: "plugin.firecrawl.credits_command",
        category: "category.system",
        slashName: "firecrawl",
        run() {
          if (!credential()?.configured) {
            void showCredentials()
            return
          }
          void loadCredit()
          api.ui.dialog.replace(() =>
            api.ui.DialogAlert({
              title: t("plugin.firecrawl.title"),
              message: credit()
                ? t("plugin.firecrawl.credit_usage", {
                    remaining: formatCredit(credit()!.remainingCredits, api.i18n.locale),
                    plan: formatCredit(credit()!.planCredits, api.i18n.locale),
                  })
                : t("plugin.firecrawl.credit_loading"),
            }),
          )
        },
      },
    ],
    bindings: [],
  })
}

function formatCredit(value: FirecrawlCreditUsage["remainingCredits"], locale: string) {
  return new Intl.NumberFormat(locale).format(Number(value))
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause)
}

const plugin: BuiltinTuiPlugin = {
  id,
  tui,
}

export default plugin