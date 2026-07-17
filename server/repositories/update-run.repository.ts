import { db } from "../db";
import { desc, eq, asc, and } from "drizzle-orm";
import {
  updateRuns,
  updateRunEvents,
  type UpdateRun,
  type UpdateRunEvent,
  type InsertUpdateRun,
  type InsertUpdateRunEvent,
} from "@shared/schema";

export interface ReconcileResult {
  reconciled: Array<{
    id: string;
    toVersion: string | null;
    decided: "success" | "interrupted";
  }>;
}

export class UpdateRunRepository {
  async createRun(data: InsertUpdateRun): Promise<UpdateRun> {
    const [row] = await db.insert(updateRuns).values(data).returning();
    return row;
  }

  async appendEvent(data: InsertUpdateRunEvent): Promise<UpdateRunEvent> {
    const [row] = await db.insert(updateRunEvents).values(data).returning();
    return row;
  }

  async finalizeRun(
    id: string,
    status: string,
    finalMessage: string | null
  ): Promise<void> {
    await db
      .update(updateRuns)
      .set({ status, finalMessage, finishedAt: new Date() })
      .where(eq(updateRuns.id, id));
  }

  async listRuns(limit = 10): Promise<UpdateRun[]> {
    return await db
      .select()
      .from(updateRuns)
      .orderBy(desc(updateRuns.startedAt))
      .limit(limit);
  }

  async getRun(id: string): Promise<UpdateRun | undefined> {
    const [row] = await db
      .select()
      .from(updateRuns)
      .where(eq(updateRuns.id, id))
      .limit(1);
    return row;
  }

  async getEvents(runId: string): Promise<UpdateRunEvent[]> {
    return await db
      .select()
      .from(updateRunEvents)
      .where(eq(updateRunEvents.runId, runId))
      .orderBy(asc(updateRunEvents.id));
  }

  async getLatestRunWithEvents(): Promise<
    { run: UpdateRun; events: UpdateRunEvent[] } | null
  > {
    const [run] = await db
      .select()
      .from(updateRuns)
      .orderBy(desc(updateRuns.startedAt))
      .limit(1);
    if (!run) return null;
    const events = await this.getEvents(run.id);
    return { run, events };
  }

  /**
   * Sweep update_runs for rows still marked status='running' from a
   * previous Node process (e.g. killed by pm2 restart mid-stream during
   * an Application Update). For each orphan, decide the terminal status
   * by comparing the on-disk VERSION to the run's to_version:
   *
   *   - versions match  -> mark 'success'  (the install actually finished
   *                        on disk; the SSE just couldn't flush its final
   *                        event before SIGINT)
   *   - versions differ -> mark 'interrupted' (the install did not land,
   *                        or a subsequent rollback / different release
   *                        moved the on-disk version)
   *
   * Returns the list of rows that were reconciled so callers can log a
   * single summary line. This is safe to call repeatedly at startup.
   */
  async reconcileStaleRunningRuns(
    currentVersion: string,
  ): Promise<ReconcileResult> {
    const stale = await db
      .select()
      .from(updateRuns)
      .where(eq(updateRuns.status, "running"));

    const reconciled: ReconcileResult["reconciled"] = [];
    for (const row of stale) {
      const versionsMatch =
        !!row.toVersion && row.toVersion.trim() === currentVersion.trim();
      const decided: "success" | "interrupted" = versionsMatch
        ? "success"
        : "interrupted";
      const finalMessage = versionsMatch
        ? `Reconciled at startup: on-disk VERSION (${currentVersion}) matches the run's target version, so the install is considered successful even though the SSE stream was cut short.`
        : `Reconciled at startup: the run was left in 'running' state but the on-disk VERSION (${currentVersion}) does not match the run's target version (${row.toVersion ?? "unknown"}). Marking as interrupted.`;

      // Use returning() so we can tell whether the conditional update
      // actually settled this row. If a parallel process (e.g. a
      // controller path on another worker) finalised it between our
      // SELECT and UPDATE, the WHERE clause will match zero rows and
      // we must NOT report it in the reconciled list — otherwise the
      // startup log overstates how many orphans we cleaned up.
      const updated = await db
        .update(updateRuns)
        .set({
          status: decided,
          finalMessage,
          finishedAt: new Date(),
        })
        .where(and(eq(updateRuns.id, row.id), eq(updateRuns.status, "running")))
        .returning({ id: updateRuns.id });

      if (updated.length > 0) {
        reconciled.push({
          id: row.id,
          toVersion: row.toVersion,
          decided,
        });
      }
    }

    return { reconciled };
  }
}

export const updateRunRepository = new UpdateRunRepository();
