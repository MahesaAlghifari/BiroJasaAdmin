/**
 * SQLite Pricing Repository
 * Admin SUN89 — Biro Jasa Management System
 */

import { db } from "../database/db";
import { SamsatCostItem } from "../../../src/domain/pricing/types";

export class DbPricingRepository {
  private mapRowToSamsatItem(row: any): SamsatCostItem {
    let parsed: any = {};
    if (row.data_json) {
      try {
        parsed = JSON.parse(row.data_json);
      } catch (err) {
        console.warn(`[DbPricingRepository] Gagal parse data_json pada item ${row.id}:`, err);
      }
    }

    // Kolom SQL fisik adalah sumber kanonis utama (Single Source of Truth)
    const basePrice = row.biaya_dasar !== null && row.biaya_dasar !== undefined
      ? Number(row.biaya_dasar)
      : Number(parsed.basePrice ?? parsed.biayaDasar ?? 0);

    const name = row.nama_item !== null && row.nama_item !== undefined && row.nama_item !== ""
      ? String(row.nama_item)
      : String(parsed.name ?? parsed.namaItem ?? "");

    const category = row.kategori !== null && row.kategori !== undefined && row.kategori !== ""
      ? String(row.kategori)
      : String(parsed.category ?? parsed.kategori ?? "Layanan Standar");

    const tipeKendaraan = row.tipe_kendaraan !== null && row.tipe_kendaraan !== undefined && row.tipe_kendaraan !== ""
      ? String(row.tipe_kendaraan)
      : String(parsed.tipeKendaraan ?? parsed.tipe_kendaraan ?? "Mobil");

    // Semantik deskripsi: jika kolom SQL tidak null/undefined, gunakan kolom SQL.
    // Jika kolom SQL bernilai NULL di database, fallback ke JSON description, atau string kosong "".
    const description = row.deskripsi !== null && row.deskripsi !== undefined
      ? String(row.deskripsi)
      : (parsed.description ?? parsed.deskripsi ?? "");

    // Field dinamis yang hanya ada di JSON dipertahankan seutuhnya
    const code = parsed.code ? String(parsed.code) : "";
    const active = parsed.active !== undefined ? Boolean(parsed.active) : true;

    return {
      ...parsed, // 1. Pertahankan seluruh atribut dinamis tambahan yang ada di data_json
      id: row.id,
      code,
      name,
      category: category as any,
      active,
      basePrice,
      description,
      // 2. Properti alias bahasa Indonesia untuk kompatibilitas service & audit logs
      namaItem: name,
      kategori: category,
      tipeKendaraan,
      biayaDasar: basePrice,
      deskripsi: description,
    };
  }

  public getAllSamsatItems(): SamsatCostItem[] {
    const stmt = db.prepare("SELECT * FROM samsat_pricing ORDER BY kategori ASC, nama_item ASC");
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapRowToSamsatItem(r));
  }

  public getSamsatItemById(id: string): SamsatCostItem | undefined {
    const stmt = db.prepare("SELECT * FROM samsat_pricing WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return undefined;
    return this.mapRowToSamsatItem(row);
  }

  public updateSamsatItem(id: string, updates: Partial<SamsatCostItem>): boolean {
    const existing = this.getSamsatItemById(id);
    if (!existing) return false;

    // Resolve nilai kanonis dari updates atau existing (SQL-derived)
    const resolvedName = updates.namaItem !== undefined
      ? String(updates.namaItem)
      : (updates.name !== undefined ? String(updates.name) : existing.name);

    const resolvedCategory = updates.kategori !== undefined
      ? String(updates.kategori)
      : (updates.category !== undefined ? String(updates.category) : existing.category);

    const resolvedTipeKendaraan = (updates as any).tipeKendaraan !== undefined
      ? String((updates as any).tipeKendaraan)
      : ((updates as any).tipe_kendaraan !== undefined
          ? String((updates as any).tipe_kendaraan)
          : ((existing as any).tipeKendaraan || "Mobil"));

    const resolvedBasePrice = updates.biayaDasar !== undefined
      ? Number(updates.biayaDasar)
      : (updates.basePrice !== undefined ? Number(updates.basePrice) : existing.basePrice);

    const resolvedDeskripsi = updates.deskripsi !== undefined
      ? (updates.deskripsi !== null ? String(updates.deskripsi) : "")
      : (updates.description !== undefined ? (updates.description !== null ? String(updates.description) : "") : (existing.description || ""));

    // Sinkronkan seluruh payload data_json agar tidak bertentangan dengan kolom SQL fisik
    const mergedJsonPayload = {
      ...existing,
      ...updates,
      id,
      name: resolvedName,
      namaItem: resolvedName,
      category: resolvedCategory,
      kategori: resolvedCategory,
      tipeKendaraan: resolvedTipeKendaraan,
      basePrice: resolvedBasePrice,
      biayaDasar: resolvedBasePrice,
      description: resolvedDeskripsi,
      deskripsi: resolvedDeskripsi,
    };

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
      resolvedName,
      resolvedCategory,
      resolvedTipeKendaraan,
      resolvedBasePrice,
      resolvedDeskripsi,
      JSON.stringify(mergedJsonPayload),
      id
    );

    return res.changes > 0;
  }

  public addSamsatItem(item: SamsatCostItem): void {
    const resolvedName = item.namaItem !== undefined
      ? String(item.namaItem)
      : (item.name !== undefined ? String(item.name) : "Item Samsat");

    const resolvedCategory = item.kategori !== undefined
      ? String(item.kategori)
      : (item.category !== undefined ? String(item.category) : "Layanan Standar");

    const resolvedTipeKendaraan = (item as any).tipeKendaraan !== undefined
      ? String((item as any).tipeKendaraan)
      : ((item as any).tipe_kendaraan !== undefined ? String((item as any).tipe_kendaraan) : "Mobil");

    const resolvedBasePrice = item.biayaDasar !== undefined
      ? Number(item.biayaDasar)
      : (item.basePrice !== undefined ? Number(item.basePrice) : 0);

    const resolvedDeskripsi = item.deskripsi !== undefined
      ? (item.deskripsi !== null ? String(item.deskripsi) : "")
      : (item.description !== undefined ? (item.description !== null ? String(item.description) : "") : "");

    const jsonPayload = {
      ...item,
      id: item.id,
      name: resolvedName,
      namaItem: resolvedName,
      category: resolvedCategory,
      kategori: resolvedCategory,
      tipeKendaraan: resolvedTipeKendaraan,
      basePrice: resolvedBasePrice,
      biayaDasar: resolvedBasePrice,
      description: resolvedDeskripsi,
      deskripsi: resolvedDeskripsi,
    };

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO samsat_pricing (
        id, nama_item, kategori, tipe_kendaraan, biaya_dasar, deskripsi, data_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      item.id,
      resolvedName,
      resolvedCategory,
      resolvedTipeKendaraan,
      resolvedBasePrice,
      resolvedDeskripsi,
      JSON.stringify(jsonPayload)
    );
  }

  // ─── SERVICE PRICING CONFIGS (BIAYA LAYANAN) ────────────────────────────────

  public getAllServicePricing(): any[] {
    const stmt = db.prepare("SELECT * FROM service_pricing_configs ORDER BY service_name ASC, wilayah ASC");
    const rows = stmt.all() as any[];
    return rows.map((r) => {
      try {
        const parsed = JSON.parse(r.data_json);
        return {
          ...parsed,
          id: r.id,
          serviceId: r.service_id,
          serviceName: r.service_name,
          samsatId: r.samsat_id,
          wilayah: r.wilayah,
          biayaJasa: r.biaya_jasa,
          biayaAntarJemput: r.biaya_antar_jemput,
        };
      } catch {
        return {
          id: r.id,
          serviceId: r.service_id,
          serviceName: r.service_name,
          samsatId: r.samsat_id,
          wilayah: r.wilayah,
          biayaJasa: r.biaya_jasa,
          biayaAntarJemput: r.biaya_antar_jemput,
        };
      }
    });
  }

  public getServicePricingById(id: string): any {
    const stmt = db.prepare("SELECT * FROM service_pricing_configs WHERE id = ?");
    const r = stmt.get(id) as any;
    if (!r) return undefined;
    try {
      const parsed = JSON.parse(r.data_json);
      return {
        ...parsed,
        id: r.id,
        serviceId: r.service_id,
        serviceName: r.service_name,
        samsatId: r.samsat_id,
        wilayah: r.wilayah,
        biayaJasa: r.biaya_jasa,
        biayaAntarJemput: r.biaya_antar_jemput,
      };
    } catch {
      return r;
    }
  }

  public upsertServicePricing(id: string, config: any): boolean {
    const serviceId = config.serviceId || id.split(":")[0];
    const samsatId = config.samsatId || id.split(":")[1];
    const serviceName = config.serviceName || serviceId;
    const wilayah = config.wilayah || samsatId;
    const biayaJasa = Number(config.biayaJasa ?? config.biayaJasaLengkap ?? 0);
    const biayaAntarJemput = Number(config.biayaAntarJemput ?? 50000);

    const stmt = db.prepare(`
      INSERT INTO service_pricing_configs (
        id, service_id, service_name, samsat_id, wilayah, biaya_jasa, biaya_antar_jemput, data_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        service_id = excluded.service_id,
        service_name = excluded.service_name,
        samsat_id = excluded.samsat_id,
        wilayah = excluded.wilayah,
        biaya_jasa = excluded.biaya_jasa,
        biaya_antar_jemput = excluded.biaya_antar_jemput,
        data_json = excluded.data_json,
        updated_at = datetime('now')
    `);

    const res = stmt.run(
      id,
      serviceId,
      serviceName,
      samsatId,
      wilayah,
      biayaJasa,
      biayaAntarJemput,
      JSON.stringify(config)
    );

    return res.changes > 0;
  }

  public createServicePricing(id: string, config: any): any {
    const serviceId = config.serviceId || id.split(":")[0];
    const samsatId = config.samsatId || id.split(":")[1];
    const serviceName = config.serviceName || serviceId;
    const wilayah = config.wilayah || samsatId;
    const biayaJasa = Number(config.biayaJasa ?? config.biayaJasaLengkap ?? 0);
    const biayaAntarJemput = Number(config.biayaAntarJemput ?? 50000);

    const stmt = db.prepare(`
      INSERT INTO service_pricing_configs (
        id, service_id, service_name, samsat_id, wilayah, biaya_jasa, biaya_antar_jemput, data_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      id,
      serviceId,
      serviceName,
      samsatId,
      wilayah,
      biayaJasa,
      biayaAntarJemput,
      JSON.stringify({ ...config, id, serviceId, serviceName, samsatId, wilayah, biayaJasa, biayaAntarJemput })
    );

    return this.getServicePricingById(id);
  }

  public deleteServicePricing(id: string): boolean {
    const stmt = db.prepare("DELETE FROM service_pricing_configs WHERE id = ?");
    const res = stmt.run(id);
    return res.changes > 0;
  }
}

export const dbPricingRepository = new DbPricingRepository();
