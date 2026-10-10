/**
 * Document Data Provider Interface
 * Admin SUN89 — Biro Jasa Management System
 */

import { DocumentItem, UploadDocumentOptions } from "../../domain/document/types";

export interface IDocumentProvider {
  uploadDocument(file: File, options: UploadDocumentOptions): Promise<DocumentItem>;
  getDocumentById(id: string): Promise<DocumentItem | null>;
  getDocumentsByOrder(orderNo: string): Promise<DocumentItem[]>;
  getDocumentsByInvoice(invoiceId: string): Promise<DocumentItem[]>;
  deleteDocument(id: string): Promise<boolean>;
  getPreviewUrl(id: string): string;
  getDownloadUrl(id: string): string;
  createAccessTicket?(id: string, operation?: "preview" | "download"): Promise<string>;
  getAuthenticatedPreviewUrl?(id: string): Promise<string>;
  getAuthenticatedDownloadUrl?(id: string): Promise<string>;
}
