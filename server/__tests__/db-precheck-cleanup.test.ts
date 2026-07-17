import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT_PATH = path.join(
  ROOT,
  "scripts",
  "prod-v37-precheck-and-cleanup.sql"
);
const MIGRATION_PATH = path.join(
  ROOT,
  "server",
  "startup-migration.ts"
);
const SHARED_CLEANUP_PATH = path.join(
  ROOT,
  "server",
  "db-precheck-cleanup.ts"
);
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");
const DOC_PATH = path.join(ROOT, "docs", "app-update-testing.md");

const SCRIPT_SQL = fs.readFileSync(SCRIPT_PATH, "utf8");
const SHARED_CLEANUP_SRC = fs.readFileSync(SHARED_CLEANUP_PATH, "utf8");
const MIGRATION_SRC =
  fs.readFileSync(MIGRATION_PATH, "utf8") + "\n" + SHARED_CLEANUP_SRC;
const PKG = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
const DOCS = fs.readFileSync(DOC_PATH, "utf8");

describe("prod-v37-precheck-and-cleanup.sql", () => {
  it("nulls out empty-string and orphan conversations.assigned_to (the v3.7 manual upgrade FK bug)", () => {
    expect(SCRIPT_SQL).toMatch(/UPDATE\s+conversations\s+SET\s+assigned_to\s*=\s*NULL/i);
    // The empty-string predicate is what catches `Key (assigned_to)=()`.
    expect(SCRIPT_SQL).toMatch(/assigned_to\s*=\s*''/i);
    expect(SCRIPT_SQL).toMatch(/assigned_to\s+NOT\s+IN\s*\(\s*SELECT\s+id\s+FROM\s+users\s*\)/i);
  });

  it("also cleans the other nullable FK varchar columns identified during the audit", () => {
    expect(SCRIPT_SQL).toMatch(/UPDATE\s+conversations\s+SET\s+channel_id\s*=\s*NULL/i);
    expect(SCRIPT_SQL).toMatch(/UPDATE\s+conversations\s+SET\s+contact_id\s*=\s*NULL/i);
    expect(SCRIPT_SQL).toMatch(/UPDATE\s+contacts\s+SET\s+created_by\s*=\s*NULL/i);
    expect(SCRIPT_SQL).toMatch(/UPDATE\s+users\s+SET\s+channel_id\s*=\s*NULL/i);
  });

  it("retains the existing dedup blocks for templates and automation_edges", () => {
    expect(SCRIPT_SQL).toMatch(/PARTITION\s+BY\s+channel_id,\s*whatsapp_template_id/i);
    expect(SCRIPT_SQL).toMatch(/PARTITION\s+BY\s+automation_id,\s*source_node_id/i);
  });

  it("has a final sanity-count query that surfaces the new orphan checks", () => {
    expect(SCRIPT_SQL).toMatch(/bad_conv_assigned_to/);
    expect(SCRIPT_SQL).toMatch(/bad_conv_channel/);
    expect(SCRIPT_SQL).toMatch(/bad_conv_contact/);
    expect(SCRIPT_SQL).toMatch(/bad_contacts_created_by/);
  });

  it("is wrapped in a single transaction so a failure rolls back cleanly", () => {
    expect(SCRIPT_SQL).toMatch(/^\s*BEGIN;/m);
    expect(SCRIPT_SQL).toMatch(/COMMIT;\s*$/);
  });
});

describe("server/startup-migration.ts boot self-heal", () => {
  const RAW_MIGRATION_SRC = fs.readFileSync(MIGRATION_PATH, "utf8");

  it("includes idempotent cleanup of conversations.assigned_to empty-string + orphan rows", () => {
    expect(MIGRATION_SRC).toMatch(/UPDATE\s+conversations[\s\S]*SET\s+assigned_to\s*=\s*NULL/);
    expect(MIGRATION_SRC).toMatch(/assigned_to\s*=\s*''/);
  });

  it("includes dedup blocks for templates and automation_edges before the unique-index step", () => {
    const dedupTemplatesIdx = MIGRATION_SRC.indexOf(
      "PARTITION BY channel_id, whatsapp_template_id"
    );
    const dedupEdgesIdx = MIGRATION_SRC.indexOf(
      "PARTITION BY automation_id, source_node_id"
    );
    expect(dedupTemplatesIdx).toBeGreaterThan(-1);
    expect(dedupEdgesIdx).toBeGreaterThan(-1);

    // Dedup must come before the CREATE UNIQUE INDEX step or the
    // index creation will fail on legacy duplicate data. The
    // shared cleanup steps are spread in via `...precheckCleanupSteps`
    // at the top of the migration list, so verify that spread sits
    // before the unique-index step in startup-migration.ts itself.
    const spreadIdx = RAW_MIGRATION_SRC.indexOf("...precheckCleanupSteps");
    const uniqueIndexIdx = RAW_MIGRATION_SRC.indexOf(
      "automation_edges_unique_handle_idx"
    );
    expect(spreadIdx).toBeGreaterThan(-1);
    expect(uniqueIndexIdx).toBeGreaterThan(-1);
    expect(spreadIdx).toBeLessThan(uniqueIndexIdx);
  });

  it("guards every cleanup with an information_schema existence check (safe on fresh installs)", () => {
    // We expect at least one guard per cleaned table.
    for (const table of ["conversations", "users", "contacts", "channels", "templates", "automation_edges"]) {
      const guardPattern = new RegExp(
        `information_schema\\.(tables|columns)[\\s\\S]*?table_name='${table}'`
      );
      expect(MIGRATION_SRC).toMatch(guardPattern);
    }
  });

  it("sources the shared cleanup steps from server/db-precheck-cleanup.ts to avoid drift with the in-app updater", () => {
    expect(RAW_MIGRATION_SRC).toMatch(
      /from\s+["']\.\/db-precheck-cleanup["']/
    );
    expect(RAW_MIGRATION_SRC).toMatch(/\.\.\.precheckCleanupSteps/);
  });
});

describe("npm scripts", () => {
  it("exposes db:precheck (psql wrapper) and db:upgrade (precheck + push --force)", () => {
    expect(PKG.scripts["db:precheck"]).toContain("prod-v37-precheck-and-cleanup.sql");
    expect(PKG.scripts["db:precheck"]).toContain("ON_ERROR_STOP=1");
    expect(PKG.scripts["db:upgrade"]).toContain("db:precheck");
    expect(PKG.scripts["db:upgrade"]).toContain("drizzle-kit push --force");
  });

  it("does not break the legacy db:push entry that the in-app updater shells out to", () => {
    expect(PKG.scripts["db:push"]).toBe("drizzle-kit push");
  });
});

describe("docs", () => {
  it("documents the new manual upgrade command", () => {
    expect(DOCS).toMatch(/npm run db:upgrade/);
    expect(DOCS).toMatch(/Manual upgrade path/i);
  });
});
