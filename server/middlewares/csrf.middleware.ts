import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_BYTES = 32;
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const parts = raw.split(";");
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq).trim();
    if (k === name) return decodeURIComponent(p.slice(eq + 1).trim());
  }
  return undefined;
}

function setCsrfCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd && process.env.FORCE_HTTPS !== "false";
  const attrs = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${Math.floor(COOKIE_MAX_AGE_MS / 1000)}`,
    "SameSite=Lax",
  ];
  if (secure) attrs.push("Secure");
  // IMPORTANT: NOT HttpOnly — client JS must read this to echo it back in the
  // X-CSRF-Token header (double-submit cookie pattern).
  const existing = res.getHeader("Set-Cookie");
  const line = attrs.join("; ");
  if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, line]);
  } else if (typeof existing === "string") {
    res.setHeader("Set-Cookie", [existing, line]);
  } else {
    res.setHeader("Set-Cookie", line);
  }
}

function ensureToken(req: Request, res: Response): string {
  let token = readCookie(req, CSRF_COOKIE_NAME);
  if (!token || token.length < 32) {
    token = generateToken();
    setCsrfCookie(res, token);
  }
  return token;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function isExemptPath(path: string): boolean {
  if (path.startsWith("/webhooks/")) return true;
  if (path.startsWith("/webhook/")) return true;
  if (path.startsWith("/api/webhooks")) return true;
  if (path.startsWith("/api/widget/")) return true;
  if (path.startsWith("/api/v1/")) return true;
  if (path === "/api/auth/login") return true;
  if (path === "/api/auth/register") return true;
  if (path === "/api/auth/signup") return true;
  if (path === "/api/auth/forgot-password") return true;
  if (path === "/api/auth/reset-password") return true;
  if (path === "/api/auth/country-data") return true;
  if (path === "/api/auth/request-otp") return true;
  if (path === "/api/auth/verify-otp") return true;
  if (path === "/api/csrf-token") return true;
  // NOTE: /api/brand-settings is NOT exempted — superadmin PUT/POST there
  // is session-authenticated and state-changing, so it must carry CSRF.
  if (path === "/api/version") return true;
  if (path === "/api/health") return true;
  if (path === "/api/languages/enabled") return true;
  return false;
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // Always ensure a CSRF cookie is issued on every request so the client
  // has a token to echo back on the next state-changing call.
  const serverToken = ensureToken(req, res);

  // Only check on API paths.
  if (!req.path.startsWith("/api")) return next();

  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

  if (isExemptPath(req.path)) return next();

  // API-key authenticated requests (public API) go through /api/v1/ (exempt).
  // Session-authenticated requests must submit the CSRF token.
  // Express lowercases request header names, but be defensive in case a
  // future middleware preserves casing.
  const rawHeader = req.headers[CSRF_HEADER_NAME] ?? req.headers["X-CSRF-Token"];
  const headerToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (!headerToken || !timingSafeEqualStr(headerToken, serverToken)) {
    return res.status(403).json({ error: "Invalid or missing CSRF token" });
  }

  next();
}

export function csrfTokenEndpoint(req: Request, res: Response) {
  const token = ensureToken(req, res);
  res.json({ csrfToken: token });
}
