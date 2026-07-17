import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import crypto from "crypto";

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
  execute: vi.fn(async () => ({ rowCount: 1, rows: [{}] })),
};

vi.mock("../db", () => ({ db: dbMock }));

// Dedup: simulate Redis returning OK on first call, then NX-conflict thereafter,
// keyed by the dedup key. This is exactly what cacheSetNX does in production.
const seenDedupKeys = new Set<string>();
vi.mock("../services/redis", () => ({
  cacheSetNX: vi.fn(async (key: string) => {
    if (seenDedupKeys.has(key)) return false;
    seenDedupKeys.add(key);
    return true;
  }),
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => true),
  cacheDel: vi.fn(async (key: string) => {
    seenDedupKeys.delete(key);
    return true;
  }),
  cacheGetJSON: vi.fn(async () => null),
  cacheSetJSON: vi.fn(async () => true),
  isRedisAvailable: vi.fn(() => true),
  getRedisClient: vi.fn(() => null),
  onRedisStateChange: vi.fn(() => () => {}),
}));

// Stripe SDK stub: constructEvent simply parses and returns the body so the
// test can ship the same event payload twice without signing it.
vi.mock("../services/payment-gateway.service", () => ({
  getStripe: vi.fn(async () => ({
    webhooks: {
      constructEvent: (raw: any) => {
        if (Buffer.isBuffer(raw)) return JSON.parse(raw.toString());
        if (typeof raw === "string") return JSON.parse(raw);
        return raw;
      },
    },
  })),
  getPayPalAccessToken: vi.fn(async () => "ppl-token"),
  getPayPalBaseUrl: vi.fn(async () => "https://api.sandbox.paypal.com"),
  getMercadoPagoAccessToken: vi.fn(async () => "mp-token"),
  getPaystackSecretKey: vi.fn(async () => "sk_test_x"),
}));

const axiosGetMock = vi.fn();
vi.mock("axios", () => ({
  default: { get: axiosGetMock, post: vi.fn() },
  get: axiosGetMock,
  post: vi.fn(),
}));

let app: Express;

beforeAll(async () => {
  const ctrl = await import("../controllers/webhooks.controller");
  app = express();
  app.use(express.json());
  app.post("/webhooks/stripe", ctrl.stripeWebhook);
  app.post("/webhooks/paypal", ctrl.paypalWebhook);
  app.post("/webhooks/mercadopago", ctrl.mercadopagoWebhook);
});

function mpHeaders(secret: string, dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return {
    "x-signature": `ts=${ts},v1=${v1}`,
    "x-request-id": requestId,
  };
}

beforeEach(() => {
  queryQueue.length = 0;
  seenDedupKeys.clear();
  updateCalls.length = 0;
  insertCalls.length = 0;
  axiosGetMock.mockReset();
  dbMock.select.mockClear();
  dbMock.insert.mockClear();
  dbMock.update.mockClear();
  dbMock.execute.mockClear();
});

// ---------------------------------------------------------------------------
// Stripe: redelivering the same `invoice.paid` event must extend the
// subscription endDate exactly once. Without dedup, a duplicate would re-run
// the db.update and double-credit the user.
// ---------------------------------------------------------------------------

describe("Stripe webhook idempotency", () => {
  it("does not re-extend endDate when the same invoice.paid event is delivered twice", async () => {
    const eventPayload = {
      id: "evt_invoice_paid_1",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1",
          subscription: "sub_stripe_1",
          lines: { data: [{ period: { end: 1800000000 } }] },
        },
      },
    };

    // First delivery: provider lookup + handler subscription lookup.
    enqueue(
      [{ id: "p-stripe", isActive: true, config: { isLive: true, webhookSecret: "whsec_x" } }],
      [{ id: "sub-row-1", gatewaySubscriptionId: "sub_stripe_1", billingCycle: "monthly" }],
    );

    const r1 = await request(app)
      .post("/webhooks/stripe")
      .set("stripe-signature", "t=1,v1=ignored")
      .send(eventPayload);
    expect(r1.status).toBe(200);
    expect(r1.body.duplicate).toBeUndefined();
    expect(updateCalls.length).toBe(1);

    // Second delivery: only the provider lookup happens before dedup short-circuits.
    enqueue([{ id: "p-stripe", isActive: true, config: { isLive: true, webhookSecret: "whsec_x" } }]);

    const r2 = await request(app)
      .post("/webhooks/stripe")
      .set("stripe-signature", "t=1,v1=ignored")
      .send(eventPayload);
    expect(r2.status).toBe(200);
    expect(r2.body.duplicate).toBe(true);
    // The handler must not have run again — still exactly one update and no
    // transaction-row insert/update side-effects on the duplicate delivery.
    expect(updateCalls.length).toBe(1);
    expect(insertCalls.length).toBe(0);
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("activates the pending transaction when invoice.paid arrives before manual verify", async () => {
    const eventPayload = {
      id: "evt_invoice_paid_first_delivery",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_first",
          subscription: "sub_stripe_pending",
          payment_intent: "pi_first",
          amount_paid: 2500,
          currency: "usd",
          lines: { data: [{ period: { start: 1800000000, end: 1802592000 } }] },
        },
      },
    };

    enqueue(
      [{ id: "p-stripe", isActive: true, config: { isLive: true, webhookSecret: "whsec_x" } }],
      [], // no subscription row exists yet
      [{
        id: "txn-pending-1",
        userId: "u-1",
        planId: "plan-1",
        billingCycle: "monthly",
        currency: "USD",
        providerTransactionId: "sub_stripe_pending",
        subscriptionId: null,
      }],
      [], // mark transaction completed
      [{
        id: "plan-1",
        name: "Pro",
        description: "Pro plan",
        monthlyPrice: "25.00",
        annualPrice: "250.00",
        permissions: [],
        features: [],
      }],
      [], // cancel older active subscription rows
      [{ id: "sub-row-new" }],
      [], // attach subscription to transaction
      [], // update user's current plan
    );

    const res = await request(app)
      .post("/webhooks/stripe")
      .set("stripe-signature", "t=1,v1=ignored")
      .send(eventPayload);

    expect(res.status).toBe(200);
    expect(insertCalls.length).toBe(1);
    expect(insertCalls[0]).toMatchObject({
      userId: "u-1",
      planId: "plan-1",
      status: "active",
      billingCycle: "monthly",
      gatewaySubscriptionId: "sub_stripe_pending",
      gatewayProvider: "stripe",
      gatewayStatus: "active",
    });
    expect(insertCalls[0].startDate.toISOString()).toBe(new Date(1800000000 * 1000).toISOString());
    expect(insertCalls[0].endDate.toISOString()).toBe(new Date(1802592000 * 1000).toISOString());
  });
});

// ---------------------------------------------------------------------------
// PayPal: PAYMENT.SALE.COMPLETED arriving 3 days after the actual charge
// must produce an endDate that exactly equals the gateway's
// next_billing_time, not now()+1 month.
// ---------------------------------------------------------------------------

describe("PayPal endDate uses gateway next_billing_time", () => {
  it("sets endDate to billing_info.next_billing_time from the live subscription, not local clock math", async () => {
    const nextBilling = "2026-06-22T10:00:00Z";

    axiosGetMock.mockImplementation(async (url: string) => {
      if (url.includes("/v1/notifications/verify-webhook-signature")) {
        return { data: { verification_status: "SUCCESS" } };
      }
      return { data: {} };
    });
    // The verify-webhook call is POST in the controller; switch the post mock.
    const axiosMod = await import("axios");
    (axiosMod.default as any).post = vi.fn(async () => ({
      data: { verification_status: "SUCCESS" },
    }));
    // GET for the subscription lookup returns next_billing_time.
    axiosGetMock.mockImplementation(async (url: string) => {
      if (url.includes("/v1/billing/subscriptions/I-AGREEMENT-1")) {
        return {
          data: {
            id: "I-AGREEMENT-1",
            billing_info: {
              next_billing_time: nextBilling,
              last_payment: { time: "2026-05-22T10:00:00Z" },
            },
          },
        };
      }
      return { data: {} };
    });

    enqueue(
      [{ id: "p-paypal", isActive: true, config: { isLive: false, webhookIdTest: "WH-TEST-1" } }],
      [{ id: "sub-row-2", gatewaySubscriptionId: "I-AGREEMENT-1", billingCycle: "monthly" }],
      [], // no transaction row matches the billing_agreement_id
    );

    const eventPayload = {
      id: "evt_paypal_sale_1",
      event_type: "PAYMENT.SALE.COMPLETED",
      resource: {
        id: "PAYID-1",
        billing_agreement_id: "I-AGREEMENT-1",
        amount: { total: "10.00", currency: "USD" },
      },
    };

    const r = await request(app)
      .post("/webhooks/paypal")
      .set("paypal-transmission-id", "tx-1")
      .set("paypal-transmission-time", "2026-05-22T10:00:01Z")
      .set("paypal-cert-url", "https://api.sandbox.paypal.com/cert")
      .set("paypal-transmission-sig", "sig")
      .set("paypal-auth-algo", "SHA256withRSA")
      .send(eventPayload);

    expect(r.status).toBe(200);
    expect(updateCalls.length).toBe(1);
    const setVals = updateCalls[0];
    expect(setVals.endDate).toBeInstanceOf(Date);
    expect(setVals.endDate.toISOString()).toBe(new Date(nextBilling).toISOString());
  });
});

// ---------------------------------------------------------------------------
// Mercado Pago: two distinct notifications for the same subscription (e.g.
// paused → authorized) share `data.id` and `action="updated"` but carry
// different top-level notification ids. The dedup key must distinguish them
// so legitimate state transitions are not dropped.
// ---------------------------------------------------------------------------

describe("Mercado Pago dedup distinguishes distinct notifications", () => {
  it("processes two updated events for the same subscription with different notification ids", async () => {
    const secret = "mp-secret-test";
    const dataId = "preapproval-1";

    enqueue(
      [{
        id: "p-mp",
        isActive: true,
        config: { isLive: false, webhookSecretTest: secret },
      }],
    );
    axiosGetMock.mockImplementation(async (url: string) => {
      if (url.includes(`/preapproval/${dataId}`)) {
        return { data: { id: dataId, status: "paused", external_reference: "ext-1" } };
      }
      return { data: {} };
    });

    const ts1 = "1700000000";
    const r1 = await request(app)
      .post("/webhooks/mercadopago")
      .set(mpHeaders(secret, dataId, "req-1", ts1))
      .send({
        id: 9001,
        type: "subscription_preapproval",
        action: "updated",
        data: { id: dataId },
        date_created: "2026-04-22T10:00:00Z",
      });
    expect(r1.status).toBe(200);
    expect(r1.body.duplicate).toBeUndefined();

    enqueue(
      [{
        id: "p-mp",
        isActive: true,
        config: { isLive: false, webhookSecretTest: secret },
      }],
    );
    axiosGetMock.mockImplementation(async (url: string) => {
      if (url.includes(`/preapproval/${dataId}`)) {
        return { data: { id: dataId, status: "authorized", external_reference: "ext-1" } };
      }
      return { data: {} };
    });

    const ts2 = "1700000060";
    // Same data.id + action="updated" but a different date_created — distinct
    // semantic state transition. Must NOT be deduped.
    const r2 = await request(app)
      .post("/webhooks/mercadopago")
      .set(mpHeaders(secret, dataId, "req-2", ts2))
      .send({
        id: 9002,
        type: "subscription_preapproval",
        action: "updated",
        data: { id: dataId },
        date_created: "2026-04-22T10:01:00Z",
      });
    expect(r2.status).toBe(200);
    expect(r2.body.duplicate).toBeUndefined();
  });

});
