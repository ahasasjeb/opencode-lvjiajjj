import { dlopen, ptr } from "bun:ffi"
import type { ReadStream } from "node:tty"
import fs from "node:fs"
import path from "node:path"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Global } from "@opencode-ai/core/global"

const STD_INPUT_HANDLE = -10
const ENABLE_PROCESSED_INPUT = 0x0001

const kernel = () =>
  dlopen("kernel32.dll", {
    GetStdHandle: { args: ["i32"], returns: "ptr" },
    GetConsoleMode: { args: ["ptr", "ptr"], returns: "i32" },
    SetConsoleMode: { args: ["ptr", "u32"], returns: "i32" },
    FlushConsoleInputBuffer: { args: ["ptr"], returns: "i32" },
  })

let k32: ReturnType<typeof kernel> | undefined

function load() {
  if (process.platform !== "win32") return false
  try {
    k32 ??= kernel()
    return true
  } catch {
    return false
  }
}

/**
 * Clear ENABLE_PROCESSED_INPUT on the console stdin handle.
 */
export function win32DisableProcessedInput() {
  if (process.platform !== "win32") return
  if (!process.stdin.isTTY) return
  if (!load()) return

  const handle = k32!.symbols.GetStdHandle(STD_INPUT_HANDLE)
  const buf = new Uint32Array(1)
  if (k32!.symbols.GetConsoleMode(handle, ptr(buf)) === 0) return

  const mode = buf[0]!
  if ((mode & ENABLE_PROCESSED_INPUT) === 0) return
  k32!.symbols.SetConsoleMode(handle, mode & ~ENABLE_PROCESSED_INPUT)
}

/**
 * Discard any queued console input (mouse events, key presses, etc.).
 */
export function win32FlushInputBuffer() {
  if (process.platform !== "win32") return
  if (!process.stdin.isTTY) return
  if (!load()) return

  const handle = k32!.symbols.GetStdHandle(STD_INPUT_HANDLE)
  k32!.symbols.FlushConsoleInputBuffer(handle)
}

let unhook: (() => void) | undefined

/**
 * Keep ENABLE_PROCESSED_INPUT disabled.
 *
 * On Windows, Ctrl+C becomes a CTRL_C_EVENT (instead of stdin input) when
 * ENABLE_PROCESSED_INPUT is set. Various runtimes can re-apply console modes
 * (sometimes on a later tick), and the flag is console-global, not per-process.
 *
 * We combine:
 * - A `setRawMode(...)` hook to re-clear after known raw-mode toggles.
 * - A low-frequency poll as a backstop for native/external mode changes.
 *
 * In safe mode, the polling interval is NOT installed. Only the setRawMode
 * hook and a one-time enforce are used.
 */
export function win32InstallCtrlCGuard() {
  if (process.platform !== "win32") return
  if (!process.stdin.isTTY) return
  if (!load()) return
  if (unhook) return unhook

  const safeMode = Flag.OPENCODE_WINDOWS_TUI_SAFE_MODE
  const stdin = process.stdin as ReadStream
  const original = stdin.setRawMode

  const handle = k32!.symbols.GetStdHandle(STD_INPUT_HANDLE)
  const buf = new Uint32Array(1)

  if (k32!.symbols.GetConsoleMode(handle, ptr(buf)) === 0) return
  const initial = buf[0]!

  const enforce = () => {
    if (k32!.symbols.GetConsoleMode(handle, ptr(buf)) === 0) return
    const mode = buf[0]!
    if ((mode & ENABLE_PROCESSED_INPUT) === 0) return
    k32!.symbols.SetConsoleMode(handle, mode & ~ENABLE_PROCESSED_INPUT)
  }

  // Some runtimes can re-apply console modes on the next tick; enforce twice.
  const later = () => {
    enforce()
    setImmediate(enforce)
  }

  let wrapped: ReadStream["setRawMode"] | undefined

  if (typeof original === "function") {
    wrapped = (mode: boolean) => {
      const result = original.call(stdin, mode)
      later()
      return result
    }

    stdin.setRawMode = wrapped
  }

  // Ensure it's cleared immediately too (covers any earlier mode changes).
  later()

  let interval: ReturnType<typeof setInterval> | undefined
  if (!safeMode) {
    interval = setInterval(enforce, 100)
    interval.unref()
  } else {
    console.debug("[win32] safe mode: console polling guard disabled")
  }

  let done = false
  unhook = () => {
    if (done) return
    done = true

    if (interval) clearInterval(interval)
    if (wrapped && stdin.setRawMode === wrapped) {
      stdin.setRawMode = original
    }

    k32!.symbols.SetConsoleMode(handle, initial)
    unhook = undefined
  }

  return unhook
}

// ---------------------------------------------------------------------------
// Windows TUI Safe Mode: terminal state management
// ---------------------------------------------------------------------------

const CRASH_MARKER_PREFIX = "tui-unclean-exit-"

function crashMarkerPath() {
  return path.join(Global.Path.state, CRASH_MARKER_PREFIX + process.pid)
}

function staleCrashMarkerPaths() {
  return fs.readdirSync(Global.Path.state).flatMap((entry) => {
    if (!entry.startsWith(CRASH_MARKER_PREFIX)) return []
    const value = entry.slice(CRASH_MARKER_PREFIX.length)
    const pid = /^\d+$/.test(value) ? Number(value) : NaN
    if (!Number.isSafeInteger(pid) || pid <= 0 || pid === process.pid) return []
    try {
      process.kill(pid, 0)
      return []
    } catch {
      return [path.join(Global.Path.state, entry)]
    }
  })
}

/**
 * Create the crash recovery marker file (atomic write).
 * Failure does not block startup.
 */
export function createCrashMarker() {
  if (process.platform !== "win32") return
  try {
    const file = crashMarkerPath()
    const tmp = file + ".tmp"
    fs.writeFileSync(tmp, String(Date.now()), "utf8")
    fs.renameSync(tmp, file)
  } catch (error) {
    console.debug("[win32] failed to create crash marker", { error })
  }
}

/**
 * Remove the crash recovery marker file.
 * Failure does not block shutdown.
 */
export function removeCrashMarker() {
  if (process.platform !== "win32") return
  try {
    fs.unlinkSync(crashMarkerPath())
  } catch {}
}

/**
 * Check for markers left by exited TUI processes.
 * If found, performs recovery (reset + flush) and returns true.
 */
export function checkAndRecoverCrashMarker(): boolean {
  if (process.platform !== "win32") return false
  try {
    const markers = staleCrashMarkerPaths()
    if (markers.length === 0) return false
    console.debug("[win32] detected unclean TUI exit marker, performing terminal recovery")
    resetWindowsTerminalState()
    win32FlushInputBuffer()
    for (const marker of markers) {
      try {
        fs.unlinkSync(marker)
      } catch (error) {
        console.debug("[win32] failed to remove crash marker", { error })
      }
    }
    return true
  } catch (error) {
    console.debug("[win32] crash marker recovery failed", { error })
    return false
  }
}

/**
 * Write conservative terminal reset sequences to stdout.
 * Disables mouse reporting, focus events, bracketed paste;
 * restores cursor visibility, default style, and main screen buffer.
 *
 * Only executes when stdout is a TTY. Does NOT use ESC c (full reset).
 */
export function resetWindowsTerminalState() {
  if (!process.stdout.isTTY) return
  try {
    process.stdout.write(
      [
        "\x1b[?1000l", // disable mouse button reporting
        "\x1b[?1002l", // disable mouse motion reporting
        "\x1b[?1003l", // disable all mouse motion reporting
        "\x1b[?1006l", // disable SGR mouse mode
        "\x1b[?1004l", // disable focus reporting
        "\x1b[?2004l", // disable bracketed paste
        "\x1b[?25h", // show cursor
        "\x1b[0m", // reset attributes
        "\x1b[?1049l", // restore main screen buffer
      ].join(""),
    )
  } catch (error) {
    console.debug("[win32] resetWindowsTerminalState failed", { error })
  }
}

// ---------------------------------------------------------------------------
// Safe mode one-time console mode setup
// ---------------------------------------------------------------------------

let savedConsoleMode: number | undefined

/**
 * In safe mode, perform a one-time console mode modification:
 * - Save the original mode
 * - Clear ENABLE_PROCESSED_INPUT so Ctrl+C is delivered as stdin data
 * - Check return values and log failures without throwing
 */
export function win32SafeModeConsoleSetup() {
  if (process.platform !== "win32") return
  if (!process.stdin.isTTY) return
  if (!load()) return

  const handle = k32!.symbols.GetStdHandle(STD_INPUT_HANDLE)
  const buf = new Uint32Array(1)

  if (k32!.symbols.GetConsoleMode(handle, ptr(buf)) === 0) {
    console.debug("[win32] GetConsoleMode failed during safe mode setup")
    return
  }

  const original = buf[0]!
  savedConsoleMode = original
  console.debug("[win32] console mode before safe setup", { mode: `0x${original.toString(16)}` })

  if ((original & ENABLE_PROCESSED_INPUT) !== 0) {
    const next = original & ~ENABLE_PROCESSED_INPUT
    if (k32!.symbols.SetConsoleMode(handle, next) === 0) {
      console.debug("[win32] SetConsoleMode failed during safe mode setup")
      savedConsoleMode = undefined
      return
    }
    console.debug("[win32] console mode after safe setup", { mode: `0x${next.toString(16)}` })
  }
}

/**
 * Restore the original console mode saved by win32SafeModeConsoleSetup.
 */
function restoreConsoleMode() {
  if (savedConsoleMode === undefined) return
  if (!k32) return
  try {
    const handle = k32.symbols.GetStdHandle(STD_INPUT_HANDLE)
    k32.symbols.SetConsoleMode(handle, savedConsoleMode)
    console.debug("[win32] restored console mode", { mode: `0x${savedConsoleMode.toString(16)}` })
  } catch (error) {
    console.debug("[win32] failed to restore console mode", { error })
  }
  savedConsoleMode = undefined
}

// ---------------------------------------------------------------------------
// Idempotent terminal cleanup
// ---------------------------------------------------------------------------

let cleanupDone = false
let cleanupRendererDestroy: (() => void) | undefined
let cleanupUnguard: (() => void) | undefined

/**
 * Register external cleanup callbacks that cleanupTerminalState should invoke.
 */
export function registerCleanupCallbacks(input: {
  rendererDestroy?: () => void
  unguard?: () => void
}) {
  if (input.rendererDestroy) cleanupRendererDestroy = input.rendererDestroy
  if (input.unguard) cleanupUnguard = input.unguard
}

/**
 * Idempotent terminal cleanup. Safe to call multiple times.
 * Each step is individually guarded so one failure does not skip later steps.
 */
export function cleanupTerminalState() {
  const hasRenderer = cleanupRendererDestroy !== undefined
  if (cleanupDone) return hasRenderer
  cleanupDone = true

  const steps: [string, () => void][] = [
    [
      "reset terminal escape sequences",
      () => resetWindowsTerminalState(),
    ],
    [
      "destroy renderer",
      () => cleanupRendererDestroy?.(),
    ],
    [
      "unhook ctrl-c guard",
      () => cleanupUnguard?.(),
    ],
    [
      "restore console mode",
      () => restoreConsoleMode(),
    ],
    [
      "flush input buffer",
      () => win32FlushInputBuffer(),
    ],
    [
      "remove crash marker",
      () => removeCrashMarker(),
    ],
  ]

  for (const [name, fn] of steps) {
    try {
      fn()
      console.debug("[win32] cleanup step ok", { step: name })
    } catch (error) {
      console.debug("[win32] cleanup step failed", { step: name, error })
    }
  }
  return hasRenderer
}

/**
 * Install process-level exit handlers that call cleanupTerminalState.
 * Returns a dispose function that removes the handlers.
 */
export function installExitHandlers() {
  if (process.platform !== "win32") return () => {}

  const terminate = (code: number) => {
    process.exitCode = code
    if (cleanupTerminalState()) return
    process.exit(code)
  }
  const onSigint = () => terminate(130)
  const onSigterm = () => terminate(143)
  const onBeforeExit = () => cleanupTerminalState()
  const onUncaught = (error: Error) => {
    console.debug("[win32] uncaughtException, cleaning up terminal", { error: error.message })
    cleanupTerminalState()
    process.exit(1)
  }
  const onUnhandled = (reason: unknown) => {
    console.debug("[win32] unhandledRejection, cleaning up terminal", { reason: String(reason) })
    cleanupTerminalState()
    process.exit(1)
  }

  process.on("SIGINT", onSigint)
  process.on("SIGTERM", onSigterm)
  process.on("beforeExit", onBeforeExit)
  process.on("uncaughtException", onUncaught)
  process.on("unhandledRejection", onUnhandled)

  return () => {
    process.off("SIGINT", onSigint)
    process.off("SIGTERM", onSigterm)
    process.off("beforeExit", onBeforeExit)
    process.off("uncaughtException", onUncaught)
    process.off("unhandledRejection", onUnhandled)
  }
}
