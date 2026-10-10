/**
 * Document Controller
 * Admin SUN89 — Biro Jasa Management System
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { documentService } from "../services/documentService";
import { documentTicketService } from "../services/documentTicketService";
import { verifyToken, TokenPayload } from "../utils/crypto";
import { ApiError } from "../middleware/errorHandler";

async function resolveDocumentUser(
  req: AuthenticatedRequest,
  docId: string,
  operation: "preview" | "download"
): Promise<TokenPayload> {
  // 1. Check Bearer token from header
  if (req.user) {
    return req.user;
  }

  const authHeader = req.headers["authorization"];
  if (authHeader) {
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
    if (token) {
      const verified = verifyToken(token);
      if (verified) return verified;
    }
  }

  // 2. Check short-lived access ticket
  const ticket = typeof req.query?.ticket === "string" ? req.query.ticket.trim() : "";
  if (ticket) {
    const validation = documentTicketService.validateTicket(ticket, docId, operation);
    if (validation.valid && validation.ticketData) {
      return {
        userId: validation.ticketData.userId,
        email: "",
        nama: validation.ticketData.userName,
        jabatan: validation.ticketData.userRole,
        role: validation.ticketData.userRole as any,
      };
    }
  }

  throw new ApiError(401, "UNAUTHENTICATED", "Autentikasi diperlukan untuk mengakses berkas dokumen.");
}

export async function createAccessTicket(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError(401, "UNAUTHENTICATED", "Autentikasi diperlukan.");
    }
    const { id } = req.params;
    const operation = req.body?.operation === "download" ? "download" : "preview";

    // Verify document exists and user is authorized
    const doc = documentService.getDocumentById(id, req.user);
    if (doc.isActive === false) {
      throw new ApiError(404, "DOCUMENT_NOT_FOUND", "Dokumen tidak ditemukan atau telah dinonaktifkan.");
    }

    const ticketEntry = documentTicketService.createTicket(id, req.user, operation);
    res.status(201).json({
      success: true,
      message: "Tiket akses dokumen berhasil diterbitkan.",
      data: {
        ticket: ticketEntry.ticket,
        expiresInSeconds: 60,
        documentId: id,
        operation: ticketEntry.operation,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new ApiError(400, "MISSING_FILE", "Berkas upload (field 'file') wajib disertakan.");
    }

    if (!req.user) {
      throw new ApiError(401, "UNAUTHENTICATED", "Autentikasi diperlukan untuk mengunggah dokumen.");
    }

    const doc = await documentService.uploadDocument({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      reportedMime: req.file.mimetype,
      documentType: req.body.documentType || "DOKUMEN_PENDUKUNG",
      orderNo: req.body.orderNo || undefined,
      invoiceId: req.body.invoiceId || undefined,
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
      user: req.user,
    });

    res.status(201).json({
      success: true,
      message: "Dokumen berhasil diunggah dan disimpan secara permanen.",
      data: doc,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError(401, "UNAUTHENTICATED", "Autentikasi diperlukan.");
    }
    const { id } = req.params;
    const doc = documentService.getDocumentById(id, req.user);
    res.json({
      success: true,
      message: "OK",
      data: doc,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function previewDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const resolvedUser = await resolveDocumentUser(req, id, "preview");
    const { doc, stream } = await documentService.getDocumentStream(id, resolvedUser);

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName)}"`);
    res.setHeader("Content-Length", doc.sizeBytes);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

export async function downloadDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const resolvedUser = await resolveDocumentUser(req, id, "download");
    const { doc, stream } = await documentService.getDocumentStream(id, resolvedUser);

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
    res.setHeader("Content-Length", doc.sizeBytes);
    res.setHeader("X-Content-Type-Options", "nosniff");

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

export async function getDocumentsByOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError(401, "UNAUTHENTICATED", "Autentikasi diperlukan.");
    }
    const { orderNo } = req.params;
    const docs = documentService.getDocumentsByOrder(orderNo, req.user);
    res.json({
      success: true,
      message: "OK",
      data: docs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentsByInvoice(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError(401, "UNAUTHENTICATED", "Autentikasi diperlukan.");
    }
    const { invoiceId } = req.params;
    const docs = documentService.getDocumentsByInvoice(invoiceId, req.user);
    res.json({
      success: true,
      message: "OK",
      data: docs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError(401, "UNAUTHENTICATED", "Autentikasi diperlukan.");
    }
    const { id } = req.params;
    await documentService.deleteDocument(id, req.user);
    res.json({
      success: true,
      message: "Dokumen berhasil dihapus.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
