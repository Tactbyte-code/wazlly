import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

const settingsRowQueue: any[][] = [];

vi.mock("../db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(settingsRowQueue.shift() ?? []),
        }),
      }),
    }),
  },
}));

vi.mock("../storage", () => ({
  storage: {
    getChannelsByUserId: vi.fn(async (ownerId: string) => {
      if (ownerId === "owner-with-ch1") return [{ id: "ch-1" }];
      return [];
    }),
  },
}));

let currentSession: { user?: any } = {};
let app: Express;

beforeAll(async () => {
  const { getAISettingsDiagnostics } = await import(
    "../controllers/ai.settings.controller"
  );

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = currentSession;
    next();
  });
  app.get("/api/ai-settings/diagnostics", getAISettingsDiagnostics);
});

beforeEach(() => {
  settingsRowQueue.length = 0;
  currentSession = {};
});

describe("GET /api/ai-settings/diagnostics", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/ai-settings/diagnostics?channelId=ch-1");
    expect(res.status).toBe(401);
  });

  it("rejects requests missing channelId with 400", async () => {
    currentSession = { user: { id: "owner-with-ch1", role: "admin" } };
    const res = await request(app).get("/api/ai-settings/diagnostics");
    expect(res.status).toBe(400);
  });

  it("rejects when admin requests a channel they do not own with 403", async () => {
    currentSession = { user: { id: "other-owner", role: "admin" } };
    const res = await request(app).get("/api/ai-settings/diagnostics?channelId=ch-1");
    expect(res.status).toBe(403);
  });

  it("returns no-settings shape when channel has no ai_settings row", async () => {
    settingsRowQueue.push([]);
    currentSession = { user: { id: "owner-with-ch1", role: "admin" } };

    const res = await request(app).get("/api/ai-settings/diagnostics?channelId=ch-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      active: false,
      hasApiKey: false,
      model: null,
      triggerWords: [],
      lastSkipReason: "no-settings",
      lastSkipAt: null,
    });
  });

  it("returns the diagnostic snapshot when an ai_settings row exists", async () => {
    const fixedAt = new Date("2026-01-15T10:30:00Z").toISOString();
    settingsRowQueue.push([
      {
        id: "ai-1",
        channelId: "ch-1",
        isActive: true,
        apiKey: "sk-real",
        model: "gpt-4o-mini",
        words: ["start", "hello"],
        lastSkipReason: "trigger-word-miss",
        lastSkipAt: fixedAt,
      },
    ]);
    currentSession = { user: { id: "owner-with-ch1", role: "admin" } };

    const res = await request(app).get("/api/ai-settings/diagnostics?channelId=ch-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      active: true,
      hasApiKey: true,
      model: "gpt-4o-mini",
      triggerWords: ["start", "hello"],
      lastSkipReason: "trigger-word-miss",
      lastSkipAt: fixedAt,
    });
  });

  it("superadmin bypasses tenant scoping for any channel", async () => {
    settingsRowQueue.push([]);
    currentSession = { user: { id: "super-1", role: "superadmin" } };

    const res = await request(app).get("/api/ai-settings/diagnostics?channelId=ch-99");

    expect(res.status).toBe(200);
    expect(res.body.lastSkipReason).toBe("no-settings");
  });
});
