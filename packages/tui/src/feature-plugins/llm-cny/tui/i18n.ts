import type { TuiPluginApi } from "@opencode-ai/plugin/tui"

export type Translator = TuiPluginApi["i18n"]["t"]

export function translator(api: TuiPluginApi): Translator {
  return (key, params) => api.i18n.t(key, params)
}

export function localizeMessage(t: Translator, message: string) {
  const keys: Record<string, string> = {
    "响应格式解析失败": "plugin.llmCny.error.parse",
    "未找到 ChatGPT OAuth 凭证": "plugin.llmCny.error.chatgptAuth",
    "未找到 OpenAI OAuth 凭证": "plugin.llmCny.error.chatgptAuth",
    "未找到 GitHub Copilot OAuth 凭证": "plugin.llmCny.error.copilotAuth",
    "认证失败或无权限访问 Copilot 额度": "plugin.llmCny.error.copilotUnauthorized",
    "Copilot 额度接口不可用（可能非 Copilot 用户）": "plugin.llmCny.error.copilotUnavailable",
    "余额接口返回格式不符合预期": "plugin.llmCny.error.balanceFormat",
  }
  const key = keys[message]
  return key ? t(key) : message
}
