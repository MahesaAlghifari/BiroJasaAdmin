/**
 * SQLite Pricing Repository
 * Admin SUN89 — Biro Jasa Management System
 */

import { db } from "../database/db";
import { SamsatCostItem } from "../../../src/domain/pricing/types";

export class DbPricingRepository {
  public getAllSamsatItems(): SamsatCostItem[] {
    const stmt = db.prepare("SELECT data_json FROM samsat_pricing ORDER BY kategori ASC, nama_item ASC");
    const rows = stmt.all() as { data_json: string }[];
    return rows.map((r) => JSON.parse(r.data_json) as SamsatCostItem);
  }

  public getSamsatItemById(id: string): SamsatCostItem | undefined {
    const stmt = db.prepare("SELECT data_json FROM samsat_pricing WHERE id = ?");
    const row = stmt.get(id) as { data_json: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.data_json) as SamsatCostItem;
  }

  public updateSamsatItem(id: string, updates: Partial<SamsatCostItem>): boolean {
    const existing = this.getSamsatItemById(id);
    if (!existing) return false;

    const merged: SamsatCostItem = { ...existing, ...updates };

    const stmt = db.prepare(`
      UPDATE samsat_pricing SET
        nama_item = ?,
        kategori = ?,
        tipe_kendaraan = ?,
        biaya_dasar = ?,
        deskripsi = ?,
        data_json = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);

    const res = stmt.run(
      merged.namaItem,
      merged.kategori,
      merged.tipeKendaraan,
      merged.biayaDasar,
      merged.deskripsi || "",
      JSON.stringify(merged),
      id
    );

    return res.changes > 0;
  }

  public addSamsatItem(item: SamsatCostItem): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO samsat_pricing (
        id, nama_item, kategori, tipe_kendaraan, biaya_dasar, deskripsi, data_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      item.id,
      item.namaItem,
      item.kategori,
      item.tipeKendaraan,
      item.biayaDasar,
      item.deskripsi || "",
      JSON.stringify(item)
    );
  }
}

export const dbPricingRepository = new DbPricingRepository();
