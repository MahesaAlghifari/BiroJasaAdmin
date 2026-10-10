/**
 * Order Routes (Secured & Validated)
 * Admin SUN89 — Biro Jasa Management System
 */

import { Router } from "express";
import {
  getOrders,
  getArchivedOrders,
  getOrderByNo,
  createOrder,
  updateOrder,
  advanceOrder,
  rollbackOrder,
  archiveOrder,
  verifyPayment,
} from "../controllers/orderController";
import { requireAuth, requireRoles, requireStageAuthority } from "../middleware/auth";
import {
  validateOrderCreatePayload,
  validateOrderUpdatePayload,
  validateStageTransitionPayload,
} from "../middleware/validation";

export const orderRouter = Router();

// Read operations (Protected against anonymous access)
orderRouter.get("/", requireAuth, getOrders);
orderRouter.get("/archived", requireAuth, getArchivedOrders);
orderRouter.get("/:orderNo", requireAuth, getOrderByNo);

// Write operations (Protected with role and stage authority)
orderRouter.post(
  "/",
  requireAuth,
  requireRoles("administrator", "admin", "svp"),
  validateOrderCreatePayload,
  createOrder
);

orderRouter.put(
  "/:orderNo",
  requireAuth,
  requireRoles("administrator", "admin", "messenger", "finance", "svp"),
  validateOrderUpdatePayload,
  updateOrder
);

orderRouter.post(
  "/:orderNo/advance",
  requireAuth,
  requireStageAuthority,
  validateStageTransitionPayload,
  advanceOrder
);

orderRouter.post(
  "/:orderNo/rollback",
  requireAuth,
  requireStageAuthority,
  validateStageTransitionPayload,
  rollbackOrder
);

orderRouter.post(
  "/:orderNo/archive",
  requireAuth,
  requireRoles("administrator", "admin", "svp"),
  archiveOrder
);

orderRouter.post(
  "/:orderNo/verify-payment",
  requireAuth,
  requireRoles("administrator", "admin", "finance", "svp"),
  verifyPayment
);
