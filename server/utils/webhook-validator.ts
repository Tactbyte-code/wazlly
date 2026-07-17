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

import crypto from "crypto";

export function validateWebhookSignature(
  body: any,
  signature: string | undefined,
  appSecret: string
): boolean {
  if (!signature) {
    return false;
  }

  const elements = signature.split("=");
  const signatureHash = elements[1];
  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(JSON.stringify(body))
    .digest("hex");

  return signatureHash === expectedHash;
}

export function getWebhookVerifyToken(): string {
  return process.env.WEBHOOK_VERIFY_TOKEN || "your_webhook_verify_token";
}
