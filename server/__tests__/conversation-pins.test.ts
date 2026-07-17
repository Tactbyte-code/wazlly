import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

// ---------- Mocks for the controller's deps ----------
//
// The controller uses drizzle's chainable query builder against `db` and a
// helper from `storage`. We replace both with hand-rolled mocks so we can
// assert HTTP-level behavior (403/409 status + error code) without a real DB.

// Queue of values that successive awaited drizzle chains will resolve to,
// in the order they're consumed by the controller code path under test.
const queryQueue: any[] = [];

function enqueue(...results: any[]) {
  queryQueue.push(...results);
}

// Build a Proxy that pretends to be a drizzle chain: every method call returns
// itself, and `await` triggers `.then` which dequeues the next staged result.
function makeChain(): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then") {
        const result = queryQueue.shift();
        const value = result === undefined ? [] : result;
        const p = Promise.resolve(value);
        return p.then.bind(p);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      // Any other property access (.from / .where / .limit / .orderBy /
      // .values / .returning / .leftJoin / etc.) returns a callable that
      // yields the same proxy so the chain keeps composing.
      return () => proxy;
    },
  };
  const proxy: any = new Proxy(function () {}, handler);
  return proxy;
}

const dbMock = {
  select: vi.fn(() => makeChain()),
  insert: vi.fn(() => makeChain()),
  delete: vi.fn(() => makeChain()),
  update: vi.fn(() => makeChain()),
};

const storageMock = {
  getChannelsByUserId: vi.fn(async (_userId: string) => [] as any[]),
};

vi.mock("../db", () => ({ db: dbMock }));
vi.mock("../storage", () => ({ storage: storageMock }));

// ---------- Test app wiring ----------

let currentSession: { user?: any } = {};
let app: Express;

const USER_OWNER = {
  id: "u-owner",
  role: "admin",
  username: "owner",
  email: "owner@example.com",
};

beforeAll(async () => {
  const { listPins, pinConversation, unpinConversation } = await import(
    "../controllers/conversation-pins.controller"
  );
  const { requireAuth } = await import("../middlewares/auth.middleware");

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = currentSession;
    next();
  });
  app.get("/api/conversations/pins", requireAuth, listPins);
  app.post("/api/conversations/:id/pin", requireAuth, pinConversation);
  app.delete("/api/conversations/:id/pin", requireAuth, unpinConversation);
});

beforeEach(() => {
  queryQueue.length = 0;
  currentSession = { user: USER_OWNER };
  storageMock.getChannelsByUserId.mockReset();
  storageMock.getChannelsByUserId.mockResolvedValue([]);
  dbMock.select.mockClear();
  dbMock.insert.mockClear();
  dbMock.delete.mockClear();
  dbMock.update.mockClear();
});

// ---------- Authorization: cross-channel access is forbidden ----------

describe("Pin endpoints — cross-channel access denial", () => {
  it("GET /pins?channelId=other → 403 when user does not own that channel", async () => {
    storageMock.getChannelsByUserId.mockResolvedValue([{ id: "ch-mine" }]);
    const res = await request(app)
      .get("/api/conversations/pins")
      .query({ channelId: "ch-other" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  it("POST /:id/pin → 403 when conversation belongs to a channel the user does not own", async () => {
    // 1) conversation lookup returns a row whose channelId is foreign.
    enqueue([{ id: "c1", channelId: "ch-other" }]);
    storageMock.getChannelsByUserId.mockResolvedValue([{ id: "ch-mine" }]);

    const res = await request(app).post("/api/conversations/c1/pin");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  it("DELETE /:id/pin → 403 when conversation belongs to a channel the user does not own", async () => {
    // unpin path: looks up conversation channelId, then guards.
    enqueue([{ channelId: "ch-other" }]);
    storageMock.getChannelsByUserId.mockResolvedValue([{ id: "ch-mine" }]);

    const res = await request(app).delete("/api/conversations/c1/pin");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  it("POST /:id/pin → 200 when user owns the channel (control case)", async () => {
    // conversation lookup → owned channel
    enqueue([{ id: "c1", channelId: "ch-mine" }]);
    storageMock.getChannelsByUserId.mockResolvedValue([{ id: "ch-mine" }]);
    // existing pin check → none
    enqueue([]);
    // count check → 0
    enqueue([{ count: 0 }]);
    // insert → no awaited rows
    enqueue([]);

    const res = await request(app).post("/api/conversations/c1/pin");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------- Soft cap: 20 pins per user per channel ----------

describe("Pin endpoints — 20-pin-per-channel soft cap", () => {
  it("returns 409 with code 'PIN_CAP_REACHED' when the cap is hit", async () => {
    // conversation lookup → owned channel
    enqueue([{ id: "c-new", channelId: "ch-mine" }]);
    storageMock.getChannelsByUserId.mockResolvedValue([{ id: "ch-mine" }]);
    // existing pin lookup → none (so we proceed to count)
    enqueue([]);
    // count check → already at the 20-cap
    enqueue([{ count: 20 }]);

    const res = await request(app).post("/api/conversations/c-new/pin");
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("PIN_CAP_REACHED");
    expect(res.body.error).toBe("PIN_CAP_REACHED");
    expect(res.body.cap).toBe(20);
    // The controller must NOT attempt the insert once the cap is reached.
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("does not return PIN_CAP_REACHED when the user is one below the cap", async () => {
    enqueue([{ id: "c-new", channelId: "ch-mine" }]);
    storageMock.getChannelsByUserId.mockResolvedValue([{ id: "ch-mine" }]);
    enqueue([]); // existing pin lookup
    enqueue([{ count: 19 }]); // count just under cap
    enqueue([]); // insert

    const res = await request(app).post("/api/conversations/c-new/pin");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(dbMock.insert).toHaveBeenCalled();
  });
});
