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
