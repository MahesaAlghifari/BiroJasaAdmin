/**
 * Pricing Domain Service
 * Admin SUN89 — Biro Jasa Management System
 */

import { dbPricingRepository } from "../repositories/dbPricingRepository";
import { dbAuditRepository } from "../repositories/dbAuditRepository";
import { SamsatCostItem } from "../../../src/domain/pricing/types";
import { ApiError } from "../middleware/errorHandler";
import { TokenPayload } from "../utils/crypto";

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
}

export const pricingService = new PricingService();
