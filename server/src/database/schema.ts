/**
 * Database Schema Definitions and Initializer
 * Admin SUN89 — Biro Jasa Management System
 */

import type { DatabaseSync } from "node:sqlite";

export function initializeSchema(targetDb: DatabaseSync): void {
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      nama TEXT NOT NULL,
      jabatan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aktif',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      order_no TEXT PRIMARY KEY,
      customer TEXT NOT NULL,
      nomor_hp TEXT NOT NULL,
      layanan TEXT NOT NULL,
      nopol TEXT NOT NULL,
      current_step INTEGER NOT NULL DEFAULT 1,
      current_stage_name TEXT NOT NULL DEFAULT 'Verifikasi',
      payment_status TEXT NOT NULL DEFAULT 'Belum Lunas',
      total_biaya REAL NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_stage ON orders(current_stage_name);
    CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(is_archived);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer);

    CREATE TABLE IF NOT EXISTS samsat_pricing (
      id TEXT PRIMARY KEY,
      nama_item TEXT NOT NULL,
      kategori TEXT NOT NULL,
      tipe_kendaraan TEXT NOT NULL,
      biaya_dasar REAL NOT NULL DEFAULT 0,
      deskripsi TEXT,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finance_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      order_no TEXT NOT NULL,
      customer TEXT NOT NULL,
      layanan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNPAID',
      total_tagihan REAL NOT NULL DEFAULT 0,
      dibayar REAL NOT NULL DEFAULT 0,
      sisa REAL NOT NULL DEFAULT 0,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_order ON finance_invoices(order_no);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON finance_invoices(status);

    CREATE TABLE IF NOT EXISTS kas_kantor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      keterangan TEXT NOT NULL,
      status TEXT NOT NULL,
      debit REAL NOT NULL DEFAULT 0,
      kredit REAL NOT NULL DEFAULT 0,
      saldo REAL NOT NULL DEFAULT 0,
      penanggung_jawab TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pengeluaran (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      keterangan TEXT NOT NULL,
      nominal REAL NOT NULL DEFAULT 0,
      penanggung_jawab TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      order_no TEXT,
      invoice_id TEXT,
      document_type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      storage_name TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_by_id TEXT,
      uploaded_by_role TEXT,
      metadata_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_no) REFERENCES orders(order_no) ON DELETE SET NULL,
      FOREIGN KEY (invoice_id) REFERENCES finance_invoices(invoice_no) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_documents_order ON documents(order_no);
    CREATE INDEX IF NOT EXISTS idx_documents_invoice ON documents(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_documents_storage_name ON documents(storage_name);
  `);

  migrateDocumentsTable(targetDb);
  migrateKasKantorTable(targetDb);
  migratePengeluaranTable(targetDb);

  targetDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_active ON documents(is_active);
  `);
}

function migrateDocumentsTable(targetDb: DatabaseSync): void {
  try {
    const tableInfo = targetDb.prepare("PRAGMA table_info(documents)").all() as { name: string }[];
    if (!tableInfo || tableInfo.length === 0) return;

    const columnNames = new Set(tableInfo.map((c) => c.name));

    // Check if foreign keys are already applied
    const foreignKeys = targetDb.prepare("PRAGMA foreign_key_list(documents)").all() as { table: string }[];
    const hasOrderFk = foreignKeys.some((fk) => fk.table === "orders");
    const hasInvoiceFk = foreignKeys.some((fk) => fk.table === "finance_invoices");

    if (!hasOrderFk || !hasInvoiceFk || !columnNames.has("is_active") || !columnNames.has("updated_at")) {
      // Validate & clean existing references safely before applying foreign keys
      targetDb.exec(`
        UPDATE documents SET order_no = NULL 
        WHERE order_no IS NOT NULL AND order_no NOT IN (SELECT order_no FROM orders);

        UPDATE documents SET invoice_id = NULL 
        WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT invoice_no FROM finance_invoices);
      `);

      const isActiveExpr = columnNames.has("is_active") ? "COALESCE(is_active, 1)" : "1";
      const updatedAtExpr = columnNames.has("updated_at") ? "COALESCE(updated_at, created_at)" : "created_at";

      // Recreate table with foreign key constraints
      targetDb.exec(`
        CREATE TABLE documents_migrated (
          id TEXT PRIMARY KEY,
          order_no TEXT,
          invoice_id TEXT,
          document_type TEXT NOT NULL,
          original_name TEXT NOT NULL,
          storage_name TEXT NOT NULL UNIQUE,
          mime_type TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          sha256 TEXT NOT NULL,
          uploaded_by TEXT NOT NULL,
          uploaded_by_id TEXT,
          uploaded_by_role TEXT,
          metadata_json TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (order_no) REFERENCES orders(order_no) ON DELETE SET NULL,
          FOREIGN KEY (invoice_id) REFERENCES finance_invoices(invoice_no) ON DELETE SET NULL
        );

        INSERT INTO documents_migrated (
          id, order_no, invoice_id, document_type, original_name,
          storage_name, mime_type, size_bytes, sha256,
          uploaded_by, uploaded_by_id, uploaded_by_role, metadata_json,
          is_active, created_at, updated_at
        )
        SELECT
          id, order_no, invoice_id, document_type, original_name,
          storage_name, mime_type, size_bytes, sha256,
          uploaded_by, uploaded_by_id, uploaded_by_role, metadata_json,
          ${isActiveExpr}, created_at, ${updatedAtExpr}
        FROM documents;

        DROP TABLE documents;
        ALTER TABLE documents_migrated RENAME TO documents;

        CREATE INDEX IF NOT EXISTS idx_documents_order ON documents(order_no);
        CREATE INDEX IF NOT EXISTS idx_documents_invoice ON documents(invoice_id);
        CREATE INDEX IF NOT EXISTS idx_documents_storage_name ON documents(storage_name);
        CREATE INDEX IF NOT EXISTS idx_documents_active ON documents(is_active);
      `);
    }
  } catch (err) {
    console.warn("[SUN89 Migration] Warning during documents table migration:", err);
  }
}

function migrateKasKantorTable(targetDb: DatabaseSync): void {
  try {
    const tableInfo = targetDb.prepare("PRAGMA table_info(kas_kantor)").all() as { name: string }[];
    if (!tableInfo || tableInfo.length === 0) return;

    const columnNames = new Set(tableInfo.map((c) => c.name));
    if (!columnNames.has("penanggung_jawab")) {
      targetDb.exec("ALTER TABLE kas_kantor ADD COLUMN penanggung_jawab TEXT;");
    }
  } catch (err) {
    console.warn("[SUN89 Migration] Warning during kas_kantor table migration:", err);
  }
}

function migratePengeluaranTable(targetDb: DatabaseSync): void {
  try {
    const tableInfo = targetDb.prepare("PRAGMA table_info(pengeluaran)").all() as { name: string }[];
    if (!tableInfo || tableInfo.length === 0) return;

    const columnNames = new Set(tableInfo.map((c) => c.name));
    if (!columnNames.has("penanggung_jawab")) {
      targetDb.exec("ALTER TABLE pengeluaran ADD COLUMN penanggung_jawab TEXT;");
    }
  } catch (err) {
    console.warn("[SUN89 Migration] Warning during pengeluaran table migration:", err);
  }
}
