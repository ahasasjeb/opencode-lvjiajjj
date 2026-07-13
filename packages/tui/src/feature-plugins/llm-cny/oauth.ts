import { homedir } from "node:os"
import { dirname, join } from "node:path"

export type OAuthCredentialSource<T> = {
  credential: T
  filePath?: string
}

export function authCandidatePaths(stateDir: string) {
  const candidates = new Set<string>([join(stateDir, "account.json"), join(stateDir, "auth.json")])
  const stateParent = dirname(stateDir)
  candidates.add(join(stateParent, "opencode", "account.json"))

  for (const base of [
    process.env.XDG_DATA_HOME,
    process.env.LOCALAPPDATA,
    process.env.APPDATA,
    join(homedir(), ".local", "share"),
    join(homedir(), "Library", "Application Support"),
  ]) {
    if (!base) continue
    candidates.add(join(base, "opencode", "account.json"))
    candidates.add(join(base, "opencode", "auth.json"))
  }

  return [...candidates]
}

export async function readOAuthCredential<T>(stateDir: string, parse: (value: unknown) => T | null): Promise<T | null> {
  return (await readOAuthCredentialSources(stateDir, parse))[0]?.credential ?? null
}

export async function readOAuthCredentialSources<T>(
  stateDir: string,
  parse: (value: unknown) => T | null,
): Promise<OAuthCredentialSource<T>[]> {
  const fromEnv = parse(JSON.parse(process.env.OPENCODE_AUTH_CONTENT ?? "null"))
  if (fromEnv) return [{ credential: fromEnv }]

  return (
    await Promise.all(
      authCandidatePaths(stateDir).map((filePath) =>
        Bun.file(filePath)
          .json()
          .then((value): OAuthCredentialSource<T> | null => {
            const credential = parse(value)
            return credential === null ? null : { credential, filePath }
          })
          .catch(() => null),
      ),
    )
  ).filter((item) => item !== null)
}

export async function writeOAuthCredential(
  stateDir: string,
  update: (value: unknown) => unknown | null,
  targetPath?: string,
): Promise<boolean> {
  for (const filePath of targetPath ? [targetPath] : authCandidatePaths(stateDir)) {
    try {
      const next = update(await Bun.file(filePath).json())
      if (!next) continue
      await Bun.write(filePath, JSON.stringify(next, null, 2))
      return true
    } catch {
      continue
    }
  }
  return false
}
