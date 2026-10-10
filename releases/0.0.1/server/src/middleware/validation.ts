/**
 * Request Validation Middleware & Sanitization DTOs
 * Admin SUN89 — Biro Jasa Management System
 */

import { Request, Response, NextFunction } from "express";
import { STAGES, StageName } from "../../../src/domain/order/types";

/**
 * Validates Auth Login Payload
 */
export function validateLoginPayload(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body || {};

  if (!email || typeof email !== "string" || !email.trim()) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Email wajib diisi." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!password || typeof password !== "string" || !password.trim()) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Password wajib diisi." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Validates Order Creation Payload
 */
export function validateOrderCreatePayload(req: Request, res: Response, next: NextFunction): void {
  const { customer, nomorHP, layanan, nopol } = req.body || {};

  if (!customer || typeof customer !== "string" || !customer.trim()) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Nama customer wajib diisi." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!nomorHP || typeof nomorHP !== "string" || !nomorHP.trim()) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Nomor HP wajib diisi." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!layanan || typeof layanan !== "string" || !layanan.trim()) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Jenis layanan wajib dipilih." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!nopol || typeof nopol !== "string" || !nopol.trim()) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Nomor polisi (nopol) wajib diisi." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Validates and sanitizes Order Update Payload
 * Strips server-owned protected fields:
 * - orderNo, currentStep, currentStageName, isArchived, createdAt, updatedAt
 * - payment.isPaymentVerified, payment.statusPembayaran, payment.dibayar, payment.kurang
 */
export function validateOrderUpdatePayload(req: Request, res: Response, next: NextFunction): void {
  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Request body harus berupa JSON object." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Reject explicit tampering with server-controlled root fields
  const forbiddenKeys = ["orderNo", "currentStep", "currentStageName", "isArchived", "createdAt", "updatedAt"];
  for (const key of forbiddenKeys) {
    if (key in body && body[key] !== undefined) {
      delete body[key];
    }
  }

  // Reject tampering with payment state directly through PUT order
  if (body.payment && typeof body.payment === "object") {
    const forbiddenPaymentKeys = ["isPaymentVerified", "statusPembayaran", "dibayar", "kurang"];
    for (const key of forbiddenPaymentKeys) {
      if (key in body.payment && body.payment[key] !== undefined) {
        delete body.payment[key];
      }
    }
  }

  next();
}

/**
 * Validates Order Stage Advance / Rollback Payload
 */
export function validateStageTransitionPayload(req: Request, res: Response, next: NextFunction): void {
  const { targetStage } = req.body || {};

  if (!targetStage || typeof targetStage !== "string" || !STAGES.includes(targetStage as StageName)) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Tahapan tujuan '${targetStage}' tidak valid. Pilihan yang valid: ${STAGES.join(", ")}`,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Validates Finance Invoice Payment Payload
 */
export function validateInvoicePaymentPayload(req: Request, res: Response, next: NextFunction): void {
  const { amount } = req.body || {};

  if (amount === undefined || amount === null) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Nominal pembayaran (amount) wajib diisi." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Nominal pembayaran harus berupa angka positif yang valid (bukan 0 atau negatif).",
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  req.body.amount = numAmount;
  next();
}

/**
 * Validates Finance Kas Kantor Payload
 */
export function validateKasKantorPayload(req: Request, res: Response, next: NextFunction): void {
  const { keterangan, status, debit, kredit } = req.body || {};

  if (!keterangan || typeof keterangan !== "string" || !keterangan.trim()) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Keterangan kas kantor wajib diisi." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const validStatuses = ["Pemasukan", "Pengeluaran", "Debit", "Kredit"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: `Status transaksi harus salah satu dari: ${validStatuses.join(", ")}` },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const numDebit = Number(debit ?? 0);
  const numKredit = Number(kredit ?? 0);

  if (!Number.isFinite(numDebit) || numDebit < 0 || !Number.isFinite(numKredit) || numKredit < 0) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Nilai debit dan kredit harus berupa angka non-negatif yang valid." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Validates Pricing Samsat Update Payload
 */
export function validatePricingUpdatePayload(req: Request, res: Response, next: NextFunction): void {
  const { basePrice } = req.body || {};

  if (basePrice !== undefined) {
    const numPrice = Number(basePrice);
    if (!Number.isFinite(numPrice) || numPrice < 0) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Harga dasar (basePrice) harus berupa angka non-negatif yang valid." },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    req.body.basePrice = numPrice;
  }

  next();
}

/**
 * Validates User Mutation Payload
 */
export function validateUserMutationPayload(req: Request, res: Response, next: NextFunction): void {
  const { email, nama, jabatan, status } = req.body || {};

  if (email !== undefined) {
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Format email tidak valid." },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  if (nama !== undefined && (typeof nama !== "string" || !nama.trim())) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Nama tidak boleh kosong." },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (jabatan !== undefined) {
    const validJabatan = ["ADMIN", "FINANCE", "SVP", "MESSENGER", "CLILEN"];
    if (!validJabatan.includes(jabatan)) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: `Jabatan harus salah satu dari: ${validJabatan.join(", ")}` },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  if (status !== undefined) {
    const validStatus = ["Aktif", "Nonaktif"];
    if (!validStatus.includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: `Status harus salah satu dari: ${validStatus.join(", ")}` },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  next();
}
