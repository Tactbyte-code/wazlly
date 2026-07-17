import { describe, it, expect, vi, beforeEach } from "vitest";

// Records of insert calls keyed by table name so we can prove that
// `automationExecutions` was NOT inserted into when cooldown blocks it.
const inserts: Record<string, any[][]> = {
  automation_executions: [],
};

// Programmable response queue for `db.select(...)`. The trigger service
// performs three selects in order:
//   1. Active automations for this channel/trigger
//   2. Node count for the matched automation
//   3. Recent executions in the cooldown window (the query we're hardening)
let selectQueue: any[][] = [];

vi.mock("../db", () => {
  const tagOf = (t: any) =>
    t?.[Symbol.for("drizzle:Name")] ?? t?._?.name ?? "";

  // Each `db.select(...).from(...).where(...)[.limit(...)]` resolves to
  // whatever is at the head of `selectQueue`.
  const makeSelect = () => {
    const resolvedRows = () => selectQueue.shift() ?? [];
    const tail: any = {
      limit: () => Promise.resolve(resolvedRows()),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolvedRows()).then(onFulfilled, onRejected),
    };
    const chain: any = {
      from: () => chain,
      where: () => tail,
    };
    return chain;
  };

  return {
    db: {
      select: () => makeSelect(),
      insert: (table: any) => ({
        values: (row: any) => ({
          onConflictDoNothing: () => ({
            returning: async () => {
              const name = tagOf(table);
              if (name === "automation_executions") {
                inserts.automation_executions.push([row]);
              }
              return [{ id: "exec-new", ...row }];
            },
          }),
          returning: async () => {
            const name = tagOf(table);
            if (name === "automation_executions") {
              inserts.automation_executions.push([row]);
            }
            return [{ id: "exec-new", ...row }];
          },
        }),
      }),
      query: { automations: { findFirst: async () => null } },
    },
  };
});

describe("triggerService.handleMessageReceived — cooldown covers running + paused", () => {
  beforeEach(() => {
    inserts.automation_executions.length = 0;
    selectQueue = [];
  });

  it("does NOT spawn a new execution when a paused execution exists in the cooldown window", async () => {
    const { triggerService } = await import(
      "../services/automation-execution-service"
    );
    // Stub the executor entirely: this test is about the trigger gate, not
    // node execution. If the gate fails open, executeAutomation would be
    // called; we'll fail the test by also asserting it was never invoked.
    const executeSpy = vi
      .spyOn(triggerService.getExecutionService(), "executeAutomation")
      .mockResolvedValue();
    const hasPendingSpy = vi
      .spyOn(triggerService.getExecutionService(), "hasPendingExecution")
      .mockReturnValue(false);

    selectQueue = [
      // 1. active automations
      [
        {
          id: "auto-1",
          channelId: "chan-1",
          name: "Welcome",
          status: "active",
          trigger: "message_received",
        },
      ],
      // 2. node count > 0
      [{ count: 3 }],
      // 3. cooldown query — pretend a paused execution exists in the window
      [{ id: "exec-paused" }],
    ];

    const handled = await triggerService.handleMessageReceived(
      "conv-1",
      { content: "hi", id: "wamid-1" },
      "chan-1",
      "contact-1",
    );

    expect(handled).toBe(true); // trigger ran but cooldown skipped
    expect(inserts.automation_executions.length).toBe(0);
    expect(executeSpy).not.toHaveBeenCalled();

    hasPendingSpy.mockRestore();
    executeSpy.mockRestore();
  });

  it("DOES spawn a new execution when no recent run exists", async () => {
    const { triggerService } = await import(
      "../services/automation-execution-service"
    );
    const executeSpy = vi
      .spyOn(triggerService.getExecutionService(), "executeAutomation")
      .mockResolvedValue();
    const hasPendingSpy = vi
      .spyOn(triggerService.getExecutionService(), "hasPendingExecution")
      .mockReturnValue(false);

    selectQueue = [
      [
        {
          id: "auto-1",
          channelId: "chan-1",
          name: "Welcome",
          status: "active",
          trigger: "message_received",
        },
      ],
      [{ count: 3 }],
      // Empty cooldown result — gate should let this through.
      [],
    ];

    await triggerService.handleMessageReceived(
      "conv-2",
      { content: "hi", id: "wamid-2" },
      "chan-1",
      "contact-2",
    );

    expect(inserts.automation_executions.length).toBe(1);
    expect(executeSpy).toHaveBeenCalledWith("exec-new");

    hasPendingSpy.mockRestore();
    executeSpy.mockRestore();
  });
});
