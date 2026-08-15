import type { Price, ModelPriceEntry } from "./types.js"

/** Beijing 2026-08-17 00:00, when V4 peak/off-peak CNY prices replace the launch rates. */
export const DEEPSEEK_V4_NEW_PRICING_AT = Date.parse("2026-08-17T00:00:00+08:00")

export const flashPrice: Price = {
  cacheHitInput: 0.02,
  cacheMissInput: 1,
  output: 2,
  discounted: false,
}

export const proPrice: Price = {
  cacheHitInput: 0.025,
  cacheMissInput: 3,
  output: 6,
  discounted: false,
}

export const flashOffPeakPrice: Price = {
  cacheHitInput: 0.05,
  cacheMissInput: 1.5,
  output: 4.5,
  discounted: true,
}

export const flashPeakPrice: Price = {
  cacheHitInput: 0.1,
  cacheMissInput: 3,
  output: 9,
  discounted: false,
}

export const proOffPeakPrice: Price = {
  cacheHitInput: 0.15,
  cacheMissInput: 4.5,
  output: 13.5,
  discounted: true,
}

export const proPeakPrice: Price = {
  cacheHitInput: 0.3,
  cacheMissInput: 9,
  output: 27,
  discounted: false,
}

export function isDeepseekPeakHour(time: number) {
  const hour = beijingHour(time)
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18)
}

export function deepseekV4Price(launch: Price, offPeak: Price, peak: Price, time: number) {
  if (time < DEEPSEEK_V4_NEW_PRICING_AT) return launch
  if (isDeepseekPeakHour(time)) return peak
  return offPeak
}

function beijingHour(time: number) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(new Date(time))
    .find((part) => part.type === "hour")?.value
  return Number(hour)
}

export const DEEPSEEK_ENTRIES: readonly ModelPriceEntry[] = [
  {
    providerID: "deepseek",
    providerLabel: "DeepSeek",
    modelID: "deepseek-v4-flash",
    modelLabel: "V4 Flash",
    priceFor: (time) => deepseekV4Price(flashPrice, flashOffPeakPrice, flashPeakPrice, time),
  },
  {
    providerID: "deepseek",
    providerLabel: "DeepSeek",
    modelID: "deepseek-v4-pro",
    modelLabel: "V4 Pro",
    priceFor: (time) => deepseekV4Price(proPrice, proOffPeakPrice, proPeakPrice, time),
  },
]
