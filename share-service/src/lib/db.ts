import postgres from "postgres"
import { PayloadType, SharePayload } from "./types"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error("DATABASE_URL is required")

const globalDatabase = globalThis as typeof globalThis & {
  shareSql?: ReturnType<typeof postgres>
  shareSchema?: Promise<void>
}

export const sql =
  globalDatabase.shareSql ??
  postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  })

if (process.env.NODE_ENV !== "production") globalDatabase.shareSql = sql

export function ensureSchema() {
  const schema =
    globalDatabase.shareSchema ??
    (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS shares (
          id text PRIMARY KEY,
          session_id text NOT NULL,
          secret_hash text NOT NULL,
          org_id text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS share_payloads (
          share_id text NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
          key text NOT NULL,
          type text NOT NULL CHECK (type IN ('session', 'message', 'part', 'session_diff', 'model')),
          content_json jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (share_id, key)
        )
      `
      await sql`
        CREATE INDEX IF NOT EXISTS share_payloads_order_idx
        ON share_payloads (share_id, type, key)
      `
    })()

  globalDatabase.shareSchema = schema
  return schema
}

export async function createShare(input: {
  id: string
  sessionID: string
  secretHash: string
  orgID?: string
}) {
  await ensureSchema()
  await sql`
    INSERT INTO shares (id, session_id, secret_hash, org_id)
    VALUES (${input.id}, ${input.sessionID}, ${input.secretHash}, ${input.orgID ?? null})
  `
}

export async function getShare(id: string) {
  await ensureSchema()
  const rows = await sql<{ id: string; secret_hash: string; org_id: string | null; updated_at: Date }[]>`
    SELECT id, secret_hash, org_id, updated_at
    FROM shares
    WHERE id = ${id}
  `
  return rows[0]
}

export async function syncPayloads(id: string, payloads: (SharePayload & { key: string })[]) {
  await ensureSchema()
  await sql.begin(async (transaction) => {
    await Promise.all(
      payloads.map(
        (payload) => transaction`
          INSERT INTO share_payloads (share_id, key, type, content_json)
          VALUES (${id}, ${payload.key}, ${payload.type}, ${transaction.json(payload.data)})
          ON CONFLICT (share_id, key) DO UPDATE
          SET type = EXCLUDED.type,
              content_json = EXCLUDED.content_json,
              updated_at = now()
        `,
      ),
    )
    await transaction`UPDATE shares SET updated_at = now() WHERE id = ${id}`
  })
}

export async function deleteShare(id: string) {
  await ensureSchema()
  await sql`DELETE FROM shares WHERE id = ${id}`
}

export async function getPayloads(id: string) {
  await ensureSchema()
  return sql<{ type: PayloadType; content_json: SharePayload["data"] }[]>`
    SELECT type, content_json
    FROM share_payloads
    WHERE share_id = ${id}
    ORDER BY
      CASE type
        WHEN 'session' THEN 1
        WHEN 'message' THEN 2
        WHEN 'part' THEN 3
        WHEN 'session_diff' THEN 4
        WHEN 'model' THEN 5
      END,
      key
  `
}

export async function getStats() {
  await ensureSchema()
  const rows = await sql<{ shares: number; payloads: number }[]>`
    SELECT
      (SELECT count(*)::int FROM shares) AS shares,
      (SELECT count(*)::int FROM share_payloads) AS payloads
  `
  return rows[0]
}
