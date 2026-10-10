/**
 * Order Controller
 * Admin SUN89 — Biro Jasa Management System
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { orderService } from "../services/orderService";

export async function getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const flat = req.query.flat === "true";
    if (flat) {
      const orders = orderService.getAllFlat(false);
      res.json({ success: true, message: "OK", data: orders, timestamp: new Date().toISOString() });
    } else {
      const orders = orderService.getActiveOrders();
      res.json({ success: true, message: "OK", data: orders, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    next(err);
  }
}

export async function getArchivedOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const archived = orderService.getAllFlat(true);
    res.json({ success: true, message: "OK", data: archived, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getOrderByNo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderNo } = req.params;
    const order = orderService.getByOrderNo(orderNo);
    res.json({ success: true, message: "OK", data: order, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = orderService.createOrder(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Order berhasil dibuat.",
      data: order,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderNo } = req.params;
    const order = orderService.updateOrder(orderNo, req.body, req.user);
    res.json({ success: true, message: "Order berhasil diperbarui.", data: order, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function advanceOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderNo } = req.params;
    const { targetStage, updates } = req.body;
    const order = orderService.advanceOrder(orderNo, targetStage, updates, req.user);
    res.json({ success: true, message: `Order berhasil dimajukan ke ${targetStage}.`, data: order, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function rollbackOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderNo } = req.params;
    const { targetStage, updates } = req.body;
    const order = orderService.rollbackOrder(orderNo, targetStage, updates, req.user);
    res.json({ success: true, message: `Order dikembalikan ke ${targetStage}.`, data: order, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function archiveOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderNo } = req.params;
    const success = orderService.archiveOrder(orderNo, req.user);
    res.json({ success, message: "Order berhasil diarsipkan.", timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderNo } = req.params;
    const verifierName = req.body.verifierName || req.user?.nama || "Admin";
    const order = orderService.verifyPayment(orderNo, verifierName, req.user);
    res.json({ success: true, message: "Pembayaran berhasil diverifikasi.", data: order, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
