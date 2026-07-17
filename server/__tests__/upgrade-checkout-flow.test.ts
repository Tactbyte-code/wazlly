import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

// Stand-in result queue consumed by the chainable drizzle proxy below. Each
// awaited query in the controller dequeues one entry, so tests stage the
// rows the controller is expected to read in execution order.
const queryQueue: any[] = [];
function enqueue(...results: any[]) {
  queryQueue.push(...results);
}

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

// The transactions controller imports the payment-gateway service at module
// load time. We don't exercise any of its functions in these tests because
// every code path under test rejects the request before reaching the gateway
// layer (currency validation happens first), but the import still has to
// resolve to something.
vi.mock("../services/payment-gateway.service", async () => {
  const actual = await vi.importActual<typeof import("../services/payment-gateway.service")>(
    "../services/payment-gateway.service",
  );
  return {
    CurrencyNotSupportedError: actual.CurrencyNotSupportedError,
    assertProviderSupportsCurrency: actual.assertProviderSupportsCurrency,
    getStripe: vi.fn(),
    getRazorpay: vi.fn(),
    createStripeSubscription: vi.fn(),
    createRazorpaySubscription: vi.fn(),
    getStripePublishableKey: vi.fn(),
    getRazorpayKeyId: vi.fn(),
    createPayPalSubscription: vi.fn(),
    getPayPalPublicClientId: vi.fn(),
    createPaystackSubscription: vi.fn(),
    getPaystackPublicKey: vi.fn(),
    createMercadoPagoSubscription: vi.fn(),
    getMercadoPagoPublicKey: vi.fn(),
    resetGatewayInstances: vi.fn(),
  };
});

// storage is pulled in by the auth middleware; nothing in these tests needs
// permission resolution, but the import still has to succeed.
vi.mock("../storage", () => ({
  storage: {
    getPermissions: vi.fn(async () => []),
    getChannelsByUserId: vi.fn(async () => []),
  },
}));

let currentSession: { user?: any } = {};
let app: Express;

const ADMIN_USER = {
  id: "u-admin",
  role: "admin",
  username: "admin",
  email: "admin@example.com",
  firstName: "Admin",
  permissions: [],
};

const SUPERADMIN_USER = {
  id: "u-super",
  role: "superadmin",
  username: "super",
  email: "super@example.com",
  firstName: "Super",
  permissions: [],
};

beforeAll(async () => {
  const { getAllProviders, getCurrencyGatewayMap } = await import(
    "../controllers/payment.providers.controller"
  );
  const { createTransaction, initiatePayment } = await import(
    "../controllers/transactions.controller"
  );
  const { requireAuth } = await import("../middlewares/auth.middleware");

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = currentSession;
    next();
  });

  app.get("/api/payment-providers", requireAuth, getAllProviders);
  app.get(
    "/api/payment-providers/currency-map",
    requireAuth,
    getCurrencyGatewayMap,
  );
  app.post("/api/transactions", requireAuth, createTransaction);
  app.post("/api/payment/initiate", requireAuth, initiatePayment);
});

beforeEach(() => {
  queryQueue.length = 0;
  currentSession = { user: ADMIN_USER };
  dbMock.select.mockClear();
  dbMock.insert.mockClear();
  dbMock.update.mockClear();
  dbMock.delete.mockClear();
});

// ---------------------------------------------------------------------------
// Currency → gateway map drives the upgrade modal. Only providers whose
// `supportedCurrencies` JSON column actually contains a currency may surface
// under that currency for the admin checkout flow — there is no INR/USD
// runtime fallback any more.
// ---------------------------------------------------------------------------

describe("Upgrade modal — operator-configured gateways per currency", () => {
  it("only returns providers an operator has explicitly configured for each currency", async () => {
    enqueue([
      {
        id: "p-stripe",
        name: "Stripe",
        providerKey: "stripe",
        isActive: true,
        supportedCurrencies: ["USD", "EUR"],
        supportedMethods: [],
      },
      {
        id: "p-razor",
        name: "Razorpay",
        providerKey: "razorpay",
        isActive: true,
        supportedCurrencies: ["INR"],
        supportedMethods: [],
      },
      {
        id: "p-paystack",
        name: "Paystack",
        providerKey: "paystack",
        isActive: true,
        // No currencies configured by the operator → must not appear under
        // any currency in the modal's gateway picker.
        supportedCurrencies: [],
        supportedMethods: [],
      },
    ]);

    const res = await request(app).get("/api/payment-providers/currency-map");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { currencyMap, availableCurrencies } = res.body.data;

    expect(availableCurrencies).toEqual(["EUR", "INR", "USD"]);
    expect(currencyMap.USD.map((p: any) => p.providerKey)).toEqual(["stripe"]);
    expect(currencyMap.EUR.map((p: any) => p.providerKey)).toEqual(["stripe"]);
    expect(currencyMap.INR.map((p: any) => p.providerKey)).toEqual(["razorpay"]);
    // Paystack has no operator-configured currency, so it must not appear
    // under any currency bucket the modal offers.
    for (const code of Object.keys(currencyMap)) {
      expect(
        currencyMap[code].some((p: any) => p.providerKey === "paystack"),
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Server-side currency guard: both POST /api/transactions and POST
// /api/payment/initiate must reject a currency the chosen provider does not
// support, with HTTP 400. This mirrors the modal's client-side filter so a
// hand-crafted request can't slip a mismatched currency through.
// ---------------------------------------------------------------------------

describe("POST /api/transactions — unsupported currency", () => {
  it("returns 400 when the requested currency is not in the provider's supportedCurrencies", async () => {
    // plan lookup
    enqueue([
      { id: "plan-1", monthlyPrice: "10.00", annualPrice: "100.00" },
    ]);
    // provider lookup — supports USD only
    enqueue([
      {
        id: "prov-stripe",
        isActive: true,
        supportedCurrencies: ["USD"],
      },
    ]);

    const res = await request(app).post("/api/transactions").send({
      userId: "u-1",
      planId: "plan-1",
      paymentProviderId: "prov-stripe",
      billingCycle: "monthly",
      paymentMethod: "card",
      currency: "INR",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/currency .*not supported/i);
    // Must not reach the insert — the guard rejects before any write.
    expect(dbMock.insert).not.toHaveBeenCalled();
  });
});

describe("POST /api/payment/initiate — unsupported currency", () => {
  it("returns 400 when createRazorpaySubscription rejects with CurrencyNotSupportedError", async () => {
    enqueue([{ id: "plan-1", monthlyPrice: "10.00", annualPrice: "100.00" }]);
    enqueue([{ id: "prov-razor", providerKey: "razorpay", isActive: true, supportedCurrencies: ["INR"], name: "Razorpay" }]);

    const res = await request(app).post("/api/payment/initiate").send({
      userId: "u-1",
      planId: "plan-1",
      paymentProviderId: "prov-razor",
      billingCycle: "monthly",
      currency: "USD",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/USD/);
    expect(dbMock.insert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Credential leak guard: GET /api/payment-providers must strip the `config`
// blob (API secrets) for any non-superadmin caller. Superadmin keeps the
// full row because the Gateway Settings page needs it to edit credentials.
// ---------------------------------------------------------------------------

describe("GET /api/payment-providers — config field projection by role", () => {
  const providerRow = {
    id: "p-stripe",
    name: "Stripe",
    providerKey: "stripe",
    description: "Stripe payments",
    logo: null,
    isActive: true,
    config: { secretKey: "sk_live_supersecret", publishableKey: "pk_live_x" },
    supportedCurrencies: ["USD"],
    supportedMethods: ["card"],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
  };

  it("non-superadmin admin receives provider rows WITHOUT the `config` field", async () => {
    currentSession = { user: ADMIN_USER };
    enqueue([providerRow]);

    const res = await request(app).get("/api/payment-providers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const [row] = res.body.data;
    expect(row.id).toBe("p-stripe");
    expect(row.providerKey).toBe("stripe");
    // Critical: no credentials may leak to non-superadmin callers.
    expect(row).not.toHaveProperty("config");
    expect(JSON.stringify(res.body)).not.toContain("sk_live_supersecret");
  });

  it("superadmin still receives the full row including `config`", async () => {
    currentSession = { user: SUPERADMIN_USER };
    enqueue([providerRow]);

    const res = await request(app).get("/api/payment-providers");
    expect(res.status).toBe(200);
    const [row] = res.body.data;
    expect(row).toHaveProperty("config");
    expect(row.config.secretKey).toBe("sk_live_supersecret");
  });
});

// ---------------------------------------------------------------------------
// Auth gate: every endpoint that participates in the upgrade flow must
// reject anonymous callers up front, before any DB work happens. These are
// the obvious "no session at all" 401 cases — role-level access is covered
// by the routing layer (`requireRole("superadmin")`) and tested elsewhere.
// ---------------------------------------------------------------------------

describe("Upgrade flow endpoints — unauthenticated access", () => {
  beforeEach(() => {
    currentSession = {};
  });

  it.each([
    ["GET", "/api/payment-providers"],
    ["GET", "/api/payment-providers/currency-map"],
  ])("%s %s → 401 when no session is attached", async (method, path) => {
    const res =
      method === "GET"
        ? await request(app).get(path)
        : await request(app).post(path).send({});
    expect(res.status).toBe(401);
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("POST /api/transactions → 401 when no session is attached", async () => {
    const res = await request(app).post("/api/transactions").send({
      userId: "u-1",
      planId: "plan-1",
      paymentProviderId: "p",
      billingCycle: "monthly",
      currency: "USD",
    });
    expect(res.status).toBe(401);
    expect(dbMock.select).not.toHaveBeenCalled();
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("POST /api/payment/initiate → 401 when no session is attached", async () => {
    const res = await request(app).post("/api/payment/initiate").send({
      userId: "u-1",
      planId: "plan-1",
      paymentProviderId: "p",
      billingCycle: "monthly",
      currency: "USD",
    });
    expect(res.status).toBe(401);
    expect(dbMock.select).not.toHaveBeenCalled();
  });
});
