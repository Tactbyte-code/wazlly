/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * ============================================================
 *
 * Public-origin auto-detection.
 *
 * On every authenticated HTTP request we observe `req.protocol` +
 * `req.get('host')` (honouring `x-forwarded-*` via Express
 * `trust proxy`) and persist the resulting absolute origin to the
 * singleton `panel_config` row. Persistence is a no-op when the
 * captured origin already matches the in-process cache, so the
 * middleware costs nothing on the hot path after the first request.
 *
 * `resolvePublicOrigin()` returns the persisted origin (trimmed,
 * trailing slash stripped) or `null` when nothing has ever been
 * observed. There is intentionally NO fallback to localhost,
 * an example domain, or any hardcoded constant — the project's
 * standing rule against runtime fallbacks applies here.
 */

import type { Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { panelConfig } from "@shared/schema";

// Augment express-session so we can read req.session.user without `any`
// casts. Mirrors the shape attached to the session in the auth layer.
declare module "express-session" {
  interface SessionData {
    user?: { id: string; role?: string; [key: string]: unknown };
  }
}

let cachedOrigin: string | null = null;
let cacheLoadedFromDb = false;
let warnedAboutMissingOrigin = false;
const isProd = process.env.NODE_ENV === "production";

function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

async function loadFromDb(): Promise<string | null> {
  try {
    const rows = await db
      .select({ publicOrigin: panelConfig.publicOrigin })
      .from(panelConfig)
      .orderBy(sql`created_at DESC`)
      .limit(1);
    return normalizeOrigin(rows[0]?.publicOrigin ?? null);
  } catch (err) {
    console.error("[public-origin] Failed to load persisted origin:", err);
    return null;
  }
}

async function persistOrigin(origin: string): Promise<void> {
  // Atomic single-row upsert. Wrapped in a transaction with a Postgres
  // advisory lock so two concurrent first-writes can't both INSERT and
  // create duplicate panel_config rows. The lock key is an arbitrary
  // 64-bit constant scoped to this operation.
  //
  // Implementation note: an UPDATE-then-conditional-INSERT pattern means
  // we'd need the driver's rowCount, which is not part of Drizzle's typed
  // result. Doing both statements unconditionally — INSERT guarded by
  // NOT EXISTS, then UPDATE — produces the same final state without
  // reading any driver-specific result fields, and the advisory lock
  // serializes concurrent first-writes so we never insert two rows.
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(8472613950174658123)`);
      await tx.execute(sql`
        INSERT INTO panel_config (name, public_origin)
        SELECT 'Your App Name', ${origin}
         WHERE NOT EXISTS (SELECT 1 FROM panel_config)
      `);
      await tx.execute(sql`
        UPDATE panel_config
           SET public_origin = ${origin},
               updated_at    = NOW()
         WHERE id = (
           SELECT id FROM panel_config ORDER BY created_at DESC LIMIT 1
         )
      `);
    });
  } catch (err) {
    console.error("[public-origin] Failed to persist origin:", err);
  }
}

// Strict host allowlist — RFC-ish hostnames + optional port, no userinfo,
// no path, no query. Rejects any Host header that could be used to point
// outbound email links at attacker-controlled domains.
const HOST_ALLOWLIST_RE = /^[a-zA-Z0-9.\-]+(:\d{1,5})?$/;

/**
 * Express middleware — capture the public origin from the real request.
 *
 * MUST be mounted AFTER the session middleware.
 *
 * Trust model:
 *  - Anonymous traffic is rejected (cannot poison via Host header alone).
 *  - Capture runs for every authenticated session, so the persisted
 *    origin self-heals as soon as any logged-in user makes a request.
 *  - Origin is derived from `req.protocol` + `req.get('host')`. We do
 *    NOT read `x-forwarded-host` ourselves; Express's `trust proxy`
 *    setting (configured in server/index.ts) governs how forwarded
 *    headers are honoured. `req.get('host')` preserves the public
 *    port, so installs on non-standard ports (e.g. https://app:8443)
 *    produce correct absolute URLs.
 *  - A strict hostname[:port] allowlist regex with a length cap rejects
 *    any structurally invalid Host value before it reaches the database.
 *  - In production, loopback hosts are skipped so an operator curling
 *    localhost on the production box cannot poison the persisted origin.
 *    In development the loopback skip is intentionally disabled so
 *    `localhost:PORT` is captured for working email links during dev.
 */
// Roles permitted to capture the public origin. Restricted to privileged
// tenant operators so a low-privilege agent who happens to load the panel
// over a stale or attacker-supplied hostname cannot rewrite the persisted
// origin used for outbound notification email links.
const PRIVILEGED_CAPTURE_ROLES = new Set(["admin", "superadmin"]);

export function capturePublicOriginMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const sessionUser = req.session?.user;
  if (!sessionUser) return next();
  const role = typeof sessionUser.role === "string" ? sessionUser.role : "";
  if (!PRIVILEGED_CAPTURE_ROLES.has(role)) return next();

  const proto = req.protocol;
  if (!proto) return next();

  // Host is derived via Express's trusted-proxy machinery — `req.hostname`
  // consults the configured `trust proxy` policy (set in server/index.ts)
  // and, when forwarded headers are honoured, returns ONLY the first
  // trusted value of `x-forwarded-host`. Extra comma-separated hops
  // appended by an untrusted downstream client cannot poison the origin
  // because Express discards them before we ever see the value. When the
  // proxy rewrites Host instead, `req.hostname` falls back to the Host
  // header — also a trusted value under the same policy. We never read
  // `x-forwarded-host` ourselves.
  const hostname = (req.hostname || "").trim();
  if (!hostname) return next();
  // Recover port from the Host header if present so installs on
  // non-standard ports (e.g. https://app:8443) still produce correct
  // absolute URLs. Host comes from Express via the same trust-proxy
  // policy, so the port is sourced from a trusted hop.
  const rawHost = (req.get("host") || "").trim();
  const portMatch = rawHost.match(/:(\d{1,5})$/);
  const isDefaultPort = portMatch
    ? (proto === "http" && portMatch[1] === "80") ||
      (proto === "https" && portMatch[1] === "443")
    : true;
  const host = portMatch && !isDefaultPort
    ? `${hostname}:${portMatch[1]}`
    : hostname;
  if (host.length > 253 || !HOST_ALLOWLIST_RE.test(host)) return next();

  // Production-only loopback skip. An operator curling localhost on the
  // production box should not poison the persisted origin.
  if (isProd) {
    const hostname = host.split(":")[0].toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    ) {
      return next();
    }
  }

  const observed = normalizeOrigin(`${proto}://${host}`);
  if (!observed) return next();

  if (cachedOrigin === observed) return next();

  cachedOrigin = observed;
  warnedAboutMissingOrigin = false;
  void persistOrigin(observed);
  next();
}

/**
 * Returns the captured public origin (e.g. "https://whatsway.diploy.in")
 * or `null` if no real request has ever been observed yet.
 *
 * On `null` we log a single WARN per process so operators can see why
 * notification email buttons are missing on a fresh install.
 */
export async function resolvePublicOriginOLD(): Promise<string | null> {
  if (cachedOrigin) return cachedOrigin;

  if (!cacheLoadedFromDb) {
    cacheLoadedFromDb = true;
    cachedOrigin = await loadFromDb();
    if (cachedOrigin) return cachedOrigin;
  }

  if (!warnedAboutMissingOrigin) {
    warnedAboutMissingOrigin = true;
    console.warn(
      "[public-origin] No public origin captured yet — notification emails " +
        "will omit action buttons until the first authenticated HTTP request " +
        "is observed. This is normal on a fresh install."
    );
  }
  return null;
}




export async function resolvePublicOrigin(): Promise<string | null> {
  const sanitizeOrigin = (origin: string | null): string | null => {
    if (!origin) return null;

    try {
      const url = new URL(origin);

      // Strip internal/private app ports
      if (
        url.port === "3010" ||
        url.port === "3000" ||
        url.port === "5000"
      ) {
        url.port = "";
      }

      return url.toString().replace(/\/+$/, "");
    } catch {
      return normalizeOrigin(origin);
    }
  };

  // Use cached value if available
  if (cachedOrigin) {
    cachedOrigin = sanitizeOrigin(cachedOrigin);
    return cachedOrigin;
  }

  // Load once from DB
  if (!cacheLoadedFromDb) {
    cacheLoadedFromDb = true;

    const dbOrigin = await loadFromDb();
    cachedOrigin = sanitizeOrigin(dbOrigin);

    if (cachedOrigin) {
      return cachedOrigin;
    }
  }

  // Warn once on fresh installs
  if (!warnedAboutMissingOrigin) {
    warnedAboutMissingOrigin = true;

    console.warn(
      "[public-origin] No public origin captured yet — notification emails " +
        "will omit action buttons until the first authenticated HTTP request " +
        "is observed. This is normal on a fresh install."
    );
  }

  return null;
}
