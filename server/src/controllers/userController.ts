/**
 * User Controller
 * Admin SUN89 — Biro Jasa Management System
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { userService } from "../services/userService";

export async function getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = userService.getAll();
    res.json({ success: true, message: "OK", data: users, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = userService.getById(id);
    res.json({ success: true, message: "OK", data: user, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const newUser = userService.createUser(req.body, req.user);
    res.status(201).json({ success: true, message: "User berhasil dibuat.", data: newUser, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updated = userService.updateUser(id, req.body, req.user);
    res.json({ success: true, message: "User berhasil diperbarui.", data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const success = userService.deleteUser(id, req.user);
    res.json({ success, message: "User berhasil dihapus.", timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function resetUserPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = userService.resetPassword(id, req.user);
    res.json({
      success: true,
      message: `Kata sandi akun ${result.nama} berhasil direset.`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
