/**
 * Authentication Controller
 * Admin SUN89 — Biro Jasa Management System
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { authService } from "../services/authService";
import { loginRateLimiter } from "../middleware/rateLimiter";

export async function login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // Reset rate limiter for client IP upon successful authentication
    const forwarded = req.headers["x-forwarded-for"];
    const ip = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : Array.isArray(forwarded) ? forwarded[0] : null)
      || req.ip
      || req.socket.remoteAddress
      || "127.0.0.1";
    loginRateLimiter.reset(ip);

    res.status(200).json({
      success: true,
      message: "Login berhasil.",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Belum login." },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = authService.getMe(req.user);
    res.status(200).json({
      success: true,
      message: "Sesi valid.",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
