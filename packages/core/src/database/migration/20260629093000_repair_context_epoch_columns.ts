import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260629093000_repair_context_epoch_columns",
  up(tx) {
    return Effect.gen(function* () {
      const columns = new Set(
        (yield* tx.all<{ name: string }>(`PRAGMA table_info(\`session_context_epoch\`)`)).map((column) => column.name),
      )
      if (!columns.has("agent"))
        yield* tx.run(`ALTER TABLE \`session_context_epoch\` ADD \`agent\` text DEFAULT 'build' NOT NULL;`)
      if (!columns.has("replacement_seq"))
        yield* tx.run(`ALTER TABLE \`session_context_epoch\` ADD \`replacement_seq\` integer;`)
      if (!columns.has("revision"))
        yield* tx.run(`ALTER TABLE \`session_context_epoch\` ADD \`revision\` integer DEFAULT 0 NOT NULL;`)
    })
  },
} satisfies DatabaseMigration.Migration
