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

import type { Request, Response, NextFunction } from 'express';
import {
  DiployError,
  asyncHandler as diployAsyncHandler,
  diployLogger,
  DIPLOY_HEADER_KEY,
  DIPLOY_HEADER_VALUE,
} from "@diploy/core";

export const AppError = DiployError;

export function errorHandler(
  err: Error | DiployError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader(DIPLOY_HEADER_KEY, DIPLOY_HEADER_VALUE);

  if (err instanceof DiployError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  diployLogger.error('Unexpected error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
}

export const asyncHandler = diployAsyncHandler;
