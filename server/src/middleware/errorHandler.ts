/**
 * Centralized Error Handling Middleware & Production Sanitizer
 * Admin SUN89 — Biro Jasa Management System
 */

import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../config/env";
import { sanitizeUrlForLogging } from "./logger";

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;
  public readonly isApiError = true;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isApiError = err instanceof ApiError || err?.isApiError === true || (err && typeof err.statusCode === "number" && typeof err.code === "string");
  const statusCode = isApiError ? err.statusCode : (err.statusCode || (err.status ? Number(err.status) : 500));
  
  // Always log server-side for troubleshooting (with sanitized URL)
  if (statusCode >= 500) {
    const sanitizedUrl = sanitizeUrlForLogging(req.originalUrl || req.url);
    console.error(`[SUN89 Server Error] [${req.method} ${sanitizedUrl}]:`, err);
  }

  const isProduction = CONFIG.NODE_ENV === "production";
  
  // For 4xx errors, preserve the user-facing message and code
  let code = isApiError ? err.code : (err.code || "VALIDATION_ERROR");
  let message = err.message || "Permintaan tidak dapat diproses.";

  // In production, sanitize 500+ errors to prevent leaking stack traces / internals
  if (statusCode >= 500 && isProduction) {
    code = "INTERNAL_SERVER_ERROR";
    message = "Terjadi kesalahan internal pada server.";
  }

  const responsePayload = {
    success: false,
    error: {
      code,
      message,
      ...(isApiError && err.details && !isProduction ? { details: err.details } : {}),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(responsePayload);
}
