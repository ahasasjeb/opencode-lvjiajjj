import { expect, test } from "bun:test"
import { continuationCommand, sessionEpilogue } from "../../src/util/presentation"

test("formats session continuation summary", () => {
  const epilogue = sessionEpilogue({ title: "A session", sessionID: "ses_123", executable: "opencode" })
  expect(epilogue).toContain("A session")
  expect(epilogue).toContain("opencode -s ses_123")
})

test("formats renamed and path-based executables", () => {
  expect(continuationCommand(["-s", "ses_123"], "opencode2", "linux")).toBe("opencode2 -s ses_123")
  expect(continuationCommand(["-s", "ses_123"], "/opt/Open Code/opencode2", "linux")).toBe(
    "'/opt/Open Code/opencode2' -s ses_123",
  )
  expect(continuationCommand(["-s", "ses_123"], "C:\\Program Files\\OpenCode\\opencode2.exe", "win32")).toBe(
    '"C:\\Program Files\\OpenCode\\opencode2.exe" -s ses_123',
  )
})
