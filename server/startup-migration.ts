/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * ============================================================
 *
 * Idempotent startup migration — runs on every server boot.
 * Uses raw SQL with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards
 * so it is always safe to re-run and never breaks a fresh install.
 *
 * Background: the project uses `db:push` for schema changes, which
 * means any client that did not run `db:push` after an update will
 * have a stale database.  This file self-heals those databases.
 */

import type { Pool } from "pg";
import { precheckCleanupSteps } from "./db-precheck-cleanup";
import { PROVIDER_CURRENCY_OPTIONS } from "@shared/payment-currencies";

interface MigrationStep {
  description: string;
  sql: string;
  /**
   * When true, the row count returned by the SQL is logged at INFO level
   * (only when > 0). Useful for one-shot data backfills so operators can
   * see how many legacy rows were repaired during an upgrade.
   */
  logRowCount?: boolean;
}

function addColumnIfNotExists(
  table: string,
  column: string,
  definition: string
): MigrationStep {
  return {
    description: `Add ${table}.${column}`,
    sql: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition};`,
  };
}

const steps: MigrationStep[] = [
  // ────────────────────────────────────────────────────
  // Data cleanup — must run BEFORE any unique-index / FK
  // step further down so they can succeed on legacy data.
  //
  // Shared with the in-app updater precheck step
  // (see server/db-precheck-cleanup.ts) so the two paths can
  // never drift apart.
  // ────────────────────────────────────────────────────
  ...precheckCleanupSteps,

  // ────────────────────────────────────────────────────
  // campaigns
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "campaigns",
    "population_started_at",
    "TIMESTAMP"
  ),

  // ────────────────────────────────────────────────────
  // automation_edges
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "automation_edges",
    "source_handle",
    "VARCHAR"
  ),
  {
    description: "Recreate automation_edges unique constraint to include source_handle",
    sql: `
      ALTER TABLE automation_edges DROP CONSTRAINT IF EXISTS automation_edges_unique_idx;
      CREATE UNIQUE INDEX IF NOT EXISTS automation_edges_unique_handle_idx
        ON automation_edges (automation_id, source_node_id, target_node_id, COALESCE(source_handle, ''));
    `,
  },

  // ────────────────────────────────────────────────────
  // automation_executions
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "automation_executions",
    "trigger_message_id",
    "VARCHAR(200)"
  ),
  {
    description: "Create automation_executions_message_unique_idx",
    sql: `
      CREATE UNIQUE INDEX IF NOT EXISTS automation_executions_message_unique_idx
        ON automation_executions (automation_id, conversation_id, trigger_message_id);
    `,
  },

  // ────────────────────────────────────────────────────
  // channels
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "channels",
    "is_coexistence",
    "BOOLEAN DEFAULT false"
  ),
  addColumnIfNotExists(
    "channels",
    "health_status",
    "TEXT DEFAULT 'unknown'"
  ),
  addColumnIfNotExists("channels", "last_health_check", "TIMESTAMP"),
  addColumnIfNotExists(
    "channels",
    "health_details",
    "JSONB DEFAULT '{}'"
  ),
  addColumnIfNotExists(
    "channels",
    "connection_method",
    "VARCHAR(20) DEFAULT 'embedded'"
  ),

  // ────────────────────────────────────────────────────
  // conversations
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "conversations",
    "last_incoming_message_at",
    "TIMESTAMP"
  ),
  addColumnIfNotExists("conversations", "last_message_text", "TEXT"),
  addColumnIfNotExists("conversations", "chatbot_id", "VARCHAR"),
  addColumnIfNotExists("conversations", "session_id", "TEXT"),
  addColumnIfNotExists(
    "conversations",
    "unread_count",
    "INTEGER DEFAULT 0"
  ),

  // ────────────────────────────────────────────────────
  // messages
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("messages", "error_details", "JSONB"),
  addColumnIfNotExists("messages", "media_sha256", "VARCHAR(128)"),
  addColumnIfNotExists("messages", "delivered_at", "TIMESTAMP"),
  addColumnIfNotExists("messages", "read_at", "TIMESTAMP"),
  addColumnIfNotExists("messages", "error_code", "VARCHAR(50)"),
  addColumnIfNotExists("messages", "error_message", "TEXT"),
  addColumnIfNotExists("messages", "campaign_id", "VARCHAR"),

  // ────────────────────────────────────────────────────
  // users
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("users", "fcm_token", "VARCHAR(512)"),
  addColumnIfNotExists(
    "users",
    "is_email_verified",
    "BOOLEAN DEFAULT false"
  ),
  addColumnIfNotExists("users", "stripe_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "razorpay_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "paypal_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "paystack_customer_code", "VARCHAR"),
  addColumnIfNotExists("users", "mercadopago_customer_id", "VARCHAR"),

  // ────────────────────────────────────────────────────
  // plans
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("plans", "stripe_product_id", "VARCHAR"),
  addColumnIfNotExists("plans", "stripe_price_id_monthly", "VARCHAR"),
  addColumnIfNotExists("plans", "stripe_price_id_annual", "VARCHAR"),
  addColumnIfNotExists("plans", "razorpay_plan_id_monthly", "VARCHAR"),
  addColumnIfNotExists("plans", "razorpay_plan_id_annual", "VARCHAR"),
  addColumnIfNotExists("plans", "paypal_product_id", "VARCHAR"),
  addColumnIfNotExists("plans", "paypal_plan_id_monthly", "VARCHAR"),
  addColumnIfNotExists("plans", "paypal_plan_id_annual", "VARCHAR"),
  addColumnIfNotExists(
    "plans",
    "paystack_plan_code_monthly",
    "VARCHAR"
  ),
  addColumnIfNotExists(
    "plans",
    "paystack_plan_code_annual",
    "VARCHAR"
  ),
  addColumnIfNotExists(
    "plans",
    "mercadopago_plan_id_monthly",
    "VARCHAR"
  ),
  addColumnIfNotExists(
    "plans",
    "mercadopago_plan_id_annual",
    "VARCHAR"
  ),

  // ────────────────────────────────────────────────────
  // subscriptions
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "subscriptions",
    "gateway_subscription_id",
    "VARCHAR"
  ),
  addColumnIfNotExists("subscriptions", "gateway_provider", "VARCHAR"),
  addColumnIfNotExists("subscriptions", "gateway_status", "VARCHAR"),

  // Stripe checkout writes these columns immediately after creating a
  // gateway subscription. Older installs may not have them yet, which causes
  // checkout to fail after Stripe has already created the subscription.
  addColumnIfNotExists("transactions", "provider_subscription_id", "VARCHAR"),
  addColumnIfNotExists("transactions", "provider_payment_intent_id", "VARCHAR"),
  addColumnIfNotExists("transactions", "provider_setup_intent_id", "VARCHAR"),
  addColumnIfNotExists("transactions", "provider_invoice_id", "VARCHAR"),
  addColumnIfNotExists("transactions", "provider_customer_id", "VARCHAR"),

  // ────────────────────────────────────────────────────
  // message_queue
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "message_queue",
    "template_language",
    "VARCHAR(20) DEFAULT 'en_US'"
  ),
  addColumnIfNotExists("message_queue", "sent_via", "VARCHAR(20)"),
  addColumnIfNotExists("message_queue", "cost", "VARCHAR(20)"),
  addColumnIfNotExists("message_queue", "delivered_at", "TIMESTAMP"),
  addColumnIfNotExists("message_queue", "read_at", "TIMESTAMP"),

  // ────────────────────────────────────────────────────
  // ai_settings
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "ai_settings",
    "words",
    "TEXT[] DEFAULT ARRAY[]::text[]"
  ),
  // Diagnostic columns: webhook handler writes the reason any time it
  // skips an AI auto-reply, so support can answer "why isn't my bot
  // replying?" from the diagnostics endpoint without DB access.
  addColumnIfNotExists("ai_settings", "last_skip_reason", "TEXT"),
  addColumnIfNotExists(
    "ai_settings",
    "last_skip_at",
    "TIMESTAMP WITH TIME ZONE"
  ),

  // ────────────────────────────────────────────────────
  // templates
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("templates", "rejection_reason", "TEXT"),
  addColumnIfNotExists(
    "templates",
    "media_type",
    "TEXT DEFAULT 'text'"
  ),
  addColumnIfNotExists("templates", "media_url", "TEXT"),
  addColumnIfNotExists("templates", "media_handle", "TEXT"),
  addColumnIfNotExists(
    "templates",
    "carousel_cards",
    "JSONB DEFAULT '[]'"
  ),
  addColumnIfNotExists("templates", "whatsapp_template_id", "TEXT"),
  addColumnIfNotExists(
    "templates",
    "usage_count",
    "INTEGER DEFAULT 0"
  ),
  addColumnIfNotExists("templates", "header_type", "TEXT"),
  addColumnIfNotExists("templates", "body_variables", "INTEGER"),

  // ────────────────────────────────────────────────────
  // campaigns
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "campaigns",
    "replied_count",
    "INTEGER DEFAULT 0"
  ),

  // ────────────────────────────────────────────────────
  // contacts — multi-tenant scoping column + index + backfill
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("contacts", "tenant_id", "VARCHAR"),
  {
    description: "Create contacts_tenant_idx on contacts(tenant_id)",
    sql: `CREATE INDEX IF NOT EXISTS contacts_tenant_idx ON contacts(tenant_id);`,
  },
  {
    description:
      "Backfill contacts.tenant_id from creator (team users -> their parent, otherwise self)",
    sql: `
      UPDATE contacts c
         SET tenant_id = COALESCE(
           NULLIF(u.created_by, ''),
           u.id
         )
        FROM users u
       WHERE c.tenant_id IS NULL
         AND c.created_by IS NOT NULL
         AND c.created_by = u.id;
    `,
  },

  // ────────────────────────────────────────────────────
  // webhook_dedup — shared dedup store used when Redis is unavailable.
  // Replaces the previous in-process Map fallback so dedup remains
  // consistent across multiple server instances.
  // ────────────────────────────────────────────────────
  {
    description: "Create webhook_dedup (if not exists) for cross-instance fallback",
    sql: `
      CREATE TABLE IF NOT EXISTS webhook_dedup (
        wamid       VARCHAR(255) PRIMARY KEY,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS webhook_dedup_created_at_idx
        ON webhook_dedup (created_at);
    `,
  },

  // ────────────────────────────────────────────────────
  // New tables — CREATE TABLE IF NOT EXISTS guards
  // ────────────────────────────────────────────────────
  {
    description: "Create table channel_signup_logs (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS channel_signup_logs (
        id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       VARCHAR NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'incomplete',
        step          VARCHAR(50) NOT NULL DEFAULT 'token_exchange',
        error_message TEXT,
        error_details JSONB,
        phone_number  TEXT,
        waba_id       TEXT,
        channel_id    VARCHAR,
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table client_api_keys (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS client_api_keys (
        id                    VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id               VARCHAR NOT NULL,
        channel_id            VARCHAR,
        name                  VARCHAR(100) NOT NULL,
        api_key               VARCHAR(64) NOT NULL UNIQUE,
        secret_hash           VARCHAR(256) NOT NULL,
        permissions           JSONB DEFAULT '[]',
        is_active             BOOLEAN DEFAULT true,
        last_used_at          TIMESTAMP,
        request_count         INTEGER DEFAULT 0,
        monthly_request_count INTEGER DEFAULT 0,
        monthly_reset_at      TIMESTAMP,
        created_at            TIMESTAMP DEFAULT NOW(),
        revoked_at            TIMESTAMP
      );
    `,
  },
  {
    description: "Create table client_api_usage_logs (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS client_api_usage_logs (
        id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id    VARCHAR NOT NULL,
        user_id       VARCHAR NOT NULL,
        channel_id    VARCHAR,
        endpoint      VARCHAR(255) NOT NULL,
        method        VARCHAR(10) NOT NULL,
        status_code   INTEGER,
        response_time INTEGER,
        ip_address    VARCHAR(45),
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table client_webhooks (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS client_webhooks (
        id                 VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id            VARCHAR NOT NULL,
        channel_id         VARCHAR,
        url                TEXT NOT NULL,
        secret             VARCHAR(256),
        events             JSONB DEFAULT '[]',
        is_active          BOOLEAN DEFAULT true,
        last_triggered_at  TIMESTAMP,
        failure_count      INTEGER DEFAULT 0,
        created_at         TIMESTAMP DEFAULT NOW(),
        updated_at         TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table platform_languages (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS platform_languages (
        id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        code         VARCHAR(10) NOT NULL UNIQUE,
        name         VARCHAR(100) NOT NULL,
        native_name  VARCHAR(100) NOT NULL,
        icon         VARCHAR(10),
        direction    VARCHAR(3) NOT NULL DEFAULT 'ltr',
        is_enabled   BOOLEAN NOT NULL DEFAULT true,
        is_default   BOOLEAN NOT NULL DEFAULT false,
        translations JSONB DEFAULT '{}',
        sort_order   INTEGER DEFAULT 0,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Repair English platform_languages row if seeded with placeholder values",
    sql: `
      UPDATE platform_languages
      SET name = 'English',
          native_name = 'English',
          icon = '🇺🇸',
          direction = 'ltr'
      WHERE code = 'en'
        AND (name = 'en' OR native_name = 'en' OR icon = 'en' OR icon IS NULL OR icon = '');
    `,
  },
  {
    description: "Remove stray sample platform_languages row",
    sql: `
      DELETE FROM platform_languages WHERE code = 'sample';
    `,
  },
  {
    description: "Create table update_runs (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS update_runs (
        id                     VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        triggered_by           VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        triggered_by_username  TEXT,
        from_version           TEXT,
        to_version             TEXT,
        status                 VARCHAR(20) NOT NULL DEFAULT 'running',
        final_message          TEXT,
        started_at             TIMESTAMP NOT NULL DEFAULT NOW(),
        finished_at            TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS update_runs_started_at_idx
        ON update_runs (started_at);
    `,
  },
  {
    description: "Create table update_run_events (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS update_run_events (
        id          SERIAL PRIMARY KEY,
        run_id      VARCHAR NOT NULL REFERENCES update_runs(id) ON DELETE CASCADE,
        step        VARCHAR(50) NOT NULL,
        status      VARCHAR(20) NOT NULL,
        message     TEXT NOT NULL,
        progress    INTEGER,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS update_run_events_run_id_idx
        ON update_run_events (run_id, id);
    `,
  },
  // ────────────────────────────────────────────────────
  // panel_config — public_origin column captured from real HTTP traffic
  // (used to build absolute URLs in notification emails). Auto-detected,
  // never hardcoded. See server/services/public-origin.ts.
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("panel_config", "public_origin", "TEXT"),

  // ────────────────────────────────────────────────────
  // payment_providers — backfill empty supported_currencies
  // for legacy rows that were saved by an older version of
  // Gateway Settings which always shipped `supportedCurrencies: []`.
  // Only fills rows that are currently empty/null; never overwrites
  // a list the operator has explicitly chosen.
  // ────────────────────────────────────────────────────
  ...Object.entries(PROVIDER_CURRENCY_OPTIONS).map(([key, currencies]) => ({
    description: `Backfill payment_providers.supported_currencies for ${key} (when empty)`,
    sql: `
      UPDATE payment_providers
         SET supported_currencies = '${JSON.stringify(currencies)}'::jsonb
       WHERE provider_key = '${key}'
         AND (
           supported_currencies IS NULL
           OR jsonb_typeof(supported_currencies) <> 'array'
           OR jsonb_array_length(supported_currencies) = 0
         );
    `,
  })),

  // ────────────────────────────────────────────────────
  // payment_providers — backfill missing config.isLive flag
  // for legacy rows created before the Live/Test toggle existed.
  //
  // Webhook signature verification now branches strictly on
  // config.isLive, so any row that has live API credentials but
  // no isLive field would silently be treated as Test mode after
  // upgrade and reject Live webhook events. Mark those rows as
  // Live so existing Live deployments keep working untouched.
  //
  // Idempotent: only runs on rows where the key is absent. New
  // rows always get the flag from the admin form.
  // ────────────────────────────────────────────────────
  {
    description:
      "Backfill payment_providers.config.isLive=true for legacy rows with live API credentials",
    logRowCount: true,
    sql: `
      UPDATE payment_providers
         SET config = COALESCE(config, '{}'::jsonb)
                      || jsonb_build_object('isLive', true)
       WHERE config IS NOT NULL
         AND NOT (config ? 'isLive')
         AND (
           COALESCE(NULLIF(config->>'apiKey', ''), '') <> ''
           OR COALESCE(NULLIF(config->>'apiSecret', ''), '') <> ''
         );
    `,
  },

  {
    description:
      "Create table whatsapp_business_accounts_config (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS whatsapp_business_accounts_config (
        id         VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id     TEXT NOT NULL,
        app_secret TEXT NOT NULL,
        config_id  TEXT NOT NULL,
        created_by VARCHAR DEFAULT '',
        is_active  BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `,
  },

  // ────────────────────────────────────────────────────
  // Convert every legacy `TIMESTAMP WITHOUT TIME ZONE` column in the
  // public schema to `TIMESTAMPTZ`, interpreting the existing wall-clock
  // value as UTC (the server has always run in UTC).
  //
  // This fixes the dashboard-time-drift bug where rows stored as naive
  // timestamps were sent to the browser without an offset, causing
  // `new Date(...)` to interpret them in the browser's local timezone.
  //
  // Idempotent: once a column is already `timestamp with time zone` it
  // is excluded from the loop. The session.expire column is excluded
  // because it is owned by `connect-pg-simple`, which expects
  // `TIMESTAMP(6) WITHOUT TIME ZONE`.
  // ────────────────────────────────────────────────────
  {
    description:
      "Convert all naive timestamp columns to timestamptz (interpret existing values as UTC)",
    sql: `
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND data_type = 'timestamp without time zone'
            AND NOT (table_name = 'session' AND column_name = 'expire')
        LOOP
          EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''UTC''',
            r.table_name, r.column_name, r.column_name
          );
        END LOOP;
      END$$;
    `,
  },
];

/**
 * Query existing columns across all tables we intend to alter so we can
 * report what was actually added vs already present.
 */
async function getExistingColumns(
  client: Awaited<ReturnType<Pool["connect"]>>
): Promise<Set<string>> {
  const { rows } = await client.query<{ key: string }>(`
    SELECT table_name || '.' || column_name AS key
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  return new Set(rows.map((r) => r.key));
}

async function getExistingTables(
  client: Awaited<ReturnType<Pool["connect"]>>
): Promise<Set<string>> {
  const { rows } = await client.query<{ table_name: string }>(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  return new Set(rows.map((r) => r.table_name));
}

export async function runStartupMigration(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    const beforeColumns = await getExistingColumns(client);
    const beforeTables = await getExistingTables(client);

    const errors: string[] = [];

    for (const step of steps) {
      try {
        const result = await client.query(step.sql);
        if (step.logRowCount && result.rowCount && result.rowCount > 0) {
          console.log(
            `[startup-migration] ${step.description} — patched ${result.rowCount} row(s).`
          );
        }
      } catch (err: any) {
        errors.push(
          `[startup-migration] FAILED — ${step.description}: ${err.message}`
        );
      }
    }

    if (errors.length > 0) {
      for (const e of errors) {
        console.error(e);
      }
      throw new Error(
        `Startup migration encountered ${errors.length} error(s). See logs above.`
      );
    }

    const afterColumns = await getExistingColumns(client);
    const afterTables = await getExistingTables(client);

    const addedColumns = [...afterColumns].filter(
      (c) => !beforeColumns.has(c)
    );
    const addedTables = [...afterTables].filter(
      (t) => !beforeTables.has(t)
    );

    if (addedColumns.length === 0 && addedTables.length === 0) {
      console.log("[startup-migration] All schema checks passed — database is up to date.");
    } else {
      if (addedTables.length > 0) {
        console.log(
          `[startup-migration] Created ${addedTables.length} new table(s): ${addedTables.join(", ")}`
        );
      }
      if (addedColumns.length > 0) {
        console.log(
          `[startup-migration] Added ${addedColumns.length} missing column(s): ${addedColumns.join(", ")}`
        );
      }
    }
  } finally {
    client.release();
  }
}
