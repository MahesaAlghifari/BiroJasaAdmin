/**
 * HTTP Security Headers Middleware
 * Admin SUN89 — Biro Jasa Management System
 */

import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../config/env";

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Clickjacking protection: only allow same origin frames
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Modern XSS filter directive
  res.setHeader("X-XSS-Protection", "0");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict access to sensitive browser features
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // HSTS: Only apply in production HTTPS environments
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  if (CONFIG.NODE_ENV === "production" && isHttps) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Remove fingerprinting headers
  res.removeHeader("X-Powered-By");

  next();
}
