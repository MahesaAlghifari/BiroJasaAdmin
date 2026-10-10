/**
 * Pricing Routes (Secured & Validated)
 * Admin SUN89 — Biro Jasa Management System
 */

import { Router } from "express";
import {
  getSamsatItems,
  getSamsatItemById,
  updateSamsatItem,
} from "../controllers/pricingController";
import { requireAuth, requireRoles } from "../middleware/auth";
import { validatePricingUpdatePayload } from "../middleware/validation";

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
