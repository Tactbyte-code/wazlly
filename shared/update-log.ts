// Pure helpers for collapsing and terminalizing the Application Update
// timeline. Lives in shared/ so both the client (client/src/pages/app-update.tsx)
// and the server-side vitest suite (server/__tests__/app-update.test.ts) can
// import them via the @shared alias.

export interface UpdateLogSSEEvent {
  step: string;
  status: string;
  message: string;
  progress?: number;
  runId?: string;
}

export interface UpdateLogPersistedEvent {
  step: string;
  status: string;
  message: string;
  progress: number | null;
}

export type SettledRunStatus =
  | "running"
  | "success"
  | "failed"
  | "rolled_back"
  | "interrupted";

const KNOWN_STATUSES = new Set([
  "running",
  "done",
  "error",
  "warning",
]);

function normalizeStepKey(step: string | null | undefined): string | null {
  if (typeof step !== "string") return null;
  const trimmed = step.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

export function eventsToSSE(
  events: UpdateLogPersistedEvent[],
): UpdateLogSSEEvent[] {
  return events.map((e) => ({
    step: e.step,
    status: e.status,
    message: e.message,
    progress: e.progress ?? undefined,
  }));
}

// Replace any prior event with the same step key so the timeline shows one
// row per pipeline step that transitions in place from running -> done.
// Defensive: events without a usable step are appended as-is (never collapsed
// into an unrelated row). Step matching is case-insensitive + trimmed so a
// legacy row with `Replace` still collapses with `replace`.
export function mergeStepEvent(
  prev: UpdateLogSSEEvent[],
  event: UpdateLogSSEEvent,
): UpdateLogSSEEvent[] {
  const key = normalizeStepKey(event.step);
  if (key === null) return [...prev, event];
  const idx = prev.findIndex((e) => normalizeStepKey(e.step) === key);
  if (idx === -1) return [...prev, event];
  const next = prev.slice();
  next[idx] = event;
  return next;
}

export function collapseEvents(
  events: UpdateLogSSEEvent[],
): UpdateLogSSEEvent[] {
  return events.reduce<UpdateLogSSEEvent[]>(
    (acc, ev) => mergeStepEvent(acc, ev),
    [],
  );
}

// When hydrating events from a row whose run is in a terminal state,
// rewrite any persisted event still marked status:'running' (or any
// unknown status that would otherwise render as the gray Package fallback
// icon) so the panel correctly shows the run as finished:
// - success run  -> remaining running/unknown events become 'done'
// - failed/rolled_back/interrupted run -> remaining running/unknown
//   events become 'warning' with an explanatory suffix
// Events already in a known terminal status (done/error/warning) are
// passed through untouched.
export function terminalizeEvents(
  events: UpdateLogSSEEvent[],
  runStatus: SettledRunStatus,
): UpdateLogSSEEvent[] {
  if (runStatus === "running") return events;
  return events.map((ev) => {
    if (KNOWN_STATUSES.has(ev.status) && ev.status !== "running") return ev;
    if (runStatus === "success") {
      return { ...ev, status: "done" };
    }
    return {
      ...ev,
      status: "warning",
      message: `${ev.message} (run ended as ${runStatus} before this step reported completion)`,
    };
  });
}

// Convenience pipeline used by the hydration paths in the UI.
export function hydrateRunLog(
  events: UpdateLogPersistedEvent[],
  runStatus: SettledRunStatus,
): UpdateLogSSEEvent[] {
  return terminalizeEvents(collapseEvents(eventsToSSE(events)), runStatus);
}
