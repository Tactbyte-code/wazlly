import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

// Advisory lock key MUST match the constant used in
// server/services/public-origin.ts → persistOrigin(). If somebody changes
// it there without updating this test, the static check below fails so
// the concurrency invariant cannot silently regress.
const ADVISORY_LOCK_KEY = "8472613950174658123";
const PUBLIC_ORIGIN_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "..", "services", "public-origin.ts"),
  "utf8"
);

describe("public-origin advisory lock key stays in sync with the source", () => {
  it("references the same 64-bit lock key the test pins", () => {
    expect(PUBLIC_ORIGIN_SOURCE).toContain(`pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`);
  });
});

describeIfDb(
  "persistPublicOrigin — concurrent first-writes never duplicate panel_config",
  () => {
    let pool: Pool;
    let schema: string;

    beforeAll(async () => {
      pool = new Pool({ connectionString: DATABASE_URL });
      schema = `public_origin_test_${Date.now()}_${Math.floor(
        Math.random() * 1_000_000
      )}`;
      const c = await pool.connect();
      try {
        await c.query(`CREATE SCHEMA "${schema}"`);
        await c.query(`SET search_path TO "${schema}"`);
        // Minimal panel_config table mirroring the columns the upsert
        // touches. created_at lets ORDER BY pick the latest row.
        await c.query(`
          CREATE TABLE panel_config (
            id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
            name varchar NOT NULL,
            public_origin text,
            created_at timestamp DEFAULT now(),
            updated_at timestamp DEFAULT now()
          )
        `);
      } finally {
        c.release();
      }
    });

    afterAll(async () => {
      const c = await pool.connect();
      try {
        await c.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally {
        c.release();
      }
      await pool.end();
    });

    async function persistOriginOnce(origin: string) {
      const client = await pool.connect();
      try {
        await client.query(`SET search_path TO "${schema}"`);
        await client.query("BEGIN");
        await client.query(`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`);
        await client.query(
          `INSERT INTO panel_config (name, public_origin)
             SELECT 'Your App Name', $1
              WHERE NOT EXISTS (SELECT 1 FROM panel_config)`,
          [origin]
        );
        await client.query(
          `UPDATE panel_config
              SET public_origin = $1,
                  updated_at    = NOW()
            WHERE id = (
              SELECT id FROM panel_config ORDER BY created_at DESC LIMIT 1
            )`,
          [origin]
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    it("creates exactly one row when two callers race the first write", async () => {
      const [a, b] = await Promise.allSettled([
        persistOriginOnce("https://a.example.com"),
        persistOriginOnce("https://b.example.com"),
      ]);
      expect(a.status).toBe("fulfilled");
      expect(b.status).toBe("fulfilled");

      const c = await pool.connect();
      try {
        await c.query(`SET search_path TO "${schema}"`);
        const { rows } = await c.query(
          `SELECT id, public_origin FROM panel_config`
        );
        expect(rows).toHaveLength(1);
        // The surviving row's origin must be one of the two we wrote, not
        // some merged or empty value.
        expect([
          "https://a.example.com",
          "https://b.example.com",
        ]).toContain(rows[0].public_origin);
      } finally {
        c.release();
      }
    });
  }
);
