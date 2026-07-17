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

import { HTTP_STATUS } from "./constants";

export class DiployError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    code = "DIPLOY_ERROR"
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Object.setPrototypeOf(this, DiployError.prototype);
  }
}

export class BadRequestError extends DiployError {
  constructor(message = "Bad request") {
    super(HTTP_STATUS.BAD_REQUEST, message, true, "BAD_REQUEST");
  }
}

export class UnauthorizedError extends DiployError {
  constructor(message = "Unauthorized") {
    super(HTTP_STATUS.UNAUTHORIZED, message, true, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends DiployError {
  constructor(message = "Forbidden") {
    super(HTTP_STATUS.FORBIDDEN, message, true, "FORBIDDEN");
  }
}

export class NotFoundError extends DiployError {
  constructor(message = "Resource not found") {
    super(HTTP_STATUS.NOT_FOUND, message, true, "NOT_FOUND");
  }
}

export class ConflictError extends DiployError {
  constructor(message = "Resource conflict") {
    super(HTTP_STATUS.CONFLICT, message, true, "CONFLICT");
  }
}

export class ValidationError extends DiployError {
  public readonly errors: Record<string, string[]>;

  constructor(message = "Validation failed", errors: Record<string, string[]> = {}) {
    super(HTTP_STATUS.UNPROCESSABLE, message, true, "VALIDATION_ERROR");
    this.errors = errors;
  }
}

export class RateLimitError extends DiployError {
  constructor(message = "Too many requests") {
    super(HTTP_STATUS.TOO_MANY_REQUESTS, message, true, "RATE_LIMIT");
  }
}

export class InternalError extends DiployError {
  constructor(message = "Internal server error") {
    super(HTTP_STATUS.INTERNAL_ERROR, message, false, "INTERNAL_ERROR");
  }
}
