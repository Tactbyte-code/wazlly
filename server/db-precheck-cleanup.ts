/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * ============================================================
 *
 * Shared legacy-data cleanup steps used both at server boot
 * (`startup-migration.ts`) and inside the in-app updater
 * (`app-update.controller.ts`) before `db:push` runs.
 *
 * Mirrors `scripts/prod-v37-precheck-and-cleanup.sql` — the same
 * SQL strings live here so the two paths cannot drift apart.
 * Every statement is idempotent and guarded by an
 * information_schema existence check so it is safe on a fresh
 * install where the referenced tables/columns may not yet exist.
 */

import type { Pool } from "pg";

export interface PrecheckCleanupStep {
  description: string;
  sql: string;
}

export const precheckCleanupSteps: PrecheckCleanupStep[] = [
  {
    description:
      "Clean nullable FK varchar empty-string + orphan rows",
    sql: `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='conversations')
           AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='users') THEN
          UPDATE conversations
            SET assigned_to = NULL
            WHERE assigned_to = ''
               OR (assigned_to IS NOT NULL
                   AND assigned_to NOT IN (SELECT id FROM users));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='conversations')
           AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='channels') THEN
          UPDATE conversations
            SET channel_id = NULL
            WHERE channel_id = ''
               OR (channel_id IS NOT NULL
                   AND channel_id NOT IN (SELECT id FROM channels));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='conversations')
           AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='contacts') THEN
          UPDATE conversations
            SET contact_id = NULL
            WHERE contact_id = ''
               OR (contact_id IS NOT NULL
                   AND contact_id NOT IN (SELECT id FROM contacts));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='users') THEN
          UPDATE users
            SET created_by = NULL
            WHERE created_by = ''
               OR (created_by IS NOT NULL
                   AND created_by NOT IN (SELECT id FROM users));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='users')
           AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='channels') THEN
          UPDATE users
            SET channel_id = NULL
            WHERE channel_id = ''
               OR (channel_id IS NOT NULL
                   AND channel_id NOT IN (SELECT id FROM channels));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='contacts')
           AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='users') THEN
          UPDATE contacts
            SET created_by = NULL
            WHERE created_by = ''
               OR (created_by IS NOT NULL
                   AND created_by NOT IN (SELECT id FROM users));
        END IF;
      END $$;
    `,
  },
  {
    description:
      "De-duplicate templates by (channel_id, whatsapp_template_id) keeping latest",
    sql: `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='templates'
                      AND column_name='whatsapp_template_id') THEN
          WITH ranked AS (
            SELECT id,
                   row_number() OVER (
                     PARTITION BY channel_id, whatsapp_template_id
                     ORDER BY updated_at DESC NULLS LAST,
                              created_at DESC NULLS LAST
                   ) AS rn
            FROM templates
            WHERE whatsapp_template_id IS NOT NULL
              AND channel_id IS NOT NULL
          )
          DELETE FROM templates t
          USING ranked r
          WHERE t.id = r.id
            AND r.rn > 1;
        END IF;
      END $$;
    `,
  },
  {
    description:
      "De-duplicate automation_edges by (automation_id, source_node_id, target_node_id, source_handle) keeping latest",
    sql: `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='automation_edges'
                      AND column_name='source_handle') THEN
          WITH ranked AS (
            SELECT id,
                   row_number() OVER (
                     PARTITION BY automation_id, source_node_id,
                                  target_node_id, source_handle
                     ORDER BY created_at DESC NULLS LAST
                   ) AS rn
            FROM automation_edges
          )
          DELETE FROM automation_edges e
          USING ranked r
          WHERE e.id = r.id
            AND r.rn > 1;
        END IF;
      END $$;
    `,
  },
];

export class DbPrecheckStepError extends Error {
  constructor(
    public readonly stepDescription: string,
    public readonly cause: Error,
  ) {
    super(`${stepDescription}: ${cause.message}`);
    this.name = "DbPrecheckStepError";
  }
}

/**
 * Run every shared cleanup step against the given pool. Throws a
 * `DbPrecheckStepError` naming the failing step on the first failure,
 * so callers (in-app updater, manual tooling) can surface a clear
 * message instead of a raw SQL error.
 */
export async function runDbPrecheckCleanup(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    for (const step of precheckCleanupSteps) {
      try {
        await client.query(step.sql);
      } catch (err: any) {
        throw new DbPrecheckStepError(step.description, err);
      }
    }
  } finally {
    client.release();
  }
}
