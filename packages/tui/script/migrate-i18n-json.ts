const en = (await Bun.file("src/i18n/en.json").json()) as Record<string, string>
const zh = (await Bun.file("src/i18n/zh.json").json()) as Record<string, string>

const home: Record<string, string> = {
  "dialog.language.title": "Language",
  "command.language.list": "Choose language",
  "home.placeholder.normal.0": "Fix a TODO in the codebase",
  "home.placeholder.normal.1": "What is the tech stack of this project?",
  "home.placeholder.normal.2": "Fix broken tests",
  "home.placeholder.shell.0": "ls -la",
  "home.placeholder.shell.1": "git status",
  "home.placeholder.shell.2": "pwd",
  "prompt.placeholder.normal": 'Ask anything... "{{example}}"',
  "prompt.placeholder.shell": 'Run a command... "{{example}}"',
  "prompt.footer.agents": "agents",
  "prompt.footer.commands": "commands",
  "prompt.footer.exit_shell": "exit shell mode",
  "home.tip.label": "Tip",
  "home.tip.no_models":
    "Run {highlight}/connect{/highlight} to add an AI provider and start coding",
  "home.tip.at_file":
    "Type {highlight}@{/highlight} followed by a filename to fuzzy search and attach files",
  "home.tip.shell_prefix":
    "Start a message with {highlight}!{/highlight} to run shell commands directly (e.g., {highlight}!ls -la{/highlight})",
  "home.tip.agent_cycle":
    "Press {highlight}{{shortcut}}{/highlight} to cycle between Build and Plan agents",
  "home.tip.undo": "Use {highlight}/undo{/highlight} to revert the last message and file changes",
  "home.tip.redo": "Use {highlight}/redo{/highlight} to restore previously undone messages and file changes",
  "home.tip.share": "Run {highlight}/share{/highlight} to create a public link to your conversation at opencode.ai",
  "home.tip.drag_drop": "Drag and drop images or PDFs into the terminal to add them as context",
  "home.tip.paste_image":
    "Press {highlight}{{shortcut}}{/highlight} to paste images from your clipboard into the prompt",
  "home.tip.editor":
    "Use {highlight}{{command}}{/highlight} or {highlight}{{shortcut}}{/highlight} to compose messages in your external editor",
  "home.tip.init": "Run {highlight}/init{/highlight} to auto-generate project rules based on your codebase",
  "home.tip.models":
    "Use {highlight}{{command}}{/highlight} or {highlight}{{shortcut}}{/highlight} to see and switch between available AI models",
  "home.tip.themes":
    "Use {highlight}{{command}}{/highlight} or {highlight}{{shortcut}}{/highlight} to switch between {{count}} built-in themes",
  "home.tip.new_session":
    "Use {highlight}{{command}}{/highlight} or {highlight}{{shortcut}}{/highlight} to start a fresh conversation session",
  "home.tip.sessions":
    "Use {highlight}{{command}}{/highlight} or {highlight}{{shortcut}}{/highlight} to list, pin, and continue sessions",
  "home.tip.pin_session":
    "Press {highlight}{{shortcut}}{/highlight} in the session list to pin a session so it stays at the top",
  "home.tip.quick_switch":
    "Pinned sessions are assigned quick slots; use {highlight}{{first}}{/highlight} through {highlight}{{last}}{/highlight} to switch",
  "home.tip.compact": "Run {highlight}/compact{/highlight} to summarize long sessions near context limits",
  "home.tip.export":
    "Use {highlight}{{command}}{/highlight} or {highlight}{{shortcut}}{/highlight} to save the conversation as Markdown",
  "home.tip.copy_message":
    "Press {highlight}{{shortcut}}{/highlight} to copy the assistant's last message to clipboard",
  "home.tip.command_list":
    "Press {highlight}{{shortcut}}{/highlight} to see all available actions and commands",
  "home.tip.connect_providers": "Run {highlight}/connect{/highlight} to add API keys for 75+ supported LLM providers",
  "home.tip.leader": "The leader key is {highlight}{{shortcut}}{/highlight}; combine with other keys for quick actions",
  "home.tip.model_cycle":
    "Press {highlight}{{shortcut}}{/highlight} to quickly switch between recently used models",
  "home.tip.sidebar":
    "Press {highlight}{{shortcut}}{/highlight} in a session to show or hide the sidebar panel",
  "home.tip.page_nav":
    "Use {highlight}{{up}}{/highlight}/{highlight}{{down}}{/highlight} to navigate through conversation history",
  "home.tip.first_message":
    "Press {highlight}{{shortcut}}{/highlight} to jump to the beginning of the conversation",
  "home.tip.last_message":
    "Press {highlight}{{shortcut}}{/highlight} to jump to the most recent message",
  "home.tip.newline":
    "Press {highlight}{{shortcut}}{/highlight} to add newlines in your prompt",
  "home.tip.clear_input":
    "Press {highlight}{{shortcut}}{/highlight} when typing to clear the input field",
  "home.tip.interrupt":
    "Press {highlight}{{shortcut}}{/highlight} to stop the AI mid-response",
  "home.tip.plan_agent": "Switch to {highlight}Plan{/highlight} agent to get suggestions without making actual changes",
  "home.tip.subagent": "Use {highlight}@agent-name{/highlight} in prompts to invoke specialized subagents",
  "home.tip.session_tree":
    "Use {highlight}{{parent}}{/highlight} / {highlight}{{first}}{/highlight} / {highlight}{{previous}}{/highlight} / {highlight}{{next}}{/highlight} to move between parent and child sessions",
  "home.tip.plugins":
    "Add {highlight}.ts{/highlight} files to {highlight}.opencode/plugins/{/highlight} for event hooks",
}

const homeZh: Record<string, string> = {
  "dialog.language.title": "语言",
  "command.language.list": "选择语言",
  "home.placeholder.normal.0": "修复代码库中的一个 TODO",
  "home.placeholder.normal.1": "这个项目的技术栈是什么？",
  "home.placeholder.normal.2": "修复失败的测试",
  "home.placeholder.shell.0": "ls -la",
  "home.placeholder.shell.1": "git status",
  "home.placeholder.shell.2": "pwd",
  "prompt.placeholder.normal": '随便问... "{{example}}"',
  "prompt.placeholder.shell": '运行命令... "{{example}}"',
  "prompt.footer.agents": "智能体",
  "prompt.footer.commands": "命令",
  "prompt.footer.exit_shell": "退出 Shell 模式",
  "home.tip.label": "提示",
  "home.tip.no_models": "运行 {highlight}/connect{/highlight} 添加 AI 提供商并开始编码",
  "home.tip.at_file": "输入 {highlight}@{/highlight} 加文件名可模糊搜索并附加文件",
  "home.tip.shell_prefix":
    "以 {highlight}!{/highlight} 开头可直接运行 Shell 命令（例如 {highlight}!ls -la{/highlight}）",
  "home.tip.agent_cycle": "按 {highlight}{{shortcut}}{/highlight} 在 Build 和 Plan 智能体间切换",
  "home.tip.undo": "使用 {highlight}/undo{/highlight} 撤销上一条消息和文件更改",
  "home.tip.redo": "使用 {highlight}/redo{/highlight} 恢复已撤销的消息和文件更改",
  "home.tip.share": "运行 {highlight}/share{/highlight} 在 opencode.ai 创建公开对话链接",
  "home.tip.drag_drop": "将图片或 PDF 拖入终端以添加为上下文",
  "home.tip.paste_image": "按 {highlight}{{shortcut}}{/highlight} 从剪贴板粘贴图片到提示框",
  "home.tip.editor":
    "使用 {highlight}{{command}}{/highlight} 或 {highlight}{{shortcut}}{/highlight} 在外部编辑器中编写消息",
  "home.tip.init": "运行 {highlight}/init{/highlight} 根据代码库自动生成项目规则",
  "home.tip.models":
    "使用 {highlight}{{command}}{/highlight} 或 {highlight}{{shortcut}}{/highlight} 查看并切换可用 AI 模型",
  "home.tip.themes":
    "使用 {highlight}{{command}}{/highlight} 或 {highlight}{{shortcut}}{/highlight} 在 {{count}} 个内置主题间切换",
  "home.tip.new_session":
    "使用 {highlight}{{command}}{/highlight} 或 {highlight}{{shortcut}}{/highlight} 开始新的对话会话",
  "home.tip.sessions":
    "使用 {highlight}{{command}}{/highlight} 或 {highlight}{{shortcut}}{/highlight} 列出、固定并继续会话",
  "home.tip.pin_session": "在会话列表中按 {highlight}{{shortcut}}{/highlight} 固定会话使其保持在顶部",
  "home.tip.quick_switch":
    "已固定的会话会分配快捷槽位；使用 {highlight}{{first}}{/highlight} 到 {highlight}{{last}}{/highlight} 切换",
  "home.tip.compact": "运行 {highlight}/compact{/highlight} 在接近上下文限制时压缩长会话",
  "home.tip.export":
    "使用 {highlight}{{command}}{/highlight} 或 {highlight}{{shortcut}}{/highlight} 将对话保存为 Markdown",
  "home.tip.copy_message": "按 {highlight}{{shortcut}}{/highlight} 复制助手最后一条消息到剪贴板",
  "home.tip.command_list": "按 {highlight}{{shortcut}}{/highlight} 查看所有可用操作和命令",
  "home.tip.connect_providers": "运行 {highlight}/connect{/highlight} 为 75+ 支持的 LLM 提供商添加 API 密钥",
  "home.tip.leader": "Leader 键为 {highlight}{{shortcut}}{/highlight}；可与其他键组合快速操作",
  "home.tip.model_cycle": "按 {highlight}{{shortcut}}{/highlight} 快速切换最近使用的模型",
  "home.tip.sidebar": "在会话中按 {highlight}{{shortcut}}{/highlight} 显示或隐藏侧边栏",
  "home.tip.page_nav": "使用 {highlight}{{up}}{/highlight}/{highlight}{{down}}{/highlight} 浏览对话历史",
  "home.tip.first_message": "按 {highlight}{{shortcut}}{/highlight} 跳转到对话开头",
  "home.tip.last_message": "按 {highlight}{{shortcut}}{/highlight} 跳转到最新消息",
  "home.tip.newline": "按 {highlight}{{shortcut}}{/highlight} 在提示框中换行",
  "home.tip.clear_input": "输入时按 {highlight}{{shortcut}}{/highlight} 清空输入框",
  "home.tip.interrupt": "按 {highlight}{{shortcut}}{/highlight} 停止 AI 响应",
  "home.tip.plan_agent": "切换到 {highlight}Plan{/highlight} 智能体可获取建议而不实际修改",
  "home.tip.subagent": "在提示中使用 {highlight}@agent-name{/highlight} 调用专用子智能体",
  "home.tip.session_tree":
    "使用 {highlight}{{parent}}{/highlight} / {highlight}{{first}}{/highlight} / {highlight}{{previous}}{/highlight} / {highlight}{{next}}{/highlight} 在父子会话间移动",
  "home.tip.plugins": "将 {highlight}.ts{/highlight} 文件添加到 {highlight}.opencode/plugins/{/highlight} 以注册事件钩子",
}

const enJson = { ...en, ...home, "command.language.cycle": "Choose language" }
const zhJson = { ...zh, ...homeZh, "command.language.cycle": "选择语言", "command.language.list": "选择语言" }

await Bun.write("src/i18n/en.json", JSON.stringify(enJson, null, 2) + "\n")
await Bun.write("src/i18n/zh.json", JSON.stringify(zhJson, null, 2) + "\n")