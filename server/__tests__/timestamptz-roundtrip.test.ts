import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const TIMESTAMPTZ_MIGRATION_SQL = `
  DO $$
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND data_type = 'timestamp without time zone'
        AND NOT (table_name = 'session' AND column_name = 'expire')
    LOOP
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''UTC''',
        r.table_name, r.column_name, r.column_name
      );
    END LOOP;
  END$$;
`;

describeIfDb("timestamptz round-trip — real DB integration", () => {
  let pool: Pool;
  let schema: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    schema = `tz_test_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    const c = await pool.connect();
    try {
      await c.query(`CREATE SCHEMA "${schema}"`);
      await c.query(`SET search_path TO "${schema}"`);
      await c.query(`
        CREATE TABLE campaigns (
          id varchar PRIMARY KEY,
          name varchar NOT NULL,
          scheduled_at timestamp,
          created_at  timestamp DEFAULT now()
        );
        CREATE TABLE session (
          sid varchar PRIMARY KEY,
          expire timestamp(6) NOT NULL
        );
      `);
    } finally {
      c.release();
    }
  });

  afterAll(async () => {
    if (pool) {
      const c = await pool.connect();
      try {
        await c.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        c.release();
      }
      await pool.end();
    }
  });

  it("converts naive timestamp columns to timestamptz and skips session.expire", async () => {
    const c = await pool.connect();
    try {
      await c.query(`SET search_path TO "${schema}"`);
      await c.query(TIMESTAMPTZ_MIGRATION_SQL);

      const { rows } = await c.query<{ table_name: string; column_name: string; data_type: string }>(`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = $1
        ORDER BY table_name, column_name
      `, [schema]);

      const byKey: Record<string, string> = {};
      for (const r of rows) byKey[`${r.table_name}.${r.column_name}`] = r.data_type;

      expect(byKey["campaigns.scheduled_at"]).toBe("timestamp with time zone");
      expect(byKey["campaigns.created_at"]).toBe("timestamp with time zone");
      expect(byKey["session.expire"]).toBe("timestamp without time zone");
    } finally {
      c.release();
    }
  });

  it("preserves the absolute instant for a non-UTC offset across insert and select", async () => {
    const c = await pool.connect();
    try {
      await c.query(`SET search_path TO "${schema}"`);
      await c.query(`SET TIME ZONE 'America/New_York'`);

      const inputIso = "2026-04-28T10:00:00+05:30";
      const expectedUtcMs = Date.parse(inputIso);

      await c.query(`INSERT INTO campaigns (id, name, scheduled_at) VALUES ($1, $2, $3)`, [
        "c1",
        "tz-roundtrip",
        new Date(inputIso),
      ]);

      const { rows } = await c.query<{ scheduled_at: Date }>(
        `SELECT scheduled_at FROM campaigns WHERE id = $1`,
        ["c1"]
      );

      expect(rows).toHaveLength(1);
      const fetched = rows[0].scheduled_at;
      expect(fetched).toBeInstanceOf(Date);
      expect(fetched.getTime()).toBe(expectedUtcMs);
      expect(fetched.toISOString()).toBe("2026-04-28T04:30:00.000Z");
    } finally {
      c.release();
    }
  });

  it("backfills pre-existing naive timestamp data as UTC during the type conversion", async () => {
    const c = await pool.connect();
    try {
      await c.query(`SET search_path TO "${schema}"`);
      await c.query(`
        CREATE TABLE legacy_rows (
          id varchar PRIMARY KEY,
          ts  timestamp
        );
      `);
      await c.query(
        `INSERT INTO legacy_rows (id, ts) VALUES ($1, '2026-04-28 08:48:48')`,
        ["legacy-1"]
      );

      await c.query(TIMESTAMPTZ_MIGRATION_SQL);

      const { rows: cols } = await c.query<{ data_type: string }>(`
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = 'legacy_rows' AND column_name = 'ts'
      `, [schema]);
      expect(cols[0].data_type).toBe("timestamp with time zone");

      await c.query(`SET TIME ZONE 'Asia/Kolkata'`);
      const { rows } = await c.query<{ ts: Date }>(
        `SELECT ts FROM legacy_rows WHERE id = $1`,
        ["legacy-1"]
      );
      expect(rows[0].ts.toISOString()).toBe("2026-04-28T08:48:48.000Z");
    } finally {
      c.release();
    }
  });
});
