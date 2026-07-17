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

export {
  DIPLOY_PRODUCT_NAME,
  DIPLOY_VERSION,
  DIPLOY_AUTHOR,
  DIPLOY_WEBSITE,
  DIPLOY_SUPPORT_EMAIL,
  DIPLOY_SUPPORT_URL,
  DIPLOY_LICENSE,
  DIPLOY_POWERED_BY,
  DIPLOY_HEADER_KEY,
  DIPLOY_HEADER_VALUE,
  DIPLOY_BRAND,
  HTTP_STATUS,
} from "./constants";

export {
  DiployError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalError,
} from "./errors";

export { DiployResponse } from "./response";
export type { DiployApiResponse } from "./response";

export {
  cleanPhoneNumber,
  formatPhoneNumber,
  normalizePhoneNumber,
  truncateText,
  slugify,
  formatBytes,
  extractTemplateVariables,
} from "./format";

export {
  asyncHandler,
  validateRequired,
  validateCSVRow,
  isValidEmail,
  isValidPhoneNumber,
  sanitizeInput,
} from "./validate";

export { diployLogger } from "./logger";
