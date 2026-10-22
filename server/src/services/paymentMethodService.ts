/**
 * Payment Method Service
 * Admin SUN89 — Biro Jasa Management System
 */

import { dbPaymentMethodRepository, PaymentMethodEntity } from "../repositories/dbPaymentMethodRepository";

export class PaymentMethodService {
  public getAll(activeOnly = false): PaymentMethodEntity[] {
    return activeOnly ? dbPaymentMethodRepository.getActive() : dbPaymentMethodRepository.getAll();
  }

  public getById(id: string): PaymentMethodEntity | undefined {
    return dbPaymentMethodRepository.getById(id);
  }

  public create(data: {
    nama_metode: string;
    bank: string;
    nama_rekening?: string;
    nomor_rekening?: string;
    status?: "Aktif" | "Nonaktif";
  }): PaymentMethodEntity {
    const nama = (data.nama_metode || "").trim();
    if (!nama) {
      throw new Error("Nama metode pembayaran wajib diisi.");
    }

    const bank = (data.bank || "").trim();
    if (!bank) {
      throw new Error("Bank / penyedia pembayaran wajib diisi.");
    }

    const existing = dbPaymentMethodRepository.getByNama(nama);
    if (existing) {
      throw new Error(`Metode pembayaran '${nama}' sudah terdaftar. Gunakan nama lain.`);
    }

    const isCash = bank.toLowerCase().includes("tunai") || bank.toLowerCase() === "cash" || nama.toLowerCase() === "cash";
    if (!isCash && (!data.nomor_rekening || !data.nomor_rekening.trim())) {
      // For bank transfer, account number should be provided
      if (bank.toLowerCase() !== "qris") {
        throw new Error("Nomor rekening wajib diisi untuk transfer bank.");
      }
    }

    return dbPaymentMethodRepository.create({
      nama_metode: nama,
      bank,
      nama_rekening: data.nama_rekening || "",
      nomor_rekening: data.nomor_rekening || "",
      status: data.status || "Aktif",
    });
  }

  public update(id: string, updates: Partial<PaymentMethodEntity>): PaymentMethodEntity {
    const existing = dbPaymentMethodRepository.getById(id);
    if (!existing) {
      throw new Error("Metode pembayaran tidak ditemukan.");
    }

    if (updates.nama_metode !== undefined) {
      const nama = updates.nama_metode.trim();
      if (!nama) throw new Error("Nama metode pembayaran tidak boleh kosong.");
      const duplicate = dbPaymentMethodRepository.getByNama(nama);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`Nama metode '${nama}' sudah digunakan oleh metode lain.`);
      }
    }

    const updated = dbPaymentMethodRepository.update(id, updates);
    if (!updated) {
      throw new Error("Gagal memperbarui metode pembayaran.");
    }
    return updated;
  }

  public delete(id: string): { success: boolean; deactivated?: boolean; message: string } {
    const res = dbPaymentMethodRepository.delete(id, true);
    if (!res.success && !res.deactivated) {
      throw new Error(res.message || "Gagal menghapus metode pembayaran.");
    }
    return {
      success: res.success,
      deactivated: res.deactivated,
      message: res.message || "Metode pembayaran berhasil diproses.",
    };
  }
}

export const paymentMethodService = new PaymentMethodService();
