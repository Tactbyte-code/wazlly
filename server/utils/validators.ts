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

import { z } from 'zod';

// Phone number validation - E.164 format
export const phoneNumberSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format'
);

// Clean phone number - removes all non-digits
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.length === 10) {
    // US format
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Validate WhatsApp Template variables
export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/{{(\d+)}}/g) || [];
  const variables: string[] = [];
  
  matches.forEach((match) => {
    const num = parseInt(match.replace('{{', '').replace('}}', ''), 10);
    variables[num - 1] = `Variable ${num}`;
  });
  
  return variables;
}

// Validate CSV data
export function validateCSVRow(row: any, requiredFields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (!row[field] || row[field].toString().trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}