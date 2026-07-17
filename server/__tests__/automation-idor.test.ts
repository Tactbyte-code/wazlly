import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import request from "supertest";

const TENANT_A = { id: "user-A", role: "admin", username: "a", email: "a@x", firstName: "A", permissions: [] };
const TENANT_B = { id: "user-B", role: "admin", username: "b", email: "b@x", firstName: "B", permissions: [] };

const CHANNEL_A = "channel-A";
const CHANNEL_B = "channel-B";

const AUTO_A = {
  id: "auto-A",
  channelId: CHANNEL_A,
  name: "Tenant A flow",
  trigger: "new_conversation",
  triggerConfig: {},
  status: "inactive",
};
const AUTO_B = {
  id: "auto-B",
  channelId: CHANNEL_B,
  name: "Tenant B flow",
  trigger: "new_conversation",
  triggerConfig: {},
  status: "inactive",
};

const automationsById: Record<string, any> = {
  [AUTO_A.id]: { ...AUTO_A },
  [AUTO_B.id]: { ...AUTO_B },
};

const calls = {
  edgeDeletes: 0,
  edgeInserts: [] as any[][],
  nodeInserts: [] as any[][],
  automationDeletes: [] as string[],
  automationUpdates: [] as string[],
};

vi.mock("../db", () => {
  // Identify the table being acted on by checking a stable property. The
  // controller uses the `automationEdges`, `automationNodes`, `automations`,
  // and `automationExecutions` table objects from `@shared/schema`. We don't
  // try to inspect the drizzle predicate; instead we expose a tiny chained
  // builder that records writes against a per-table counter and we route via
  // a tag that the test sets on the table reference.
  const tagOf = (t: any) =>
    t?.[Symbol.for("drizzle:Name")] ?? t?._?.name ?? "";
  return {
    db: {
      query: {
        automations: {
          findFirst: async () =>
            automationsById[(globalThis as any).__lookupAutomationId] ?? null,
        },
        automationExecutions: { findFirst: async () => null },
      },
      delete: (table: any) => ({
        where: () => {
          const name = tagOf(table);
          if (name === "automation_edges") {
            calls.edgeDeletes += 1;
          } else if (name === "automations") {
            calls.automationDeletes.push(
              (globalThis as any).__lookupAutomationId,
            );
          }
          return Promise.resolve();
        },
      }),
      update: (_table: any) => ({
        set: (_vals: any) => ({
          where: () => ({
            returning: async () => {
              const id = (globalThis as any).__lookupAutomationId;
              calls.automationUpdates.push(id);
              return automationsById[id] ? [automationsById[id]] : [];
            },
          }),
        }),
      }),
      insert: (table: any) => ({
        values: (rows: any[]) => {
          const name = tagOf(table);
          if (name === "automation_edges") calls.edgeInserts.push(rows);
          if (name === "automation_nodes") calls.nodeInserts.push(rows);
          return Promise.resolve();
        },
      }),
      select: () => ({
        from: () => ({
          leftJoin: () => ({ leftJoin: () => Promise.resolve([]) }),
          where: () => Promise.resolve([]),
        }),
      }),
      transaction: async (fn: any) => {
        // Drive the inner transaction body with the same chained mocks so
        // tx.delete() / tx.insert() observe the same recorders.
        return fn({
          delete: (table: any) => ({
            where: () => {
              const name = tagOf(table);
              if (name === "automation_edges") calls.edgeDeletes += 1;
              return Promise.resolve();
            },
          }),
          insert: (table: any) => ({
            values: (rows: any[]) => {
              const name = tagOf(table);
              if (name === "automation_edges") calls.edgeInserts.push(rows);
              if (name === "automation_nodes") calls.nodeInserts.push(rows);
              return Promise.resolve();
            },
          }),
        });
      },
    },
  };
});

vi.mock("../storage", () => ({
  storage: {
    getChannelsByUserId: async (userId: string) => {
      if (userId === TENANT_A.id) return [{ id: CHANNEL_A }];
      if (userId === TENANT_B.id) return [{ id: CHANNEL_B }];
      return [];
    },
  },
}));

vi.mock("../services/automation-execution-service", () => ({
  executionService: {},
  triggerService: {},
  sanitizeAutomationVariables: (x: any) => x,
}));

let currentSession: { user?: any } = {};
let app: Express;

beforeAll(async () => {
  const {
    getAutomation,
    updateAutomation,
    deleteAutomation,
    saveAutomationEdges,
  } = await import("../controllers/automation.controller");

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = currentSession;
    next();
  });
  // Capture automationId for the mocked `findFirst` lookup.
  app.param("id", (req, _res, next, id) => {
    (globalThis as any).__lookupAutomationId = id;
    next();
  });
  app.param("automationId", (req, _res, next, id) => {
    (globalThis as any).__lookupAutomationId = id;
    next();
  });

  app.get("/api/automations/:id", getAutomation);
  app.put("/api/automations/:id", updateAutomation);
  app.delete("/api/automations/:id", deleteAutomation);
  app.post(
    "/api/automations/:automationId/edges",
    saveAutomationEdges,
  );

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
});

beforeEach(() => {
  calls.edgeDeletes = 0;
  calls.edgeInserts.length = 0;
  calls.nodeInserts.length = 0;
  calls.automationDeletes.length = 0;
  calls.automationUpdates.length = 0;
});

describe("Automation IDOR — cross-tenant access is blocked", () => {
  it("GET another tenant's automation returns 404 (existence not leaked)", async () => {
    currentSession = { user: TENANT_A };
    const res = await request(app).get(`/api/automations/${AUTO_B.id}`);
    expect(res.status).toBe(404);
  });

  it("PUT another tenant's automation returns 404 and never updates the row", async () => {
    currentSession = { user: TENANT_A };
    const res = await request(app)
      .put(`/api/automations/${AUTO_B.id}`)
      .send({ name: "hijacked", trigger: "new_conversation", triggerConfig: {} });
    expect(res.status).toBe(404);
    expect(calls.automationUpdates).not.toContain(AUTO_B.id);
  });

  it("DELETE another tenant's automation returns 404 and never deletes the row", async () => {
    currentSession = { user: TENANT_A };
    const res = await request(app).delete(`/api/automations/${AUTO_B.id}`);
    expect(res.status).toBe(404);
    expect(calls.automationDeletes).not.toContain(AUTO_B.id);
  });

  it("Unauthenticated requests are rejected before any DB lookup", async () => {
    currentSession = {};
    const res = await request(app).get(`/api/automations/${AUTO_A.id}`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/automations/:automationId/edges — wired to saveAutomationEdges", () => {
  it("writes the payload to the automation_edges table for the owning tenant", async () => {
    currentSession = { user: TENANT_A };
    const payload = {
      edges: [
        { id: "e1", source: "n1", target: "n2", sourceHandle: null, animated: true },
      ],
    };
    const res = await request(app)
      .post(`/api/automations/${AUTO_A.id}/edges`)
      .send(payload);

    expect(res.status).toBe(200);
    // The handler must have inserted into automation_edges (not _nodes).
    expect(calls.edgeInserts.length).toBe(1);
    expect(calls.edgeInserts[0]).toHaveLength(1);
    expect(calls.edgeInserts[0][0]).toMatchObject({
      sourceNodeId: "n1",
      targetNodeId: "n2",
    });
    expect(calls.nodeInserts.length).toBe(0);
    // Replacement is wrapped in a transaction → delete also fires.
    expect(calls.edgeDeletes).toBe(1);
  });

  it("rejects edge writes against another tenant's automation with 404", async () => {
    currentSession = { user: TENANT_A };
    const res = await request(app)
      .post(`/api/automations/${AUTO_B.id}/edges`)
      .send({ edges: [{ id: "e", source: "x", target: "y" }] });

    expect(res.status).toBe(404);
    expect(calls.edgeInserts.length).toBe(0);
    expect(calls.edgeDeletes).toBe(0);
  });
});
