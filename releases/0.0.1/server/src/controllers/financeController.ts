/**
 * Finance Controller
 * Admin SUN89 — Biro Jasa Management System
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { financeService } from "../services/financeService";

export async function getInvoices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoices = financeService.getAllInvoices();
    res.json({ success: true, message: "OK", data: invoices, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getInvoiceById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const invoice = financeService.getInvoiceById(id);
    res.json({ success: true, message: "OK", data: invoice, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function payInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { amount, details } = req.body;
    const invoice = financeService.recordPayment(id, Number(amount), details, req.user);
    res.json({ success: true, message: "Pembayaran berhasil dicatat.", data: invoice, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getKasKantor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const entries = financeService.getAllKasKantor();
    res.json({ success: true, message: "OK", data: entries, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function addKasKantor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const entry = financeService.addKasKantor(req.body, req.user);
    res.status(201).json({ success: true, message: "Transaksi kas berhasil ditambahkan.", data: entry, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
