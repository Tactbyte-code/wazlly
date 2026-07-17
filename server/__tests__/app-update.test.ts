import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import request from "supertest";
import path from "path";
import fs from "fs";
import os from "os";
import AdmZip from "adm-zip";
import { execFileSync } from "child_process";
import { DbPrecheckStepError } from "../db-precheck-cleanup";

let TEST_ROOT: string;

beforeAll(() => {
  TEST_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "app-update-test-"));
  process.env.APP_UPDATE_ROOT = TEST_ROOT;
  fs.writeFileSync(
    path.join(TEST_ROOT, "package.json"),
    JSON.stringify({ name: "host", version: "1.0.0" })
  );
  fs.writeFileSync(path.join(TEST_ROOT, "VERSION"), "1.0.0\n");
  fs.mkdirSync(path.join(TEST_ROOT, "server"));
  fs.writeFileSync(path.join(TEST_ROOT, "server", "stub.js"), "// stub\n");
});

afterAll(() => {
  delete process.env.APP_UPDATE_ROOT;
  if (TEST_ROOT && fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }
});

let currentSession: { user?: { id: string; role: string; username: string; email: string; firstName: string; permissions: any[] } } = {};

async function buildApp(): Promise<Express> {
  const app = express();
  app.use((req, _res, next) => { (req as any).session = currentSession; next(); });

  const { csrfMiddleware } = await import("../middlewares/csrf.middleware");
  const { registerAppUpdateRoutes } = await import("../routes/app-update.routes");

  app.use(csrfMiddleware);
  registerAppUpdateRoutes(app);
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

let app: Express;
let appUpdateController: typeof import("../controllers/app-update.controller");

beforeAll(async () => {
  app = await buildApp();
  appUpdateController = await import("../controllers/app-update.controller");
});

const SUPERADMIN = {
  id: "u-super",
  role: "superadmin",
  username: "super",
  email: "super@example.com",
  firstName: "Super",
  permissions: [],
};
const ADMIN_USER = { ...SUPERADMIN, id: "u-admin", role: "admin" };

async function getCsrf(agent: ReturnType<typeof request.agent>): Promise<string> {
  const res = await agent.get("/api/app-update/status");
  const setCookie = res.headers["set-cookie"];
  const cookies = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
  const csrfLine = cookies.find((c: string) => c.startsWith("csrf_token="));
  if (!csrfLine) throw new Error(`no csrf_token cookie issued; got: ${cookies.join(" | ")}`);
  return decodeURIComponent(csrfLine.split(";")[0].split("=")[1]);
}

function buildHappyPathZip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("package.json", Buffer.from(JSON.stringify({ name: "host", version: "1.1.0" })));
  zip.addFile("VERSION", Buffer.from("1.1.0\n"));
  zip.addFile("server/index.js", Buffer.from("// new server\n"));
  return zip.toBuffer();
}

function tempDir() { return path.join(TEST_ROOT, ".update-temp"); }
function backupsDir() { return path.join(TEST_ROOT, ".update-backups"); }
function extractedDir() { return path.join(tempDir(), "extracted"); }

function listTempFiles(): string[] {
  if (!fs.existsSync(tempDir())) return [];
  return fs.readdirSync(tempDir());
}

beforeEach(() => {
  currentSession = {};
  appUpdateController.__resetUpdateLockForTests();
  for (const dir of [".update-temp", ".update-backups"]) {
    const p = path.join(TEST_ROOT, dir);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  }
  // Default the new precheck step to a no-op for every existing test
  // so they never hit the real database. Tests that specifically
  // exercise the precheck step override this with their own spy.
  vi.spyOn(appUpdateController.__deps, "runDbPrecheckCleanup")
    .mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Auth & role guards (all four endpoints)", () => {
  const cases: Array<{ name: string; method: "get" | "post"; path: string }> = [
    { name: "GET /status",   method: "get",  path: "/api/app-update/status" },
    { name: "POST /upload",  method: "post", path: "/api/app-update/upload" },
    { name: "POST /execute", method: "post", path: "/api/app-update/execute" },
    { name: "POST /rollback", method: "post", path: "/api/app-update/rollback" },
  ];

  for (const c of cases) {
    it(`${c.name} unauthenticated → 401`, async () => {
      currentSession = {};
      const agent = request.agent(app);
      let token = "";
      // mutating endpoints need a CSRF token to get past the CSRF gate so
      // we can prove the auth gate fires next; for GET no token is needed.
      if (c.method === "post") {
        // Even unauthenticated, the CSRF middleware always issues a cookie.
        // But the auth check happens AFTER CSRF, so unauth POST without
        // token → 403, with token → 401. We want the 401 specifically.
        token = await getCsrf(agent);
      }
      const req = c.method === "get"
        ? agent.get(c.path)
        : agent.post(c.path).set("X-CSRF-Token", token);
      const res = await req;
      expect(res.status).toBe(401);
    });

    it(`${c.name} as non-superadmin (admin) → 403`, async () => {
      currentSession = { user: ADMIN_USER };
      const agent = request.agent(app);
      let token = "";
      if (c.method === "post") token = await getCsrf(agent);
      const req = c.method === "get"
        ? agent.get(c.path)
        : agent.post(c.path).set("X-CSRF-Token", token);
      const res = await req;
      expect(res.status).toBe(403);
    });
  }

  it("CSRF: mutating endpoints reject missing X-CSRF-Token with 403 even for superadmin", async () => {
    currentSession = { user: SUPERADMIN };
    for (const p of ["/api/app-update/upload", "/api/app-update/execute", "/api/app-update/rollback"]) {
      const res = await request(app).post(p);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/CSRF/i);
    }
  });
});

describe("GET /status", () => {
  beforeEach(() => { currentSession = { user: SUPERADMIN }; });

  it("reports VERSION file when present", async () => {
    const res = await request(app).get("/api/app-update/status");
    expect(res.status).toBe(200);
    expect(res.body.currentVersion).toBe("1.0.0");
    expect(res.body.backup).toEqual({ exists: false });
    expect(res.body.updateInProgress).toBe(false);
  });

  it("returns newest backup-* directory when `latest` symlink is missing entirely (Task #145)", async () => {
    fs.mkdirSync(backupsDir(), { recursive: true });
    const older = path.join(backupsDir(), "backup-1000");
    const newer = path.join(backupsDir(), "backup-2000");
    fs.mkdirSync(older, { recursive: true });
    fs.writeFileSync(path.join(older, "VERSION"), "0.5.0\n");
    fs.mkdirSync(newer, { recursive: true });
    fs.writeFileSync(path.join(newer, "VERSION"), "0.9.0\n");
    // Force newer mtime on `newer` so the scan picks it deterministically.
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(newer, future, future);

    const res = await request(app).get("/api/app-update/status");
    expect(res.status).toBe(200);
    expect(res.body.backup.exists).toBe(true);
    expect(res.body.backup.version).toBe("0.9.0");
  });

  it("returns newest backup-* directory when `latest` symlink is dangling (Task #145)", async () => {
    fs.mkdirSync(backupsDir(), { recursive: true });
    const real = path.join(backupsDir(), "backup-3000");
    fs.mkdirSync(real, { recursive: true });
    fs.writeFileSync(path.join(real, "VERSION"), "0.7.0\n");
    // Dangling: target does not exist.
    fs.symlinkSync(path.join(backupsDir(), "backup-missing"), path.join(backupsDir(), "latest"));

    const res = await request(app).get("/api/app-update/status");
    expect(res.status).toBe(200);
    expect(res.body.backup.exists).toBe(true);
    expect(res.body.backup.version).toBe("0.7.0");
  });

  it("falls back to package.json version when VERSION is absent", async () => {
    const versionPath = path.join(TEST_ROOT, "VERSION");
    const original = fs.readFileSync(versionPath);
    fs.unlinkSync(versionPath);
    try {
      // Bump package.json to a distinguishable version for this test.
      fs.writeFileSync(
        path.join(TEST_ROOT, "package.json"),
        JSON.stringify({ name: "host", version: "9.9.9" })
      );
      const res = await request(app).get("/api/app-update/status");
      expect(res.status).toBe(200);
      expect(res.body.currentVersion).toBe("9.9.9");
    } finally {
      fs.writeFileSync(versionPath, original);
      fs.writeFileSync(
        path.join(TEST_ROOT, "package.json"),
        JSON.stringify({ name: "host", version: "1.0.0" })
      );
    }
  });
});

describe("Upload validation", () => {
  beforeEach(() => { currentSession = { user: SUPERADMIN }; });

  it("rejects request with no file → 400", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent.post("/api/app-update/upload").set("X-CSRF-Token", token);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No ZIP file/i);
  });

  it("rejects non-.zip extension via multer fileFilter → 400 (route-mapped)", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", Buffer.from("hello"), "bogus.txt");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/zip/i);
    // No residue ZIP file in temp.
    const leftover = listTempFiles().filter((f) => f.endsWith(".txt") || f.endsWith(".zip"));
    expect(leftover).toEqual([]);
  });

  it("rejects ZIP missing package.json → 400 + cleans up extracted/", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const zip = new AdmZip();
    zip.addFile("server/index.js", Buffer.from("// foo"));
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", zip.toBuffer(), "update.zip");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/package\.json/);
    expect(fs.existsSync(extractedDir())).toBe(false);
    // Uploaded ZIP file removed.
    expect(listTempFiles().filter((f) => f.endsWith(".zip"))).toEqual([]);
  });

  it("rejects ZIP missing both server/ and client/ → 400 + cleans up", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({ version: "1.1.0" })));
    zip.addFile("README.md", Buffer.from("readme"));
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", zip.toBuffer(), "update.zip");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/server\/ or client\//);
    expect(fs.existsSync(extractedDir())).toBe(false);
    expect(listTempFiles().filter((f) => f.endsWith(".zip"))).toEqual([]);
  });

  it("rejects ZIP with path-traversal entry → 400 + cleans up", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);

    const stage = fs.mkdtempSync(path.join(os.tmpdir(), "trav-"));
    fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify({ version: "1.1.0" }));
    fs.writeFileSync(path.join(stage, "evil.txt"), "pwn");
    const zipPath = path.join(stage, "trav.zip");
    execFileSync("zip", [zipPath, "package.json"], { cwd: stage });
    execFileSync("zip", ["-g", zipPath, "../" + path.basename(stage) + "/evil.txt"], { cwd: stage });

    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", fs.readFileSync(zipPath), "update.zip");
    fs.rmSync(stage, { recursive: true, force: true });

    expect(res.status).toBe(400);
    // Defense in depth: rejected by the listing check ("traversal") OR by
    // unzip itself refusing to extract path entries containing ".." (the
    // controller surfaces the latter as "Failed to extract"/"validate").
    expect(res.body.error).toMatch(/traversal|extract|validate/i);
    expect(fs.existsSync(extractedDir())).toBe(false);
    expect(listTempFiles().filter((f) => f.endsWith(".zip"))).toEqual([]);
  });

  it("rejects ZIP containing a symlink that ESCAPES the archive root → 400 + names offending path", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);

    const stage = fs.mkdtempSync(path.join(os.tmpdir(), "syml-"));
    fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify({ version: "1.1.0" }));
    fs.mkdirSync(path.join(stage, "server"));
    fs.writeFileSync(path.join(stage, "server", "index.js"), "");
    fs.symlinkSync("/etc/passwd", path.join(stage, "evil-link"));
    const zipPath = path.join(stage, "syml.zip");
    execFileSync("zip", ["-y", "-r", zipPath, "."], { cwd: stage });

    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", fs.readFileSync(zipPath), "update.zip");
    fs.rmSync(stage, { recursive: true, force: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/symlink/i);
    expect(res.body.error).toMatch(/evil-link/);
    expect(res.body.error).toMatch(/escapes/i);
    expect(fs.existsSync(extractedDir())).toBe(false);
    expect(listTempFiles().filter((f) => f.endsWith(".zip"))).toEqual([]);
  });

  it("ACCEPTS ZIP containing only INTERNAL symlinks (e.g. node_modules/.bin/*) → 200", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);

    // Build a tree that mirrors a real release ZIP with bundled
    // node_modules: a .bin/foo entry that links to ../foo/bin.js. The
    // symlink target stays inside the archive root, so validation must
    // allow it.
    const stage = fs.mkdtempSync(path.join(os.tmpdir(), "syml-ok-"));
    fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify({ version: "1.1.0" }));
    fs.mkdirSync(path.join(stage, "server"));
    fs.writeFileSync(path.join(stage, "server", "index.js"), "// new\n");
    fs.mkdirSync(path.join(stage, "node_modules", "foo"), { recursive: true });
    fs.writeFileSync(path.join(stage, "node_modules", "foo", "bin.js"), "#!/usr/bin/env node\n");
    fs.mkdirSync(path.join(stage, "node_modules", ".bin"), { recursive: true });
    fs.symlinkSync("../foo/bin.js", path.join(stage, "node_modules", ".bin", "foo"));

    const zipPath = path.join(stage, "ok.zip");
    execFileSync("zip", ["-y", "-r", zipPath, "."], { cwd: stage });

    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", fs.readFileSync(zipPath), "update.zip");
    fs.rmSync(stage, { recursive: true, force: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Extracted dir kept for execute to consume.
    expect(fs.existsSync(extractedDir())).toBe(true);
  });

  it("rejects ZIP containing a DANGLING symlink → 400 + names offending path", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);

    const stage = fs.mkdtempSync(path.join(os.tmpdir(), "syml-dangling-"));
    fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify({ version: "1.1.0" }));
    fs.mkdirSync(path.join(stage, "server"));
    fs.writeFileSync(path.join(stage, "server", "index.js"), "");
    // Relative link to a sibling that doesn't exist — stays "inside" the
    // archive lexically but realpath() throws.
    fs.symlinkSync("./does-not-exist.js", path.join(stage, "broken-link"));

    const zipPath = path.join(stage, "dangling.zip");
    execFileSync("zip", ["-y", "-r", zipPath, "."], { cwd: stage });

    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", fs.readFileSync(zipPath), "update.zip");
    fs.rmSync(stage, { recursive: true, force: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dangling/i);
    expect(res.body.error).toMatch(/broken-link/);
    expect(fs.existsSync(extractedDir())).toBe(false);
    expect(listTempFiles().filter((f) => f.endsWith(".zip"))).toEqual([]);
  });

  it("rejects garbage (non-archive) bytes → 400 + cleans up", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", Buffer.from("this is not a zip file at all"), "update.zip");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid archive|extract|validate/i);
    expect(fs.existsSync(extractedDir())).toBe(false);
    expect(listTempFiles().filter((f) => f.endsWith(".zip"))).toEqual([]);
  });

  it("rejects upload while another update is in progress → 409", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);

    // Stage extracted dir so executeUpdate proceeds past the early check.
    fs.mkdirSync(extractedDir(), { recursive: true });
    fs.writeFileSync(path.join(extractedDir(), "package.json"), JSON.stringify({ version: "1.1.0" }));

    let resolveCmd: (v: string) => void = () => {};
    const cmdPromise = new Promise<string>((r) => { resolveCmd = r; });
    vi.spyOn(appUpdateController.__deps, "runCommand").mockReturnValue(cmdPromise as any);
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});

    const execPromise = streamExecute(agent, token);
    await new Promise((r) => setTimeout(r, 300));

    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", buildHappyPathZip(), "update.zip");
    expect(res.status).toBe(409);

    resolveCmd("ok");
    try { await execPromise; } catch {}
  });

  it("happy path: returns success + parses VERSION file + cleans uploaded ZIP", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", buildHappyPathZip(), "update.zip");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newVersion).toBe("1.1.0");
    expect(res.body.currentVersion).toBe("1.0.0");
    // Extracted dir kept for execute to consume; uploaded ZIP file removed.
    expect(fs.existsSync(extractedDir())).toBe(true);
    expect(listTempFiles().filter((f) => f.endsWith(".zip"))).toEqual([]);
  });
});

describe("Upload preview", () => {
  beforeEach(() => { currentSession = { user: SUPERADMIN }; });

  it("happy path returns a preview summary with file count, top-level layout, and no blockers", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", buildHappyPathZip(), "update.zip");
    expect(res.status).toBe(200);
    expect(res.body.preview).toBeDefined();
    const p = res.body.preview;
    expect(p.fileCount).toBeGreaterThanOrEqual(3);
    expect(p.hasPackageJson).toBe(true);
    expect(p.hasServer).toBe(true);
    expect(p.hasClient).toBe(false);
    expect(p.topLevel).toEqual(expect.arrayContaining(["package.json", "VERSION", "server/"]));
    expect(p.hasBlockers).toBe(false);
    // Missing client/ should produce a warning (not a blocker).
    expect(p.warnings.some((w: any) => w.level === "warning" && /client\//.test(w.message))).toBe(true);
  });

  it("flags downgrade as a warning (not a blocker)", async () => {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({ name: "host", version: "0.5.0" })));
    zip.addFile("VERSION", Buffer.from("0.5.0\n"));
    zip.addFile("server/index.js", Buffer.from("// older\n"));
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", zip.toBuffer(), "update.zip");
    expect(res.status).toBe(200);
    const p = res.body.preview;
    expect(p.hasBlockers).toBe(false);
    expect(p.warnings.some((w: any) => /downgrade/i.test(w.message) && w.level === "warning")).toBe(true);
  });

  it("flags same version as a warning", async () => {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({ name: "host", version: "1.0.0" })));
    zip.addFile("VERSION", Buffer.from("1.0.0\n"));
    zip.addFile("server/index.js", Buffer.from("// same\n"));
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", zip.toBuffer(), "update.zip");
    expect(res.status).toBe(200);
    const p = res.body.preview;
    expect(p.warnings.some((w: any) => /same as the current/i.test(w.message))).toBe(true);
  });

  it("flags suspicious top-level entries (.env, node_modules) as blockers and disables apply", async () => {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({ name: "host", version: "1.1.0" })));
    zip.addFile("VERSION", Buffer.from("1.1.0\n"));
    zip.addFile("server/index.js", Buffer.from("// new\n"));
    zip.addFile(".env", Buffer.from("SECRET=1\n"));
    zip.addFile("node_modules/foo/package.json", Buffer.from("{}"));
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", zip.toBuffer(), "update.zip");
    expect(res.status).toBe(200);
    const p = res.body.preview;
    expect(p.hasBlockers).toBe(true);
    const blocker = p.warnings.find((w: any) => w.level === "blocker");
    expect(blocker).toBeTruthy();
    expect(blocker.message).toMatch(/\.env/);
    expect(blocker.message).toMatch(/node_modules/);
  });

  it("does not emit a downgrade warning when the current version is unknown/non-semver", async () => {
    const versionPath = path.join(TEST_ROOT, "VERSION");
    const original = fs.readFileSync(versionPath);
    const pkgPath = path.join(TEST_ROOT, "package.json");
    const originalPkg = fs.readFileSync(pkgPath);
    fs.unlinkSync(versionPath);
    fs.writeFileSync(pkgPath, JSON.stringify({ name: "host" })); // no version => "unknown"
    try {
      const zip = new AdmZip();
      zip.addFile("package.json", Buffer.from(JSON.stringify({ name: "host", version: "0.1.0" })));
      zip.addFile("VERSION", Buffer.from("0.1.0\n"));
      zip.addFile("server/index.js", Buffer.from("// new\n"));
      const agent = request.agent(app);
      const token = await getCsrf(agent);
      const res = await agent
        .post("/api/app-update/upload")
        .set("X-CSRF-Token", token)
        .attach("zipFile", zip.toBuffer(), "update.zip");
      expect(res.status).toBe(200);
      const p = res.body.preview;
      // Must NOT misclassify as a downgrade just because current is unknown.
      expect(p.warnings.some((w: any) => /downgrade/i.test(w.message))).toBe(false);
    } finally {
      fs.writeFileSync(versionPath, original);
      fs.writeFileSync(pkgPath, originalPkg);
    }
  });

  it("flags missing version (no package.json version, no VERSION file) as a blocker", async () => {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({ name: "host" })));
    zip.addFile("server/index.js", Buffer.from("// new\n"));
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent
      .post("/api/app-update/upload")
      .set("X-CSRF-Token", token)
      .attach("zipFile", zip.toBuffer(), "update.zip");
    expect(res.status).toBe(200);
    expect(res.body.newVersion).toBe("unknown");
    const p = res.body.preview;
    expect(p.hasBlockers).toBe(true);
    expect(p.warnings.some((w: any) => w.level === "blocker" && /new version/i.test(w.message))).toBe(true);
  });
});

function parseSSE(body: string): Array<{ step: string; status: string; message: string; progress?: number }> {
  const events: any[] = [];
  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try { events.push(JSON.parse(line.slice(6))); } catch {}
  }
  return events;
}

async function streamExecute(agent: ReturnType<typeof request.agent>, token: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    agent
      .post("/api/app-update/execute")
      .set("X-CSRF-Token", token)
      .buffer(true)
      .parse((res, cb) => {
        let buf = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { buf += chunk; });
        res.on("end", () => cb(null, buf));
      })
      .end((err, res) => {
        if (err) return reject(err);
        resolve({ status: res.status, body: (res as any).body || "" });
      });
  });
}

describe("Execute pipeline (mocked)", () => {
  beforeEach(() => {
    currentSession = { user: SUPERADMIN };
    fs.mkdirSync(extractedDir(), { recursive: true });
    fs.writeFileSync(path.join(extractedDir(), "package.json"), JSON.stringify({ version: "1.1.0" }));
    fs.mkdirSync(path.join(extractedDir(), "server"));
    fs.writeFileSync(path.join(extractedDir(), "server", "stub.js"), "// new\n");
  });

  it("rejects execute when staged tree contains suspicious top-level entry (.env) — even though disk was staged directly", async () => {
    fs.writeFileSync(path.join(extractedDir(), ".env"), "SECRET=1\n");
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { status, body } = await streamExecute(agent, token);
    expect(status).toBe(200);
    const events = parseSSE(body);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ step: "validate", status: "error" });
    expect(events[0].message).toMatch(/suspicious/i);
    // Lock released after early validation failure.
    const stat = await agent.get("/api/app-update/status");
    expect(stat.body.updateInProgress).toBe(false);
  });

  it("rejects execute when staged package has no detectable version", async () => {
    fs.writeFileSync(path.join(extractedDir(), "package.json"), JSON.stringify({ name: "host" }));
    if (fs.existsSync(path.join(extractedDir(), "VERSION"))) {
      fs.unlinkSync(path.join(extractedDir(), "VERSION"));
    }
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ step: "validate", status: "error" });
    expect(events[0].message).toMatch(/version/i);
  });

  it("requires prior upload (extracted dir missing) → SSE error", async () => {
    fs.rmSync(extractedDir(), { recursive: true, force: true });
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { status, body } = await streamExecute(agent, token);
    expect(status).toBe(200);
    const events = parseSSE(body);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ step: "validate", status: "error" });
  });

  it("happy execute (pm2 missing): emits steps in strict order with manual-restart message", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      fs.mkdirSync(p, { recursive: true });
      fs.writeFileSync(path.join(p, "VERSION"), "1.0.0\n");
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");
    vi.spyOn(appUpdateController.__deps, "isPm2Available").mockReturnValue(false);
    const detached = vi.spyOn(appUpdateController.__deps, "dispatchDetachedRestart").mockImplementation(() => {});

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);
    const sequence = events.map((e) => `${e.step}:${e.status}`);

    expect(sequence).toEqual([
      "backup:running",
      "backup:done",
      "replace:running",
      "replace:done",
      "dependencies:running",
      "dependencies:done",
      "build:running",
      "build:done",
      "precheck:running",
      "precheck:done",
      "database:running",
      "database:done",
      "restart:warning",
      "complete:done",
    ]);

    const completion = events[events.length - 1];
    expect(completion.message).toMatch(/restart the application manually/i);
    expect(completion.progress).toBe(100);

    // No pm2 -> no detached spawn.
    expect(detached).not.toHaveBeenCalled();

    // Lock released after success.
    const status = await agent.get("/api/app-update/status");
    expect(status.body.updateInProgress).toBe(false);
  });

  it("happy execute (pm2 available): emits restart:done + complete:done before dispatching detached restart", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      fs.mkdirSync(p, { recursive: true });
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");
    vi.spyOn(appUpdateController.__deps, "isPm2Available").mockReturnValue(true);
    const detached = vi.spyOn(appUpdateController.__deps, "dispatchDetachedRestart").mockImplementation(() => {});

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);
    const sequence = events.map((e) => `${e.step}:${e.status}`);

    expect(sequence.slice(-2)).toEqual(["restart:done", "complete:done"]);
    const restart = events.find((e) => e.step === "restart")!;
    expect(restart.message).toMatch(/pm2 will reload/i);
    const completion = events[events.length - 1];
    expect(completion.message).toMatch(/Application is restarting/i);
    expect(completion.progress).toBe(100);

    // Detached spawn is scheduled on a 500ms setTimeout after the
    // response closes, so wait briefly before asserting.
    await new Promise((r) => setTimeout(r, 700));
    expect(detached).toHaveBeenCalledTimes(1);
  });

  it("execute succeeds when `latest` already exists as a dangling symlink before the run (Task #145)", async () => {
    fs.mkdirSync(backupsDir(), { recursive: true });
    // Pre-stage a dangling `latest` symlink whose target was never created,
    // mirroring the production state from Task #145.
    fs.symlinkSync(
      path.join(backupsDir(), "backup-never-existed"),
      path.join(backupsDir(), "latest"),
    );

    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      fs.mkdirSync(p, { recursive: true });
      fs.writeFileSync(path.join(p, "VERSION"), "1.0.0\n");
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");
    vi.spyOn(appUpdateController.__deps, "isPm2Available").mockReturnValue(false);

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);

    // No EEXIST: backup step completes and the pipeline finishes.
    const backupErr = events.find((e) => e.step === "backup" && e.status === "error");
    expect(backupErr).toBeUndefined();
    expect(events.find((e) => e.step === "backup" && e.status === "done")).toBeTruthy();
    expect(events[events.length - 1]).toMatchObject({ step: "complete", status: "done" });

    // `latest` now points at a real, existing backup directory.
    const latestLink = path.join(backupsDir(), "latest");
    const target = fs.readlinkSync(latestLink);
    const resolved = path.isAbsolute(target) ? target : path.join(backupsDir(), target);
    expect(fs.existsSync(resolved)).toBe(true);
    expect(fs.statSync(resolved).isDirectory()).toBe(true);
  });

  it("npm install failure triggers rollback flow (strict prefix), restoreFromBackup called, lock released", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      fs.mkdirSync(p, { recursive: true });
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    const restore = vi.spyOn(appUpdateController.__deps, "restoreFromBackup").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockImplementation(async (cmd: string) => {
      if (cmd.includes("npm install")) throw new Error("ENOSPC");
      return "ok";
    });

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const sequence = parseSSE(body).map((e) => `${e.step}:${e.status}`);

    // Strict prefix: backup→replace then dependencies error then rollback.
    expect(sequence.slice(0, 5)).toEqual([
      "backup:running",
      "backup:done",
      "replace:running",
      "replace:done",
      "dependencies:running",
    ]);
    expect(sequence).toContain("dependencies:error");
    expect(sequence).toContain("rollback:running");
    expect(sequence).toContain("rollback:done");
    expect(restore).toHaveBeenCalled();

    const status = await agent.get("/api/app-update/status");
    expect(status.body.updateInProgress).toBe(false);
  });

  it("concurrent execute → second request gets 409 and lock is released after first completes", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      fs.mkdirSync(p, { recursive: true });
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});

    let resolveCmd: (v: string) => void = () => {};
    const cmdPromise = new Promise<string>((r) => { resolveCmd = r; });
    let calls = 0;
    vi.spyOn(appUpdateController.__deps, "runCommand").mockImplementation(async () => {
      calls++;
      if (calls === 1) return cmdPromise;
      return "ok";
    });

    const agent = request.agent(app);
    const token = await getCsrf(agent);

    const first = streamExecute(agent, token);
    await new Promise((r) => setTimeout(r, 200));

    const second = await agent.post("/api/app-update/execute").set("X-CSRF-Token", token);
    expect(second.status).toBe(409);

    resolveCmd("ok");
    await first;

    const status = await agent.get("/api/app-update/status");
    expect(status.body.updateInProgress).toBe(false);
  });
});

describe("Precheck step (Task #152) — auto-clean legacy data", () => {
  beforeEach(() => {
    currentSession = { user: SUPERADMIN };
    fs.mkdirSync(extractedDir(), { recursive: true });
    fs.writeFileSync(
      path.join(extractedDir(), "package.json"),
      JSON.stringify({ version: "1.1.0" }),
    );
    fs.mkdirSync(path.join(extractedDir(), "server"), { recursive: true });
    fs.writeFileSync(
      path.join(extractedDir(), "server", "stub.js"),
      "// new\n",
    );
  });

  it("invokes runDbPrecheckCleanup once, between build:done and database:running", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation(
      (p: string) => {
        fs.mkdirSync(p, { recursive: true });
      },
    );
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");
    vi.spyOn(appUpdateController.__deps, "isPm2Available").mockReturnValue(false);
    const precheckSpy = vi
      .spyOn(appUpdateController.__deps, "runDbPrecheckCleanup")
      .mockResolvedValue(undefined);

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);
    const sequence = events.map((e) => `${e.step}:${e.status}`);

    expect(precheckSpy).toHaveBeenCalledTimes(1);

    const buildDoneIdx = sequence.indexOf("build:done");
    const precheckRunningIdx = sequence.indexOf("precheck:running");
    const precheckDoneIdx = sequence.indexOf("precheck:done");
    const dbRunningIdx = sequence.indexOf("database:running");
    expect(buildDoneIdx).toBeGreaterThan(-1);
    expect(precheckRunningIdx).toBe(buildDoneIdx + 1);
    expect(precheckDoneIdx).toBe(precheckRunningIdx + 1);
    expect(dbRunningIdx).toBe(precheckDoneIdx + 1);

    const precheckDone = events.find(
      (e) => e.step === "precheck" && e.status === "done",
    )!;
    expect(precheckDone.message).toMatch(/legacy data/i);
  });

  it("precheck failure → emits error naming the failing cleanup step, rolls back, finalizes as rolled_back", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation(
      (p: string) => {
        fs.mkdirSync(p, { recursive: true });
        fs.writeFileSync(path.join(p, "VERSION"), "1.0.0\n");
      },
    );
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    const restore = vi
      .spyOn(appUpdateController.__deps, "restoreFromBackup")
      .mockImplementation(() => {});
    const runCmd = vi
      .spyOn(appUpdateController.__deps, "runCommand")
      .mockResolvedValue("ok");

    vi.spyOn(
      appUpdateController.__deps,
      "runDbPrecheckCleanup",
    ).mockRejectedValue(
      new DbPrecheckStepError(
        "De-duplicate templates by (channel_id, whatsapp_template_id) keeping latest",
        new Error("permission denied for table templates"),
      ),
    );

    vi.spyOn(appUpdateController.__deps, "persistRunStart").mockResolvedValue(
      "run-precheck-fail",
    );
    vi.spyOn(appUpdateController.__deps, "persistRunEvent").mockResolvedValue();
    const finishSpy = vi
      .spyOn(appUpdateController.__deps, "persistRunFinish")
      .mockResolvedValue();

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);
    const sequence = events.map((e) => `${e.step}:${e.status}`);

    const precheckErr = events.find(
      (e) => e.step === "precheck" && e.status === "error",
    )!;
    expect(precheckErr).toBeTruthy();
    // The error message names the failing cleanup step + the underlying cause.
    expect(precheckErr.message).toMatch(/precheck failed/i);
    expect(precheckErr.message).toMatch(/De-duplicate templates/);
    expect(precheckErr.message).toMatch(/permission denied/);

    // Drizzle push was NEVER reached.
    expect(
      runCmd.mock.calls.some((c) => String(c[0]).includes("db:push")),
    ).toBe(false);
    expect(sequence).not.toContain("database:running");

    // Rollback ran, finalize recorded the failure with the same message.
    expect(sequence).toContain("rollback:running");
    expect(sequence).toContain("rollback:done");
    expect(restore).toHaveBeenCalled();
    expect(finishSpy).toHaveBeenCalledWith(
      "run-precheck-fail",
      "rolled_back",
      expect.stringMatching(/precheck failed/i),
    );

    // Lock released so the manual rollback button is reachable.
    const status = await agent.get("/api/app-update/status");
    expect(status.body.updateInProgress).toBe(false);
  });
});

describe("Update run persistence", () => {
  beforeEach(() => {
    currentSession = { user: SUPERADMIN };
    fs.mkdirSync(extractedDir(), { recursive: true });
    fs.writeFileSync(path.join(extractedDir(), "package.json"), JSON.stringify({ version: "1.1.0" }));
  });

  it("happy path: persistRunStart, persistRunEvent (per event), persistRunFinish('success')", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");

    const startSpy = vi.spyOn(appUpdateController.__deps, "persistRunStart")
      .mockResolvedValue("run-abc");
    const eventSpy = vi.spyOn(appUpdateController.__deps, "persistRunEvent")
      .mockResolvedValue();
    const finishSpy = vi.spyOn(appUpdateController.__deps, "persistRunFinish")
      .mockResolvedValue();

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy.mock.calls[0][0]).toMatchObject({
      triggeredByUsername: SUPERADMIN.username,
      toVersion: "1.1.0",
    });
    expect(eventSpy).toHaveBeenCalledTimes(events.length);
    // Event order matches SSE order.
    const persistedSeq = eventSpy.mock.calls.map(
      (c: any[]) => `${c[1].step}:${c[1].status}`,
    );
    const sseSeq = events.map((e) => `${e.step}:${e.status}`);
    expect(persistedSeq).toEqual(sseSeq);
    expect(finishSpy).toHaveBeenCalledTimes(1);
    expect(finishSpy.mock.calls[0]).toEqual([
      "run-abc",
      "success",
      expect.any(String),
    ]);
  });

  it("failure path: persistRunFinish called with 'rolled_back'", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "restoreFromBackup").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockImplementation(async (cmd: string) => {
      if (cmd.includes("npm install")) throw new Error("ENOSPC");
      return "ok";
    });
    vi.spyOn(appUpdateController.__deps, "persistRunStart").mockResolvedValue("run-x");
    vi.spyOn(appUpdateController.__deps, "persistRunEvent").mockResolvedValue();
    const finishSpy = vi.spyOn(appUpdateController.__deps, "persistRunFinish")
      .mockResolvedValue();

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    await streamExecute(agent, token);

    expect(finishSpy).toHaveBeenCalledWith(
      "run-x",
      "rolled_back",
      expect.any(String),
    );
  });

  it("persistence failures do not break the SSE stream", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");
    vi.spyOn(appUpdateController.__deps, "persistRunStart").mockRejectedValue(new Error("db down"));
    vi.spyOn(appUpdateController.__deps, "persistRunEvent").mockRejectedValue(new Error("db down"));
    vi.spyOn(appUpdateController.__deps, "persistRunFinish").mockRejectedValue(new Error("db down"));

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1].step).toBe("complete");
  });
});

describe("Update run history endpoints", () => {
  beforeEach(() => { currentSession = { user: SUPERADMIN }; });

  const ANON: any = null;

  it("GET /runs requires auth", async () => {
    currentSession = ANON;
    const res = await request(app).get("/api/app-update/runs");
    expect(res.status).toBe(401);
  });

  it("GET /runs/latest requires auth", async () => {
    currentSession = ANON;
    const res = await request(app).get("/api/app-update/runs/latest");
    expect(res.status).toBe(401);
  });

  it("GET /runs/:id requires auth", async () => {
    currentSession = ANON;
    const res = await request(app).get("/api/app-update/runs/abc");
    expect(res.status).toBe(401);
  });

  it("GET /runs returns list (limit clamped to 50)", async () => {
    const spy = vi.spyOn(appUpdateController.__deps, "loadRuns")
      .mockResolvedValue([{ id: "r1" } as any, { id: "r2" } as any]);
    const res = await request(app).get("/api/app-update/runs?limit=999");
    expect(res.status).toBe(200);
    expect(res.body.runs).toHaveLength(2);
    expect(spy).toHaveBeenCalledWith(50);
  });

  it("GET /runs/latest returns null shape when nothing persisted", async () => {
    vi.spyOn(appUpdateController.__deps, "loadLatestRun").mockResolvedValue(null);
    const res = await request(app).get("/api/app-update/runs/latest");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ run: null, events: [] });
  });

  it("GET /runs/latest returns run + events when present", async () => {
    vi.spyOn(appUpdateController.__deps, "loadLatestRun").mockResolvedValue({
      run: { id: "r1", status: "success" } as any,
      events: [{ id: 1, step: "backup", status: "done" } as any],
    });
    const res = await request(app).get("/api/app-update/runs/latest");
    expect(res.status).toBe(200);
    expect(res.body.run.id).toBe("r1");
    expect(res.body.events).toHaveLength(1);
  });

  it("GET /runs/:id returns 404 when missing", async () => {
    vi.spyOn(appUpdateController.__deps, "loadRunById").mockResolvedValue(null);
    const res = await request(app).get("/api/app-update/runs/missing");
    expect(res.status).toBe(404);
  });

  it("GET /runs/:id returns run + events", async () => {
    vi.spyOn(appUpdateController.__deps, "loadRunById").mockResolvedValue({
      run: { id: "r2" } as any,
      events: [{ id: 1, step: "validate", status: "done" } as any],
    });
    const res = await request(app).get("/api/app-update/runs/r2");
    expect(res.status).toBe(200);
    expect(res.body.run.id).toBe("r2");
    expect(res.body.events[0].step).toBe("validate");
  });
});

describe("Manual rollback", () => {
  beforeEach(() => { currentSession = { user: SUPERADMIN }; });

  it("returns 404 when no backup exists", async () => {
    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent.post("/api/app-update/rollback").set("X-CSRF-Token", token);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No backup/i);
  });

  it("succeeds when a backup is present and reports restored version", async () => {
    fs.mkdirSync(backupsDir(), { recursive: true });
    const backupDir = path.join(backupsDir(), "backup-test");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, "VERSION"), "0.9.0\n");
    fs.symlinkSync(backupDir, path.join(backupsDir(), "latest"));

    const restore = vi.spyOn(appUpdateController.__deps, "restoreFromBackup").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent.post("/api/app-update/rollback").set("X-CSRF-Token", token);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.restoredVersion).toBe("0.9.0");
    expect(restore).toHaveBeenCalledWith(backupDir);

    const status = await agent.get("/api/app-update/status");
    expect(status.body.updateInProgress).toBe(false);
  });

  it("succeeds with newest backup-* directory when `latest` is dangling (Task #145)", async () => {
    fs.mkdirSync(backupsDir(), { recursive: true });
    const older = path.join(backupsDir(), "backup-100");
    const newer = path.join(backupsDir(), "backup-200");
    fs.mkdirSync(older, { recursive: true });
    fs.writeFileSync(path.join(older, "VERSION"), "0.5.0\n");
    fs.mkdirSync(newer, { recursive: true });
    fs.writeFileSync(path.join(newer, "VERSION"), "0.8.0\n");
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(newer, future, future);
    // Dangling `latest` — target was never created.
    fs.symlinkSync(path.join(backupsDir(), "backup-missing"), path.join(backupsDir(), "latest"));

    const restore = vi.spyOn(appUpdateController.__deps, "restoreFromBackup").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const res = await agent.post("/api/app-update/rollback").set("X-CSRF-Token", token);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.restoredVersion).toBe("0.8.0");
    expect(res.body.restoredFrom).toBe("backup-200");
    expect(res.body.message).toMatch(/latest pointer was missing/i);
    expect(restore).toHaveBeenCalledWith(newer);
  });

  it("returns 409 when rollback called while update in progress", async () => {
    fs.mkdirSync(extractedDir(), { recursive: true });
    fs.writeFileSync(path.join(extractedDir(), "package.json"), JSON.stringify({ version: "1.1.0" }));
    fs.mkdirSync(backupsDir(), { recursive: true });
    const backupDir = path.join(backupsDir(), "backup-test2");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.symlinkSync(backupDir, path.join(backupsDir(), "latest"));

    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    let resolveCmd: (v: string) => void = () => {};
    const cmdPromise = new Promise<string>((r) => { resolveCmd = r; });
    vi.spyOn(appUpdateController.__deps, "runCommand").mockReturnValue(cmdPromise as any);

    const agent = request.agent(app);
    const token = await getCsrf(agent);

    const exec = streamExecute(agent, token);
    await new Promise((r) => setTimeout(r, 200));

    const res = await agent.post("/api/app-update/rollback").set("X-CSRF-Token", token);
    expect(res.status).toBe(409);

    resolveCmd("ok");
    await exec;
  });
});

describe("Restart finalisation ordering (Task #100)", () => {
  beforeEach(() => {
    currentSession = { user: SUPERADMIN };
    fs.mkdirSync(extractedDir(), { recursive: true });
    fs.writeFileSync(
      path.join(extractedDir(), "package.json"),
      JSON.stringify({ version: "1.1.0" }),
    );
  });

  it("persistRunFinish('success', ...) is called BEFORE dispatchDetachedRestart", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");
    vi.spyOn(appUpdateController.__deps, "isPm2Available").mockReturnValue(true);

    const order: string[] = [];
    vi.spyOn(appUpdateController.__deps, "persistRunStart").mockResolvedValue("run-ord");
    vi.spyOn(appUpdateController.__deps, "persistRunEvent").mockResolvedValue();
    vi.spyOn(appUpdateController.__deps, "persistRunFinish").mockImplementation(async (_id, status) => {
      order.push(`finish:${status}`);
    });
    vi.spyOn(appUpdateController.__deps, "dispatchDetachedRestart").mockImplementation(() => {
      order.push("restart");
    });

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    await streamExecute(agent, token);

    // Wait for the 500ms delayed detached restart to fire.
    await new Promise((r) => setTimeout(r, 700));

    expect(order).toEqual(["finish:success", "restart"]);
  });

  it("dispatchDetachedRestart is invoked exactly once with the app root", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockResolvedValue("ok");
    vi.spyOn(appUpdateController.__deps, "isPm2Available").mockReturnValue(true);
    const detached = vi.spyOn(appUpdateController.__deps, "dispatchDetachedRestart").mockImplementation(() => {});

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    await streamExecute(agent, token);
    await new Promise((r) => setTimeout(r, 700));

    expect(detached).toHaveBeenCalledTimes(1);
    expect(detached.mock.calls[0][0]).toBe(TEST_ROOT);
  });
});

describe("Startup reconciler (Task #100)", () => {
  it("marks stale 'running' rows as 'success' when on-disk VERSION matches the run target", async () => {
    const updates: Array<{ id: string; status: string; finalMessage: string | null }> = [];
    const stale = [
      { id: "r-match", toVersion: "2.0.0", status: "running" },
      { id: "r-mismatch", toVersion: "9.9.9", status: "running" },
    ];

    const fakeRepo = {
      reconcileStaleRunningRuns: async (currentVersion: string) => {
        const reconciled: Array<{ id: string; toVersion: string | null; decided: "success" | "interrupted" }> = [];
        for (const row of stale) {
          const versionsMatch = row.toVersion.trim() === currentVersion.trim();
          const decided: "success" | "interrupted" = versionsMatch ? "success" : "interrupted";
          updates.push({
            id: row.id,
            status: decided,
            finalMessage: versionsMatch ? "match" : "mismatch",
          });
          reconciled.push({ id: row.id, toVersion: row.toVersion, decided });
        }
        return { reconciled };
      },
    };

    vi.doMock("../repositories/update-run.repository", () => ({
      updateRunRepository: fakeRepo,
    }));

    // Re-import controller so the dynamic import inside reconcileStartupRuns
    // picks up the mocked repository.
    vi.resetModules();
    const fresh = await import("../controllers/app-update.controller");
    await fresh.reconcileStartupRuns("2.0.0");

    expect(updates).toEqual([
      { id: "r-match", status: "success", finalMessage: "match" },
      { id: "r-mismatch", status: "interrupted", finalMessage: "mismatch" },
    ]);

    vi.doUnmock("../repositories/update-run.repository");
    vi.resetModules();
    // Re-pin the module-level appUpdateController binding for any
    // subsequent suites that might run in the same file.
    appUpdateController = await import("../controllers/app-update.controller");
  });

  it("repository.reconcileStaleRunningRuns: matches -> success, mismatches -> interrupted", async () => {
    // Direct unit test of the repository method using a hand-rolled
    // db stub that records SQL calls. This avoids needing a real
    // PostgreSQL connection in the test environment.
    const recorded: Array<{ kind: "select" | "update"; payload?: any }> = [];
    const stale = [
      { id: "a", toVersion: "3.0.0", status: "running" },
      { id: "b", toVersion: "1.0.0", status: "running" },
      { id: "c", toVersion: null,    status: "running" },
    ];

    const dbStub = {
      select: () => ({
        from: () => ({
          where: async () => {
            recorded.push({ kind: "select" });
            return stale;
          },
        }),
      }),
      update: () => ({
        set: (payload: any) => ({
          where: () => ({
            returning: async () => {
              recorded.push({ kind: "update", payload });
              return [{ id: "ok" }];
            },
          }),
        }),
      }),
    };

    vi.doMock("../db", () => ({ db: dbStub }));
    vi.resetModules();
    const repoMod = await import("../repositories/update-run.repository");
    const result = await repoMod.updateRunRepository.reconcileStaleRunningRuns("3.0.0");

    expect(result.reconciled).toEqual([
      { id: "a", toVersion: "3.0.0", decided: "success" },
      { id: "b", toVersion: "1.0.0", decided: "interrupted" },
      { id: "c", toVersion: null,    decided: "interrupted" },
    ]);
    const updateCalls = recorded.filter((r) => r.kind === "update");
    expect(updateCalls).toHaveLength(3);
    expect(updateCalls[0].payload.status).toBe("success");
    expect(updateCalls[1].payload.status).toBe("interrupted");
    expect(updateCalls[2].payload.status).toBe("interrupted");
    expect(updateCalls[0].payload.finishedAt).toBeInstanceOf(Date);

    vi.doUnmock("../db");
    vi.resetModules();
    appUpdateController = await import("../controllers/app-update.controller");
  });
});

describe("Update log hydration helpers", () => {
  type PersistedEvent = {
    step: string;
    status: string;
    message: string;
    progress: number | null;
  };

  const PIPELINE: Array<{ step: string; running: string; done: string }> = [
    { step: "backup", running: "Creating backup...", done: "Backup created." },
    { step: "replace", running: "Replacing application code...", done: "Application code replaced successfully." },
    { step: "dependencies", running: "Installing dependencies...", done: "Dependencies installed successfully." },
    { step: "build", running: "Building application...", done: "Application built successfully." },
    { step: "database", running: "Updating database schema...", done: "Database schema updated." },
  ];

  function buildSuccessFixture(): PersistedEvent[] {
    const rows: PersistedEvent[] = [];
    let progress = 0;
    for (const s of PIPELINE) {
      progress += 10;
      rows.push({ step: s.step, status: "running", message: s.running, progress });
      progress += 5;
      rows.push({ step: s.step, status: "done", message: s.done, progress });
    }
    rows.push({ step: "restart", status: "done", message: "Application restart scheduled.", progress: 98 });
    rows.push({ step: "complete", status: "done", message: "Update completed successfully!", progress: 100 });
    return rows;
  }

  it("collapses running+done pairs into one settled line per step (success run)", async () => {
    const { hydrateRunLog } = await import("@shared/update-log");
    const result = hydrateRunLog(buildSuccessFixture(), "success");

    // 5 pipeline steps + restart + complete = 7 settled rows.
    expect(result).toHaveLength(7);
    expect(result.every((r) => r.status === "done")).toBe(true);
    expect(result.map((r) => r.step)).toEqual([
      "backup",
      "replace",
      "dependencies",
      "build",
      "database",
      "restart",
      "complete",
    ]);
    // The done message wins (running messages must not leak through).
    expect(result.find((r) => r.step === "replace")?.message).toBe(
      "Application code replaced successfully.",
    );
    expect(result.find((r) => r.step === "dependencies")?.message).toBe(
      "Dependencies installed successfully.",
    );
  });

  it("renders unfinished steps as warnings when the run was interrupted", async () => {
    const { hydrateRunLog } = await import("@shared/update-log");
    // Partial run: backup+replace settled, dependencies started but never
    // reported done before pm2 killed the process.
    const rows: PersistedEvent[] = [
      { step: "backup", status: "running", message: "Creating backup...", progress: 10 },
      { step: "backup", status: "done", message: "Backup created.", progress: 20 },
      { step: "replace", status: "running", message: "Replacing application code...", progress: 30 },
      { step: "replace", status: "done", message: "Application code replaced successfully.", progress: 45 },
      { step: "dependencies", status: "running", message: "Installing dependencies...", progress: 50 },
    ];
    const result = hydrateRunLog(rows, "interrupted");

    expect(result).toHaveLength(3);
    expect(result.find((r) => r.step === "backup")?.status).toBe("done");
    expect(result.find((r) => r.step === "replace")?.status).toBe("done");
    const deps = result.find((r) => r.step === "dependencies")!;
    expect(deps.status).toBe("warning");
    expect(deps.message).toMatch(/run ended as interrupted/);
  });

  it("normalizes unknown statuses to a settled state (no gray fallback icons)", async () => {
    const { hydrateRunLog } = await import("@shared/update-log");
    // Mimic a legacy/unknown status leaking into the persisted rows
    // (the screenshot reproduction had two such rows on the database step).
    const rows: PersistedEvent[] = [
      { step: "database", status: "info", message: "Updating database schema...", progress: 85 },
      { step: "database", status: "info", message: "Database schema updated.", progress: 90 },
    ];

    const success = hydrateRunLog(rows, "success");
    expect(success).toHaveLength(1);
    expect(success[0].status).toBe("done");
    expect(success[0].message).toBe("Database schema updated.");

    const interrupted = hydrateRunLog(rows, "interrupted");
    expect(interrupted).toHaveLength(1);
    expect(interrupted[0].status).toBe("warning");
  });

  it("collapses case-insensitively so legacy mixed-case step names still merge", async () => {
    const { hydrateRunLog } = await import("@shared/update-log");
    const rows: PersistedEvent[] = [
      { step: "Replace", status: "running", message: "Replacing application code...", progress: 30 },
      { step: "replace", status: "done", message: "Application code replaced successfully.", progress: 45 },
    ];
    const result = hydrateRunLog(rows, "success");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("done");
    expect(result[0].message).toBe("Application code replaced successfully.");
  });

  it("never collapses events that have a missing/blank step (defensive)", async () => {
    const { hydrateRunLog } = await import("@shared/update-log");
    const rows: PersistedEvent[] = [
      { step: "", status: "running", message: "Mystery row 1", progress: null },
      { step: "", status: "done", message: "Mystery row 2", progress: null },
    ];
    const result = hydrateRunLog(rows, "success");
    // Both rows preserved (we don't risk merging unrelated entries together
    // just because they share an empty step).
    expect(result).toHaveLength(2);
    // Running gets terminalized to done for a success run.
    expect(result.every((r) => r.status === "done")).toBe(true);
  });
});

describe("Database step hardening (Task #148)", () => {
  beforeEach(async () => {
    currentSession = { user: SUPERADMIN };
    fs.mkdirSync(extractedDir(), { recursive: true });
    fs.writeFileSync(
      path.join(extractedDir(), "package.json"),
      JSON.stringify({ version: "1.1.0" }),
    );
    fs.mkdirSync(path.join(extractedDir(), "server"), { recursive: true });
    fs.writeFileSync(path.join(extractedDir(), "server", "stub.js"), "// new\n");
    // Earlier "Startup reconciler" tests call vi.resetModules() which can
    // leave `appUpdateController` pointing at a fresh module instance
    // while the express app's routes still reference the original. Force
    // a full rebuild so spies on __deps actually intercept the routes'
    // calls in this describe.
    appUpdateController = await import("../controllers/app-update.controller");
    app = await buildApp();
    // Re-pin the precheck no-op to the freshly imported controller so
    // the in-app updater pipeline never touches the real database.
    vi.spyOn(appUpdateController.__deps, "runDbPrecheckCleanup")
      .mockResolvedValue(undefined);
  });

  it("(a) database step calls runCommand with newlines on stdin and a ~2-minute watchdog", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      fs.mkdirSync(p, { recursive: true });
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "isPm2Available").mockReturnValue(false);

    const seenCalls: Array<{ cmd: string; timeoutMs?: number; stdin?: string }> = [];
    vi.spyOn(appUpdateController.__deps, "runCommand").mockImplementation(
      async (cmd: string, _cwd: string, timeoutMs?: number, stdinInput?: string) => {
        seenCalls.push({ cmd, timeoutMs, stdin: stdinInput });
        return "ok";
      },
    );

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);

    // The database step must succeed end-to-end.
    const dbDone = events.find((e) => e.step === "database" && e.status === "done");
    expect(dbDone).toBeTruthy();
    expect(events[events.length - 1]).toMatchObject({ step: "complete", status: "done" });

    // Find the db:push call and assert stdin newlines + ~2-min watchdog.
    const dbCall = seenCalls.find((c) => c.cmd.includes("db:push"));
    expect(dbCall).toBeTruthy();
    expect(dbCall!.stdin).toBeTruthy();
    expect(dbCall!.stdin!.length).toBeGreaterThanOrEqual(8);
    expect(/^\n+$/.test(dbCall!.stdin!)).toBe(true);
    // Step-specific watchdog: 2 minutes (much shorter than the 5-minute default).
    expect(dbCall!.timeoutMs).toBeDefined();
    expect(dbCall!.timeoutMs!).toBeLessThanOrEqual(120_000);
    expect(dbCall!.timeoutMs!).toBeGreaterThanOrEqual(60_000);
  });

  it("(b) shorter database-step watchdog drives the error path → rollback runs and run finalizes", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      fs.mkdirSync(p, { recursive: true });
      fs.writeFileSync(path.join(p, "VERSION"), "1.0.0\n");
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    const restore = vi.spyOn(appUpdateController.__deps, "restoreFromBackup").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockImplementation(
      async (cmd: string, _cwd: string, timeoutMs?: number) => {
        if (cmd.includes("db:push")) {
          // Simulate the watchdog firing. Surface the actual timeout the
          // controller passed in so the assertion below verifies it was
          // the shorter db-specific value (and not the 5-min default).
          throw new Error(`Command timed out after ${(timeoutMs ?? 0) / 1000}s`);
        }
        return "ok";
      },
    );
    const finishSpy = vi.spyOn(appUpdateController.__deps, "persistRunFinish").mockResolvedValue();
    vi.spyOn(appUpdateController.__deps, "persistRunStart").mockResolvedValue("run-db-timeout");
    vi.spyOn(appUpdateController.__deps, "persistRunEvent").mockResolvedValue();

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);
    const sequence = events.map((e) => `${e.step}:${e.status}`);

    const dbErr = events.find((e) => e.step === "database" && e.status === "error")!;
    expect(dbErr).toBeTruthy();
    expect(dbErr.message).toMatch(/timed out after 120s/);

    expect(sequence).toContain("rollback:running");
    expect(sequence).toContain("rollback:done");
    expect(restore).toHaveBeenCalled();

    expect(finishSpy).toHaveBeenCalledWith(
      "run-db-timeout",
      "rolled_back",
      expect.any(String),
    );

    // Lock released so the rollback button is reachable.
    const status = await agent.get("/api/app-update/status");
    expect(status.body.updateInProgress).toBe(false);
  });

  it("(c) drizzle prompt text appears verbatim in the database:error SSE message", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      fs.mkdirSync(p, { recursive: true });
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "restoreFromBackup").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockImplementation(async (cmd: string) => {
      if (cmd.includes("db:push")) {
        throw new Error(
          "Command failed (exit 1): Reading schema...\n" +
          "Is update_run_events table created or renamed from another table?\n" +
          "process exited",
        );
      }
      return "ok";
    });

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);

    const dbErr = events.find((e) => e.step === "database" && e.status === "error")!;
    expect(dbErr).toBeTruthy();
    expect(dbErr.message).toMatch(/drizzle prompt/i);
    expect(dbErr.message).toMatch(/update_run_events/);
    expect(dbErr.message).toMatch(/created or renamed/i);
  });

  it("(c2) database step timeout preserves drizzle prompt text from the partial output", async () => {
    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      fs.mkdirSync(p, { recursive: true });
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "restoreFromBackup").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockImplementation(async (cmd: string) => {
      if (cmd.includes("db:push")) {
        // Simulate the watchdog firing on a hung drizzle push: the
        // partial output (captured before kill) is appended to the
        // timeout error message by runCommand itself. The controller
        // must still extract and surface the prompt line.
        throw new Error(
          "Command timed out after 120s. Last output: Reading schema...\n" +
          "Is update_run_events table created or renamed from another table?\n",
        );
      }
      return "ok";
    });

    const agent = request.agent(app);
    const token = await getCsrf(agent);
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);

    const dbErr = events.find((e) => e.step === "database" && e.status === "error")!;
    expect(dbErr).toBeTruthy();
    expect(dbErr.message).toMatch(/timed out/i);
    expect(dbErr.message).toMatch(/drizzle prompt/i);
    expect(dbErr.message).toMatch(/update_run_events/);
  });

  it("(d) manual rollback reaches a backup after a db-step-timeout finalizes the run as failed", async () => {
    // First, run an execute that times out at the database step and
    // finalizes as rolled_back. The lock must release so the manual
    // rollback button is reachable from the UI right after.
    fs.mkdirSync(backupsDir(), { recursive: true });
    const backupDir = path.join(backupsDir(), "backup-after-timeout");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, "VERSION"), "1.0.0\n");

    vi.spyOn(appUpdateController.__deps, "backupCurrentApp").mockImplementation((p: string) => {
      // Update the backup path created by the run (real impl creates a new
      // dir + symlink; here we just point `latest` at our prepared backup).
      try { fs.symlinkSync(backupDir, path.join(backupsDir(), "latest")); } catch {}
    });
    vi.spyOn(appUpdateController.__deps, "syncTree").mockImplementation(() => {});
    const restore = vi.spyOn(appUpdateController.__deps, "restoreFromBackup").mockImplementation(() => {});
    vi.spyOn(appUpdateController.__deps, "runCommand").mockImplementation(async (cmd: string) => {
      if (cmd.includes("db:push")) {
        throw new Error("Command timed out after 120s");
      }
      return "ok";
    });

    const agent = request.agent(app);
    const token = await getCsrf(agent);

    // Run that fails at the db step.
    const { body } = await streamExecute(agent, token);
    const events = parseSSE(body);
    expect(events.find((e) => e.step === "database" && e.status === "error")).toBeTruthy();

    // Lock released; manual rollback must succeed against the existing backup.
    const status = await agent.get("/api/app-update/status");
    expect(status.body.updateInProgress).toBe(false);
    expect(status.body.backup.exists).toBe(true);

    const rb = await agent.post("/api/app-update/rollback").set("X-CSRF-Token", token);
    expect(rb.status).toBe(200);
    expect(rb.body.success).toBe(true);
    expect(rb.body.restoredVersion).toBe("1.0.0");
    expect(restore).toHaveBeenCalled();
  });
});

