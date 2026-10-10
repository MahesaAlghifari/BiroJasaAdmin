/**
 * User Routes (Secured & Validated)
 * Admin SUN89 — Biro Jasa Management System
 */

import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController";
import { requireAuth, requireRoles, requireUserSelfOrAdmin } from "../middleware/auth";
import { validateUserMutationPayload } from "../middleware/validation";

export const userRouter = Router();

// List all users (Administrator & Admin only to protect employee PII)
userRouter.get(
  "/",
  requireAuth,
  requireRoles("administrator", "admin"),
  getUsers
);

// Get user profile (Protected: Administrator, Admin, or self)
userRouter.get(
  "/:id",
  requireAuth,
  requireUserSelfOrAdmin,
  getUserById
);

// User mutations (Administrator & Admin only)
userRouter.post(
  "/",
  requireAuth,
  requireRoles("administrator", "admin"),
  validateUserMutationPayload,
  createUser
);

userRouter.put(
  "/:id",
  requireAuth,
  requireRoles("administrator", "admin"),
  validateUserMutationPayload,
  updateUser
);

userRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("administrator", "admin"),
  deleteUser
);
