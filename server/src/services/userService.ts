/**
 * User Management Domain Service
 * Admin SUN89 — Biro Jasa Management System
 */

import { dbUserRepository } from "../repositories/dbUserRepository";
import { dbAuditRepository } from "../repositories/dbAuditRepository";
import { SystemUser } from "../../../src/domain/user/types";
import { hashPassword } from "../utils/crypto";
import { ApiError } from "../middleware/errorHandler";
import { TokenPayload } from "../utils/crypto";

export class UserService {
  public getAll(): SystemUser[] {
    return dbUserRepository.getAll();
  }

  public getById(id: number | string): SystemUser {
    const user = dbUserRepository.getById(id);
    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", `User ID '${id}' tidak ditemukan.`);
    }
    return user;
  }

  public createUser(payload: { nama: string; jabatan: string; email: string; password?: string; status?: "Aktif" | "Nonaktif" }, user?: TokenPayload | null): SystemUser {
    if (!payload.nama || !payload.email || !payload.jabatan) {
      throw new ApiError(400, "VALIDATION_ERROR", "Field nama, email, dan jabatan wajib diisi.");
    }

    const existing = dbUserRepository.getByEmailWithCredentials(payload.email);
    if (existing) {
      throw new ApiError(409, "EMAIL_EXISTS", `User dengan email '${payload.email}' sudah terdaftar.`);
    }

    const rawPassword = payload.password || "admin123";
    const { hash, salt } = hashPassword(rawPassword);

    const created = dbUserRepository.createUser({
      email: payload.email,
      password_hash: hash,
      password_salt: salt,
      nama: payload.nama,
      jabatan: payload.jabatan,
      status: payload.status || "Aktif",
    });

    dbAuditRepository.save({
      id: `log-usr-create-${Date.now()}`,
      userId: user?.userId || "usr-admin",
      userName: user?.nama || "Admin",
      userRole: user?.role || "admin",
      action: "CREATE_USER",
      module: "Manajemen Pengguna",
      details: `Menambahkan pengguna baru ${created.nama} (${created.jabatan})`,
      metadata: { createdUser: created },
      createdAt: new Date().toISOString(),
    });

    return created;
  }

  public updateUser(id: number | string, updates: Partial<{ nama: string; jabatan: string; email: string; status: "Aktif" | "Nonaktif" }>, user?: TokenPayload | null): SystemUser {
    this.getById(id);
    const success = dbUserRepository.updateUser(id, updates);
    if (!success) {
      throw new ApiError(500, "UPDATE_FAILED", `Gagal memperbarui user ID ${id}`);
    }

    const updated = this.getById(id);

    dbAuditRepository.save({
      id: `log-usr-upd-${Date.now()}`,
      userId: user?.userId || "usr-admin",
      userName: user?.nama || "Admin",
      userRole: user?.role || "admin",
      action: "UPDATE_USER",
      module: "Manajemen Pengguna",
      details: `Memperbarui data pengguna ${updated.nama}`,
      metadata: { id, updates },
      createdAt: new Date().toISOString(),
    });

    return updated;
  }

  public deleteUser(id: number | string, user?: TokenPayload | null): boolean {
    const existing = this.getById(id);
    const success = dbUserRepository.deleteUser(id);
    if (success) {
      dbAuditRepository.save({
        id: `log-usr-del-${Date.now()}`,
        userId: user?.userId || "usr-admin",
        userName: user?.nama || "Admin",
        userRole: user?.role || "admin",
        action: "DELETE_USER",
        module: "Manajemen Pengguna",
        details: `Menghapus pengguna ${existing.nama}`,
        metadata: { id, name: existing.nama },
        createdAt: new Date().toISOString(),
      });
    }
    return success;
  }
}

export const userService = new UserService();
