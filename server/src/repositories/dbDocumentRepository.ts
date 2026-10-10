/**
 * SQLite Document Repository
 * Admin SUN89 — Biro Jasa Management System
 */

import { db } from "../database/db";

export interface DocumentEntity {
  id: string;
  orderNo?: string | null;
  invoiceId?: string | null;
  documentType: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedBy: string;
  uploadedById?: string | null;
  uploadedByRole?: string | null;
  metadata?: Record<string, any> | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface DocumentRow {
  id: string;
  order_no: string | null;
  invoice_id: string | null;
  document_type: string;
  original_name: string;
  storage_name: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  uploaded_by: string;
  uploaded_by_id: string | null;
  uploaded_by_role: string | null;
  metadata_json: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function mapRowToEntity(row: DocumentRow): DocumentEntity {
  return {
    id: row.id,
    orderNo: row.order_no,
    invoiceId: row.invoice_id,
    documentType: row.document_type,
    originalName: row.original_name,
    storageName: row.storage_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    uploadedBy: row.uploaded_by,
    uploadedById: row.uploaded_by_id,
    uploadedByRole: row.uploaded_by_role,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    isActive: Boolean(row.is_active ?? 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DbDocumentRepository {
  public createDocument(doc: DocumentEntity): DocumentEntity {
    const createdAt = doc.createdAt || new Date().toISOString();
    const updatedAt = doc.updatedAt || createdAt;
    const isActive = doc.isActive !== false ? 1 : 0;

    const stmt = db.prepare(`
      INSERT INTO documents (
        id, order_no, invoice_id, document_type, original_name,
        storage_name, mime_type, size_bytes, sha256,
        uploaded_by, uploaded_by_id, uploaded_by_role, metadata_json,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      doc.id,
      doc.orderNo || null,
      doc.invoiceId || null,
      doc.documentType,
      doc.originalName,
      doc.storageName,
      doc.mimeType,
      doc.sizeBytes,
      doc.sha256,
      doc.uploadedBy,
      doc.uploadedById || null,
      doc.uploadedByRole || null,
      doc.metadata ? JSON.stringify(doc.metadata) : null,
      isActive,
      createdAt,
      updatedAt
    );

    return {
      ...doc,
      isActive: Boolean(isActive),
      createdAt,
      updatedAt,
    };
  }

  public findById(id: string, includeInactive = false): DocumentEntity | null {
    const sql = includeInactive
      ? "SELECT * FROM documents WHERE id = ?"
      : "SELECT * FROM documents WHERE id = ? AND is_active = 1";
    const stmt = db.prepare(sql);
    const row = stmt.get(id) as DocumentRow | undefined;
    return row ? mapRowToEntity(row) : null;
  }

  public findByStorageName(storageName: string, includeInactive = false): DocumentEntity | null {
    const sql = includeInactive
      ? "SELECT * FROM documents WHERE storage_name = ?"
      : "SELECT * FROM documents WHERE storage_name = ? AND is_active = 1";
    const stmt = db.prepare(sql);
    const row = stmt.get(storageName) as DocumentRow | undefined;
    return row ? mapRowToEntity(row) : null;
  }

  public findByOrderNo(orderNo: string, includeInactive = false): DocumentEntity[] {
    const sql = includeInactive
      ? "SELECT * FROM documents WHERE order_no = ? ORDER BY created_at ASC"
      : "SELECT * FROM documents WHERE order_no = ? AND is_active = 1 ORDER BY created_at ASC";
    const stmt = db.prepare(sql);
    const rows = stmt.all(orderNo) as DocumentRow[];
    return rows.map(mapRowToEntity);
  }

  public findByInvoiceId(invoiceId: string, includeInactive = false): DocumentEntity[] {
    const sql = includeInactive
      ? "SELECT * FROM documents WHERE invoice_id = ? ORDER BY created_at ASC"
      : "SELECT * FROM documents WHERE invoice_id = ? AND is_active = 1 ORDER BY created_at ASC";
    const stmt = db.prepare(sql);
    const rows = stmt.all(invoiceId) as DocumentRow[];
    return rows.map(mapRowToEntity);
  }

  public softDelete(id: string): boolean {
    const stmt = db.prepare("UPDATE documents SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND is_active = 1");
    const info: any = stmt.run(id);
    return info.changes > 0;
  }

  public deleteDocument(id: string): boolean {
    return this.softDelete(id);
  }

  public hardDelete(id: string): boolean {
    const stmt = db.prepare("DELETE FROM documents WHERE id = ?");
    const info: any = stmt.run(id);
    return info.changes > 0;
  }

  public linkOrder(id: string, orderNo: string): boolean {
    const stmt = db.prepare("UPDATE documents SET order_no = ?, updated_at = datetime('now') WHERE id = ?");
    const info: any = stmt.run(orderNo, id);
    return info.changes > 0;
  }

  public linkInvoice(id: string, invoiceId: string): boolean {
    const stmt = db.prepare("UPDATE documents SET invoice_id = ?, updated_at = datetime('now') WHERE id = ?");
    const info: any = stmt.run(invoiceId, id);
    return info.changes > 0;
  }
}

export const dbDocumentRepository = new DbDocumentRepository();
