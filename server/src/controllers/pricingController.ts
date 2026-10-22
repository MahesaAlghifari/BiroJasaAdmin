/**
 * Pricing Controller
 * Admin SUN89 — Biro Jasa Management System
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { pricingService } from "../services/pricingService";

export async function getSamsatItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = pricingService.getAllSamsatItems();
    res.json({ success: true, message: "OK", data: items, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getSamsatItemById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const item = pricingService.getSamsatItemById(id);
    res.json({ success: true, message: "OK", data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function updateSamsatItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updated = pricingService.updateSamsatItem(id, req.body, req.user);
    res.json({ success: true, message: "Harga Samsat berhasil diperbarui.", data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getAllServicePricing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = pricingService.getAllServicePricing();
    res.json({ success: true, message: "OK", data: items, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function updateServicePricing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updated = pricingService.updateServicePricing(id, req.body, req.user);
    res.json({ success: true, message: "Konfigurasi biaya layanan berhasil disimpan.", data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function createServicePricing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const created = pricingService.createServicePricing(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Konfigurasi biaya layanan berhasil ditambahkan.",
      data: created,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteServicePricing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    pricingService.deleteServicePricing(id, req.user);
    res.json({
      success: true,
      message: "Konfigurasi biaya layanan berhasil dihapus.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
