/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

function readVersionFile(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      resolve(__dirname, "..", "..", "VERSION"),
      resolve(process.cwd(), "VERSION"),
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        return readFileSync(p, "utf-8").trim();
      }
    }
    return "3.0.0";
  } catch {
    return "3.0.0";
  }
}

export const DIPLOY_PRODUCT_NAME = "Diploy";
export const DIPLOY_VERSION = readVersionFile();
export const DIPLOY_AUTHOR = "Bisht Technologies Private Limited";
export const DIPLOY_WEBSITE = "https://diploy.in";
export const DIPLOY_SUPPORT_EMAIL = "cs@diploy.in";
export const DIPLOY_SUPPORT_URL = "https://diploy.ticksy.com";
export const DIPLOY_LICENSE = "Envato / CodeCanyon License";

export const DIPLOY_POWERED_BY = `${DIPLOY_PRODUCT_NAME} v${DIPLOY_VERSION}`;
export const DIPLOY_HEADER_KEY = "X-Powered-By";
export const DIPLOY_HEADER_VALUE = DIPLOY_POWERED_BY;

export const DIPLOY_BRAND = {
  name: DIPLOY_PRODUCT_NAME,
  version: DIPLOY_VERSION,
  author: DIPLOY_AUTHOR,
  website: DIPLOY_WEBSITE,
  support: DIPLOY_SUPPORT_EMAIL,
  license: DIPLOY_LICENSE,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
