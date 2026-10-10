/**
 * Document Routes
 * Admin SUN89 — Biro Jasa Management System
 */

import { Router } from "express";
import multer from "multer";
import { CONFIG } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { uploadRateLimiter } from "../middleware/rateLimiter";
import {
  uploadDocument,
  getDocumentById,
  createAccessTicket,
  previewDocument,
  downloadDocument,
  getDocumentsByOrder,
  getDocumentsByInvoice,
  deleteDocument,
} from "../controllers/documentController";

export const documentRouter = Router();

// Configure Multer with in-memory buffering & strict size limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CONFIG.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

// Document Upload Route (Protected, Rate-Limited, Single File)
documentRouter.post(
  "/upload",
  requireAuth,
  uploadRateLimiter,
  upload.single("file"),
  uploadDocument
);

// Collections
documentRouter.get("/order/:orderNo", requireAuth, getDocumentsByOrder);
documentRouter.get("/invoice/:invoiceId", requireAuth, getDocumentsByInvoice);

// Short-Lived Access Ticket Issuance (Protected by Bearer JWT)
documentRouter.post("/:id/ticket", requireAuth, createAccessTicket);

// Media Streaming & Preview (Protected by Bearer JWT or Short-Lived Access Ticket)
documentRouter.get("/:id/preview", previewDocument);
documentRouter.get("/:id/download", downloadDocument);

// Single Resource Management
documentRouter.get("/:id", requireAuth, getDocumentById);
documentRouter.delete("/:id", requireAuth, deleteDocument);
