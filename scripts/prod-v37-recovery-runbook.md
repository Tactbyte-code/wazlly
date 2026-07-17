# Production v3.6 → v3.7 Recovery Runbook

The self-hosted production server is stuck on v3.6 with the upload dropzone hidden, and `npm run db:push` for v3.7 keeps failing on legacy data. This runbook gives you a single command that does everything.

## Prerequisites
- SSH access to the production box (e.g. `/home/whatsway/`)
- `DATABASE_URL` available (already in `/home/whatsway/.env`)
- `pg_dump`, `psql`, `node`, `npm`, and `pm2` on PATH
- The v3.7 source already deployed to `/home/whatsway/` (so the cleanup script and the wrapper are present at `scripts/`)

## One-shot recovery (recommended)

```bash
cd /home/whatsway
bash scripts/prod-v37-recover.sh
```

The wrapper performs **5 steps** with PASS/FAIL output at each:

1. Backs up the production DB to `/tmp/whatsway-backup-pre-v37-<timestamp>.sql`
2. Runs `scripts/prod-v37-precheck-and-cleanup.sql` (users, contacts, templates, automation_edges normalization in one transaction — automatically rolls back on any error)
3. Runs `npm run db:push --force` (no interactive prompts)
4. Restarts pm2
5. Verifies the running version is `3.7.x`

If any step fails, the script aborts with a clear message and tells you the backup path so you can restore.

### Restore (if anything goes wrong)
```bash
psql "$DATABASE_URL" < /tmp/whatsway-backup-pre-v37-<timestamp>.sql
pm2 restart whatsway
```

## Verify in the browser
Visit `https://whatsway.diploy.in/app-update`:
- Header badge reads **v3.7**
- The **Upload ZIP** dropzone is visible above the "Update complete" panel
- Hard refresh — the log shows one settled line per pipeline step (no duplicate running+done rows)

---

## Manual fallback (if you can't run the wrapper)

### 1. Copy files onto the server
```bash
scp scripts/prod-v37-precheck-and-cleanup.sql root@whatsway.diploy.in:/tmp/
```

### 2. Backup
```bash
cd /home/whatsway
source .env
pg_dump "$DATABASE_URL" > /tmp/whatsway-backup-pre-v37.sql
ls -lh /tmp/whatsway-backup-pre-v37.sql
```

### 3. Cleanup
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/prod-v37-precheck-and-cleanup.sql
```

The final row should print four zeros:
```
 bad_users_created_by | null_contacts_channel | dup_templates | dup_automation_edges
----------------------+-----------------------+---------------+----------------------
                    0 |                     0 |             0 |                    0
```

### 4. Push schema
```bash
cd /home/whatsway
npm run db:push -- --force
```

(Or `npm run db:push` interactively and answer **No** to every truncate / data-loss prompt.)

### 5. Restart and verify
```bash
pm2 restart whatsway
pm2 ls          # confirm version 3.7.0
```

---

## Why this is needed
v3.7 tightens four constraints that v3.6 left loose:
1. `users.created_by` must reference a valid user (or be NULL)
2. `contacts.channel_id` must be NOT NULL
3. `templates(channel_id, whatsapp_template_id)` must be unique
4. `automation_edges(automation_id, source_node_id, target_node_id, source_handle)` must be unique

Existing legacy rows violated all four. The cleanup script normalizes them in one transaction. After this lands, the in-app updater (now with Task #110's permanently visible dropzone) will handle all future updates without manual intervention.
