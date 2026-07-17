import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

// We mock the `db` module the middleware imports so we can capture calls
// without any real database. The middleware calls `db.transaction(cb)` and
// inside the callback runs `tx.execute(sql\`...\`)` for the advisory lock,
// the conditional INSERT, and the UPDATE. We don't care which statement
// runs — only whether ANY write was attempted, because that's what the
// task spec means by "no write".

const transactionFn = vi.fn(async (cb: any) => {
  const tx = { execute: vi.fn(async () => undefined) };
  await cb(tx);
});

vi.mock("../db", () => ({
  db: {
    transaction: transactionFn,
    select: vi.fn(() => ({
      from: () => ({
        orderBy: () => ({ limit: async () => [] }),
      }),
    })),
  },
}));

let app: Express;
let currentSession: { user?: any } = {};
let trustProxy: boolean | number | string = 1;

async function buildApp() {
  const { capturePublicOriginMiddleware } = await import(
    "../services/public-origin"
  );
  const a = express();
  a.set("trust proxy", trustProxy);
  a.use((req, _res, next) => {
    (req as any).session = currentSession;
    next();
  });
  a.use(capturePublicOriginMiddleware);
  a.get("/probe", (_req, res) => res.status(200).json({ ok: true }));
  return a;
}

beforeEach(async () => {
  vi.resetModules();
  transactionFn.mockClear();
  currentSession = {};
  trustProxy = 1;
  app = await buildApp();
});

afterEach(() => {
  delete process.env.NODE_ENV;
});

describe("capturePublicOriginMiddleware", () => {
  it("does not write when the request is anonymous", async () => {
    currentSession = {};
    app = await buildApp();
    await request(app)
      .get("/probe")
      .set("Host", "panel.example.com")
      .expect(200);
    expect(transactionFn).not.toHaveBeenCalled();
  });

  it("does not write for an authenticated non-admin user", async () => {
    currentSession = { user: { id: "u1", role: "agent" } };
    app = await buildApp();
    await request(app)
      .get("/probe")
      .set("Host", "panel.example.com")
      .expect(200);
    expect(transactionFn).not.toHaveBeenCalled();
  });

  it("writes for an admin with a valid host header", async () => {
    currentSession = { user: { id: "admin1", role: "admin" } };
    app = await buildApp();
    await request(app)
      .get("/probe")
      .set("Host", "panel.example.com")
      .expect(200);
    // The persistOrigin call is fire-and-forget, give the next microtask
    // a chance to run before we assert.
    await new Promise((r) => setImmediate(r));
    expect(transactionFn).toHaveBeenCalledTimes(1);
  });

  it("does not write when the host header is malformed", async () => {
    currentSession = { user: { id: "admin1", role: "admin" } };
    app = await buildApp();
    await request(app)
      .get("/probe")
      .set("Host", "evil.com/path?injected=1")
      .expect(200);
    await new Promise((r) => setImmediate(r));
    expect(transactionFn).not.toHaveBeenCalled();
  });

  it("does not write when the host header is loopback in production", async () => {
    process.env.NODE_ENV = "production";
    vi.resetModules();
    transactionFn.mockClear();
    currentSession = { user: { id: "admin1", role: "admin" } };
    app = await buildApp();
    await request(app).get("/probe").set("Host", "127.0.0.1:3000").expect(200);
    await new Promise((r) => setImmediate(r));
    expect(transactionFn).not.toHaveBeenCalled();
  });

  it("uses the first trusted value of a multi-value x-forwarded-host", async () => {
    currentSession = { user: { id: "admin1", role: "admin" } };
    trustProxy = true;
    app = await buildApp();
    // Express, with `trust proxy` enabled, populates req.hostname from
    // the FIRST entry of x-forwarded-host. The middleware must derive
    // the origin from that trusted first hop via req.hostname, never
    // from the attacker's appended second hop.
    await request(app)
      .get("/probe")
      .set("Host", "panel.example.com")
      .set("X-Forwarded-Host", "panel.example.com, evil.attacker.test")
      .set("X-Forwarded-Proto", "https")
      .expect(200);
    await new Promise((r) => setImmediate(r));
    expect(transactionFn).toHaveBeenCalledTimes(1);

    // Use the same module's resolvePublicOrigin to verify the cached value
    // came from the first (trusted) host, not the attacker-appended one.
    const { resolvePublicOrigin } = await import(
      "../services/public-origin"
    );
    const cached = await resolvePublicOrigin();
    expect(cached).toBe("https://panel.example.com");
    expect(cached).not.toContain("evil.attacker.test");
  });
});
