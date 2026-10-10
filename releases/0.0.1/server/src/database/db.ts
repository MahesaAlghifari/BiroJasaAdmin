/**
 * SQLite Database Connection
 * Admin SUN89 — Biro Jasa Management System
 */

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config/env";

const dbDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(CONFIG.DB_PATH);

// Enable foreign keys, WAL mode, and busy timeout for concurrent operations
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

import { initializeSchema } from "./schema";
initializeSchema(db);

let inTransaction = false;

export function runInTransaction<T>(fn: () => T): T {
  if (inTransaction) {
    return fn();
  }
  inTransaction = true;
  db.exec("BEGIN TRANSACTION;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    inTransaction = false;
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // ignore rollback errors if already aborted
    }
    inTransaction = false;
    throw err;
  }
}

export function closeDb(): void {
  try {
    db.close();
    console.log("[SUN89 Database] SQLite connection closed successfully.");
  } catch (err) {
    console.error("[SUN89 Database] Error closing database:", err);
  }
}

