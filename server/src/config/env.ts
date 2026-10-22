/**
 * Backend Environment Configuration & Production Validator
 * Admin SUN89 — Biro Jasa Management System
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

// Automatically load root .env file in Node.js 20+
if (typeof (process as any).loadEnvFile === "function") {
  try {
    (process as any).loadEnvFile();
  } catch {
    // Non-fatal if .env doesn't exist
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Project root is 3 levels up from server/src/config
const DEFAULT_PROJECT_ROOT = path.resolve(__dirname, "../../..");
export const PROJECT_ROOT = process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : DEFAULT_PROJECT_ROOT;

export function resolveConfigPath(configuredPath: string | undefined, defaultRelative: string): string {
  if (!configuredPath || configuredPath.trim() === "") {
    return path.resolve(PROJECT_ROOT, defaultRelative);
  }
  return path.isAbsolute(configuredPath) ? path.resolve(configuredPath) : path.resolve(PROJECT_ROOT, configuredPath);
}

const DEFAULT_DEV_JWT = "sun89-secure-birojasa-secret-key-2026";

export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
  DB_PATH: string;
  CORS_ORIGIN: string;
  UPLOAD_DIR: string;
  BACKUP_DIR?: string;
  MAX_FILE_SIZE_BYTES: number;
  TRUST_PROXY: string | number;
  TICKET_TTL_SECONDS: number;
  RATE_LIMIT_LOGIN_MAX: number;
  RATE_LIMIT_API_MAX: number;
  RATE_LIMIT_UPLOAD_MAX: number;
}

export function validateEnv(env: Partial<EnvConfig> & { getAllowedOrigins?: () => string[] }): void {
  const isProduction = env.NODE_ENV === "production";

  // 1. Port Validation
  const port = env.PORT !== undefined ? Number(env.PORT) : 3001;
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`FATAL CONFIGURATION: Invalid PORT configured: ${env.PORT}. Must be between 1 and 65535.`);
  }

  // 2. Production Secret & Hardening Validation
  if (isProduction) {
    const jwtSecret = env.JWT_SECRET || "";
    if (!jwtSecret || jwtSecret === DEFAULT_DEV_JWT || jwtSecret.length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: In production mode, JWT_SECRET must be explicitly set and be at least 32 characters long."
      );
    }

    // Insecure placeholder check
    const insecurePlaceholders = [
      "sun89-secure-birojasa-secret-key-2026",
      "sun89-change-this-in-production-secret-token-key-2026",
      "change-me-in-production-secret-key-32chars",
      "12345678901234567890123456789012",
    ];
    if (insecurePlaceholders.includes(jwtSecret)) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: Insecure placeholder detected in JWT_SECRET. A unique, high-entropy secret must be provided."
      );
    }

    // CORS Origin validation
    const rawOrigins = env.CORS_ORIGIN || "";
    const origins = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);
    if (origins.length === 0 || origins.includes("*")) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: Wildcard CORS origin ('*') is strictly forbidden with credentialed API access in production."
      );
    }
  }

  // 3. File Size Validation
  const maxBytes = env.MAX_FILE_SIZE_BYTES !== undefined ? Number(env.MAX_FILE_SIZE_BYTES) : 5242880;
  if (isNaN(maxBytes) || maxBytes <= 0 || maxBytes > 52428800) {
    throw new Error("FATAL CONFIGURATION: MAX_FILE_SIZE_BYTES must be a positive integer not exceeding 50MB (52428800).");
  }

  // 4. Ticket TTL Validation
  const ticketTtl = env.TICKET_TTL_SECONDS !== undefined ? Number(env.TICKET_TTL_SECONDS) : 60;
  if (isNaN(ticketTtl) || ticketTtl < 10 || ticketTtl > 300) {
    throw new Error("FATAL CONFIGURATION: TICKET_TTL_SECONDS must be between 10 and 300 seconds.");
  }

  // 5. Upload Directory Validation
  if (env.UPLOAD_DIR !== undefined && (!env.UPLOAD_DIR || typeof env.UPLOAD_DIR !== "string" || env.UPLOAD_DIR.trim() === "")) {
    throw new Error("FATAL CONFIGURATION: UPLOAD_DIR must be a non-empty string path.");
  }

  // 6. Database Path Validation
  if (env.DB_PATH !== undefined && (!env.DB_PATH || typeof env.DB_PATH !== "string" || env.DB_PATH.trim() === "")) {
    throw new Error("FATAL CONFIGURATION: DB_PATH must be a non-empty string path.");
  }

  // 7. Backup Directory Validation
  if (env.BACKUP_DIR !== undefined && (!env.BACKUP_DIR || typeof env.BACKUP_DIR !== "string" || env.BACKUP_DIR.trim() === "")) {
    throw new Error("FATAL CONFIGURATION: BACKUP_DIR must be a non-empty string path.");
  }
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || DEFAULT_DEV_JWT,
  PROJECT_ROOT,
  DB_PATH: resolveConfigPath(process.env.DB_PATH, "server/data/database.sqlite"),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173",
  UPLOAD_DIR: resolveConfigPath(process.env.UPLOAD_DIR, "server/uploads"),
  BACKUP_DIR: resolveConfigPath(process.env.BACKUP_DIR, "server/backups"),
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || "5242880", 10), // 5MB default
  TRUST_PROXY: process.env.TRUST_PROXY || "1",
  TICKET_TTL_SECONDS: parseInt(process.env.TICKET_TTL_SECONDS || "60", 10),
  RATE_LIMIT_LOGIN_MAX: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || "10", 10),
  RATE_LIMIT_API_MAX: parseInt(process.env.RATE_LIMIT_API_MAX || (process.env.NODE_ENV === "production" ? "600" : "5000"), 10),
  RATE_LIMIT_UPLOAD_MAX: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || "30", 10),

  /**
   * Returns list of authorized CORS origins
   */
  getAllowedOrigins(): string[] {
    const raw = this.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173";
    return raw.split(",").map((o) => o.trim()).filter(Boolean);
  },

  /**
   * Fail-fast production environment validation
   */
  validate(): void {
    validateEnv(this);
  },
};

// Validate environment on module load
CONFIG.validate();

