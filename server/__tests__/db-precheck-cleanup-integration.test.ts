import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { spawnSync } from "child_process";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
const SCRIPT_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "scripts",
  "prod-v37-precheck-and-cleanup.sql"
);

const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb(
  "prod-v37-precheck-and-cleanup.sql — real DB integration",
  () => {
    let pool: Pool;
    let schema: string;

    beforeAll(async () => {
      pool = new Pool({ connectionString: DATABASE_URL });
      schema = `precheck_test_${Date.now()}_${Math.floor(
        Math.random() * 1_000_000
      )}`;
      const c = await pool.connect();
      try {
        await c.query(`CREATE SCHEMA "${schema}"`);
        await c.query(`SET search_path TO "${schema}"`);
        await c.query(`
          CREATE TABLE users (
            id varchar PRIMARY KEY,
            username varchar,
            email varchar,
            password varchar,
            role varchar,
            permissions text[],
            status varchar,
            created_by varchar,
            channel_id varchar,
            created_at timestamp DEFAULT now(),
            updated_at timestamp DEFAULT now()
          );
          CREATE TABLE channels (
            id varchar PRIMARY KEY,
            name varchar,
            created_at timestamp DEFAULT now()
          );
          CREATE TABLE contacts (
            id varchar PRIMARY KEY,
            channel_id varchar,
            phone varchar,
            name varchar,
            created_by varchar,
            created_at timestamp DEFAULT now()
          );
          CREATE TABLE conversations (
            id varchar PRIMARY KEY,
            channel_id varchar,
            contact_id varchar,
            assigned_to varchar
          );
          CREATE TABLE templates (
            id varchar PRIMARY KEY,
            channel_id varchar,
            whatsapp_template_id varchar,
            name varchar,
            created_at timestamp DEFAULT now(),
            updated_at timestamp DEFAULT now()
          );
          CREATE TABLE automation_edges (
            id varchar PRIMARY KEY,
            automation_id varchar,
            source_node_id varchar,
            target_node_id varchar,
            source_handle varchar,
            created_at timestamp DEFAULT now()
          );
        `);
      } finally {
        c.release();
      }
    }, 30000);

    afterAll(async () => {
      if (pool) {
        try {
          await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        } finally {
          await pool.end();
        }
      }
    });

    async function seed() {
      const c = await pool.connect();
      try {
        await c.query(`SET search_path TO "${schema}"`);
        // Truncate so the test can run multiple times in the same session.
        await c.query(`
          TRUNCATE conversations, automation_edges, templates,
                   contacts, users, channels RESTART IDENTITY CASCADE;
        `);

        // Channels (section [2/5] requires at least one).
        await c.query(
          `INSERT INTO channels (id, name) VALUES ('ch1','Primary Channel')`
        );

        // Users
        await c.query(`
          INSERT INTO users
            (id, username, email, password, role, permissions, status)
          VALUES
            ('u-admin', 'admin', 'a@x', 'p', 'admin',
             ARRAY[]::text[], 'active');
        `);
        // Dirty: empty-string created_by + channel_id
        await c.query(`
          INSERT INTO users
            (id, username, email, password, role, permissions, status,
             created_by, channel_id)
          VALUES
            ('u-empty', 'b', 'b@x', 'p', 'user',
             ARRAY[]::text[], 'active', '', '');
        `);
        // Dirty: orphan created_by + channel_id
        await c.query(`
          INSERT INTO users
            (id, username, email, password, role, permissions, status,
             created_by, channel_id)
          VALUES
            ('u-orphan', 'c', 'c@x', 'p', 'user',
             ARRAY[]::text[], 'active', 'no-such-user', 'no-such-channel');
        `);

        // Contacts (need at least one valid for conversation FK).
        await c.query(
          `INSERT INTO contacts (id, channel_id, phone, name)
             VALUES ('co-1','ch1','+1','x')`
        );
        // Dirty contacts.created_by
        await c.query(
          `INSERT INTO contacts (id, channel_id, phone, name, created_by)
             VALUES ('co-2','ch1','+2','y','')`
        );
        await c.query(
          `INSERT INTO contacts (id, channel_id, phone, name, created_by)
             VALUES ('co-3','ch1','+3','z','no-such-user')`
        );

        // Conversations — the v3.7 manual upgrade bug
        await c.query(
          `INSERT INTO conversations (id, channel_id, contact_id, assigned_to)
             VALUES ('cv-empty','','','')`
        );
        await c.query(
          `INSERT INTO conversations (id, channel_id, contact_id, assigned_to)
             VALUES ('cv-orphan','no-ch','no-co','no-user')`
        );
        // Healthy conversation that must survive untouched.
        await c.query(
          `INSERT INTO conversations (id, channel_id, contact_id, assigned_to)
             VALUES ('cv-good','ch1','co-1','u-admin')`
        );

        // Duplicate templates — keep the newer one
        await c.query(`
          INSERT INTO templates
            (id, channel_id, whatsapp_template_id, name, updated_at)
          VALUES
            ('t-old','ch1','wa-1','older','2024-01-01'),
            ('t-new','ch1','wa-1','newer','2025-12-01');
        `);
        // Duplicate edges — keep the newer one
        await c.query(`
          INSERT INTO automation_edges
            (id, automation_id, source_node_id, target_node_id,
             source_handle, created_at)
          VALUES
            ('e-old','a1','n1','n2','h','2024-01-01'),
            ('e-new','a1','n1','n2','h','2025-12-01');
        `);
      } finally {
        c.release();
      }
    }

    function runScriptViaPsql() {
      const result = spawnSync(
        "psql",
        [
          DATABASE_URL!,
          "-v",
          "ON_ERROR_STOP=1",
          "-X",
          "-q",
          "-f",
          SCRIPT_PATH,
        ],
        {
          env: {
            ...process.env,
            // Redirect every unqualified table reference in the script
            // into our isolated test schema. Use the portable
            // `-c key=value` form documented by libpq instead of the
            // long `--search_path=` form, which some libpq builds
            // reject.
            PGOPTIONS: `-c search_path=${schema}`,
          },
          encoding: "utf8",
        }
      );
      return result;
    }

    it("cleans empty-string + orphan FK varchar values, dedupes templates and edges, preserves healthy rows", async () => {
      await seed();

      const result = runScriptViaPsql();
      if (result.status !== 0) {
        throw new Error(
          `psql exit ${result.status}\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`
        );
      }

      const c = await pool.connect();
      try {
        await c.query(`SET search_path TO "${schema}"`);

        // The bug we're fixing: assigned_to must be NULL, not ''.
        const conv = await c.query<{
          id: string;
          channel_id: string | null;
          contact_id: string | null;
          assigned_to: string | null;
        }>(`SELECT id, channel_id, contact_id, assigned_to
              FROM conversations ORDER BY id`);
        const convById = Object.fromEntries(conv.rows.map((r) => [r.id, r]));
        expect(convById["cv-empty"]).toEqual({
          id: "cv-empty",
          channel_id: null,
          contact_id: null,
          assigned_to: null,
        });
        expect(convById["cv-orphan"]).toEqual({
          id: "cv-orphan",
          channel_id: null,
          contact_id: null,
          assigned_to: null,
        });
        // Healthy row untouched.
        expect(convById["cv-good"]).toEqual({
          id: "cv-good",
          channel_id: "ch1",
          contact_id: "co-1",
          assigned_to: "u-admin",
        });

        // Users: empty + orphan FK varchars nulled out.
        const u = await c.query<{
          id: string;
          created_by: string | null;
          channel_id: string | null;
        }>(`SELECT id, created_by, channel_id
              FROM users ORDER BY id`);
        const usersById = Object.fromEntries(u.rows.map((r) => [r.id, r]));
        expect(usersById["u-empty"].created_by).toBeNull();
        expect(usersById["u-empty"].channel_id).toBeNull();
        expect(usersById["u-orphan"].created_by).toBeNull();
        expect(usersById["u-orphan"].channel_id).toBeNull();

        // Contacts.created_by cleaned.
        const contactsBad = await c.query<{ count: string }>(
          `SELECT COUNT(*) AS count FROM contacts
             WHERE created_by IS NOT NULL
               AND created_by NOT IN (SELECT id FROM users)`
        );
        expect(Number(contactsBad.rows[0].count)).toBe(0);

        // Templates dedup: only newer copy survives.
        const tpl = await c.query<{ id: string; name: string }>(
          `SELECT id, name FROM templates
             WHERE channel_id='ch1' AND whatsapp_template_id='wa-1'`
        );
        expect(tpl.rows).toHaveLength(1);
        expect(tpl.rows[0].name).toBe("newer");

        // Automation edges dedup: only newer copy survives.
        const edges = await c.query<{ id: string }>(
          `SELECT id FROM automation_edges
             WHERE automation_id='a1' AND source_node_id='n1'
               AND target_node_id='n2' AND source_handle='h'`
        );
        expect(edges.rows).toHaveLength(1);
        expect(edges.rows[0].id).toBe("e-new");

        // Final sanity: zero orphans across every cleaned column.
        const sanity = await c.query<{
          bad_users_created_by: string;
          bad_users_channel: string;
          bad_contacts_created_by: string;
          bad_conv_assigned_to: string;
          bad_conv_channel: string;
          bad_conv_contact: string;
        }>(`
          SELECT
            (SELECT COUNT(*) FROM users
               WHERE created_by IS NOT NULL
                 AND created_by NOT IN (SELECT id FROM users))
              AS bad_users_created_by,
            (SELECT COUNT(*) FROM users
               WHERE channel_id IS NOT NULL
                 AND channel_id NOT IN (SELECT id FROM channels))
              AS bad_users_channel,
            (SELECT COUNT(*) FROM contacts
               WHERE created_by IS NOT NULL
                 AND created_by NOT IN (SELECT id FROM users))
              AS bad_contacts_created_by,
            (SELECT COUNT(*) FROM conversations
               WHERE assigned_to IS NOT NULL
                 AND assigned_to NOT IN (SELECT id FROM users))
              AS bad_conv_assigned_to,
            (SELECT COUNT(*) FROM conversations
               WHERE channel_id IS NOT NULL
                 AND channel_id NOT IN (SELECT id FROM channels))
              AS bad_conv_channel,
            (SELECT COUNT(*) FROM conversations
               WHERE contact_id IS NOT NULL
                 AND contact_id NOT IN (SELECT id FROM contacts))
              AS bad_conv_contact;
        `);
        const row = sanity.rows[0];
        for (const [k, v] of Object.entries(row)) {
          expect(
            { [k]: Number(v) },
            `${k} should be zero after cleanup`
          ).toEqual({ [k]: 0 });
        }
      } finally {
        c.release();
      }
    }, 30000);

    it("is idempotent — a second run is a no-op and still exits 0", async () => {
      // No re-seed: the schema is already clean from the previous test.
      const second = runScriptViaPsql();
      expect(second.status).toBe(0);

      const c = await pool.connect();
      try {
        await c.query(`SET search_path TO "${schema}"`);
        const stillClean = await c.query<{ count: string }>(`
          SELECT COUNT(*) AS count FROM conversations
            WHERE assigned_to = ''
               OR (assigned_to IS NOT NULL
                   AND assigned_to NOT IN (SELECT id FROM users));
        `);
        expect(Number(stillClean.rows[0].count)).toBe(0);
      } finally {
        c.release();
      }
    }, 30000);
  }
);
