import type { TuiPlugin, TuiPluginApi, TuiPluginStatus } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { useTerminalDimensions } from "@opentui/solid"
import { fileURLToPath } from "url"
import { DialogSelect, type DialogSelectOption } from "../../ui/dialog-select"
import { Show, createEffect, createMemo, createSignal } from "solid-js"
import { useBindings } from "../../keymap"
import { useLanguage } from "../../context/language"
import type { Translator } from "../../i18n/translate"

const id = "internal:plugin-manager"

function state(api: TuiPluginApi, item: TuiPluginStatus, t: Translator) {
  if (!item.enabled) {
    return <span style={{ fg: api.theme.current.textMuted }}>{t("dialog.plugins.disabled")}</span>
  }

  return (
    <span style={{ fg: item.active ? api.theme.current.success : api.theme.current.error }}>
      {item.active ? t("dialog.plugins.active") : t("dialog.plugins.inactive")}
    </span>
  )
}

function source(spec: string) {
  if (!spec.startsWith("file://")) return
  return fileURLToPath(spec)
}

function meta(item: TuiPluginStatus, width: number, t: Translator) {
  if (item.source === "internal") {
    if (width >= 120) return t("dialog.plugins.builtin_full")
    return t("dialog.plugins.builtin")
  }
  const next = source(item.spec)
  if (next) return next
  return item.spec
}

function Install(props: { api: TuiPluginApi }) {
  const language = useLanguage()
  const [global, setGlobal] = createSignal(false)
  const [busy, setBusy] = createSignal(false)

  useBindings(() => ({
    enabled: !busy(),
    bindings: [{ key: "tab", desc: "Toggle install scope", group: "Plugins", cmd: () => setGlobal((value) => !value) }],
  }))

  return (
    <props.api.ui.DialogPrompt
      title={language.t("dialog.plugins.install.title")}
      placeholder={language.t("dialog.plugins.install.placeholder")}
      busy={busy()}
      busyText={language.t("dialog.plugins.install.busy")}
      description={() => (
        <box flexDirection="row" gap={1}>
          <text fg={props.api.theme.current.textMuted}>{language.t("dialog.plugins.scope")}</text>
          <text fg={busy() ? props.api.theme.current.textMuted : props.api.theme.current.text}>
            {global() ? language.t("dialog.plugins.scope_global") : language.t("dialog.plugins.scope_local")}
          </text>
          <Show when={!busy()}>
            <text fg={props.api.theme.current.textMuted}>{language.t("dialog.plugins.scope_toggle")}</text>
          </Show>
        </box>
      )}
      onConfirm={(raw) => {
        if (busy()) return
        const mod = raw.trim()
        if (!mod) {
          props.api.ui.toast({
            variant: "error",
            message: language.t("toast.plugins.name_required"),
          })
          return
        }

        setBusy(true)
        void props.api.plugins
          .install(mod, { global: global() })
          .then((out) => {
            if (!out.ok) {
              props.api.ui.toast({
                variant: "error",
                message: out.message,
              })
              if (out.missing) {
                props.api.ui.toast({
                  variant: "info",
                  message: language.t("toast.plugins.missing_registry"),
                })
              }
              show(props.api)
              return
            }

            props.api.ui.toast({
              variant: "success",
              message: language.t("toast.plugins.installed", {
                mod,
                scope: global() ? language.t("dialog.plugins.scope_global") : language.t("dialog.plugins.scope_local"),
                dir: out.dir,
              }),
            })
            if (!out.tui) {
              props.api.ui.toast({
                variant: "info",
                message: language.t("toast.plugins.no_tui"),
              })
              show(props.api)
              return
            }

            return props.api.plugins.add(mod).then((ok) => {
              if (!ok) {
                props.api.ui.toast({
                  variant: "warning",
                  message: language.t("toast.plugins.load_failed"),
                })
                show(props.api)
                return
              }

              props.api.ui.toast({
                variant: "success",
                message: language.t("toast.plugins.loaded", { mod }),
              })
              show(props.api)
            })
          })
          .finally(() => {
            setBusy(false)
          })
      }}
      onCancel={() => {
        show(props.api)
      }}
    />
  )
}

function row(api: TuiPluginApi, item: TuiPluginStatus, width: number, t: Translator): DialogSelectOption<string> {
  return {
    title: item.id,
    value: item.id,
    category: item.source === "internal" ? t("dialog.plugins.internal") : t("dialog.plugins.external"),
    description: meta(item, width, t),
    footer: state(api, item, t),
    disabled: item.id === id,
  }
}

function showInstall(api: TuiPluginApi) {
  api.ui.dialog.replace(() => <Install api={api} />)
}

function View(props: { api: TuiPluginApi }) {
  const language = useLanguage()
  const size = useTerminalDimensions()
  const [list, setList] = createSignal(props.api.plugins.list())
  const [cur, setCur] = createSignal<string | undefined>()
  const [lock, setLock] = createSignal(false)

  createEffect(() => {
    const width = size().width
    if (width >= 128) {
      props.api.ui.dialog.setSize("xlarge")
      return
    }
    if (width >= 96) {
      props.api.ui.dialog.setSize("large")
      return
    }
    props.api.ui.dialog.setSize("medium")
  })

  const rows = createMemo(() =>
    [...list()]
      .sort((a, b) => {
        const x = a.source === "internal" ? 1 : 0
        const y = b.source === "internal" ? 1 : 0
        if (x !== y) return x - y
        return a.id.localeCompare(b.id)
      })
      .map((item) => row(props.api, item, size().width, language.t)),
  )

  const flip = (x: string) => {
    if (lock()) return
    const item = list().find((entry) => entry.id === x)
    if (!item) return
    setLock(true)
    const task = item.active ? props.api.plugins.deactivate(x) : props.api.plugins.activate(x)
    void task
      .then((ok) => {
        if (!ok) {
          props.api.ui.toast({
            variant: "error",
            message: language.t("toast.plugins.update_failed", { id: item.id }),
          })
        }
        setList(props.api.plugins.list())
      })
      .finally(() => {
        setLock(false)
      })
  }

  return (
    <DialogSelect
      title={language.t("dialog.plugins.title")}
      options={rows()}
      current={cur()}
      onMove={(item) => setCur(item.value)}
      actions={[
        {
          title: language.t("action.toggle"),
          command: "plugins.toggle",
          hidden: lock(),
          onTrigger: (item) => {
            setCur(item.value)
            flip(item.value)
          },
        },
        {
          title: language.t("action.install"),
          command: "dialog.plugins.install",
          hidden: lock(),
          onTrigger: () => {
            showInstall(props.api)
          },
        },
      ]}
      onSelect={(item) => {
        setCur(item.value)
        flip(item.value)
      }}
    />
  )
}

function show(api: TuiPluginApi) {
  api.ui.dialog.replace(() => <View api={api} />)
}

const tui: TuiPlugin = async (api) => {
  api.keymap.registerLayer({
    commands: [
      {
        name: "plugins.list",
        title: "keybind.plugin_manager",
        category: "category.system",
        namespace: "palette",
        run() {
          show(api)
        },
      },
      {
        name: "plugins.install",
        title: "keybind.plugin_install",
        category: "category.system",
        namespace: "palette",
        run() {
          showInstall(api)
        },
      },
    ],
    bindings: api.tuiConfig.keybinds.gather("plugins.palette", ["plugins.list", "plugins.install"]),
  })
}

const plugin: BuiltinTuiPlugin = {
  id,
  tui,
}

export default plugin