import { describe, it, expect, beforeEach, vi } from "vitest";

const queryQueue: any[] = [];
function enqueue(...results: any[]) {
  queryQueue.push(...results);
}

const updateCalls: { table: string; values: any; whereId?: string }[] = [];
const insertCalls: { table: string; values: any }[] = [];

function makeChain(label: "select" | "update" | "insert" | "delete"): any {
  let captured: any = undefined;
  let table: string = "";
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === "from" || prop === "into") {
        return (t: any) => {
          table = t?._?.name || t?.tableName || "";
          return proxy;
        };
      }
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
      if (prop === "returning") {
        return () => proxy;
      }
      if (prop === "then") {
        if (label === "update" && captured !== undefined) {
          updateCalls.push({ table, values: captured });
        }
        if (label === "insert" && captured !== undefined) {
          insertCalls.push({ table, values: captured });
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
  insert: vi.fn((t: any) => {
    const c = makeChain("insert");
    return c.into(t);
  }),
  update: vi.fn((t: any) => {
    const c = makeChain("update");
    c.from(t);
    return c;
  }),
  delete: vi.fn(() => makeChain("delete")),
  execute: vi.fn(async () => ({ rowCount: 1, rows: [{}] })),
};

vi.mock("../db", () => ({ db: dbMock }));

const seenDedupKeys = new Set<string>();
vi.mock("../services/redis", () => ({
  cacheSetNX: vi.fn(async (key: string) => {
    if (seenDedupKeys.has(key)) return false;
    seenDedupKeys.add(key);
    return true;
  }),
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => true),
  cacheDel: vi.fn(async () => true),
  cacheGetJSON: vi.fn(async () => null),
  cacheSetJSON: vi.fn(async () => true),
  isRedisAvailable: vi.fn(() => true),
  getRedisClient: vi.fn(() => null),
  onRedisStateChange: vi.fn(() => () => {}),
}));

const stripeRetrieveMock = vi.fn();
vi.mock("../services/payment-gateway.service", () => ({
  getStripe: vi.fn(async () => ({
    paymentIntents: { retrieve: stripeRetrieveMock },
  })),
  getRazorpay: vi.fn(async () => null),
  getPayPalAccessToken: vi.fn(async () => "ppl-token"),
  getPayPalBaseUrl: vi.fn(async () => "https://api-m.sandbox.paypal.com"),
  getPaystackSecretKey: vi.fn(async () => "sk_test_x"),
  getMercadoPagoAccessToken: vi.fn(async () => "mp-token"),
}));

const axiosGetMock = vi.fn();
vi.mock("axios", () => ({
  default: { get: axiosGetMock, post: vi.fn() },
  get: axiosGetMock,
  post: vi.fn(),
}));

beforeEach(() => {
  queryQueue.length = 0;
  seenDedupKeys.clear();
  updateCalls.length = 0;
  insertCalls.length = 0;
  axiosGetMock.mockReset();
  stripeRetrieveMock.mockReset();
  dbMock.select.mockClear();
  dbMock.insert.mockClear();
  dbMock.update.mockClear();
});

const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000);
const THIRTY_ONE_DAYS_AGO = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

describe("PaymentReconciler.reconcileOnce", () => {
  it("transitions a 2-hour-old paystack pending row reported as success to completed and activates a subscription exactly once", async () => {
    enqueue([
      {
        tx: {
          id: "tx-paystack-1",
          userId: "user-1",
          planId: "plan-1",
          subscriptionId: null,
          billingCycle: "monthly",
          currency: "NGN",
          providerTransactionId: "pst-ref-1",
          providerOrderId: null,
          providerPaymentId: null,
          paymentProviderId: "pp-1",
          status: "pending",
          createdAt: TWO_HOURS_AGO,
        },
        providerKey: "paystack",
      },
    ]);

    axiosGetMock.mockImplementation(async (url: string) => {
      if (url.includes("/transaction/verify/pst-ref-1")) {
        return { status: 200, data: { data: { status: "success" } } };
      }
      throw new Error(`unexpected url ${url}`);
    });

    enqueue([]);
    enqueue([
      {
        id: "tx-paystack-1",
        userId: "user-1",
        planId: "plan-1",
        subscriptionId: null,
        billingCycle: "monthly",
        currency: "NGN",
        providerTransactionId: "pst-ref-1",
        status: "completed",
      },
    ]);
    enqueue([{ id: "plan-1", name: "Pro", monthlyPrice: "10", annualPrice: "100", description: "p", permissions: [], features: [] }]);
    enqueue([]);
    enqueue([{ id: "sub-new-1" }]);
    enqueue([]);
    enqueue([]);

    const { paymentReconciler } = await import("../cron/payment-reconciler.cron");
    await paymentReconciler.reconcileOnce();

    const txCompletedUpdate = updateCalls.find((c) => c.values?.status === "completed");
    expect(txCompletedUpdate).toBeDefined();

    const subInsert = insertCalls.find((c) => c.values?.status === "active");
    expect(subInsert).toBeDefined();
    expect(subInsert!.values.userId).toBe("user-1");
    expect(subInsert!.values.gatewayProvider).toBe("paystack");
    expect(insertCalls.length).toBe(1);
  });

  it("transitions a 2-hour-old stripe pending row reported as failed to failed and does not activate a subscription", async () => {
    enqueue([
      {
        tx: {
          id: "tx-stripe-1",
          userId: "user-2",
          planId: "plan-2",
          subscriptionId: null,
          billingCycle: "monthly",
          currency: "USD",
          providerTransactionId: "pi_failed_1",
          providerOrderId: null,
          providerPaymentId: null,
          paymentProviderId: "pp-2",
          status: "pending",
          createdAt: TWO_HOURS_AGO,
        },
        providerKey: "stripe",
      },
    ]);

    stripeRetrieveMock.mockResolvedValue({
      id: "pi_failed_1",
      status: "requires_payment_method",
      last_payment_error: { code: "card_declined", message: "declined" },
    });

    const { paymentReconciler } = await import("../cron/payment-reconciler.cron");
    await paymentReconciler.reconcileOnce();

    const failedUpdate = updateCalls.find((c) => c.values?.status === "failed");
    expect(failedUpdate).toBeDefined();
    expect(insertCalls.length).toBe(0);
  });

  it("marks a 31-day-old paypal pending row as expired without calling the gateway", async () => {
    enqueue([
      {
        tx: {
          id: "tx-paypal-old-1",
          userId: "user-3",
          planId: "plan-3",
          subscriptionId: null,
          billingCycle: "monthly",
          currency: "USD",
          providerTransactionId: "I-OLD-AGREEMENT",
          providerOrderId: null,
          providerPaymentId: null,
          paymentProviderId: "pp-3",
          status: "pending",
          createdAt: THIRTY_ONE_DAYS_AGO,
        },
        providerKey: "paypal",
      },
    ]);

    const { paymentReconciler } = await import("../cron/payment-reconciler.cron");
    await paymentReconciler.reconcileOnce();

    expect(axiosGetMock).not.toHaveBeenCalled();
    const expiredUpdate = updateCalls.find((c) => c.values?.status === "expired");
    expect(expiredUpdate).toBeDefined();
    expect(insertCalls.length).toBe(0);
  });

  it("does not double-activate when the webhook already activated the subscription before the cron tick fetched the row", async () => {
    enqueue([
      {
        tx: {
          id: "tx-race-1",
          userId: "user-4",
          planId: "plan-4",
          subscriptionId: null,
          billingCycle: "monthly",
          currency: "USD",
          providerTransactionId: "pi_race_1",
          providerOrderId: null,
          providerPaymentId: null,
          paymentProviderId: "pp-4",
          status: "pending",
          createdAt: TWO_HOURS_AGO,
        },
        providerKey: "stripe",
      },
    ]);

    stripeRetrieveMock.mockResolvedValue({
      id: "pi_race_1",
      status: "succeeded",
    });

    enqueue([
      {
        id: "tx-race-1",
        userId: "user-4",
        planId: "plan-4",
        subscriptionId: "sub-already-by-webhook",
        billingCycle: "monthly",
        currency: "USD",
        providerTransactionId: "pi_race_1",
        status: "completed",
      },
    ]);

    const { paymentReconciler } = await import("../cron/payment-reconciler.cron");
    await paymentReconciler.reconcileOnce();

    expect(insertCalls.length).toBe(0);
  });
});
