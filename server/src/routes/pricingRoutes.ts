/**
 * Pricing Routes (Secured & Validated)
 * Admin SUN89 — Biro Jasa Management System
 */

import { Router } from "express";
import {
  getSamsatItems,
  getSamsatItemById,
  updateSamsatItem,
  getAllServicePricing,
  updateServicePricing,
  createServicePricing,
  deleteServicePricing,
} from "../controllers/pricingController";
import { requireAuth, requireRoles } from "../middleware/auth";
import { validatePricingUpdatePayload, validateServicePricingPayload } from "../middleware/validation";

export const pricingRouter = Router();

// Read operations (Protected with authentication)
pricingRouter.get("/samsat", requireAuth, getSamsatItems);
pricingRouter.get("/samsat/:id", requireAuth, getSamsatItemById);

// Update operation (Administrator & Admin only, with numeric validation)
pricingRouter.put(
  "/samsat/:id",
  requireAuth,
  requireRoles("administrator", "admin"),
  validatePricingUpdatePayload,
  updateSamsatItem
);

// Service Pricing / Biaya Layanan CRUD
pricingRouter.get("/services", requireAuth, getAllServicePricing);
pricingRouter.post(
  "/services",
  requireAuth,
  requireRoles("administrator", "admin"),
  validateServicePricingPayload,
  createServicePricing
);
pricingRouter.put(
  "/services/:id",
  requireAuth,
  requireRoles("administrator", "admin"),
  validateServicePricingPayload,
  updateServicePricing
);
pricingRouter.delete(
  "/services/:id",
  requireAuth,
  requireRoles("administrator", "admin"),
  deleteServicePricing
);
