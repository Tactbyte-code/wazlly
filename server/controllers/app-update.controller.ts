import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { execFileSync, spawn } from "child_process";
import semver from "semver";
import { pool } from "../db";
import {
  runDbPrecheckCleanup,
  DbPrecheckStepError,
} from "../db-precheck-cleanup";

const CMD_TIMEOUT_MS = 300_000;

let updateLock = false;

const PROTECTED_PATHS = new Set([
  "uploads",
  ".env",
  "node_modules",
  ".update-backups",
  ".update-temp",
  ".git",
  ".replit",
  ".config",
  ".local",
  "replit.nix",
  "replit_agent",
  ".cache",
  "data",
  "database",
  "db",
  ".data",
  "logs",
  "tmp",
]);

const PROTECTED_SUBPATHS = [
  "public/uploads",
];

function getAppRoot(): string {
  return process.env.APP_UPDATE_ROOT || process.cwd();
}

function getRoots() {
  const APP_ROOT = getAppRoot();
  return {
    APP_ROOT,
    BACKUP_DIR: path.join(APP_ROOT, ".update-backups"),
    TEMP_DIR: path.join(APP_ROOT, ".update-temp"),
  };
}

function isProtected(relativePath: string): boolean {
  const topLevel = relativePath.split(path.sep)[0];
  if (PROTECTED_PATHS.has(topLevel)) return true;
  const normalized = relativePath.replace(/\\/g, "/");
  for (const sub of PROTECTED_SUBPATHS) {
    if (normalized === sub || normalized.startsWith(sub + "/")) return true;
  }
  return false;
}

function getAppVersion(): string {
  const { APP_ROOT } = getRoots();
  try {
    const versionFile = path.join(APP_ROOT, "VERSION");
    if (fs.existsSync(versionFile)) {
      return fs.readFileSync(versionFile, "utf-8").trim();
    }
    const pkg = JSON.parse(
      fs.readFileSync(path.join(APP_ROOT, "package.json"), "utf-8")
    );
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Returns the path of the most recent on-disk `backup-*` directory, or
 * `null` if BACKUP_DIR is missing or contains none. Used as a fallback
 * when the `latest` convenience symlink is missing or dangling so the
 * UI never lies about backup availability.
 */
function findNewestBackupDir(): string | null {
  const { BACKUP_DIR } = getRoots();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true });
  } catch {
    return null;
  }
  let best: { fullPath: string; mtimeMs: number } | null = null;
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("backup-")) continue;
    const fullPath = path.join(BACKUP_DIR, entry.name);
    try {
      const stat = fs.statSync(fullPath);
      if (!best || stat.mtimeMs > best.mtimeMs) {
        best = { fullPath, mtimeMs: stat.mtimeMs };
      }
    } catch {}
  }
  return best?.fullPath ?? null;
}

function readBackupVersion(backupPath: string): string {
  const versionFile = path.join(backupPath, "VERSION");
  const pkgFile = path.join(backupPath, "package.json");
  if (fs.existsSync(versionFile)) {
    try { return fs.readFileSync(versionFile, "utf-8").trim() || "unknown"; } catch {}
  }
  if (fs.existsSync(pkgFile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
      return pkg.version || "unknown";
    } catch {}
  }
  return "unknown";
}

/**
 * Resolves the active backup directory. Prefers the `latest` symlink
 * when it points at a real directory; otherwise falls back to the
 * newest `backup-*` directory on disk. This guards against the case
 * where `latest` is missing, dangling, or replaced by a non-link, so
 * the UI and rollback flow keep working even after partial failures.
 */
function resolveActiveBackup(): { backupPath: string; viaLatest: boolean } | null {
  const { BACKUP_DIR } = getRoots();
  const latestLink = path.join(BACKUP_DIR, "latest");

  let linkExists = false;
  try {
    fs.lstatSync(latestLink);
    linkExists = true;
  } catch {}

  if (linkExists) {
    try {
      const target = fs.readlinkSync(latestLink);
      const candidate = path.isAbsolute(target)
        ? target
        : path.join(BACKUP_DIR, target);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return { backupPath: candidate, viaLatest: true };
      }
    } catch {}
  }

  const fallback = findNewestBackupDir();
  if (fallback) return { backupPath: fallback, viaLatest: false };
  return null;
}

function getBackupInfo(): { exists: boolean; timestamp?: string; version?: string } {
  const active = resolveActiveBackup();
  if (!active) return { exists: false };
  try {
    const stat = fs.statSync(active.backupPath);
    return {
      exists: true,
      timestamp: stat.mtime.toISOString(),
      version: readBackupVersion(active.backupPath),
    };
  } catch {
    return { exists: false };
  }
}

type ValidateResult =
  | { ok: true }
  | { ok: false; offendingPath: string; reason: string };

/**
 * Walks the extracted ZIP tree and rejects only entries that are
 * actually unsafe:
 *  - any path (file/dir/symlink) whose resolved location escapes the
 *    extract root → path traversal
 *  - a symlink whose target resolves outside the extract root, or whose
 *    target is dangling/unreadable
 *
 * Internal-only symlinks (target stays inside extractDir) are allowed
 * because real release ZIPs that bundle node_modules have many of them
 * (`.bin/*`, workspace package links). The copy step skips symlinks so
 * none of them ever land in the live install — `npm ci` recreates
 * `node_modules/.bin/*` after dependency installation.
 */
function validateExtractedTree(extractDir: string): ValidateResult {
  const root = path.resolve(extractDir);

  const walkAndCheck = (dir: string): ValidateResult => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relForError = path.relative(root, fullPath) || entry.name;

      const resolved = path.resolve(fullPath);
      if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        return {
          ok: false,
          offendingPath: relForError,
          reason: "escapes the archive root (path traversal)",
        };
      }

      if (entry.isSymbolicLink()) {
        let realTarget: string;
        try {
          realTarget = fs.realpathSync(fullPath);
        } catch {
          return {
            ok: false,
            offendingPath: relForError,
            reason: "is a dangling symlink (target does not exist)",
          };
        }
        const realResolved = path.resolve(realTarget);
        if (realResolved !== root && !realResolved.startsWith(root + path.sep)) {
          return {
            ok: false,
            offendingPath: relForError,
            reason: "is a symlink whose target escapes the archive root",
          };
        }
        // Internal symlink — safe. Do NOT recurse through it (would
        // cause infinite loops on circular links and is unnecessary
        // because the real target is also walked when we reach it
        // directly).
        continue;
      }

      if (entry.isDirectory()) {
        const sub = walkAndCheck(fullPath);
        if (!sub.ok) return sub;
      }
    }
    return { ok: true };
  };

  return walkAndCheck(root);
}

function collectTreeStats(root: string): { fileCount: number; dirCount: number; totalSize: number } {
  let fileCount = 0;
  let dirCount = 0;
  let totalSize = 0;
  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        dirCount++;
        walk(fullPath);
      } else if (entry.isFile()) {
        fileCount++;
        try { totalSize += fs.statSync(fullPath).size; } catch {}
      }
    }
  };
  walk(root);
  return { fileCount, dirCount, totalSize };
}

/**
 * Compare two version strings for the upload preview. Returns null when
 * either side cannot be parsed as semver (including the "unknown" sentinel)
 * so callers can skip the downgrade warning rather than misclassify it.
 * Uses node-semver with coercion as a fallback to tolerate near-semver
 * strings like "1.2" or "v1.2.3-build.5".
 */
function compareSemver(a: string, b: string): number | null {
  if (!a || !b || a === "unknown" || b === "unknown") return null;
  const pa = semver.valid(a) ?? semver.valid(semver.coerce(a));
  const pb = semver.valid(b) ?? semver.valid(semver.coerce(b));
  if (!pa || !pb) return null;
  return semver.compare(pa, pb);
}

function collectPaths(dir: string, base: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath);
    if (isProtected(relPath)) continue;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      results.push(relPath);
      results.push(...collectPaths(fullPath, base));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

function syncTree(sourceRoot: string, destRoot: string) {
  const sourcePaths = collectPaths(sourceRoot, sourceRoot);

  for (const relPath of sourcePaths) {
    const srcFull = path.join(sourceRoot, relPath);
    const destFull = path.join(destRoot, relPath);
    const stat = fs.statSync(srcFull);

    if (stat.isDirectory()) {
      if (!fs.existsSync(destFull)) {
        fs.mkdirSync(destFull, { recursive: true });
      }
    } else {
      const destDir = path.dirname(destFull);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcFull, destFull);
    }
  }

  const destPaths = collectPaths(destRoot, destRoot);
  const sourcePathSet = new Set(sourcePaths);

  const dirsToRemove: string[] = [];
  for (const relPath of destPaths) {
    if (sourcePathSet.has(relPath)) continue;

    const destFull = path.join(destRoot, relPath);
    if (!fs.existsSync(destFull)) continue;

    const stat = fs.statSync(destFull);
    if (stat.isDirectory()) {
      dirsToRemove.push(destFull);
    } else {
      fs.unlinkSync(destFull);
    }
  }

  for (const dir of dirsToRemove.sort((a, b) => b.length - a.length)) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    } catch {}
  }
}

function backupCurrentApp(backupPath: string) {
  const { APP_ROOT } = getRoots();
  fs.mkdirSync(backupPath, { recursive: true });
  const paths = collectPaths(APP_ROOT, APP_ROOT);

  for (const relPath of paths) {
    const src = path.join(APP_ROOT, relPath);
    const dest = path.join(backupPath, relPath);
    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
    } else {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(src, dest);
    }
  }
}

function preserveProtectedSubpaths(): Map<string, string> {
  const { APP_ROOT, TEMP_DIR } = getRoots();
  const saved = new Map<string, string>();
  for (const sub of PROTECTED_SUBPATHS) {
    const fullPath = path.join(APP_ROOT, sub);
    if (fs.existsSync(fullPath)) {
      const tempSave = path.join(TEMP_DIR, `preserved-${sub.replace(/\//g, "_")}-${Date.now()}`);
      if (!fs.existsSync(path.dirname(tempSave))) {
        fs.mkdirSync(path.dirname(tempSave), { recursive: true });
      }
      execFileSync("cp", ["-r", fullPath, tempSave], { timeout: 60000 });
      saved.set(sub, tempSave);
    }
  }
  return saved;
}

function restoreProtectedSubpaths(saved: Map<string, string>) {
  const { APP_ROOT } = getRoots();
  for (const [sub, tempPath] of saved.entries()) {
    const destPath = path.join(APP_ROOT, sub);
    const destParent = path.dirname(destPath);
    if (!fs.existsSync(destParent)) {
      fs.mkdirSync(destParent, { recursive: true });
    }
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true, force: true });
    }
    execFileSync("cp", ["-r", tempPath, destPath], { timeout: 60000 });
    fs.rmSync(tempPath, { recursive: true, force: true });
  }
}

function restoreFromBackup(backupPath: string) {
  const { APP_ROOT } = getRoots();
  const saved = preserveProtectedSubpaths();

  const appEntries = fs.readdirSync(APP_ROOT, { withFileTypes: true });
  for (const entry of appEntries) {
    if (isProtected(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(APP_ROOT, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }

  const backupEntries = fs.readdirSync(backupPath, { withFileTypes: true });
  for (const entry of backupEntries) {
    const src = path.join(backupPath, entry.name);
    const dest = path.join(APP_ROOT, entry.name);
    if (entry.isDirectory()) {
      execFileSync("cp", ["-r", src, dest], { timeout: 60000 });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  restoreProtectedSubpaths(saved);
}

function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number = CMD_TIMEOUT_MS,
  stdinInput?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    let killed = false;
    // Always pipe stdin so we can close it (or write to it) explicitly.
    // Default stdio leaves the child's stdin open-but-empty, which causes
    // interactive tools (e.g. drizzle-kit push) to block forever waiting
    // for a keypress that never comes.
    const proc = spawn("sh", ["-c", command], {
      cwd,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGKILL");
      // Preserve the last lines of output so callers (e.g. the database
      // step) can still extract drizzle prompt text from a hang, not
      // just from a clean non-zero exit.
      const tail = output.slice(-500);
      const suffix = tail ? `. Last output: ${tail}` : "";
      reject(new Error(`Command timed out after ${timeoutMs / 1000}s${suffix}`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    // Feed any provided stdin payload, then close stdin so the child
    // sees EOF immediately and any prompt loop terminates.
    if (proc.stdin) {
      proc.stdin.on("error", () => { /* ignore EPIPE if child exited early */ });
      if (stdinInput && stdinInput.length > 0) {
        try { proc.stdin.write(stdinInput); } catch { /* ignore */ }
      }
      try { proc.stdin.end(); } catch { /* ignore */ }
    }

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed (exit ${code}): ${output.slice(-500)}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

const DB_STEP_TIMEOUT_MS = 120_000;
const DRIZZLE_PROMPT_PATTERNS: RegExp[] = [
  /Is\s+\S+\s+(table|column|enum)\s+created\s+or\s+renamed/i,
  /Do you want to truncate.*table/i,
  /created or renamed from another/i,
  /truncate the table/i,
];

function extractDrizzlePrompt(output: string): string | null {
  if (!output) return null;
  const lines = output.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    for (const pat of DRIZZLE_PROMPT_PATTERNS) {
      if (pat.test(line)) return line;
    }
  }
  return null;
}

async function persistRunStart(data: {
  triggeredBy: string | null;
  triggeredByUsername: string | null;
  fromVersion: string | null;
  toVersion: string | null;
}): Promise<string | null> {
  try {
    const { updateRunRepository } = await import(
      "../repositories/update-run.repository"
    );
    const row = await updateRunRepository.createRun({
      triggeredBy: data.triggeredBy,
      triggeredByUsername: data.triggeredByUsername,
      fromVersion: data.fromVersion,
      toVersion: data.toVersion,
      status: "running",
      finalMessage: null,
    });
    return row.id;
  } catch (err: any) {
    console.warn(
      "[app-update] Failed to persist run start, continuing without history:",
      err?.message || err
    );
    return null;
  }
}

async function persistRunEvent(
  runId: string | null,
  event: { step: string; status: string; message: string; progress?: number }
): Promise<void> {
  if (!runId) return;
  try {
    const { updateRunRepository } = await import(
      "../repositories/update-run.repository"
    );
    await updateRunRepository.appendEvent({
      runId,
      step: event.step,
      status: event.status,
      message: event.message,
      progress: event.progress ?? null,
    });
  } catch (err: any) {
    console.warn(
      "[app-update] Failed to persist run event:",
      err?.message || err
    );
  }
}

async function persistRunFinish(
  runId: string | null,
  status: string,
  finalMessage: string | null
): Promise<void> {
  if (!runId) return;
  try {
    const { updateRunRepository } = await import(
      "../repositories/update-run.repository"
    );
    await updateRunRepository.finalizeRun(runId, status, finalMessage);
  } catch (err: any) {
    console.warn(
      "[app-update] Failed to finalize run:",
      err?.message || err
    );
  }
}

async function loadRuns(limit: number) {
  const { updateRunRepository } = await import(
    "../repositories/update-run.repository"
  );
  return updateRunRepository.listRuns(limit);
}

async function loadLatestRun() {
  const { updateRunRepository } = await import(
    "../repositories/update-run.repository"
  );
  return updateRunRepository.getLatestRunWithEvents();
}

async function loadRunById(id: string) {
  const { updateRunRepository } = await import(
    "../repositories/update-run.repository"
  );
  const run = await updateRunRepository.getRun(id);
  if (!run) return null;
  const events = await updateRunRepository.getEvents(id);
  return { run, events };
}

/**
 * Returns true when pm2 is on PATH on the current host. Synchronous
 * because this is called once per update from the restart tail and the
 * lookup is cheap. Failures (no pm2, exec error) return false so the
 * caller can fall back to "please restart manually".
 */
function isPm2Available(): boolean {
  try {
    execFileSync("which", ["pm2"], { stdio: "ignore", timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget detached restart. The spawned `pm2 restart all`
 * is fully detached from this Node process (its own session, no
 * inherited stdio) and unref'd, so:
 *
 *   1. The current Node process keeps running long enough to flush
 *      the SSE response and close the socket cleanly before pm2
 *      sends SIGINT.
 *   2. pm2's restart of the parent does not also kill the spawned
 *      restarter half-way through (because it's in its own session).
 *
 * Production code must call __deps.dispatchDetachedRestart so tests
 * can spy and assert call ordering vs. persistRunFinish.
 */
function dispatchDetachedRestart(cwd: string): void {
  try {
    const child = spawn("sh", ["-c", "pm2 restart all >/dev/null 2>&1"], {
      cwd,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, NODE_ENV: "production" },
    });
    child.unref();
  } catch (err: any) {
    console.warn(
      "[app-update] dispatchDetachedRestart failed to spawn pm2:",
      err?.message || err,
    );
  }
}

/**
 * Reconcile any update_runs rows left in 'running' state from a
 * previous Node process (e.g. killed mid-stream by pm2 restart during
 * an Application Update). Called once at server boot from server/index.ts.
 *
 * Logs a single line per reconciled row plus a summary line. Swallows
 * all errors so a transient DB issue can never block server startup.
 */
async function reconcileStartupRuns(currentVersion: string): Promise<void> {
  try {
    const { updateRunRepository } = await import(
      "../repositories/update-run.repository"
    );
    const result = await updateRunRepository.reconcileStaleRunningRuns(
      currentVersion,
    );
    if (result.reconciled.length === 0) return;
    for (const row of result.reconciled) {
      console.log(
        `[app-update] Reconciled stale run ${row.id} (target ${row.toVersion ?? "unknown"}, on-disk ${currentVersion}) -> ${row.decided}`,
      );
    }
    console.log(
      `[app-update] Startup reconciler: settled ${result.reconciled.length} stale 'running' update_runs row(s).`,
    );
  } catch (err: any) {
    console.warn(
      "[app-update] Startup reconciler failed (non-fatal):",
      err?.message || err,
    );
  }
}

export { reconcileStartupRuns, getAppVersion };

/**
 * Test seam. Tests replace these (via vi.spyOn(__deps, 'foo')) to avoid
 * running real shell commands or filesystem mutations against the live
 * project tree. Production code paths must call __deps.fn(...) — never
 * the bare local fn — so the spy actually intercepts the call.
 */
export const __deps = {
  runCommand,
  backupCurrentApp,
  syncTree,
  restoreFromBackup,
  persistRunStart,
  persistRunEvent,
  persistRunFinish,
  loadRuns,
  loadLatestRun,
  loadRunById,
  isPm2Available,
  dispatchDetachedRestart,
  runDbPrecheckCleanup: () => runDbPrecheckCleanup(pool),
};

/** Test helper. Resets the in-memory updateLock. Production code must
 * not call this — locking is managed by the handlers themselves. */
export function __resetUpdateLockForTests() {
  updateLock = false;
}

export interface UpdateSSEEvent {
  step: string;
  status: string;
  message: string;
  progress?: number;
  runId?: string;
}

function sendSSE(res: Response, data: UpdateSSEEvent) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function emit(
  res: Response,
  runId: string | null,
  data: UpdateSSEEvent
): Promise<void> {
  const payload: UpdateSSEEvent = runId ? { ...data, runId } : data;
  sendSSE(res, payload);
  try {
    await __deps.persistRunEvent(runId, data);
  } catch {
    /* persistence is best-effort */
  }
}

export const listRuns = async (req: Request, res: Response) => {
  try {
    const limitRaw = parseInt(String(req.query.limit ?? "10"), 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 50)
      : 10;
    const runs = await __deps.loadRuns(limit);
    res.json({ runs });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: `Failed to fetch update runs: ${err.message}` });
  }
};

export const getLatestRun = async (_req: Request, res: Response) => {
  try {
    const result = await __deps.loadLatestRun();
    if (!result) return res.json({ run: null, events: [] });
    res.json(result);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: `Failed to fetch latest run: ${err.message}` });
  }
};

export const getRunById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const result = await __deps.loadRunById(id);
    if (!result) return res.status(404).json({ error: "Run not found" });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch run: ${err.message}` });
  }
};

export const getStatus = (_req: Request, res: Response) => {
  res.json({
    currentVersion: getAppVersion(),
    backup: getBackupInfo(),
    updateInProgress: updateLock,
  });
};

export const uploadZip = async (req: Request, res: Response) => {
  if (updateLock) {
    return res.status(409).json({ error: "An update is already in progress" });
  }

  const { TEMP_DIR } = getRoots();

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No ZIP file uploaded" });
    }

    if (!file.originalname.endsWith(".zip")) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: "Only .zip files are accepted" });
    }

    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const extractDir = path.join(TEMP_DIR, "extracted");
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      const listing = execFileSync("unzip", ["-l", file.path], { timeout: 30000, stdio: ["ignore", "pipe", "ignore"] }).toString();
      const lines = listing.split("\n");
      for (const line of lines) {
        const match = line.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/);
        if (match) {
          const entryPath = match[1].trim();
          if (entryPath.includes("..") || entryPath.startsWith("/")) {
            fs.unlinkSync(file.path);
            fs.rmSync(extractDir, { recursive: true, force: true });
            return res.status(400).json({
              error: "Invalid ZIP: contains path traversal entries. Upload rejected.",
            });
          }
        }
      }
    } catch {
      try { fs.unlinkSync(file.path); } catch {}
      fs.rmSync(extractDir, { recursive: true, force: true });
      return res.status(400).json({ error: "Failed to validate ZIP contents. Ensure it is a valid archive." });
    }

    try {
      execFileSync("unzip", ["-o", file.path, "-d", extractDir], {
        timeout: 120000,
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      fs.rmSync(extractDir, { recursive: true, force: true });
      try { fs.unlinkSync(file.path); } catch {}
      return res.status(400).json({ error: "Failed to extract ZIP file. Ensure it is a valid archive." });
    }

    try { fs.unlinkSync(file.path); } catch {}

    const validation = validateExtractedTree(extractDir);
    if (!validation.ok) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      return res.status(400).json({
        error: `Invalid ZIP: symlink/entry at "${validation.offendingPath}" ${validation.reason}. Re-package without node_modules/ or other symlinked content.`,
      });
    }

    let rootDir = extractDir;
    const entries = fs.readdirSync(extractDir);
    if (
      entries.length === 1 &&
      fs.statSync(path.join(extractDir, entries[0])).isDirectory()
    ) {
      rootDir = path.join(extractDir, entries[0]);
    }

    const hasPkg = fs.existsSync(path.join(rootDir, "package.json"));
    const hasServer = fs.existsSync(path.join(rootDir, "server"));
    const hasClient = fs.existsSync(path.join(rootDir, "client"));

    if (!hasPkg || (!hasServer && !hasClient)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      return res.status(400).json({
        error:
          "Invalid application ZIP: must contain package.json and server/ or client/ directories",
      });
    }

    let newVersion = "unknown";
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(rootDir, "package.json"), "utf-8")
      );
      newVersion = pkg.version || "unknown";
    } catch {}

    const vFile = path.join(rootDir, "VERSION");
    if (fs.existsSync(vFile)) {
      newVersion = fs.readFileSync(vFile, "utf-8").trim() || newVersion;
    }

    const currentVersion = getAppVersion();
    const stats = collectTreeStats(rootDir);
    const topLevel = fs
      .readdirSync(rootDir, { withFileTypes: true })
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort();

    const warnings: Array<{ level: "warning" | "blocker"; message: string }> = [];

    if (!hasServer) {
      warnings.push({ level: "warning", message: "Update package does not contain a server/ directory." });
    }
    if (!hasClient) {
      warnings.push({ level: "warning", message: "Update package does not contain a client/ directory." });
    }

    if (newVersion === "unknown") {
      warnings.push({ level: "blocker", message: "Could not determine new version from package.json or VERSION file." });
    } else if (newVersion === currentVersion) {
      warnings.push({ level: "warning", message: `New version (${newVersion}) is the same as the current version.` });
    } else {
      const cmp = compareSemver(newVersion, currentVersion);
      if (cmp !== null && cmp < 0) {
        warnings.push({ level: "warning", message: `New version (${newVersion}) is older than current (${currentVersion}). This is a downgrade.` });
      }
    }

    const SUSPICIOUS_TOP_LEVEL = [".env", "node_modules", ".git", ".update-backups", ".update-temp", "uploads"];
    const suspicious = topLevel
      .map((e) => e.replace(/\/$/, ""))
      .filter((e) => SUSPICIOUS_TOP_LEVEL.includes(e));
    if (suspicious.length > 0) {
      warnings.push({
        level: "blocker",
        message: `Suspicious top-level entries present in package: ${suspicious.join(", ")}. This looks like a raw development folder rather than a release build.`,
      });
    }

    if (stats.fileCount > 50000) {
      warnings.push({
        level: "warning",
        message: `Package contains ${stats.fileCount} files, which is unusually large.`,
      });
    }

    res.json({
      success: true,
      newVersion,
      currentVersion,
      preview: {
        fileCount: stats.fileCount,
        dirCount: stats.dirCount,
        totalSize: stats.totalSize,
        topLevel,
        hasServer,
        hasClient,
        hasPackageJson: hasPkg,
        warnings,
        hasBlockers: warnings.some((w) => w.level === "blocker"),
      },
    });
  } catch (err: any) {
    const extractDir = path.join(TEMP_DIR, "extracted");
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
};

export const executeUpdate = async (req: Request, res: Response) => {
  if (updateLock) {
    res.status(409).json({ error: "An update is already in progress" });
    return;
  }

  updateLock = true;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  let runId: string | null = null;
  let lastMessage = "";

  const finish = async (
    finalStatus: "success" | "failed" | "rolled_back",
    finalMessage: string
  ) => {
    clearInterval(heartbeat);
    updateLock = false;
    try {
      await __deps.persistRunFinish(runId, finalStatus, finalMessage || lastMessage);
    } catch {
      /* persistence is best-effort */
    }
    res.end();
  };

  const { APP_ROOT, BACKUP_DIR, TEMP_DIR } = getRoots();
  const extractDir = path.join(TEMP_DIR, "extracted");

  const fromVersion = getAppVersion();
  let toVersion: string | null = null;
  if (fs.existsSync(extractDir)) {
    try {
      let probeRoot = extractDir;
      const probeEntries = fs.readdirSync(extractDir);
      if (
        probeEntries.length === 1 &&
        fs.statSync(path.join(extractDir, probeEntries[0])).isDirectory()
      ) {
        probeRoot = path.join(extractDir, probeEntries[0]);
      }
      const vFile = path.join(probeRoot, "VERSION");
      if (fs.existsSync(vFile)) {
        toVersion = fs.readFileSync(vFile, "utf-8").trim() || null;
      } else {
        const pkgFile = path.join(probeRoot, "package.json");
        if (fs.existsSync(pkgFile)) {
          const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
          toVersion = pkg.version || null;
        }
      }
    } catch {}
  }

  const sessionUser = req.user;
  try {
    runId = await __deps.persistRunStart({
      triggeredBy: sessionUser?.id ?? null,
      triggeredByUsername: sessionUser?.username ?? null,
      fromVersion: fromVersion || null,
      toVersion,
    });
  } catch {
    runId = null;
  }

  const sse = async (data: UpdateSSEEvent): Promise<void> => {
    lastMessage = data.message;
    await emit(res, runId, data);
  };

  if (!fs.existsSync(extractDir)) {
    await sse({
      step: "validate",
      status: "error",
      message: "No uploaded update found. Please upload a ZIP file first.",
    });
    await finish("failed", "No uploaded update found.");
    return;
  }

  let rootDir = extractDir;
  const entries = fs.readdirSync(extractDir);
  if (
    entries.length === 1 &&
    fs.statSync(path.join(extractDir, entries[0])).isDirectory()
  ) {
    rootDir = path.join(extractDir, entries[0]);
  }

  if (!fs.existsSync(path.join(rootDir, "package.json"))) {
    await sse({
      step: "validate",
      status: "error",
      message: "Invalid update package: package.json not found.",
    });
    await finish("failed", "Invalid update package: package.json not found.");
    return;
  }

  // Re-evaluate blocker checks server-side so an API caller cannot bypass
  // the disabled "Apply Update" button by hitting /execute directly.
  const stagedTopLevel = fs.readdirSync(rootDir);
  const SUSPICIOUS_TOP_LEVEL_EXEC = [".env", "node_modules", ".git", ".update-backups", ".update-temp", "uploads"];
  const stagedSuspicious = stagedTopLevel.filter((e) => SUSPICIOUS_TOP_LEVEL_EXEC.includes(e));
  if (stagedSuspicious.length > 0) {
    sendSSE(res, {
      step: "validate",
      status: "error",
      message: `Update rejected: package contains suspicious top-level entries (${stagedSuspicious.join(", ")}). Re-build a clean release archive.`,
    });
    finish();
    return;
  }

  let stagedNewVersion = "unknown";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
    stagedNewVersion = pkg.version || "unknown";
  } catch {}
  const stagedVFile = path.join(rootDir, "VERSION");
  if (fs.existsSync(stagedVFile)) {
    stagedNewVersion = fs.readFileSync(stagedVFile, "utf-8").trim() || stagedNewVersion;
  }
  if (stagedNewVersion === "unknown") {
    sendSSE(res, {
      step: "validate",
      status: "error",
      message: "Update rejected: could not determine the new version from package.json or VERSION.",
    });
    finish();
    return;
  }

  const backupName = `backup-${Date.now()}`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    await sse({
      step: "backup",
      status: "running",
      message: "Creating backup of current application...",
      progress: 10,
    });

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    __deps.backupCurrentApp(backupPath);

    // Replace the `latest` convenience symlink idempotently. We use
    // try/catch around unlink (instead of fs.existsSync, which FOLLOWS
    // symlinks and reports a dangling link as "absent") so a stale or
    // broken `latest` from a prior failed run is removed cleanly. If
    // anything still goes wrong we wrap the error with the path so the
    // operator sees `.update-backups/latest` instead of a raw EEXIST.
    const latestLink = path.join(BACKUP_DIR, "latest");
    try {
      try {
        fs.unlinkSync(latestLink);
      } catch (err: any) {
        if (err && err.code !== "ENOENT") throw err;
      }
      fs.symlinkSync(backupPath, latestLink);
    } catch (err: any) {
      const code = err?.code ? `${err.code}: ` : "";
      throw new Error(
        `${code}failed to update backup pointer at ${latestLink}: ${err?.message || err}`,
      );
    }

    await sse({
      step: "backup",
      status: "done",
      message: "Backup created successfully.",
      progress: 20,
    });

    await sse({
      step: "replace",
      status: "running",
      message: "Replacing application code (full sync, protected paths preserved)...",
      progress: 30,
    });

    __deps.syncTree(rootDir, APP_ROOT);

    await sse({
      step: "replace",
      status: "done",
      message: "Application code replaced successfully.",
      progress: 45,
    });

    await sse({
      step: "dependencies",
      status: "running",
      message: "Installing dependencies (fresh reinstall, may take a few minutes)...",
      progress: 50,
    });

    try {
      const nodeModulesPath = path.join(APP_ROOT, "node_modules");
      if (fs.existsSync(nodeModulesPath)) {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }
      await __deps.runCommand("npm install --production=false 2>&1", APP_ROOT);
      await sse({
        step: "dependencies",
        status: "done",
        message: "Dependencies installed successfully.",
        progress: 65,
      });
    } catch (err: any) {
      await sse({
        step: "dependencies",
        status: "error",
        message: `npm install failed: ${err.message.slice(0, 300)}`,
      });
      await rollbackFromBackup(backupPath, res, sse);
      await finish("rolled_back", `npm install failed: ${err.message.slice(0, 300)}`);
      return;
    }

    await sse({
      step: "build",
      status: "running",
      message: "Building application...",
      progress: 70,
    });

    try {
      await __deps.runCommand("npm run build 2>&1", APP_ROOT);
      await sse({
        step: "build",
        status: "done",
        message: "Application built successfully.",
        progress: 80,
      });
    } catch (err: any) {
      await sse({
        step: "build",
        status: "error",
        message: `Build failed: ${err.message.slice(0, 300)}`,
      });
      await rollbackFromBackup(backupPath, res, sse);
      await finish("rolled_back", `Build failed: ${err.message.slice(0, 300)}`);
      return;
    }

    // ────────────────────────────────────────────────────
    // Precheck: clean legacy data BEFORE drizzle-kit push so a
    // dirty database (empty-string FKs, duplicate templates /
    // automation_edges) does not crash the database step. Mirrors
    // the manual `npm run db:upgrade` path so customers who never
    // SSH in can still complete an update on a legacy database.
    // ────────────────────────────────────────────────────
    await sse({
      step: "precheck",
      status: "running",
      message: "Cleaning legacy data before database migration...",
      progress: 82,
    });

    try {
      await __deps.runDbPrecheckCleanup();
      await sse({
        step: "precheck",
        status: "done",
        message: "Legacy data cleanup completed successfully.",
        progress: 84,
      });
    } catch (err: any) {
      const stepName =
        err instanceof DbPrecheckStepError
          ? err.stepDescription
          : "unknown precheck step";
      const detail = (err?.message ?? String(err)).slice(0, 300);
      const fullMsg = `Database precheck failed at "${stepName}": ${detail}`;
      await sse({
        step: "precheck",
        status: "error",
        message: fullMsg.slice(0, 500),
      });
      await rollbackFromBackup(backupPath, res, sse);
      await finish("rolled_back", fullMsg.slice(0, 500));
      return;
    }

    await sse({
      step: "database",
      status: "running",
      message: "Updating database schema...",
      progress: 85,
    });

    try {
      // Feed drizzle-kit a stream of newlines so any interactive prompt
      // (rename-or-create, truncate-or-not, etc.) is auto-answered with
      // its highlighted-by-default safe option. runCommand also closes
      // stdin afterward so the child sees EOF and cannot block forever.
      const dbOutput = await __deps.runCommand(
        "npm run db:push -- --force 2>&1",
        APP_ROOT,
        DB_STEP_TIMEOUT_MS,
        "\n".repeat(64),
      );
      const promptHint = extractDrizzlePrompt(dbOutput);
      await sse({
        step: "database",
        status: "done",
        message: promptHint
          ? `Database schema updated. Drizzle asked: "${promptHint.slice(0, 200)}" (auto-answered with default).`
          : "Database schema updated successfully.",
        progress: 90,
      });
    } catch (err: any) {
      const promptHint = extractDrizzlePrompt(err?.message ?? "");
      const baseMsg = (err?.message ?? "").slice(0, 300);
      const fullMsg = promptHint
        ? `Database migration failed: drizzle prompt "${promptHint.slice(0, 200)}" was not auto-answered. ${baseMsg}`
        : `Database migration failed: ${baseMsg}`;
      await sse({
        step: "database",
        status: "error",
        message: fullMsg.slice(0, 500),
      });
      await rollbackFromBackup(backupPath, res, sse);
      await finish("rolled_back", fullMsg.slice(0, 500));
      return;
    }

    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }

    const oldBackups = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("backup-") && f !== backupName)
      .sort()
      .slice(0, -2);

    for (const old of oldBackups) {
      const oldPath = path.join(BACKUP_DIR, old);
      try {
        if (fs.statSync(oldPath).isDirectory()) {
          fs.rmSync(oldPath, { recursive: true, force: true });
        }
      } catch {}
    }

    // Finalize the run (SSE + DB) BEFORE dispatching pm2 restart so the
    // SIGINT doesn't truncate the persisted state.
    const pm2Available = __deps.isPm2Available();

    await sse({
      step: "restart",
      status: pm2Available ? "done" : "warning",
      message: pm2Available
        ? "Application restart scheduled — pm2 will reload this process momentarily."
        : "pm2 not available on this host — please restart the application manually after the update completes.",
      progress: 98,
    });

    const completeMessage = pm2Available
      ? "Update completed successfully! Application is restarting now — refresh the page in a few seconds."
      : "Update completed successfully! Please restart the application manually (e.g. pm2 restart all).";

    await sse({
      step: "complete",
      status: "done",
      message: completeMessage,
      progress: 100,
    });

    await finish("success", completeMessage);

    if (pm2Available) {
      // Brief delay so the SSE response flushes before pm2 SIGINTs us.
      setTimeout(() => {
        __deps.dispatchDetachedRestart(APP_ROOT);
      }, 500);
    }
  } catch (err: any) {
    await sse({
      step: "error",
      status: "error",
      message: `Update failed: ${err.message}`,
    });

    try {
      await rollbackFromBackup(backupPath, res, sse);
    } catch {}

    await finish("rolled_back", `Update failed: ${err.message}`);
  }
};

type SSEFn = (data: UpdateSSEEvent) => void | Promise<void>;

async function rollbackFromBackup(backupPath: string, res: Response, sse?: SSEFn) {
  const { APP_ROOT } = getRoots();
  const out: SSEFn = sse ?? ((d) => sendSSE(res, d));
  await out({
    step: "rollback",
    status: "running",
    message: "Rolling back to previous version...",
  });

  try {
    if (!fs.existsSync(backupPath)) {
      await out({
        step: "rollback",
        status: "error",
        message: "Backup not found. Manual restoration may be required.",
      });
      return;
    }

    __deps.restoreFromBackup(backupPath);

    await out({
      step: "rollback",
      status: "running",
      message: "Reinstalling dependencies for restored version...",
    });

    try {
      const nodeModulesPath = path.join(APP_ROOT, "node_modules");
      if (fs.existsSync(nodeModulesPath)) {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }
      await __deps.runCommand("npm install --production=false 2>&1", APP_ROOT);
    } catch {
      await out({
        step: "rollback",
        status: "warning",
        message: "Dependency reinstall after rollback encountered issues. Manual npm install may be needed.",
      });
    }

    await out({
      step: "rollback",
      status: "done",
      message: "Rollback completed. Previous version restored. Please restart the application.",
    });
  } catch (err: any) {
    await out({
      step: "rollback",
      status: "error",
      message: `Rollback failed: ${err.message}. Manual restoration may be required from ${backupPath}`,
    });
  }
}

export const manualRollback = async (_req: Request, res: Response) => {
  if (updateLock) {
    return res.status(409).json({ error: "An update is in progress. Cannot rollback now." });
  }

  const { APP_ROOT } = getRoots();

  // Resolve via the same helper used by the status endpoint so a
  // dangling/missing `latest` symlink no longer blocks rollback when
  // real `backup-*` directories still exist on disk.
  const active = resolveActiveBackup();
  if (!active) {
    return res.status(404).json({ error: "No backup available for rollback" });
  }
  const { backupPath, viaLatest } = active;

  updateLock = true;

  try {
    if (!fs.existsSync(backupPath)) {
      updateLock = false;
      return res.status(404).json({ error: "Backup directory not found" });
    }

    __deps.restoreFromBackup(backupPath);

    try {
      const nodeModulesPath = path.join(APP_ROOT, "node_modules");
      if (fs.existsSync(nodeModulesPath)) {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }
      await __deps.runCommand("npm install --production=false 2>&1", APP_ROOT);
    } catch {}

    updateLock = false;
    const restoredVersion = readBackupVersion(backupPath);
    const restoredFrom = path.basename(backupPath);
    const note = viaLatest
      ? ""
      : ` (latest pointer was missing — restored from ${restoredFrom})`;
    res.json({
      success: true,
      message: `Rollback completed. Previous version restored${note}. Please restart the application.`,
      restoredVersion,
      restoredFrom,
    });
  } catch (err: any) {
    updateLock = false;
    res.status(500).json({ error: `Rollback failed: ${err.message}` });
  }
};
