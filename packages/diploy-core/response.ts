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

import type { Response } from "express";
import { HTTP_STATUS, DIPLOY_HEADER_KEY, DIPLOY_HEADER_VALUE } from "./constants";

export interface DiployApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

function setBrandHeader(res: Response): void {
  if (!res.headersSent) {
    res.setHeader(DIPLOY_HEADER_KEY, DIPLOY_HEADER_VALUE);
  }
}

export class DiployResponse {
  static success<T>(res: Response, data?: T, message?: string, statusCode = HTTP_STATUS.OK): Response {
    setBrandHeader(res);
    const body: DiployApiResponse<T> = {
      success: true,
      ...(message && { message }),
      ...(data !== undefined && { data }),
    };
    return res.status(statusCode).json(body);
  }

  static created<T>(res: Response, data?: T, message = "Resource created successfully"): Response {
    return DiployResponse.success(res, data, message, HTTP_STATUS.CREATED);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): Response {
    setBrandHeader(res);
    const totalPages = Math.ceil(total / limit);
    const body: DiployApiResponse<T[]> = {
      success: true,
      ...(message && { message }),
      data,
      meta: { page, limit, total, totalPages },
    };
    return res.status(HTTP_STATUS.OK).json(body);
  }

  static error(
    res: Response,
    message = "An error occurred",
    statusCode = HTTP_STATUS.INTERNAL_ERROR,
    errors?: Record<string, string[]>
  ): Response {
    setBrandHeader(res);
    const body: DiployApiResponse = {
      success: false,
      message,
      ...(errors && { errors }),
    };
    return res.status(statusCode).json(body);
  }

  static noContent(res: Response): Response {
    setBrandHeader(res);
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }
}
