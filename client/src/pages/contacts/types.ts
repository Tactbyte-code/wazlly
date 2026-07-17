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

import { type Contact, type InsertContact } from "@shared/schema";

export interface ContactsResponse {
  data: Contact[];
  pagination: {
    page: number;
    limit: number;
    count: number;
    total: number;
    totalPages: number;
  };
}

export interface TemplateVariable {
  type?: "fullName" | "phone" | "custom";
  value?: string;
}

export type TemplateVariables = {
  [key: string]: TemplateVariable;
};

export type { Contact, InsertContact };
