import type { Metadata } from "next"
import { IBM_Plex_Mono, Manrope } from "next/font/google"
import "./globals.css"

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" })
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Relay — opencode session sharing",
  description: "A standalone share service compatible with the opencode share protocol.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  )
}
