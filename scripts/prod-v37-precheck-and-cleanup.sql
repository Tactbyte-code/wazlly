-- =============================================================================
-- WhatsWay v3.6 -> v3.7 production recovery script
-- =============================================================================
-- Run on the PRODUCTION Postgres BEFORE `npm run db:push`.
-- Safe to re-run (idempotent). Wraps everything in a single transaction so
-- a failure rolls back cleanly.
--
-- Usage:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prod-v37-precheck-and-cleanup.sql
--
-- The single recommended manual upgrade command is:
--   npm run db:upgrade
-- which runs this script via psql and then `drizzle-kit push --force`
-- in one shot, with no interactive prompts.
--
-- If you must invoke `db:push` directly after this script, all truncate
-- and data-loss prompts can be answered "No" — the cleanups above ensure
-- only the safe constraint additions apply.
-- =============================================================================

\set ON_ERROR_STOP on
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. users.created_by  -- must reference an existing users.id or be NULL
-- ---------------------------------------------------------------------------
\echo '[1/5] Cleaning users.created_by orphans...'

UPDATE users
SET created_by = NULL
WHERE created_by = ''
   OR (created_by IS NOT NULL
       AND created_by NOT IN (SELECT id FROM users));

SELECT COUNT(*) AS users_created_by_still_orphan
FROM users
WHERE created_by IS NOT NULL
  AND created_by NOT IN (SELECT id FROM users);

-- ---------------------------------------------------------------------------
-- 2. contacts.channel_id  -- about to become NOT NULL
--    Strategy: delete orphan contacts whose phone already exists in the
--    target channel (true duplicates), then assign remaining orphans to
--    the oldest channel. If you have multiple tenants and need a smarter
--    mapping, ABORT here and do it manually.
-- ---------------------------------------------------------------------------
\echo '[2/5] Cleaning contacts.channel_id NULLs...'

DO $$
DECLARE
  default_channel_id varchar;
  channel_count int;
BEGIN
  SELECT COUNT(*) INTO channel_count FROM channels;
  IF channel_count = 0 THEN
    RAISE EXCEPTION 'No channels exist; cannot backfill contacts.channel_id';
  END IF;
  IF channel_count > 1 THEN
    RAISE NOTICE 'Multiple channels exist (%). Using oldest as default for orphan contacts. Review before committing.', channel_count;
  END IF;
END $$;

-- Drop orphan contacts whose phone already exists in the target channel.
DELETE FROM contacts
WHERE channel_id IS NULL
  AND phone IN (
    SELECT phone FROM contacts
    WHERE channel_id = (SELECT id FROM channels ORDER BY created_at LIMIT 1)
  );

-- Move remaining orphans to the oldest channel.
UPDATE contacts
SET channel_id = (SELECT id FROM channels ORDER BY created_at LIMIT 1)
WHERE channel_id IS NULL;

SELECT COUNT(*) AS contacts_channel_id_still_null
FROM contacts
WHERE channel_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. templates.template_channel_wa_id_unique
--    Removes duplicate (channel_id, whatsapp_template_id) rows, keeping the
--    most recently updated copy.
-- ---------------------------------------------------------------------------
\echo '[3/5] De-duplicating templates by (channel_id, whatsapp_template_id)...'

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY channel_id, whatsapp_template_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM templates
  WHERE whatsapp_template_id IS NOT NULL
    AND channel_id IS NOT NULL
)
DELETE FROM templates t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

SELECT channel_id, whatsapp_template_id, COUNT(*) AS dup_count
FROM templates
WHERE whatsapp_template_id IS NOT NULL
GROUP BY channel_id, whatsapp_template_id
HAVING COUNT(*) > 1;

-- ---------------------------------------------------------------------------
-- 4. automation_edges.automation_edges_unique_handle_idx
--    Removes duplicate (automation_id, source_node_id, target_node_id,
--    source_handle) rows, keeping the most recently created.
-- ---------------------------------------------------------------------------
\echo '[4/5] De-duplicating automation_edges...'

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

SELECT automation_id, source_node_id, target_node_id, source_handle,
       COUNT(*) AS dup_count
FROM automation_edges
GROUP BY 1,2,3,4
HAVING COUNT(*) > 1;

-- ---------------------------------------------------------------------------
-- 5. Nullable FK varchar columns — empty-string and orphan cleanup
--    Old code paths sometimes wrote '' instead of NULL into nullable FK
--    columns. Postgres treats '' as a real value, so adding/validating the
--    FK constraint fails with: Key (col)=() is not present in table "...".
--    Convert any '' or orphan values back to NULL for every nullable FK
--    varchar column so drizzle-kit push can apply unique/FK constraints.
-- ---------------------------------------------------------------------------
\echo '[5/6] Cleaning nullable FK varchar empty-string + orphan rows...'

-- conversations.assigned_to -> users.id  (the v3.7 manual upgrade bug)
UPDATE conversations
SET assigned_to = NULL
WHERE assigned_to = ''
   OR (assigned_to IS NOT NULL
       AND assigned_to NOT IN (SELECT id FROM users));

-- conversations.channel_id -> channels.id
UPDATE conversations
SET channel_id = NULL
WHERE channel_id = ''
   OR (channel_id IS NOT NULL
       AND channel_id NOT IN (SELECT id FROM channels));

-- conversations.contact_id -> contacts.id
UPDATE conversations
SET contact_id = NULL
WHERE contact_id = ''
   OR (contact_id IS NOT NULL
       AND contact_id NOT IN (SELECT id FROM contacts));

-- contacts.created_by -> users.id
UPDATE contacts
SET created_by = NULL
WHERE created_by = ''
   OR (created_by IS NOT NULL
       AND created_by NOT IN (SELECT id FROM users));

-- users.channel_id -> channels.id
UPDATE users
SET channel_id = NULL
WHERE channel_id = ''
   OR (channel_id IS NOT NULL
       AND channel_id NOT IN (SELECT id FROM channels));

-- ---------------------------------------------------------------------------
-- 6. Final sanity counts
-- ---------------------------------------------------------------------------
\echo '[6/6] Final counts (all should be zero)...'

SELECT
  (SELECT COUNT(*) FROM users
     WHERE created_by IS NOT NULL
       AND created_by NOT IN (SELECT id FROM users))         AS bad_users_created_by,
  (SELECT COUNT(*) FROM users
     WHERE channel_id IS NOT NULL
       AND channel_id NOT IN (SELECT id FROM channels))      AS bad_users_channel,
  (SELECT COUNT(*) FROM contacts WHERE channel_id IS NULL)   AS null_contacts_channel,
  (SELECT COUNT(*) FROM contacts
     WHERE created_by IS NOT NULL
       AND created_by NOT IN (SELECT id FROM users))         AS bad_contacts_created_by,
  (SELECT COUNT(*) FROM conversations
     WHERE assigned_to IS NOT NULL
       AND assigned_to NOT IN (SELECT id FROM users))        AS bad_conv_assigned_to,
  (SELECT COUNT(*) FROM conversations
     WHERE channel_id IS NOT NULL
       AND channel_id NOT IN (SELECT id FROM channels))      AS bad_conv_channel,
  (SELECT COUNT(*) FROM conversations
     WHERE contact_id IS NOT NULL
       AND contact_id NOT IN (SELECT id FROM contacts))      AS bad_conv_contact,
  (SELECT COUNT(*) FROM (
     SELECT 1 FROM templates
     WHERE whatsapp_template_id IS NOT NULL
     GROUP BY channel_id, whatsapp_template_id
     HAVING COUNT(*) > 1
   ) x)                                                       AS dup_templates,
  (SELECT COUNT(*) FROM (
     SELECT 1 FROM automation_edges
     GROUP BY automation_id, source_node_id, target_node_id, source_handle
     HAVING COUNT(*) > 1
   ) y)                                                       AS dup_automation_edges;

\echo ''
\echo 'CLEANUP COMPLETE. If all counts above are 0, run: npm run db:upgrade (or drizzle-kit push --force)'
\echo 'Answer all truncate / data-loss prompts with: No'
\echo ''

COMMIT;
