/**
 * Express Application Assembly with Hardened Security
 * Admin SUN89 — Biro Jasa Management System
 */

import express, { Express, Request, Response } from "express";
import cors from "cors";
import fs from "node:fs";
import { CONFIG } from "./config/env";
import { db } from "./database/db";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import { securityHeaders } from "./middleware/securityHeaders";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { seedDatabase } from "./database/seed";

import { authRouter } from "./routes/authRoutes";
import { orderRouter } from "./routes/orderRoutes";
import { pricingRouter } from "./routes/pricingRoutes";
import { financeRouter } from "./routes/financeRoutes";
import { userRouter } from "./routes/userRoutes";
import { auditRouter } from "./routes/auditRoutes";
import { documentRouter } from "./routes/documentRoutes";

export function createApp(): Express {
  // Initialize Database Seeds if needed
  seedDatabase();

  const app = express();

  // Reverse Proxy & Forwarded Headers Configuration (Milestone 4)
  const trustProxySetting = CONFIG.TRUST_PROXY === "true" ? true
    : CONFIG.TRUST_PROXY === "false" ? false
    : !isNaN(Number(CONFIG.TRUST_PROXY)) ? Number(CONFIG.TRUST_PROXY)
    : CONFIG.TRUST_PROXY;
  app.set("trust proxy", trustProxySetting);

  // 1. Security Headers (Milestone 14)
  app.use(securityHeaders);

  // 2. Hardened CORS Configuration (Milestone 9)
  const allowedOrigins = CONFIG.getAllowedOrigins();
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, test agents, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        return callback(new Error(`CORS Error: Origin '${origin}' is not authorized.`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );

  // 3. Payload size limiting (Milestone 19)
  app.use(express.json({ limit: "10mb" }));
  app.use(requestLogger);

  // 4. Rate Limiting for all API routes (Milestone 15)
  app.use("/api", apiRateLimiter);

  // 5. Health Probes: Liveness & Readiness Endpoints (Section 9)
  // Liveness probe (fast, lightweight process-alive check)
  const livenessHandler = (req: Request, res: Response) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "admin-sun89-api",
      database: "sqlite-connected",
    });
  };
  app.get("/api/health", livenessHandler);
  app.get("/api/health/live", livenessHandler);

  // Readiness probe (checks critical dependencies: DB connectivity, storage directory writability)
  app.get("/api/health/ready", (req: Request, res: Response) => {
    const checks: Record<string, string> = {
      database: "unknown",
      storage: "unknown",
      config: "healthy",
    };
    let isReady = true;

    // 1. Check SQLite database responsiveness
    try {
      const row = db.prepare("SELECT 1 AS alive").get() as { alive?: number };
      if (row && row.alive === 1) {
        checks.database = "healthy";
      } else {
        checks.database = "degraded";
        isReady = false;
      }
    } catch {
      checks.database = "unhealthy";
      isReady = false;
    }

    // 2. Check persistent document upload directory accessibility and writability
    try {
      if (!fs.existsSync(CONFIG.UPLOAD_DIR)) {
        fs.mkdirSync(CONFIG.UPLOAD_DIR, { recursive: true });
      }
      fs.accessSync(CONFIG.UPLOAD_DIR, fs.constants.W_OK);
      checks.storage = "healthy";
    } catch {
      checks.storage = "unhealthy";
      isReady = false;
    }

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
      status: isReady ? "ready" : "not_ready",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Mount Feature Routes
  app.use("/api/auth", authRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/pricing", pricingRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/users", userRouter);
  app.use("/api/audit-logs", auditRouter);
  app.use("/api/documents", documentRouter);

  // 404 handler for unknown routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan.`,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Centralized Error Handler (Milestone 16)
  app.use(errorHandler);

  return app;
}
