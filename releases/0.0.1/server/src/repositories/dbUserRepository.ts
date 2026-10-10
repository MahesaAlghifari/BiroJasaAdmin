/**
 * SQLite User Repository
 * Admin SUN89 — Biro Jasa Management System
 */

import { db } from "../database/db";
import { SystemUser } from "../../../src/domain/user/types";

export interface UserEntity {
  id: number;
  email: string;
  password_hash: string;
  password_salt: string;
  nama: string;
  jabatan: string;
  status: "Aktif" | "Nonaktif";
  created_at: string;
  updated_at: string;
}

export class DbUserRepository {
  public getAll(): SystemUser[] {
    const stmt = db.prepare("SELECT id, email, nama, jabatan, status FROM users ORDER BY id ASC");
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      nama: r.nama,
      jabatan: r.jabatan,
      email: r.email,
      status: r.status,
    }));
  }

  public getById(id: number | string): SystemUser | undefined {
    const stmt = db.prepare("SELECT id, email, nama, jabatan, status FROM users WHERE id = ?");
    const row = stmt.get(Number(id)) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      nama: row.nama,
      jabatan: row.jabatan,
      email: row.email,
      status: row.status,
    };
  }

  public getByEmailWithCredentials(email: string): UserEntity | undefined {
    const stmt = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)");
    return stmt.get(email.trim()) as UserEntity | undefined;
  }

  public createUser(userData: { email: string; password_hash: string; password_salt: string; nama: string; jabatan: string; status: "Aktif" | "Nonaktif" }): SystemUser {
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, password_salt, nama, jabatan, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userData.email, userData.password_hash, userData.password_salt, userData.nama, userData.jabatan, userData.status);
    const newId = Number(result.lastInsertRowid);
    return {
      id: newId,
      nama: userData.nama,
      jabatan: userData.jabatan,
      email: userData.email,
      status: userData.status,
    };
  }

  public updateUser(id: number | string, updates: Partial<{ nama: string; jabatan: string; email: string; status: "Aktif" | "Nonaktif" }>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.nama !== undefined) { fields.push("nama = ?"); values.push(updates.nama); }
    if (updates.jabatan !== undefined) { fields.push("jabatan = ?"); values.push(updates.jabatan); }
    if (updates.email !== undefined) { fields.push("email = ?"); values.push(updates.email); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }

    if (fields.length === 0) return true;
    fields.push("updated_at = datetime('now')");
    values.push(Number(id));

    const stmt = db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`);
    const res = stmt.run(...values);
    return res.changes > 0;
  }

  public updateCredentials(id: number | string, password_hash: string, password_salt: string): boolean {
    const stmt = db.prepare(`
      UPDATE users SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE id = ?
    `);
    const res = stmt.run(password_hash, password_salt, Number(id));
    return res.changes > 0;
  }

  public deleteUser(id: number | string): boolean {
    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    const res = stmt.run(Number(id));
    return res.changes > 0;
  }
}

export const dbUserRepository = new DbUserRepository();
