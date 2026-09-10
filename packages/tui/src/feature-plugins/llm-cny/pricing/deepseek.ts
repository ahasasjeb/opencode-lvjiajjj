import type { Price, ModelPriceEntry } from "./types.js"

/** Beijing 2026-08-17 00:00, when V4 peak/off-peak CNY prices replace the launch rates. */
export const DEEPSEEK_V4_NEW_PRICING_AT = Date.parse("2026-08-17T00:00:00+08:00")
export const DEEPSEEK_V41_PRICING_AT = Date.parse("2026-09-10T12:00:00+08:00")
export const DEEPSEEK_PRO_FLASH_PRICING_AT = Date.parse("2026-09-14T12:00:00+08:00")

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

// CNY per million tokens: https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
export const flashV41OffPeakPrice: Price = {
  cacheHitInput: 0.02,
  cacheMissInput: 1,
  output: 4,
  discounted: true,
}

export const flashV41PeakPrice: Price = {
  cacheHitInput: 0.04,
  cacheMissInput: 2,
  output: 8,
  discounted: false,
}

export function isDeepseekPeakHour(time: number) {
  // Shift to fixed UTC+8, then use UTC getters so the host timezone cannot affect billing.
  const beijing = new Date(time + 8 * 60 * 60 * 1000)
  const day = beijing.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = beijing.getUTCHours()
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18)
}

export function deepseekV4Price(launch: Price, offPeak: Price, peak: Price, time: number) {
  if (time < DEEPSEEK_V4_NEW_PRICING_AT) return launch
  if (isDeepseekPeakHour(time)) return peak
  return offPeak
}

function flashPriceFor(time: number) {
  if (time < DEEPSEEK_V41_PRICING_AT) return deepseekV4Price(flashPrice, flashOffPeakPrice, flashPeakPrice, time)
  return isDeepseekPeakHour(time) ? flashV41PeakPrice : flashV41OffPeakPrice
}

export const DEEPSEEK_ENTRIES: readonly ModelPriceEntry[] = [
  {
    providerID: "deepseek",
    providerLabel: "DeepSeek",
    modelID: "deepseek-flash",
    modelLabel: "V4.1 Flash",
    priceFor: flashPriceFor,
  },
  {
    providerID: "deepseek",
    providerLabel: "DeepSeek",
    modelID: "deepseek-v4-flash",
    modelLabel: "V4 Flash",
    priceFor: flashPriceFor,
  },
  {
    providerID: "deepseek",
    providerLabel: "DeepSeek",
    modelID: "deepseek-v4-flash-vision-exp",
    modelLabel: "V4 Flash Vision Exp",
    priceFor: flashPriceFor,
  },
  {
    providerID: "deepseek",
    providerLabel: "DeepSeek",
    modelID: "deepseek-v4-pro",
    modelLabel: "V4 Pro",
    priceFor: (time) =>
      time >= DEEPSEEK_PRO_FLASH_PRICING_AT
        ? flashPriceFor(time)
        : deepseekV4Price(proPrice, proOffPeakPrice, proPeakPrice, time),
  },
]
