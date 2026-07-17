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

export const isDemoUser = (username?: string) => {
  return username === "demouser" || username === "demoadmin";
};

export const maskValue = (value: string = "") => {
  if (!value) return "";
  if (value.length <= 2) return "*".repeat(value.length);
  return value.slice(0, -1).replace(/./g, "*") + value.slice(-1);
};

export const maskPhone = (phone: string = "") => {
  if (!phone) return "";
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.length <= 4) return "*".repeat(cleaned.length);
  return "*".repeat(cleaned.length - 4) + cleaned.slice(-4);
};

export const maskEmail = (email: string = "") => {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return maskValue(email);
  const local = parts[0];
  if (local.length <= 1) return "*@" + parts[1];
  return local[0] + "*".repeat(local.length - 1) + "@" + parts[1];
};

export const maskName = (name: string = "") => {
  if (!name) return "";
  if (name.length <= 1) return "*";
  return name[0] + "***";
};

export const maskContent = (_content: string = "") => {
  return "*** Hidden ***";
};
