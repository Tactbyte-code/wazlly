import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

const queryQueue: any[] = [];
function enqueue(...results: any[]) {
  queryQueue.push(...results);
}

const updateCalls: any[] = [];
const insertCalls: any[] = [];

function makeChain(label: "select" | "update" | "insert" | "delete"): any {
  let captured: any = undefined;
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === "set") {
        return (vals: any) => {
          captured = vals;
          return proxy;
        };
      }
      if (prop === "values") {
        return (vals: any) => {
          captured = vals;
          return proxy;
        };
      }
      if (prop === "then") {
        if (label === "update" && captured !== undefined) updateCalls.push(captured);
        if (label === "insert" && captured !== undefined) insertCalls.push(captured);
        const result = queryQueue.shift();
        const value = result === undefined ? [] : result;
        const p = Promise.resolve(value);
        return p.then.bind(p);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      return () => proxy;
    },
  };
  const proxy: any = new Proxy(function () {}, handler);
  return proxy;
}

const dbMock = {
  select: vi.fn(() => makeChain("select")),
  insert: vi.fn(() => makeChain("insert")),
  update: vi.fn(() => makeChain("update")),
  delete: vi.fn(() => makeChain("delete")),
};

vi.mock("../db", () => ({ db: dbMock }));

const syncPlanToAllGatewaysMock = vi.fn(async (_planId: string) => ({
  stripe: { monthlyPriceId: "price_new" },
  errors: [] as string[],
}));

vi.mock("../services/payment-gateway.service", () => ({
  syncPlanToAllGateways: syncPlanToAllGatewaysMock,
  syncPlanToStripe: vi.fn(),
  syncPlanToRazorpay: vi.fn(),
}));

vi.mock("../services/cache", () => ({
  cacheGet: vi.fn(async (_k: string, _ttl: number, fn: any) => fn()),
  cacheInvalidate: vi.fn(async () => {}),
  CACHE_KEYS: {
    subscriptionPlans: () => "plans",
    planById: (id: string) => `plan:${id}`,
  },
  CACHE_TTL: { subscriptionPlans: 60 },
}));

let app: Express;

beforeAll(async () => {
  const ctrl = await import("../controllers/plans.controller");
  app = express();
  app.use(express.json());
  app.put("/api/admin/plans/:id", ctrl.updatePlan);
  app.post("/api/admin/plans", ctrl.createPlan);
});

beforeEach(() => {
  queryQueue.length = 0;
  updateCalls.length = 0;
  insertCalls.length = 0;
  syncPlanToAllGatewaysMock.mockClear();
  dbMock.select.mockClear();
  dbMock.insert.mockClear();
  dbMock.update.mockClear();
});

describe("Plan create/update auto-syncs to gateways", () => {
  it("re-syncs to gateways and refreshes stripePriceIdMonthly when monthlyPrice changes", async () => {
    const planId = "plan-1";
    enqueue(
      [{ id: planId, name: "Pro", monthlyPrice: "20.00", annualPrice: "200.00", stripePriceIdMonthly: "price_old" }],
      [{ id: planId, name: "Pro", monthlyPrice: "30.00", annualPrice: "200.00", stripePriceIdMonthly: "price_old" }],
    );
    syncPlanToAllGatewaysMock.mockImplementationOnce(async (id: string) => {
      await dbMock.update({}).set({ stripePriceIdMonthly: "price_new" }).where({ id });
      return { stripe: { monthlyPriceId: "price_new" }, errors: [] };
    });

    const r = await request(app)
      .put(`/api/admin/plans/${planId}`)
      .send({ monthlyPrice: "30.00" });

    expect(r.status).toBe(200);
    expect(syncPlanToAllGatewaysMock).toHaveBeenCalledWith(planId);
    expect(syncPlanToAllGatewaysMock).toHaveBeenCalledTimes(1);
    const stripeUpdate = updateCalls.find((u) => u.stripePriceIdMonthly === "price_new");
    expect(stripeUpdate).toBeDefined();
    expect(r.body.syncWarnings).toEqual([]);
  });

  it("does not sync when only cosmetic fields like name change", async () => {
    const planId = "plan-2";
    enqueue(
      [{ id: planId, name: "Pro", monthlyPrice: "20.00", annualPrice: "200.00" }],
      [{ id: planId, name: "Pro Plus", monthlyPrice: "20.00", annualPrice: "200.00" }],
    );

    const r = await request(app)
      .put(`/api/admin/plans/${planId}`)
      .send({ name: "Pro Plus" });

    expect(r.status).toBe(200);
    expect(syncPlanToAllGatewaysMock).not.toHaveBeenCalled();
    expect(r.body.syncWarnings).toEqual([]);
  });

  it("re-syncs when currency value differs from the existing row", async () => {
    const planId = "plan-cur";
    enqueue(
      [{ id: planId, name: "Pro", monthlyPrice: "20.00", annualPrice: "200.00", currency: "USD" }],
      [{ id: planId, name: "Pro", monthlyPrice: "20.00", annualPrice: "200.00", currency: "USD" }],
    );

    const r = await request(app)
      .put(`/api/admin/plans/${planId}`)
      .send({ currency: "EUR" });

    expect(r.status).toBe(200);
    expect(syncPlanToAllGatewaysMock).toHaveBeenCalledWith(planId);
  });

  it("does not re-sync when the request restates the same currency", async () => {
    const planId = "plan-cur-same";
    enqueue(
      [{ id: planId, name: "Pro", monthlyPrice: "20.00", annualPrice: "200.00", currency: "USD" }],
      [{ id: planId, name: "Pro", monthlyPrice: "20.00", annualPrice: "200.00", currency: "USD" }],
    );

    const r = await request(app)
      .put(`/api/admin/plans/${planId}`)
      .send({ currency: "USD" });

    expect(r.status).toBe(200);
    expect(syncPlanToAllGatewaysMock).not.toHaveBeenCalled();
  });

  it("auto-syncs newly created plans and surfaces gateway errors as syncWarnings", async () => {
    const newPlanId = "plan-new";
    enqueue(
      [{ id: newPlanId, name: "Starter", monthlyPrice: "5.00", annualPrice: "50.00" }],
    );
    syncPlanToAllGatewaysMock.mockImplementationOnce(async () => ({
      stripe: { monthlyPriceId: "price_starter" },
      errors: ["PayPal: PayPal credentials missing", "Mercado Pago: not configured"],
    }));

    const r = await request(app)
      .post("/api/admin/plans")
      .send({ name: "Starter", monthlyPrice: "5.00", annualPrice: "50.00" });

    expect(r.status).toBe(201);
    expect(syncPlanToAllGatewaysMock).toHaveBeenCalledWith(newPlanId);
    expect(r.body.syncWarnings).toEqual([
      { gateway: "PayPal", error: "PayPal credentials missing" },
      { gateway: "Mercado Pago", error: "not configured" },
    ]);
  });
});
