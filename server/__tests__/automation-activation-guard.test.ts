import { describe, it, expect, vi } from "vitest";

vi.mock("../db", () => ({ db: {} }));
vi.mock("../storage", () => ({ storage: {} }));
vi.mock("../services/automation-execution-service", () => ({
  executionService: {},
  triggerService: {},
  sanitizeAutomationVariables: (x: any) => x,
}));

describe("findActivationProblem", () => {
  it("rejects an empty flow", async () => {
    const { findActivationProblem } = await import(
      "../controllers/automation.controller"
    );
    expect(findActivationProblem([], [])).toMatch(/at least one node/i);
  });

  it("rejects a node-only flow with no edges", async () => {
    const { findActivationProblem } = await import(
      "../controllers/automation.controller"
    );
    expect(
      findActivationProblem([{ nodeId: "n1" }], []),
    ).toMatch(/connection/i);
  });

  it("rejects a flow whose only edge points to an unknown node", async () => {
    const { findActivationProblem } = await import(
      "../controllers/automation.controller"
    );
    expect(
      findActivationProblem(
        [{ nodeId: "n1" }],
        [{ sourceNodeId: "n1", targetNodeId: "ghost" }],
      ),
    ).toMatch(/valid connection/i);
  });

  it("rejects a closed cycle with no entry point", async () => {
    const { findActivationProblem } = await import(
      "../controllers/automation.controller"
    );
    expect(
      findActivationProblem(
        [{ nodeId: "a" }, { nodeId: "b" }],
        [
          { sourceNodeId: "a", targetNodeId: "b" },
          { sourceNodeId: "b", targetNodeId: "a" },
        ],
      ),
    ).toMatch(/no start node/i);
  });

  it("rejects a flow whose only start node has no outgoing edge", async () => {
    const { findActivationProblem } = await import(
      "../controllers/automation.controller"
    );
    // Stranded start `x`; `y` and `z` form an internal cycle that no node
    // outside it points to, so `x` is the only start and has no outgoing.
    expect(
      findActivationProblem(
        [{ nodeId: "x" }, { nodeId: "y" }, { nodeId: "z" }],
        [
          { sourceNodeId: "y", targetNodeId: "z" },
          { sourceNodeId: "z", targetNodeId: "y" },
        ],
      ),
    ).toMatch(/start node has no outgoing/i);
  });

  it("accepts a minimal valid flow", async () => {
    const { findActivationProblem } = await import(
      "../controllers/automation.controller"
    );
    expect(
      findActivationProblem(
        [{ nodeId: "trigger" }, { nodeId: "action" }],
        [{ sourceNodeId: "trigger", targetNodeId: "action" }],
      ),
    ).toBeNull();
  });

  it("accepts a flow with multiple start nodes when at least one has outgoing", async () => {
    const { findActivationProblem } = await import(
      "../controllers/automation.controller"
    );
    expect(
      findActivationProblem(
        [{ nodeId: "a" }, { nodeId: "b" }, { nodeId: "c" }],
        [{ sourceNodeId: "a", targetNodeId: "b" }],
      ),
    ).toBeNull();
  });
});
