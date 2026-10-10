/**
 * Authentication Service
 * Admin SUN89 — Biro Jasa Management System
 */

import { dbUserRepository } from "../repositories/dbUserRepository";
import { verifyPassword, hashPassword, needsRehash, generateToken, TokenPayload } from "../utils/crypto";
import { ApiError } from "../middleware/errorHandler";
import { dbAuditRepository } from "../repositories/dbAuditRepository";

export class AuthService {
  public async login(email?: string, password?: string): Promise<{ token: string; user: any }> {
    // 1. Enforce strict non-empty credentials validation (Prevents passwordless bypass)
    if (!email || typeof email !== "string" || !email.trim()) {
      throw new ApiError(400, "VALIDATION_ERROR", "Email wajib diisi.");
    }

    if (!password || typeof password !== "string" || !password.trim()) {
      throw new ApiError(400, "VALIDATION_ERROR", "Password wajib diisi.");
    }

    const cleanEmail = email.trim().toLowerCase();
    const userEntity = dbUserRepository.getByEmailWithCredentials(cleanEmail);
    if (!userEntity) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau password tidak valid.");
    }

    if (userEntity.status !== "Aktif") {
      throw new ApiError(403, "ACCOUNT_INACTIVE", "Akun Anda tidak aktif.");
    }

    // 2. Validate password hash
    const isValid = verifyPassword(password, userEntity.password_hash, userEntity.password_salt);
    if (!isValid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau password tidak valid.");
    }

    // 3. Transparent password hash upgrade if account was stored with legacy PBKDF2 iterations
    if (needsRehash(userEntity.password_hash)) {
      try {
        const { hash: newHash, salt: newSalt } = hashPassword(password);
        dbUserRepository.updateCredentials(userEntity.id, newHash, newSalt);
      } catch (rehashErr) {
        console.warn("[AuthService] Warning: Failed to upgrade legacy password hash:", rehashErr);
      }
    }

    // Map jabatan to application role
    const roleMap: Record<string, 'administrator' | 'finance' | 'admin' | 'messenger'> = {
      SVP: "administrator",
      ADMIN: "admin",
      FINANCE: "finance",
      MESSENGER: "messenger",
    };
    const role = roleMap[userEntity.jabatan] || "admin";

    const token = generateToken({
      userId: `usr-${userEntity.id}`,
      email: userEntity.email,
      nama: userEntity.nama,
      jabatan: userEntity.jabatan,
      role,
    });

    // Record login audit log
    dbAuditRepository.save({
      id: `log-auth-${Date.now()}`,
      userId: `usr-${userEntity.id}`,
      userName: userEntity.nama,
      userRole: role,
      action: "LOGIN",
      module: "Authentication",
      details: `User ${userEntity.nama} (${role}) berhasil login.`,
      createdAt: new Date().toISOString(),
    });

    return {
      token,
      user: {
        id: userEntity.id,
        userId: `usr-${userEntity.id}`,
        email: userEntity.email,
        nama: userEntity.nama,
        jabatan: userEntity.jabatan,
        role,
        status: userEntity.status,
      },
    };
  }

  public getMe(userPayload: TokenPayload) {
    const user = dbUserRepository.getById(userPayload.userId.replace("usr-", ""));
    return {
      ...userPayload,
      ...(user || {}),
    };
  }
}

export const authService = new AuthService();
