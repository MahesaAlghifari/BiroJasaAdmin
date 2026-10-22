/**
 * Pricing Domain Service
 * Admin SUN89 — Biro Jasa Management System
 */

import { dbPricingRepository } from "../repositories/dbPricingRepository";
import { dbAuditRepository } from "../repositories/dbAuditRepository";
import { dbWilayahRepository } from "../repositories/dbWilayahRepository";
import { SamsatCostItem } from "../../../src/domain/pricing/types";
import { ApiError } from "../middleware/errorHandler";
import { TokenPayload } from "../utils/crypto";
import { normalizeSamsatPricingPayload, normalizeServicePricingPayload } from "../utils/aliasNormalizer";

export class PricingService {
  public getAllSamsatItems(): SamsatCostItem[] {
    return dbPricingRepository.getAllSamsatItems();
  }

  public getSamsatItemById(id: string): SamsatCostItem {
    const item = dbPricingRepository.getSamsatItemById(id);
    if (!item) {
      throw new ApiError(404, "ITEM_NOT_FOUND", `Item harga Samsat '${id}' tidak ditemukan.`);
    }
    return item;
  }

  public updateSamsatItem(id: string, updates: Partial<SamsatCostItem>, user?: TokenPayload | null): SamsatCostItem {
    const existing = this.getSamsatItemById(id);
    normalizeSamsatPricingPayload(updates);
    const success = dbPricingRepository.updateSamsatItem(id, updates);
    if (!success) {
      throw new ApiError(500, "UPDATE_FAILED", `Gagal memperbarui item Samsat ${id}`);
    }

    const updated = this.getSamsatItemById(id);

    dbAuditRepository.save({
      id: `log-pricing-upd-${Date.now()}`,
      userId: user?.userId || "usr-system",
      userName: user?.nama || "Admin API",
      userRole: user?.role || "admin",
      action: "UPDATE_PRICING",
      module: "Harga Dasar Samsat",
      details: `Memperbarui harga dasar ${updated.namaItem}: Rp ${updated.biayaDasar.toLocaleString("id-ID")}`,
      metadata: { itemId: id, updates },
      createdAt: new Date().toISOString(),
    });

    return updated;
  }

  // ─── SERVICE PRICING (BIAYA LAYANAN) ────────────────────────────────────────

  public getAllServicePricing(): any[] {
    return dbPricingRepository.getAllServicePricing();
  }

  public getServicePricingById(id: string): any {
    const item = dbPricingRepository.getServicePricingById(id);
    if (!item) {
      throw new ApiError(404, "NOT_FOUND", `Konfigurasi biaya layanan '${id}' tidak ditemukan.`);
    }
    return item;
  }

  public createServicePricing(payload: any, user?: TokenPayload | null): any {
    normalizeServicePricingPayload(payload);
    const serviceName = String(payload.serviceName || payload.layanan || payload.service_name || "").trim();
    const wilayah = String(payload.wilayah || payload.namaSamsat || "").trim();

    if (!serviceName || !wilayah) {
      throw new ApiError(400, "VALIDATION_ERROR", "Nama layanan dan wilayah Samsat wajib diisi.");
    }

    const slugify = (text: string) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const serviceId = payload.serviceId || payload.service_id || slugify(serviceName);
    const samsatId = payload.samsatId || payload.samsat_id || (wilayah.startsWith("samsat-") ? wilayah : `samsat-${slugify(wilayah)}`);
    const id = payload.id || `${serviceId}:${samsatId}`;

    // Referential integrity check: Samsat office must exist in samsat_offices master
    const samsatOffice = dbWilayahRepository.getSamsatOfficeById(samsatId);
    if (!samsatOffice) {
      const allOffices = dbWilayahRepository.getAllSamsatOffices();
      const matched = allOffices.find(
        (o) => o.name.toLowerCase().includes(wilayah.toLowerCase()) || o.wilayah.toLowerCase().includes(wilayah.toLowerCase())
      );
      if (!matched) {
        throw new ApiError(404, "SAMSAT_NOT_FOUND", `Kantor Samsat untuk wilayah '${wilayah}' (${samsatId}) tidak ditemukan dalam master data Samsat.`);
      }
    }

    const existing = dbPricingRepository.getServicePricingById(id);
    if (existing) {
      throw new ApiError(409, "DUPLICATE_CONFIG", `Konfigurasi biaya layanan '${serviceName}' untuk wilayah '${wilayah}' sudah terdaftar.`);
    }

    const biayaJasa = Number(payload.biayaJasa ?? payload.biayaJasaLengkap ?? 0);
    const biayaAntarJemput = Number(payload.biayaAntarJemput ?? 50000);

    if (!Number.isFinite(biayaJasa) || biayaJasa < 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Biaya jasa harus berupa nominal angka non-negatif yang valid.");
    }
    if (!Number.isFinite(biayaAntarJemput) || biayaAntarJemput < 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Biaya antar jemput harus berupa nominal angka non-negatif yang valid.");
    }

    const created = dbPricingRepository.createServicePricing(id, {
      ...payload,
      id,
      serviceId,
      serviceName,
      samsatId,
      wilayah,
      biayaJasa,
      biayaAntarJemput,
    });

    dbAuditRepository.save({
      id: `log-service-pricing-crt-${Date.now()}`,
      userId: user?.userId || "usr-system",
      userName: user?.nama || "Admin API",
      userRole: user?.role || "admin",
      action: "CREATE_SERVICE_PRICING",
      module: "Biaya Layanan",
      details: `Menambahkan konfigurasi biaya layanan ${serviceName} (${wilayah}): Jasa Rp ${biayaJasa.toLocaleString("id-ID")}`,
      metadata: { id, serviceId, samsatId, wilayah, biayaJasa, biayaAntarJemput },
      createdAt: new Date().toISOString(),
    });

    return created;
  }

  public updateServicePricing(id: string, config: any, user?: TokenPayload | null): any {
    const success = dbPricingRepository.upsertServicePricing(id, config);
    if (!success) {
      throw new ApiError(500, "UPDATE_FAILED", `Gagal memperbarui konfigurasi biaya layanan '${id}'`);
    }

    dbAuditRepository.save({
      id: `log-service-pricing-${Date.now()}`,
      userId: user?.userId || "usr-system",
      userName: user?.nama || "Admin API",
      userRole: user?.role || "admin",
      action: "UPDATE_SERVICE_PRICING",
      module: "Biaya Layanan",
      details: `Memperbarui biaya layanan ${id}: Jasa Rp ${Number(config.biayaJasa || 0).toLocaleString("id-ID")}`,
      metadata: { id, config },
      createdAt: new Date().toISOString(),
    });

    return dbPricingRepository.getServicePricingById(id);
  }

  public deleteServicePricing(id: string, user?: TokenPayload | null): boolean {
    const existing = dbPricingRepository.getServicePricingById(id);
    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", `Konfigurasi biaya layanan '${id}' tidak ditemukan.`);
    }

    const success = dbPricingRepository.deleteServicePricing(id);
    if (!success) {
      throw new ApiError(500, "DELETE_FAILED", `Gagal menghapus konfigurasi biaya layanan '${id}'.`);
    }

    dbAuditRepository.save({
      id: `log-service-pricing-del-${Date.now()}`,
      userId: user?.userId || "usr-system",
      userName: user?.nama || "Admin API",
      userRole: user?.role || "admin",
      action: "DELETE_SERVICE_PRICING",
      module: "Biaya Layanan",
      details: `Menghapus konfigurasi biaya layanan ${existing.serviceName || id} (${existing.wilayah || ""})`,
      metadata: { id, serviceName: existing.serviceName, wilayah: existing.wilayah },
      createdAt: new Date().toISOString(),
    });

    return true;
  }
}

export const pricingService = new PricingService();
