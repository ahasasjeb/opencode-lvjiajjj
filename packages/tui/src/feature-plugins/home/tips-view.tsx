import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, For, type Accessor } from "solid-js"
import { DEFAULT_THEMES, useTheme } from "../../context/theme"
import { useCommandShortcut } from "../../keymap"
import { useLanguage } from "../../context/language"
import type { Translator } from "../../i18n/translate"

const themeCount = Object.keys(DEFAULT_THEMES).length

type TipPart = { text: string; highlight: boolean }
type TipShortcut = Accessor<string>
type Shortcuts = {
  agentCycle: TipShortcut
  childFirst: TipShortcut
  childNext: TipShortcut
  childPrevious: TipShortcut
  commandList: TipShortcut
  editorOpen: TipShortcut
  helpShow: TipShortcut
  inputClear: TipShortcut
  inputNewline: TipShortcut
  inputPaste: TipShortcut
  inputUndo: TipShortcut
  leader: TipShortcut
  messagesCopy: TipShortcut
  messagesFirst: TipShortcut
  messagesLast: TipShortcut
  messagesPageDown: TipShortcut
  messagesPageUp: TipShortcut
  messagesToggleConceal: TipShortcut
  modelCycleRecent: TipShortcut
  modelList: TipShortcut
  sessionExport: TipShortcut
  sessionInterrupt: TipShortcut
  sessionList: TipShortcut
  sessionNew: TipShortcut
  sessionParent: TipShortcut
  sessionPinToggle: TipShortcut
  sessionQuickSwitch1: TipShortcut
  sessionQuickSwitch9: TipShortcut
  sessionSidebarToggle: TipShortcut
  sessionTimeline: TipShortcut
  statusView: TipShortcut
  terminalSuspend: TipShortcut
  themeList: TipShortcut
}

type TipContext = {
  shortcuts: Shortcuts
  t: Translator
}

type TipResolver = (ctx: TipContext) => string | undefined

function parse(tip: string): TipPart[] {
  const parts: TipPart[] = []
  const regex = /\{highlight\}(.*?)\{\/highlight\}/g
  const found = Array.from(tip.matchAll(regex))
  const state = found.reduce(
    (acc, match) => {
      const start = match.index ?? 0
      if (start > acc.index) {
        acc.parts.push({ text: tip.slice(acc.index, start), highlight: false })
      }
      acc.parts.push({ text: match[1], highlight: true })
      acc.index = start + match[0].length
      return acc
    },
    { parts, index: 0 },
  )

  if (state.index < tip.length) {
    parts.push({ text: tip.slice(state.index), highlight: false })
  }

  return parts
}

function configShortcut(api: TuiPluginApi, command: string): TipShortcut {
  return () =>
    api.tuiConfig.keybinds
      .get(command)
      .map((binding) => api.keys.formatSequence(Array.from(api.keymap.parseKeySequence(binding.key))))
      .filter(Boolean)
      .join(", ")
}

function commandTip(
  t: Translator,
  key: "home.tip.editor" | "home.tip.models" | "home.tip.themes" | "home.tip.new_session" | "home.tip.sessions" | "home.tip.export",
  command: string,
  shortcut: string,
  params?: Record<string, string | number | boolean>,
) {
  return t(key, { command, shortcut: shortcut || command, ...params })
}

const TIP_RESOLVERS: TipResolver[] = [
  (ctx) => ctx.t("home.tip.at_file"),
  (ctx) => ctx.t("home.tip.shell_prefix"),
  (ctx) => {
    const shortcut = ctx.shortcuts.agentCycle()
    if (!shortcut) return undefined
    return ctx.t("home.tip.agent_cycle", { shortcut })
  },
  (ctx) => ctx.t("home.tip.undo"),
  (ctx) => ctx.t("home.tip.redo"),
  (ctx) => ctx.t("home.tip.share"),
  (ctx) => ctx.t("home.tip.drag_drop"),
  (ctx) => {
    const shortcut = ctx.shortcuts.inputPaste()
    if (!shortcut) return undefined
    return ctx.t("home.tip.paste_image", { shortcut })
  },
  (ctx) => commandTip(ctx.t, "home.tip.editor", "/editor", ctx.shortcuts.editorOpen()),
  (ctx) => ctx.t("home.tip.init"),
  (ctx) => commandTip(ctx.t, "home.tip.models", "/models", ctx.shortcuts.modelList()),
  (ctx) => commandTip(ctx.t, "home.tip.themes", "/themes", ctx.shortcuts.themeList(), { count: themeCount }),
  (ctx) => commandTip(ctx.t, "home.tip.new_session", "/new", ctx.shortcuts.sessionNew()),
  (ctx) => commandTip(ctx.t, "home.tip.sessions", "/sessions", ctx.shortcuts.sessionList()),
  (ctx) => {
    const shortcut = ctx.shortcuts.sessionPinToggle()
    if (!shortcut) return undefined
    return ctx.t("home.tip.pin_session", { shortcut })
  },
  (ctx) => {
    const first = ctx.shortcuts.sessionQuickSwitch1()
    const last = ctx.shortcuts.sessionQuickSwitch9()
    if (!first || !last) return undefined
    return ctx.t("home.tip.quick_switch", { first, last })
  },
  (ctx) => ctx.t("home.tip.compact"),
  (ctx) => commandTip(ctx.t, "home.tip.export", "/export", ctx.shortcuts.sessionExport()),
  (ctx) => {
    const shortcut = ctx.shortcuts.messagesCopy()
    if (!shortcut) return undefined
    return ctx.t("home.tip.copy_message", { shortcut })
  },
  (ctx) => {
    const shortcut = ctx.shortcuts.commandList()
    if (!shortcut) return undefined
    return ctx.t("home.tip.command_list", { shortcut })
  },
  (ctx) => ctx.t("home.tip.connect_providers"),
  (ctx) => {
    const shortcut = ctx.shortcuts.leader()
    if (!shortcut) return undefined
    return ctx.t("home.tip.leader", { shortcut })
  },
  (ctx) => {
    const shortcut = ctx.shortcuts.modelCycleRecent()
    if (!shortcut) return undefined
    return ctx.t("home.tip.model_cycle", { shortcut })
  },
  (ctx) => {
    const shortcut = ctx.shortcuts.sessionSidebarToggle()
    if (!shortcut) return undefined
    return ctx.t("home.tip.sidebar", { shortcut })
  },
  (ctx) => {
    const up = ctx.shortcuts.messagesPageUp()
    const down = ctx.shortcuts.messagesPageDown()
    if (!up || !down) return undefined
    return ctx.t("home.tip.page_nav", { up, down })
  },
  (ctx) => {
    const shortcut = ctx.shortcuts.messagesFirst()
    if (!shortcut) return undefined
    return ctx.t("home.tip.first_message", { shortcut })
  },
  (ctx) => {
    const shortcut = ctx.shortcuts.messagesLast()
    if (!shortcut) return undefined
    return ctx.t("home.tip.last_message", { shortcut })
  },
  (ctx) => {
    const shortcut = ctx.shortcuts.inputNewline()
    if (!shortcut) return undefined
    return ctx.t("home.tip.newline", { shortcut })
  },
  (ctx) => {
    const shortcut = ctx.shortcuts.inputClear()
    if (!shortcut) return undefined
    return ctx.t("home.tip.clear_input", { shortcut })
  },
  (ctx) => {
    const shortcut = ctx.shortcuts.sessionInterrupt()
    if (!shortcut) return undefined
    return ctx.t("home.tip.interrupt", { shortcut })
  },
  (ctx) => ctx.t("home.tip.plan_agent"),
  (ctx) => ctx.t("home.tip.subagent"),
  (ctx) => {
    const parent = ctx.shortcuts.sessionParent()
    const first = ctx.shortcuts.childFirst()
    const previous = ctx.shortcuts.childPrevious()
    const next = ctx.shortcuts.childNext()
    if (!parent || !first || !previous || !next) return undefined
    return ctx.t("home.tip.session_tree", { parent, first, previous, next })
  },
  (ctx) => ctx.t("home.tip.plugins"),
]

export function Tips(props: { api: TuiPluginApi; connected?: boolean }) {
  const theme = useTheme().theme
  const language = useLanguage()
  const tipOffset = Math.random()
  const shortcuts: Shortcuts = {
    agentCycle: configShortcut(props.api, "agent.cycle"),
    childFirst: configShortcut(props.api, "session.child.first"),
    childNext: configShortcut(props.api, "session.child.cycle"),
    childPrevious: configShortcut(props.api, "session.child.cycle.reverse"),
    commandList: useCommandShortcut("command.palette.show"),
    editorOpen: configShortcut(props.api, "prompt.editor"),
    helpShow: configShortcut(props.api, "help.show"),
    inputClear: configShortcut(props.api, "input.clear"),
    inputNewline: configShortcut(props.api, "input.newline"),
    inputPaste: configShortcut(props.api, "input.paste"),
    inputUndo: configShortcut(props.api, "input.undo"),
    leader: configShortcut(props.api, "leader"),
    messagesCopy: configShortcut(props.api, "messages.copy"),
    messagesFirst: configShortcut(props.api, "messages.first"),
    messagesLast: configShortcut(props.api, "messages.last"),
    messagesPageDown: configShortcut(props.api, "messages.page_down"),
    messagesPageUp: configShortcut(props.api, "messages.page_up"),
    messagesToggleConceal: configShortcut(props.api, "messages.toggle_conceal"),
    modelCycleRecent: configShortcut(props.api, "model.cycle_recent"),
    modelList: configShortcut(props.api, "model.list"),
    sessionExport: configShortcut(props.api, "session.export"),
    sessionInterrupt: configShortcut(props.api, "session.interrupt"),
    sessionList: configShortcut(props.api, "session.list"),
    sessionNew: configShortcut(props.api, "session.new"),
    sessionParent: configShortcut(props.api, "session.parent"),
    sessionPinToggle: configShortcut(props.api, "session.pin.toggle"),
    sessionQuickSwitch1: configShortcut(props.api, "session.quick_switch.1"),
    sessionQuickSwitch9: configShortcut(props.api, "session.quick_switch.9"),
    sessionSidebarToggle: configShortcut(props.api, "session.sidebar.toggle"),
    sessionTimeline: configShortcut(props.api, "session.timeline"),
    statusView: configShortcut(props.api, "opencode.status"),
    terminalSuspend: configShortcut(props.api, "terminal.suspend"),
    themeList: configShortcut(props.api, "theme.switch"),
  }

  const tips = createMemo(() => {
    language.locale()
    const t = language.t
    const ctx = { shortcuts, t }
    if (props.connected === false) return [t("home.tip.no_models")]
    return TIP_RESOLVERS.map((resolve) => resolve(ctx)).filter((value): value is string => typeof value === "string")
  })

  const tip = createMemo(() => {
    const list = tips()
    return list[Math.floor(tipOffset * list.length)] ?? language.t("home.tip.no_models")
  })

  const parts = createMemo(() => parse(tip()))

  return (
    <box flexDirection="row" maxWidth="100%">
      <text flexShrink={0} style={{ fg: theme.warning }}>
        ● {language.t("home.tip.label")}{" "}
      </text>
      <text flexShrink={1} wrapMode="word">
        <For each={parts()}>
          {(part) => <span style={{ fg: part.highlight ? theme.text : theme.textMuted }}>{part.text}</span>}
        </For>
      </text>
    </box>
  )
}