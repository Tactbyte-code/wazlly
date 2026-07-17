import { describe, it, expect, beforeEach, vi } from "vitest";

const queryQueue: any[] = [];
function enqueue(...results: any[]) {
  queryQueue.push(...results);
}

const updateCalls: { table: string; values: any; whereArg?: any }[] = [];

function makeChain(label: "select" | "update"): any {
  let captured: any = undefined;
  let table: string = "";
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === "from") {
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
      if (prop === "where") {
        if (label === "update" && captured !== undefined) {
          updateCalls.push({ table, values: captured });
          captured = undefined;
        }
        return () => proxy;
      }
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
  select: vi.fn(() => makeChain("select")),
  update: vi.fn(() => makeChain("update")),
  insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
};

vi.mock("../db", () => ({ db: dbMock }));
vi.mock("../services/training.service", () => ({
  searchTrainingData: vi.fn(async () => ({ chunks: [], qaPairs: [] })),
}));
vi.mock("../services/notification.service", () => ({
  triggerThrottledNotification: vi.fn(async () => undefined),
  NOTIFICATION_EVENTS: {},
}));
vi.mock("../services/whatsapp-api", () => ({
  WhatsAppApiService: vi.fn().mockImplementation(() => ({
    sendTextMessage: vi.fn(async () => ({ messages: [{ id: "wa-out-1" }] })),
  })),
}));
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn(async () => ({ choices: [{ message: { content: "hi" } }] })) } },
  })),
}));

const baseChannel = { id: "ch-1", createdBy: "u-1", name: "Channel" };
const baseConversation = { id: "conv-1", status: "open", assignedTo: null };
const baseContact = { id: "contact-1", name: "Alice" };

let logSpy: ReturnType<typeof vi.spyOn>;

async function callHandler(args: {
  channelId?: string;
  conversation?: any;
  messageType?: string;
}) {
  const mod = await import("../services/webhook-handler");
  const handler = (mod.WebhookHandler as any).handleAIAutoReply.bind(mod.WebhookHandler);
  await handler(
    args.channelId ?? "ch-1",
    baseChannel,
    args.conversation ?? baseConversation,
    baseContact,
    "hello",
    "+15555550001",
    args.messageType ?? "text",
  );
}

beforeEach(() => {
  queryQueue.length = 0;
  updateCalls.length = 0;
  dbMock.select.mockClear();
  dbMock.update.mockClear();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("handleAIAutoReply — skip diagnostics", () => {
  it("logs and does NOT update when no ai_settings row exists", async () => {
    enqueue([]); // SELECT ai_settings -> none

    await callHandler({});

    expect(logSpy).toHaveBeenCalledWith("[AI] skip: no-settings channel=ch-1");
    expect(updateCalls.length).toBe(0);
  });

  it("logs `inactive` and writes diagnostic columns when isActive=false", async () => {
    enqueue([{ id: "ai-1", channelId: "ch-1", isActive: false, apiKey: "sk-x", words: [] }]);

    await callHandler({});

    expect(logSpy).toHaveBeenCalledWith("[AI] skip: inactive channel=ch-1");
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0].values.lastSkipReason).toBe("inactive");
    expect(updateCalls[0].values.lastSkipAt).toBeInstanceOf(Date);
  });

  it("logs `no-api-key` and writes diagnostic columns when apiKey is empty", async () => {
    enqueue([{ id: "ai-1", channelId: "ch-1", isActive: true, apiKey: "", words: [] }]);

    await callHandler({});

    expect(logSpy).toHaveBeenCalledWith("[AI] skip: no-api-key channel=ch-1");
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0].values.lastSkipReason).toBe("no-api-key");
  });

  it("logs `assigned-to-agent` when conversation is already handed off", async () => {
    enqueue([{ id: "ai-1", channelId: "ch-1", isActive: true, apiKey: "sk-x", words: [] }]);

    await callHandler({
      conversation: { id: "conv-1", status: "assigned", assignedTo: "agent-7" },
    });

    expect(logSpy).toHaveBeenCalledWith("[AI] skip: assigned-to-agent channel=ch-1");
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0].values.lastSkipReason).toBe("assigned-to-agent");
  });

  it("logs `non-text-message` for image/audio/etc.", async () => {
    enqueue([{ id: "ai-1", channelId: "ch-1", isActive: true, apiKey: "sk-x", words: [] }]);

    await callHandler({ messageType: "image" });

    expect(logSpy).toHaveBeenCalledWith("[AI] skip: non-text-message channel=ch-1");
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0].values.lastSkipReason).toBe("non-text-message");
  });

  it("recordNonContentSkip logs `non-text-message` and updates diagnostics when settings exist (reaction path)", async () => {
    enqueue([{ id: "ai-1", channelId: "ch-1", isActive: true, apiKey: "sk-x", words: [] }]);

    const mod = await import("../services/webhook-handler");
    await mod.WebhookHandler.recordNonContentSkip("ch-1");

    expect(logSpy).toHaveBeenCalledWith("[AI] skip: non-text-message channel=ch-1");
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0].values.lastSkipReason).toBe("non-text-message");
  });

  it("recordNonContentSkip logs `no-settings` when no row exists for the channel (reaction path)", async () => {
    enqueue([]);

    const mod = await import("../services/webhook-handler");
    await mod.WebhookHandler.recordNonContentSkip("ch-1");

    expect(logSpy).toHaveBeenCalledWith("[AI] skip: no-settings channel=ch-1");
    expect(updateCalls.length).toBe(0);
  });

  it("logs `trigger-word-miss` on first message when none of the trigger words match", async () => {
    enqueue([
      {
        id: "ai-1",
        channelId: "ch-1",
        isActive: true,
        apiKey: "sk-x",
        words: ["start", "menu"],
      },
    ]);
    enqueue([{ id: "msg-1" }]); // existingMessages — single inbound, so isFirstMessage=true

    await callHandler({});

    expect(logSpy).toHaveBeenCalledWith("[AI] skip: trigger-word-miss channel=ch-1");
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0].values.lastSkipReason).toBe("trigger-word-miss");
  });
});
