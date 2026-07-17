import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

const queryQueue: any[] = [];

function makeChain(): any {
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === "then") {
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
  select: vi.fn(() => makeChain()),
  insert: vi.fn(() => makeChain()),
  update: vi.fn(() => makeChain()),
  delete: vi.fn(() => makeChain()),
};

vi.mock("../db", () => ({ db: dbMock }));

let svc: typeof import("../services/payment-gateway.service");

beforeAll(async () => {
  svc = await import("../services/payment-gateway.service");
});

beforeEach(() => {
  queryQueue.length = 0;
});

describe("syncPlanToAllGateways scopes to active providers", () => {
  it("only attempts the gateways listed as active and ignores inactive ones", async () => {
    queryQueue.push([{ providerKey: "stripe" }, { providerKey: "razorpay" }]);

    const result = await svc.syncPlanToAllGateways("plan-x");

    const gateways = result.errors.map((e) => e.split(":")[0]);
    expect(gateways).toEqual(["Stripe", "Razorpay"]);
    expect(gateways).not.toContain("PayPal");
    expect(gateways).not.toContain("Paystack");
    expect(gateways).not.toContain("Mercado Pago");
  });

  it("invokes nothing when no providers are active and returns no errors", async () => {
    queryQueue.push([]);

    const result = await svc.syncPlanToAllGateways("plan-y");

    expect(result.errors).toEqual([]);
    expect(result.stripe).toBeUndefined();
    expect(result.razorpay).toBeUndefined();
    expect(result.paypal).toBeUndefined();
    expect(result.paystack).toBeUndefined();
    expect(result.mercadopago).toBeUndefined();
  });
});
