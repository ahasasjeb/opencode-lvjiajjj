import type { DisplayBalance } from "../balance.js"

const money = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

export function formatMoney(value: number) {
  return money.format(value)
}

export function formatTokens(value: number, locale = "en") {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString(locale)
}

export function formatTime(value: number, locale = "en") {
  return new Date(value).toLocaleTimeString(locale, {
    hour12: false,
  })
}

export function formatDetails(details: DisplayBalance["details"], labels: Record<string, string> = {}) {
  return details.map((item) => `${labels[item.label] ?? item.label} ${item.value}`).join(" · ")
}

export function errorMessage(cause: unknown) {
  if (cause instanceof Error) return cause.message
  return String(cause)
}
