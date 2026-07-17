import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

const queryQueue: any[] = [];
const insertCalls: { table: string }[] = [];

let lastFromTable: string | null = null;
let lastValues: any = null;

function makeChain(label: "select" | "update" | "insert" | "delete"): any {
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === "from") {
        return (table: any) => {
          lastFromTable = (table?.[Symbol.for("drizzle:Name")] as string) || (table?.name) || "";
          return proxy;
        };
      }
      if (prop === "values") {
        return (vals: any) => {
          lastValues = vals;
          return proxy;
        };
      }
      if (prop === "set") {
        return () => proxy;
      }
      if (prop === "then") {
        if (label === "insert") {
          insertCalls.push({ table: lastFromTable || "unknown" });
        }
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
  insert: vi.fn((table: any) => {
    lastFromTable = table?.[Symbol.for("drizzle:Name")] || "";
    return makeChain("insert");
  }),
  update: vi.fn(() => makeChain("update")),
  delete: vi.fn(() => makeChain("delete")),
};

vi.mock("../db", () => ({ db: dbMock }));
vi.mock("../services/public-origin", () => ({
  resolvePublicOrigin: vi.fn(async () => "https://app.example.test"),
}));

const razorpaySubsCreate = vi.fn(async () => ({ id: "sub_123", short_url: "https://rzp.io/x", status: "created" }));
const razorpaySubsCancel = vi.fn(async () => ({}));
const razorpayCustomersCreate = vi.fn(async () => ({ id: "cust_1" }));

vi.mock("razorpay", () => {
  function Razorpay(this: any) {
    this.subscriptions = { create: razorpaySubsCreate, cancel: razorpaySubsCancel };
    this.customers = { create: razorpayCustomersCreate };
  }
  return { default: Razorpay };
});

const stripeSubsCreate = vi.fn(async () => ({
  id: "stripe_sub_1",
  status: "incomplete",
  latest_invoice: { payment_intent: { client_secret: "cs_secret" } },
}));
const stripeCheckoutSessionsCreate = vi.fn(async () => ({
  id: "cs_test_1",
  url: "https://checkout.stripe.com/c/pay/cs_test_1",
  status: "open",
}));
const stripeSubsCancel = vi.fn(async () => ({}));
const stripeCustomersCreate = vi.fn(async () => ({ id: "cus_1" }));
const stripeCustomersRetrieve = vi.fn(async () => ({ id: "cus_existing" }));

vi.mock("stripe", () => {
  function Stripe(this: any) {
    this.subscriptions = { create: stripeSubsCreate, cancel: stripeSubsCancel };
    this.checkout = { sessions: { create: stripeCheckoutSessionsCreate } };
    this.customers = { create: stripeCustomersCreate, retrieve: stripeCustomersRetrieve };
  }
  return { default: Stripe };
});

let svc: typeof import("../services/payment-gateway.service");

beforeAll(async () => {
  svc = await import("../services/payment-gateway.service");
});

beforeEach(() => {
  queryQueue.length = 0;
  insertCalls.length = 0;
  lastFromTable = null;
  lastValues = null;
  svc.resetGatewayInstances();
  razorpaySubsCreate.mockClear();
  stripeSubsCreate.mockClear();
  stripeCheckoutSessionsCreate.mockClear();
  stripeSubsCancel.mockClear();
  stripeCustomersRetrieve.mockClear();
});

describe("checkout currency validation", () => {
  it("createRazorpaySubscription throws CurrencyNotSupportedError on USD when only INR is supported and inserts no subscription row", async () => {
    queryQueue.push(
      [{ providerKey: "razorpay", isActive: true, supportedCurrencies: ["INR"], config: { isLive: false, apiKeyTest: "k", apiSecretTest: "s" }, name: "Razorpay" }],
      [{ providerKey: "razorpay", isActive: true, supportedCurrencies: ["INR"], name: "Razorpay" }],
    );

    await expect(
      svc.createRazorpaySubscription("u1", "p1", "monthly", "USD"),
    ).rejects.toBeInstanceOf(svc.CurrencyNotSupportedError);

    expect(razorpaySubsCreate).not.toHaveBeenCalled();
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("createRazorpaySubscription proceeds when the requested currency is supported", async () => {
    queryQueue.push(
      [{ providerKey: "razorpay", isActive: true, supportedCurrencies: ["INR"], config: { isLive: false, apiKeyTest: "k", apiSecretTest: "s" }, name: "Razorpay" }],
      [{ providerKey: "razorpay", isActive: true, supportedCurrencies: ["INR"], name: "Razorpay" }],
      [{ id: "p1", name: "Pro", razorpayPlanIdMonthly: "rzp_plan_1", monthlyPrice: "1000.00", annualPrice: "10000.00" }],
      [],
    );

    const result = await svc.createRazorpaySubscription("u1", "p1", "monthly", "INR");

    expect(razorpaySubsCreate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ subscriptionId: "sub_123" });
  });

  it("createStripeSubscription proceeds when the requested currency is supported", async () => {
    queryQueue.push(
      [{ providerKey: "stripe", isActive: true, supportedCurrencies: ["USD"], config: { isLive: false, apiSecretTest: "sk_test" }, name: "Stripe" }],
      [{ providerKey: "stripe", isActive: true, supportedCurrencies: ["USD"], name: "Stripe" }],
      [{ id: "p1", name: "Pro", stripePriceIdMonthly: "price_1", monthlyPrice: "10.00", annualPrice: "100.00" }],
      [{ id: "u1", email: "u@x.com", username: "u", stripeCustomerId: "cus_existing" }],
      [],
    );

    const result = await svc.createStripeSubscription("u1", "p1", "monthly", "USD");

    expect(stripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      checkoutSessionId: "cs_test_1",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
      requiresRedirect: true,
    });
  });

  it("createStripeSubscription throws CurrencyNotSupportedError when EUR is requested but only USD is supported", async () => {
    queryQueue.push(
      [{ providerKey: "stripe", isActive: true, supportedCurrencies: ["USD"], config: { isLive: false, apiSecretTest: "sk_test" }, name: "Stripe" }],
      [{ providerKey: "stripe", isActive: true, supportedCurrencies: ["USD"], name: "Stripe" }],
    );

    await expect(
      svc.createStripeSubscription("u1", "p1", "monthly", "EUR"),
    ).rejects.toBeInstanceOf(svc.CurrencyNotSupportedError);
    expect(stripeSubsCreate).not.toHaveBeenCalled();
  });

  it("createRazorpaySubscription throws unconfigured error when supportedCurrencies is empty", async () => {
    queryQueue.push(
      [{ providerKey: "razorpay", isActive: true, supportedCurrencies: [], config: { isLive: false, apiKeyTest: "k", apiSecretTest: "s" }, name: "Razorpay" }],
      [{ providerKey: "razorpay", isActive: true, supportedCurrencies: [], name: "Razorpay" }],
    );

    await expect(
      svc.createRazorpaySubscription("u1", "p1", "monthly", "INR"),
    ).rejects.toMatchObject({ name: "CurrencyNotSupportedError", reason: "unconfigured" });
  });
});

describe("checkout controller maps currency error to 400", () => {
  let app: Express;

  beforeAll(async () => {
    const ctrl = await import("../controllers/transactions.controller");
    app = express();
    app.use(express.json());
    app.post("/api/checkout", ctrl.initiatePayment);
  });

  it("returns 400 with the CurrencyNotSupportedError message when the helper rejects", async () => {
    const provider = {
      id: "prov1",
      providerKey: "razorpay",
      isActive: true,
      supportedCurrencies: ["INR"],
      config: { isLive: false, apiKeyTest: "k", apiSecretTest: "s" },
      name: "Razorpay",
    };
    queryQueue.push(
      [{ id: "p1", name: "Pro", monthlyPrice: "1000.00", annualPrice: "10000.00" }],
      [provider],
    );

    const r = await request(app).post("/api/checkout").send({
      userId: "u1",
      planId: "p1",
      currency: "USD",
      paymentProviderId: "prov1",
      billingCycle: "monthly",
    });

    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
    expect(String(r.body.message)).toMatch(/USD/);
    expect(dbMock.insert).not.toHaveBeenCalled();
  });
});
