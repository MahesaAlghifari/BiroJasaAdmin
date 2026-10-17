/**
 * Finance Routes (Secured & Validated)
 * Admin SUN89 — Biro Jasa Management System
 */

import { Router } from "express";
import {
  getInvoices,
  getInvoiceById,
  payInvoice,
  getKasKantor,
  addKasKantor,
  getPengeluaran,
  addPengeluaran,
} from "../controllers/financeController";
import { requireAuth, requireRoles } from "../middleware/auth";
import {
  validateInvoicePaymentPayload,
  validateKasKantorPayload,
  validatePengeluaranPayload,
} from "../middleware/validation";

export const financeRouter = Router();

// Read operations (Protected from anonymous access & restricted to authorized roles)
financeRouter.get(
  "/invoices",
  requireAuth,
  requireRoles("administrator", "admin", "finance"),
  getInvoices
);

financeRouter.get(
  "/invoices/:id",
  requireAuth,
  requireRoles("administrator", "admin", "finance"),
  getInvoiceById
);

// Payment mutation (Strictly Administrator & Finance with amount validation)
financeRouter.post(
  "/invoices/:id/pay",
  requireAuth,
  requireRoles("administrator", "finance"),
  validateInvoicePaymentPayload,
  payInvoice
);

// Kas Kantor read (Protected)
financeRouter.get(
  "/kas-kantor",
  requireAuth,
  requireRoles("administrator", "admin", "finance"),
  getKasKantor
);

// Kas Kantor mutation (Administrator & Finance with debit/credit validation)
financeRouter.post(
  "/kas-kantor",
  requireAuth,
  requireRoles("administrator", "finance"),
  validateKasKantorPayload,
  addKasKantor
);

// Pengeluaran read (Protected)
financeRouter.get(
  "/pengeluaran",
  requireAuth,
  requireRoles("administrator", "admin", "finance"),
  getPengeluaran
);

// Pengeluaran mutation (Administrator & Finance)
financeRouter.post(
  "/pengeluaran",
  requireAuth,
  requireRoles("administrator", "finance"),
  validatePengeluaranPayload,
  addPengeluaran
);

