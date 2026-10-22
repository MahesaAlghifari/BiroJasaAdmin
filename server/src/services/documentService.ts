/**
 * Document Domain Service
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Orchestrates secure persistent file storage, database metadata records,
 * RBAC authorization checks, atomic rollbacks, and audit trails.
 */

import crypto from "node:crypto";
import { Readable } from "node:stream";
import { IDocumentStorageAdapter } from "../storage/documentStorageAdapter";
import { localDiskDocumentStorage } from "../storage/localDiskDocumentStorage";
import { DbDocumentRepository, dbDocumentRepository, DocumentEntity } from "../repositories/dbDocumentRepository";
import { dbAuditRepository } from "../repositories/dbAuditRepository";
import { dbOrderRepository } from "../repositories/dbOrderRepository";
import { dbFinanceRepository } from "../repositories/dbFinanceRepository";
import { runInTransaction } from "../database/db";
import { validateUploadedDocument } from "../utils/fileValidation";
import { ApiError } from "../middleware/errorHandler";
import { TokenPayload } from "../utils/crypto";

export interface UploadDocumentParams {
  buffer: Buffer;
  originalName: string;
  reportedMime?: string;
  documentType: string;
  orderNo?: string;
  invoiceId?: string;
  metadata?: Record<string, any>;
  user: TokenPayload;
}

export class DocumentService {
  constructor(
    private storage: IDocumentStorageAdapter = localDiskDocumentStorage,
    private docRepo: DbDocumentRepository = dbDocumentRepository
  ) {}

  /**
   * Upload and durably persist a document with binary validation & audit logging.
   */
  public async uploadDocument(params: UploadDocumentParams): Promise<DocumentEntity> {
    const { buffer, originalName, reportedMime, documentType, orderNo, invoiceId, metadata, user } = params;

    // 0. Referential integrity validation before storage persistence
    const trimmedOrderNo = orderNo && orderNo.trim() ? orderNo.trim() : null;
    const trimmedInvoiceId = invoiceId && invoiceId.trim() ? invoiceId.trim() : null;

    if (trimmedOrderNo) {
      const existingOrder = dbOrderRepository.getByOrderNo(trimmedOrderNo);
      if (!existingOrder) {
        throw new ApiError(404, "ORDER_NOT_FOUND", `Order dengan nomor '${trimmedOrderNo}' tidak ditemukan.`);
      }
    }

    if (trimmedInvoiceId) {
      const existingInv = dbFinanceRepository.getInvoiceByNo(trimmedInvoiceId);
      if (!existingInv) {
        throw new ApiError(404, "INVOICE_NOT_FOUND", `Invoice dengan nomor '${trimmedInvoiceId}' tidak ditemukan.`);
      }
    }

    // 1. Magic bytes validation & sanitization
    const validated = validateUploadedDocument(buffer, originalName, reportedMime);

    // 2. Persist to storage medium
    const stored = await this.storage.saveFile(buffer, validated.extension);

    // 3. Persist metadata to database inside atomic transaction
    const docId = `DOC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const docEntity: DocumentEntity = {
      id: docId,
      orderNo: trimmedOrderNo,
      invoiceId: trimmedInvoiceId,
      documentType: documentType || "DOKUMEN_PENDUKUNG",
      originalName: validated.sanitizedOriginalName,
      storageName: stored.storageName,
      mimeType: validated.mimeType,
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      uploadedBy: user.nama || user.email,
      uploadedById: String(user.id),
      uploadedByRole: user.jabatan,
      metadata: metadata || null,
      createdAt: new Date().toISOString(),
    };

    try {
      runInTransaction(() => {
        this.docRepo.createDocument(docEntity);

        // Invalidate document approval if document uploaded for an order
        if (trimmedOrderNo) {
          dbOrderRepository.updateOrder(trimmedOrderNo, {
            documentApproval: {
              stage5Verified: false,
              stage6Approved: false,
              approvedDocsSnapshot: [],
            },
            documentsVerified: false,
            approvedBySpv: false,
          } as any);
        }
      });
    } catch (dbErr: any) {
      // Rollback: delete orphaned file on disk and log explicitly (Requirement #8)
      let cleanupSuccess = false;
      try {
        await this.storage.deleteFile(stored.storageName);
        cleanupSuccess = true;
        console.warn(
          `[DocumentService] Rollback pembersihan berhasil: Berkas fisik yatim '${stored.storageName}' di '${stored.filePath}' telah dihapus setelah penyimpanan metadata database gagal.`
        );
      } catch (unlinkErr) {
        console.error(
          `[DocumentService] CRITICAL ROLLBACK FAILURE: Gagal membersihkan berkas fisik yatim '${stored.storageName}' di '${stored.filePath}' setelah penyimpanan database gagal:`,
          unlinkErr
        );
      }
      throw new ApiError(
        500,
        "STORAGE_ERROR",
        `Gagal menyimpan metadata dokumen ke basis data: ${dbErr?.message || "Kesalahan basis data"}. Status pembersihan disk: ${cleanupSuccess ? "berhasil dibersihkan" : "gagal dibersihkan (tercatat di log server)"}.`
      );
    }

    // 4. Record audit trail
    try {
      dbAuditRepository.save({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: String(user.id),
        userName: user.nama || user.email,
        userRole: user.jabatan as any,
        action: "DOCUMENT_UPLOADED",
        module: "Dokumen",
        details: `Upload dokumen '${docEntity.originalName}' (${docEntity.documentType}) untuk ${trimmedOrderNo ? `Order ${trimmedOrderNo}` : trimmedInvoiceId ? `Invoice ${trimmedInvoiceId}` : 'Umum'}`,
        metadata: {
          documentId: docEntity.id,
          orderNo: docEntity.orderNo,
          invoiceId: docEntity.invoiceId,
          storageName: docEntity.storageName,
          sizeBytes: docEntity.sizeBytes,
          sha256: docEntity.sha256,
        },
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Non-blocking audit error
    }

    return docEntity;
  }

  /**
   * Authorize and retrieve document metadata.
   */
  public getDocumentById(id: string, user: TokenPayload): DocumentEntity {
    const doc = this.docRepo.findById(id);
    if (!doc) {
      throw new ApiError(404, "DOCUMENT_NOT_FOUND", `Dokumen dengan ID '${id}' tidak ditemukan.`);
    }

    this.authorizeAccess(doc, user);
    return doc;
  }

  /**
   * Authorize and stream document content.
   */
  public async getDocumentStream(
    id: string,
    user: TokenPayload
  ): Promise<{ doc: DocumentEntity; stream: Readable; buffer?: Buffer }> {
    const doc = this.getDocumentById(id, user);

    const exists = await this.storage.exists(doc.storageName);
    if (!exists) {
      throw new ApiError(404, "FILE_NOT_FOUND", "Berkas fisik dokumen tidak ditemukan di penyimpanan.");
    }

    const stream = this.storage.getReadStream(doc.storageName);
    return { doc, stream };
  }

  /**
   * Authorize and read entire file buffer.
   */
  public async getDocumentBuffer(
    id: string,
    user: TokenPayload
  ): Promise<{ doc: DocumentEntity; buffer: Buffer }> {
    const doc = this.getDocumentById(id, user);

    const exists = await this.storage.exists(doc.storageName);
    if (!exists) {
      throw new ApiError(404, "FILE_NOT_FOUND", "Berkas fisik dokumen tidak ditemukan di penyimpanan.");
    }

    const buffer = await this.storage.readFile(doc.storageName);
    return { doc, buffer };
  }

  /**
   * Retrieve all documents linked to an order.
   */
  public getDocumentsByOrder(orderNo: string, user: TokenPayload): DocumentEntity[] {
    const role = (user.role || user.jabatan || "").toLowerCase();
    // Check order access authorization
    const order = dbOrderRepository.getByOrderNo(orderNo);
    if (order && role === "messenger") {
      const ordMessenger = (order.messenger || (order as any).assignedMessengerName || "").toLowerCase().trim();
      const isUnassigned = !ordMessenger || ordMessenger === "belum ditugaskan" || ordMessenger === "-";
      const uName = (user.nama || "").toLowerCase().trim();
      const matches = ordMessenger === uName || ordMessenger.includes(uName) || uName.includes(ordMessenger);
      if (!isUnassigned && !matches) {
        throw new ApiError(403, "FORBIDDEN", "Anda tidak berwenang melihat dokumen untuk order ini.");
      }
    }

    return this.docRepo.findByOrderNo(orderNo);
  }

  /**
   * Retrieve all documents linked to an invoice.
   */
  public getDocumentsByInvoice(invoiceId: string, user: TokenPayload): DocumentEntity[] {
    const role = (user.role || user.jabatan || "").toLowerCase();
    if (role === "messenger") {
      throw new ApiError(403, "FORBIDDEN", "Messenger tidak memiliki akses ke dokumen invoice.");
    }
    return this.docRepo.findByInvoiceId(invoiceId);
  }

  /**
   * Delete document from database and disk with authorization & audit.
   */
  public async deleteDocument(id: string, user: TokenPayload): Promise<boolean> {
    const doc = this.docRepo.findById(id);
    if (!doc) {
      throw new ApiError(404, "DOCUMENT_NOT_FOUND", `Dokumen dengan ID '${id}' tidak ditemukan.`);
    }

    const role = (user.role || user.jabatan || "").toLowerCase();
    const uid = String(user.userId || (user as any).id || "");

    // Only administrator, admin, or the original uploader can delete
    const isOwner = doc.uploadedById === uid;
    const isAdmin = role === "administrator" || role === "admin" || role === "svp";

    if (!isAdmin && !isOwner) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak berwenang untuk menghapus dokumen ini.");
    }

    // Soft delete in database (preserves audit integrity)
    const deleted = this.docRepo.softDelete(id);
    if (deleted) {
      // Record audit
      try {
        dbAuditRepository.save({
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: String(user.userId || (user as any).id || user.email),
          userName: user.nama || user.email,
          userRole: (user.role || user.jabatan || "admin") as any,
          action: "DOCUMENT_DELETED",
          module: "Dokumen",
          details: `Dokumen '${doc.originalName}' (${doc.id}) dinonaktifkan (soft delete) oleh ${user.nama || user.email}`,
          metadata: { documentId: doc.id, storageName: doc.storageName, softDeleted: true },
          createdAt: new Date().toISOString(),
        });
      } catch {
        // Non-blocking
      }

      // Invalidate document approval if document was linked to an order
      if (doc.orderNo) {
        try {
          dbOrderRepository.updateOrder(doc.orderNo, {
            documentApproval: {
              stage5Verified: false,
              stage6Approved: false,
              approvedDocsSnapshot: [],
            },
            documentsVerified: false,
            approvedBySpv: false,
          } as any);
        } catch {
          // Non-blocking
        }
      }
    }

    return deleted;
  }

  /**
   * RBAC authorization check.
   */
  public authorizeAccess(doc: DocumentEntity, user: TokenPayload): void {
    const role = (user.role || user.jabatan || "").toLowerCase();
    const uid = String(user.userId || (user as any).id || "");

    // Superadmin and Admin have unrestricted access
    if (role === "administrator" || role === "admin" || role === "svp") {
      return;
    }

    // Uploader always has access to their own uploads
    if (doc.uploadedById === uid) {
      return;
    }

    // Finance can access invoice docs, payment proofs, and order docs
    if (role === "finance") {
      return;
    }

    // Messenger can access only specifically assigned orders
    if (role === "messenger") {
      if (doc.orderNo) {
        const order = dbOrderRepository.getByOrderNo(doc.orderNo);
        if (order) {
          const isAssigned =
            order.messenger === user.nama ||
            order.messengerPengantar === user.nama ||
            (order.assignedMessengerId && order.assignedMessengerId === ((user as any).employeeId || user.userId));
          if (isAssigned) {
            return;
          }
        }
        throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki izin untuk mengakses dokumen order ini.");
      }
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki izin untuk mengakses dokumen ini.");
    }

    throw new ApiError(403, "FORBIDDEN", "Akses ke dokumen ditolak.");
  }

  public linkOrder(id: string, orderNo: string, user: TokenPayload): boolean {
    const doc = this.docRepo.findById(id);
    if (!doc) {
      throw new ApiError(404, "DOCUMENT_NOT_FOUND", `Dokumen '${id}' tidak ditemukan.`);
    }
    const success = this.docRepo.linkOrder(id, orderNo);
    if (success && orderNo) {
      try {
        dbOrderRepository.updateOrder(orderNo, {
          documentApproval: {
            stage5Verified: false,
            stage6Approved: false,
            approvedDocsSnapshot: [],
          },
          documentsVerified: false,
          approvedBySpv: false,
        } as any);
      } catch {
        // Non-blocking
      }
    }
    return success;
  }
}

export const documentService = new DocumentService();
