import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260629090000_add_context_epoch_replacement_seq",
  up(tx) {
    return Effect.gen(function* () {
      if (
        (yield* tx.all<{ name: string }>(`PRAGMA table_info(\`session_context_epoch\`)`)).some(
          (column) => column.name === "replacement_seq",
        )
      )
        return
      yield* tx.run(`ALTER TABLE \`session_context_epoch\` ADD \`replacement_seq\` integer;`)
    })
  },
} satisfies DatabaseMigration.Migration
