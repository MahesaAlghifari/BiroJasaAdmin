/**
 * Master Pricing Store — Authoritative Single Source of Truth for Master Pricing
 * Admin SUN89 — Biro Jasa Management System
 * 
 * INTEGRATION PIPELINE:
 * Harga Dasar Samsat (per-Samsat item amounts)
 *         ↓
 * Biaya Layanan (service + samsat -> biaya jasa, antar jemput, enabled components)
 *         ↓
 * Buat Order (pure calculator consumer)
 *         ↓
 * Order Cost Breakdown & Immutable Snapshot
 *         ↓
 * Finance Invoice
 */

import { useState, useEffect } from "react";
import {
  SamsatMasterItem,
  PricingItem,
  SamsatCostItem,
  ServiceFeeConfig,
  ServiceComponentConfig,
  ServiceCostItem,
  ServicePackageConfig,
  OrderCostBreakdownItem,
  OrderCostSnapshot,
} from "../../domain/pricing/types";
import { auditLog } from "../utils/auditLog";
import { pricingRepository } from "../../data/repositories/pricingRepository";
import { APP_CONFIG } from "../config/appConfig";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Authoritative Samsat Master List
// ─────────────────────────────────────────────────────────────────────────────
export const SAMSAT_LIST: SamsatMasterItem[] = [
  { id: "samsat-jakarta-timur", name: "Samsat Jakarta Timur", wilayah: "Jakarta Timur", alamat: "Jl. Raya Pondok Gede" },
  { id: "samsat-jakarta-barat", name: "Samsat Jakarta Barat", wilayah: "Jakarta Barat", alamat: "Jl. Daan Mogot" },
  { id: "samsat-jakarta-selatan", name: "Samsat Jakarta Selatan", wilayah: "Jakarta Selatan", alamat: "Jl. TB Simatupang" },
  { id: "samsat-jakarta-utara", name: "Samsat Jakarta Utara", wilayah: "Jakarta Utara", alamat: "Jl. Yos Sudarso" },
  { id: "samsat-jakarta-pusat", name: "Samsat Jakarta Pusat", wilayah: "Jakarta Pusat", alamat: "Jl. Gn. Sahari" },
  { id: "samsat-depok", name: "Samsat Depok", wilayah: "Depok", alamat: "Jl. Margonda Raya" },
  { id: "samsat-bekasi", name: "Samsat Bekasi", wilayah: "Bekasi", alamat: "Jl. Ahmad Yani" },
  { id: "samsat-tangerang", name: "Samsat Tangerang", wilayah: "Tangerang", alamat: "Jl. Gatot Subroto" },
  { id: "samsat-bogor", name: "Samsat Bogor", wilayah: "Bogor", alamat: "Jl. Pajajaran" },
  { id: "samsat-tangerang-selatan", name: "Samsat Tangerang Selatan", wilayah: "Tangerang Selatan", alamat: "Jl. Pahlawan Seribu" },
];

export function resolveSamsatId(input?: string): string {
  if (!input) return "samsat-jakarta-timur";
  const normalized = input.toLowerCase().trim();
  if (normalized.includes("timur")) return "samsat-jakarta-timur";
  if (normalized.includes("barat")) return "samsat-jakarta-barat";
  if (normalized.includes("selatan") && !normalized.includes("tangerang")) return "samsat-jakarta-selatan";
  if (normalized.includes("utara")) return "samsat-jakarta-utara";
  if (normalized.includes("pusat")) return "samsat-jakarta-pusat";
  if (normalized.includes("depok")) return "samsat-depok";
  if (normalized.includes("bekasi")) return "samsat-bekasi";
  if (normalized.includes("tangerang selatan") || normalized.includes("tangsel")) return "samsat-tangerang-selatan";
  if (normalized.includes("tangerang")) return "samsat-tangerang";
  if (normalized.includes("bogor")) return "samsat-bogor";
  return "samsat-jakarta-timur";
}

export function resolveServiceId(input?: string): string {
  if (!input) return "mutasi-antar-samsat";
  const normalized = input.toLowerCase().trim();
  if (normalized.includes("antar")) return "mutasi-antar-samsat";
  if (normalized.includes("luar")) return "mutasi-luar-daerah";
  if (normalized.includes("1 tahun") || normalized.includes("1-tahun")) return "perpanjangan-1-tahun";
  if (normalized.includes("5 tahun") || normalized.includes("5-tahun")) return "perpanjangan-5-tahun";
  if (normalized.includes("balik nama") || normalized.includes("balik-nama")) return "balik-nama";
  if (normalized.includes("tarik berkas") || normalized.includes("tarik-berkas")) return "tarik-berkas";
  if (normalized.includes("duplikat")) return "duplikat-stnk";
  return "mutasi-antar-samsat";
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Authoritative Pricing Items (Master Component Catalog)
// ─────────────────────────────────────────────────────────────────────────────
export const MASTER_PRICING_ITEMS: PricingItem[] = [
  // 17 Mutasi Keluar
  { id: "mutasi-legalisir", code: "MK-01", name: "Legalisir", category: "Mutasi Keluar", active: true },
  { id: "mutasi-hadir", code: "MK-02", name: "Hadir", category: "Mutasi Keluar", active: true },
  { id: "mutasi-legalisir-cf", code: "MK-03", name: "Legalisir CF", category: "Mutasi Keluar", active: true },
  { id: "mutasi-cf", code: "MK-04", name: "Cek Fisik", category: "Mutasi Keluar", active: true },
  { id: "mutasi-bantuan", code: "MK-05", name: "Bantuan", category: "Mutasi Keluar", active: true },
  { id: "mutasi-hadir2", code: "MK-06", name: "Hadir 2", category: "Mutasi Keluar", active: true },
  { id: "mutasi-cek-blokir", code: "MK-07", name: "Cek Blokir", category: "Mutasi Keluar", active: true },
  { id: "mutasi-lok-pembukuan", code: "MK-08", name: "Lok. Pembukuan", category: "Mutasi Keluar", active: true },
  { id: "mutasi-lok-tu", code: "MK-09", name: "Lok. TU", category: "Mutasi Keluar", active: true },
  { id: "mutasi-lok-tu-nopil", code: "MK-10", name: "Lok. TU Nopil", category: "Mutasi Keluar", active: true },
  { id: "mutasi-loksus", code: "MK-11", name: "Loksus", category: "Mutasi Keluar", active: true },
  { id: "mutasi-cetak-skp", code: "MK-12", name: "Cetak SKP", category: "Mutasi Keluar", active: true },
  { id: "mutasi-cetak-fiskal", code: "MK-13", name: "Cetak Fiskal", category: "Mutasi Keluar", active: true },
  { id: "mutasi-lok-arsip", code: "MK-14", name: "Lok. Arsip", category: "Mutasi Keluar", active: true },
  { id: "mutasi-cek-progresif", code: "MK-15", name: "Cek Progresif", category: "Mutasi Keluar", active: true },
  { id: "mutasi-matiin-nopil", code: "MK-16", name: "Matiin Nopil", category: "Mutasi Keluar", active: true },
  { id: "mutasi-daftar-mutmas-normal", code: "MK-17", name: "Daftar Mutmas Normal", category: "Mutasi Keluar", active: true },
  { id: "mutasi-daftar-mutmas-kilat", code: "MK-18", name: "Daftar Mutmas Kilat", category: "Mutasi Keluar", active: true },

  // 13 Mutasi Masuk
  { id: "mutasi-legalisir-mutmas", code: "MM-01", name: "Legalisir Mutmas", category: "Mutasi Masuk", active: true },
  { id: "mutasi-mutmas-pendaftaran", code: "MM-02", name: "Mutmas By Pendaftaran", category: "Mutasi Masuk", active: true },
  { id: "mutasi-req-ganjil-genap", code: "MM-03", name: "Req Ganjil Genap", category: "Mutasi Masuk", active: true },
  { id: "mutasi-acak", code: "MM-04", name: "Nopol Acak", category: "Mutasi Masuk", active: true },
  { id: "mutasi-lok-tu-masuk", code: "MM-05", name: "Lok. TU Masuk", category: "Mutasi Masuk", active: true },
  { id: "mutasi-lok-pembukuan-masuk", code: "MM-06", name: "Lok. Pembukuan Masuk", category: "Mutasi Masuk", active: true },
  { id: "mutasi-daftar-bpkb", code: "MM-07", name: "Daftar BPKB", category: "Mutasi Masuk", active: true },
  { id: "mutasi-penulisan-bpkb", code: "MM-08", name: "Penulisan BPKB", category: "Mutasi Masuk", active: true },
  { id: "mutasi-cetak-notice", code: "MM-09", name: "Cetak Notice", category: "Mutasi Masuk", active: true },
  { id: "mutasi-cetak-stnk", code: "MM-10", name: "Cetak STNK", category: "Mutasi Masuk", active: true },
  { id: "mutasi-cetak-plat", code: "MM-11", name: "Cetak Plat", category: "Mutasi Masuk", active: true },

  // 5 Layanan Standar Samsat
  { id: "std-cek-fisik", code: "STD-01", name: "Cek Fisik Kendaraan Standar", category: "Layanan Standar", active: true },
  { id: "std-pendaftaran", code: "STD-02", name: "Pendaftaran & Verifikasi Loket", category: "Layanan Standar", active: true },
  { id: "std-cetak-stnk", code: "STD-03", name: "Pencetakan STNK", category: "Layanan Standar", active: true },
  { id: "std-cetak-plat", code: "STD-04", name: "Pencetakan Plat Nomor", category: "Layanan Standar", active: true },
  { id: "std-validasi-bpkb", code: "STD-05", name: "Validasi BPKB / Rubentina", category: "Layanan Standar", active: true },
];

// Mapping helper from key in initialMutasiAS row to pricingItemId
const MUTASI_AS_ROW_KEY_MAP: Record<string, string> = {
  legalisir: "mutasi-legalisir",
  hadir: "mutasi-hadir",
  legalisirCf: "mutasi-legalisir-cf",
  cf: "mutasi-cf",
  bantuan: "mutasi-bantuan",
  hadir2: "mutasi-hadir2",
  cekBlokir: "mutasi-cek-blokir",
  lokPembukuan: "mutasi-lok-pembukuan",
  lokTu: "mutasi-lok-tu",
  lokTuNopil: "mutasi-lok-tu-nopil",
  loksus: "mutasi-loksus",
  cetakSkp: "mutasi-cetak-skp",
  cetakFiskal: "mutasi-cetak-fiskal",
  lokArsip: "mutasi-lok-arsip",
  cekProgresif: "mutasi-cek-progresif",
  matiinNopil: "mutasi-matiin-nopil",
  daftarMutmasNormal: "mutasi-daftar-mutmas-normal",
  daftarMutmasKilat: "mutasi-daftar-mutmas-kilat",
  legalisirMutmas: "mutasi-legalisir-mutmas",
  mutmasByPendaftaran: "mutasi-mutmas-pendaftaran",
  reqGanjilGenap: "mutasi-req-ganjil-genap",
  acak: "mutasi-acak",
  lokTuMasuk: "mutasi-lok-tu-masuk",
  lokPembukuanMasuk: "mutasi-lok-pembukuan-masuk",
  daftarBpkb: "mutasi-daftar-bpkb",
  penulisanBpkb: "mutasi-penulisan-bpkb",
  cetakNotice: "mutasi-cetak-notice",
  cetakStnk: "mutasi-cetak-stnk",
  cetakPlat: "mutasi-cetak-plat",
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Pricing Store (Authoritative Singleton)
// ─────────────────────────────────────────────────────────────────────────────
class PricingStore {
  // Samsat ID -> Map<pricingItemId, amount>
  private samsatPricing: Map<string, Map<string, number>> = new Map();

  // Service ID + Samsat ID -> ServiceFeeConfig
  private serviceConfigs: Map<string, ServiceFeeConfig> = new Map();

  // Raw table rows for sync with UI components
  private samsats: SamsatMasterItem[] = [...SAMSAT_LIST];
  private mutasiASRows: any[] = [];
  private mutasiLDRows: any[] = [];
  private balikNamaRows: any[] = [];
  private tarikBerkasRows: any[] = [];
  private duplikatSTNKRows: any[] = [];
  private biayaLayananRows: any[] = [];
  private hargaDasarRows: any[] = [];

  private listeners: Set<() => void> = new Set();
  private isApiMode: boolean;
  private unsubscribeRepo?: () => void;

  constructor() {
    this.seed();
    this.isApiMode = APP_CONFIG.dataProvider === "api";
    if (this.isApiMode) {
      this.syncFromRepository();
      this.unsubscribeRepo = pricingRepository.subscribe(() => {
        this.syncFromRepository();
      });
    }
  }

  public setApiMode(isApi: boolean): void {
    this.isApiMode = isApi;
    if (this.unsubscribeRepo) {
      this.unsubscribeRepo();
      this.unsubscribeRepo = undefined;
    }
    if (isApi) {
      this.syncFromRepository();
      this.unsubscribeRepo = pricingRepository.subscribe(() => {
        this.syncFromRepository();
      });
    } else {
      this.seed();
      this.notify();
    }
  }

  public syncFromRepository(): void {
    const items = pricingRepository.getSamsatItems();
    if (!Array.isArray(items) || items.length === 0) return;

    items.forEach((item) => {
      const price = item.basePrice || 0;
      this.samsatPricing.forEach((map) => {
        map.set(item.id, price);
      });
    });

    this.notify();
  }

  private seed() {
    // 1. Seed Mutasi AS table rows (from HargaDasarSamsat baseline)
    this.mutasiASRows = [
      {
        id: 1,
        namaSamsat: "Samsat Jakarta Timur",
        legalisir: 50000, hadir: 75000, legalisirCf: 100000, cf: 80000, bantuan: 60000, hadir2: 70000,
        cekBlokir: 25000, lokPembukuan: 30000, lokTu: 35000, lokTuNopil: 40000, loksus: 45000,
        cetakSkp: 20000, cetakFiskal: 25000, lokArsip: 30000, cekProgresif: 50000, matiinNopil: 35000,
        daftarMutmasNormal: 150000, daftarMutmasKilat: 250000,
        legalisirMutmas: 100000, mutmasByPendaftaran: 50000, reqGanjilGenap: 50000, acak: 40000,
        lokTuMasuk: 35000, lokPembukuanMasuk: 30000, daftarBpkb: 150000, penulisanBpkb: 100000,
        cetakNotice: 25000, cetakStnk: 50000, cetakPlat: 75000,
      },
      {
        id: 2,
        namaSamsat: "Samsat Jakarta Barat",
        legalisir: 50000, hadir: 75000, legalisirCf: 100000, cf: 80000, bantuan: 60000, hadir2: 70000,
        cekBlokir: 25000, lokPembukuan: 30000, lokTu: 35000, lokTuNopil: 40000, loksus: 45000,
        cetakSkp: 20000, cetakFiskal: 25000, lokArsip: 30000, cekProgresif: 50000, matiinNopil: 35000,
        daftarMutmasNormal: 150000, daftarMutmasKilat: 250000,
        legalisirMutmas: 100000, mutmasByPendaftaran: 50000, reqGanjilGenap: 50000, acak: 40000,
        lokTuMasuk: 35000, lokPembukuanMasuk: 30000, daftarBpkb: 150000, penulisanBpkb: 100000,
        cetakNotice: 25000, cetakStnk: 50000, cetakPlat: 75000,
      },
      {
        id: 3,
        namaSamsat: "Samsat Depok",
        legalisir: 45000, hadir: 70000, legalisirCf: 95000, cf: 75000, bantuan: 55000, hadir2: 65000,
        cekBlokir: 23000, lokPembukuan: 28000, lokTu: 33000, lokTuNopil: 38000, loksus: 43000,
        cetakSkp: 18000, cetakFiskal: 23000, lokArsip: 28000, cekProgresif: 48000, matiinNopil: 33000,
        daftarMutmasNormal: 140000, daftarMutmasKilat: 240000,
        legalisirMutmas: 95000, mutmasByPendaftaran: 48000, reqGanjilGenap: 48000, acak: 38000,
        lokTuMasuk: 33000, lokPembukuanMasuk: 28000, daftarBpkb: 140000, penulisanBpkb: 95000,
        cetakNotice: 23000, cetakStnk: 48000, cetakPlat: 70000,
      },
    ];

    // Seed Samsat pricing from mutasiASRows
    this.mutasiASRows.forEach((row) => {
      const samsatId = resolveSamsatId(row.namaSamsat);
      let priceMap = this.samsatPricing.get(samsatId);
      if (!priceMap) {
        priceMap = new Map();
        this.samsatPricing.set(samsatId, priceMap);
      }
      for (const [key, pricingItemId] of Object.entries(MUTASI_AS_ROW_KEY_MAP)) {
        if (row[key] !== undefined && typeof row[key] === "number") {
          priceMap.set(pricingItemId, row[key]);
        }
      }
    });

    // Populate all other Samsats with baseline prices
    SAMSAT_LIST.forEach((samsat) => {
      if (!this.samsatPricing.has(samsat.id)) {
        const defaultMap = new Map();
        const baseRow = this.mutasiASRows[0];
        for (const [key, pricingItemId] of Object.entries(MUTASI_AS_ROW_KEY_MAP)) {
          defaultMap.set(pricingItemId, baseRow[key] || 50000);
        }
        // Standard items
        defaultMap.set("std-cek-fisik", 30000);
        defaultMap.set("std-pendaftaran", 20000);
        defaultMap.set("std-cetak-stnk", 25000);
        defaultMap.set("std-cetak-plat", 35000);
        defaultMap.set("std-validasi-bpkb", 50000);
        this.samsatPricing.set(samsat.id, defaultMap);
      } else {
        const existing = this.samsatPricing.get(samsat.id)!;
        if (!existing.has("std-cek-fisik")) existing.set("std-cek-fisik", 30000);
        if (!existing.has("std-pendaftaran")) existing.set("std-pendaftaran", 20000);
        if (!existing.has("std-cetak-stnk")) existing.set("std-cetak-stnk", 25000);
        if (!existing.has("std-cetak-plat")) existing.set("std-cetak-plat", 35000);
        if (!existing.has("std-validasi-bpkb")) existing.set("std-validasi-bpkb", 50000);
      }
    });

    // Ensure all 10 Samsats exist in mutasiASRows
    SAMSAT_LIST.forEach((s) => {
      if (!this.mutasiASRows.some((r) => resolveSamsatId(r.namaSamsat) === s.id)) {
        const baseRow = this.mutasiASRows[0];
        this.mutasiASRows.push({
          ...baseRow,
          id: this.mutasiASRows.length + 1,
          namaSamsat: s.name,
        });
      }
    });

    // Seed other Harga Dasar Samsat sub-tabs for all 10 Samsats
    this.mutasiLDRows = SAMSAT_LIST.map((s, idx) => ({
      id: idx + 1,
      namaSamsat: s.name,
      totalBiaya: s.id === "samsat-depok" ? 480000 : s.id === "samsat-tangerang" ? 520000 : 500000,
    }));

    this.balikNamaRows = SAMSAT_LIST.map((s, idx) => ({
      id: idx + 1,
      namaSamsat: s.name,
      biayaPengurusan: s.id === "samsat-depok" ? 190000 : 200000,
      biayaAdmin: s.id === "samsat-depok" ? 48000 : 50000,
      biayaLegalisir: s.id === "samsat-depok" ? 70000 : 75000,
      biayaCetak: s.id === "samsat-depok" ? 95000 : 100000,
      totalEstimasi: s.id === "samsat-depok" ? 403000 : 425000,
    }));

    this.tarikBerkasRows = SAMSAT_LIST.map((s, idx) => ({
      id: idx + 1,
      namaSamsat: s.name,
      biayaPengambilan: s.id === "samsat-depok" ? 140000 : 150000,
      biayaAdmin: s.id === "samsat-depok" ? 48000 : 50000,
      biayaEkspedisi: s.id === "samsat-depok" ? 70000 : 75000,
      totalEstimasi: s.id === "samsat-depok" ? 258000 : 275000,
    }));

    this.duplikatSTNKRows = SAMSAT_LIST.map((s, idx) => ({
      id: idx + 1,
      namaSamsat: s.name,
      biayaPembuatan: s.id === "samsat-depok" ? 95000 : 100000,
      biayaAdmin: s.id === "samsat-depok" ? 48000 : 50000,
      biayaCetak: s.id === "samsat-depok" ? 70000 : 75000,
      biayaValidasi: s.id === "samsat-depok" ? 48000 : 50000,
      totalEstimasi: s.id === "samsat-depok" ? 261000 : 275000,
    }));

    this.hargaDasarRows = SAMSAT_LIST.map((s, idx) => ({
      id: idx + 1,
      namaSamsat: s.name,
      hargaDasar: 150000,
      adminSamsat: 50000,
      jasa: 75000,
      totalEstimasi: 275000,
    }));

    // 2. Seed Biaya Layanan table rows (from BiayaLayanan.tsx baseline)
    this.biayaLayananRows = [
      // Perpanjangan 1 Tahun
      { id: 1, layanan: "Perpanjangan 1 Tahun", wilayah: "Jakarta Timur", biayaJasaLengkap: 250000, biayaJasaNembak: 150000, biayaAntarJemput: 50000 },
      { id: 2, layanan: "Perpanjangan 1 Tahun", wilayah: "Jakarta Barat", biayaJasaLengkap: 250000, biayaJasaNembak: 150000, biayaAntarJemput: 50000 },
      { id: 3, layanan: "Perpanjangan 1 Tahun", wilayah: "Jakarta Selatan", biayaJasaLengkap: 250000, biayaJasaNembak: 150000, biayaAntarJemput: 50000 },
      { id: 4, layanan: "Perpanjangan 1 Tahun", wilayah: "Jakarta Utara", biayaJasaLengkap: 250000, biayaJasaNembak: 150000, biayaAntarJemput: 50000 },
      { id: 5, layanan: "Perpanjangan 1 Tahun", wilayah: "Jakarta Pusat", biayaJasaLengkap: 250000, biayaJasaNembak: 150000, biayaAntarJemput: 50000 },
      { id: 6, layanan: "Perpanjangan 1 Tahun", wilayah: "Depok", biayaJasaLengkap: 230000, biayaJasaNembak: 140000, biayaAntarJemput: 60000 },
      { id: 7, layanan: "Perpanjangan 1 Tahun", wilayah: "Bekasi", biayaJasaLengkap: 240000, biayaJasaNembak: 145000, biayaAntarJemput: 55000 },
      { id: 8, layanan: "Perpanjangan 1 Tahun", wilayah: "Tangerang", biayaJasaLengkap: 240000, biayaJasaNembak: 145000, biayaAntarJemput: 55000 },
      { id: 9, layanan: "Perpanjangan 1 Tahun", wilayah: "Bogor", biayaJasaLengkap: 230000, biayaJasaNembak: 140000, biayaAntarJemput: 65000 },
      { id: 10, layanan: "Perpanjangan 1 Tahun", wilayah: "Tangerang Selatan", biayaJasaLengkap: 245000, biayaJasaNembak: 148000, biayaAntarJemput: 52000 },

      // Perpanjangan 5 Tahun
      { id: 11, layanan: "Perpanjangan 5 Tahun", wilayah: "Jakarta Timur", biayaJasaLengkap: 500000, biayaJasaNembak: 300000, biayaAntarJemput: 50000 },
      { id: 12, layanan: "Perpanjangan 5 Tahun", wilayah: "Jakarta Barat", biayaJasaLengkap: 500000, biayaJasaNembak: 300000, biayaAntarJemput: 50000 },
      { id: 13, layanan: "Perpanjangan 5 Tahun", wilayah: "Jakarta Selatan", biayaJasaLengkap: 500000, biayaJasaNembak: 300000, biayaAntarJemput: 50000 },
      { id: 14, layanan: "Perpanjangan 5 Tahun", wilayah: "Jakarta Utara", biayaJasaLengkap: 500000, biayaJasaNembak: 300000, biayaAntarJemput: 50000 },
      { id: 15, layanan: "Perpanjangan 5 Tahun", wilayah: "Jakarta Pusat", biayaJasaLengkap: 500000, biayaJasaNembak: 300000, biayaAntarJemput: 50000 },
      { id: 16, layanan: "Perpanjangan 5 Tahun", wilayah: "Depok", biayaJasaLengkap: 480000, biayaJasaNembak: 290000, biayaAntarJemput: 60000 },
      { id: 17, layanan: "Perpanjangan 5 Tahun", wilayah: "Bekasi", biayaJasaLengkap: 490000, biayaJasaNembak: 295000, biayaAntarJemput: 55000 },
      { id: 18, layanan: "Perpanjangan 5 Tahun", wilayah: "Tangerang", biayaJasaLengkap: 490000, biayaJasaNembak: 295000, biayaAntarJemput: 55000 },
      { id: 19, layanan: "Perpanjangan 5 Tahun", wilayah: "Bogor", biayaJasaLengkap: 480000, biayaJasaNembak: 290000, biayaAntarJemput: 65000 },
      { id: 20, layanan: "Perpanjangan 5 Tahun", wilayah: "Tangerang Selatan", biayaJasaLengkap: 495000, biayaJasaNembak: 298000, biayaAntarJemput: 52000 },

      // Mutasi Antar Samsat (Biaya Jasa Jakarta Timur = 800000)
      { id: 21, layanan: "Mutasi Antar Samsat", wilayah: "Jakarta Timur", biayaJasa: 800000, biayaAntarJemput: 50000 },
      { id: 22, layanan: "Mutasi Antar Samsat", wilayah: "Jakarta Barat", biayaJasa: 800000, biayaAntarJemput: 50000 },
      { id: 23, layanan: "Mutasi Antar Samsat", wilayah: "Jakarta Selatan", biayaJasa: 800000, biayaAntarJemput: 50000 },
      { id: 24, layanan: "Mutasi Antar Samsat", wilayah: "Jakarta Utara", biayaJasa: 800000, biayaAntarJemput: 50000 },
      { id: 25, layanan: "Mutasi Antar Samsat", wilayah: "Jakarta Pusat", biayaJasa: 800000, biayaAntarJemput: 50000 },
      { id: 26, layanan: "Mutasi Antar Samsat", wilayah: "Depok", biayaJasa: 750000, biayaAntarJemput: 60000 },
      { id: 27, layanan: "Mutasi Antar Samsat", wilayah: "Bekasi", biayaJasa: 780000, biayaAntarJemput: 55000 },
      { id: 28, layanan: "Mutasi Antar Samsat", wilayah: "Tangerang", biayaJasa: 780000, biayaAntarJemput: 55000 },
      { id: 29, layanan: "Mutasi Antar Samsat", wilayah: "Bogor", biayaJasa: 750000, biayaAntarJemput: 65000 },
      { id: 30, layanan: "Mutasi Antar Samsat", wilayah: "Tangerang Selatan", biayaJasa: 790000, biayaAntarJemput: 52000 },

      // Mutasi Luar Daerah
      { id: 31, layanan: "Mutasi Luar Daerah", wilayah: "Jakarta Timur", biayaJasa: 1500000, biayaAntarJemput: 50000 },
      { id: 32, layanan: "Mutasi Luar Daerah", wilayah: "Jakarta Barat", biayaJasa: 1500000, biayaAntarJemput: 50000 },
      { id: 33, layanan: "Mutasi Luar Daerah", wilayah: "Jakarta Selatan", biayaJasa: 1500000, biayaAntarJemput: 50000 },
      { id: 34, layanan: "Mutasi Luar Daerah", wilayah: "Jakarta Utara", biayaJasa: 1500000, biayaAntarJemput: 50000 },
      { id: 35, layanan: "Mutasi Luar Daerah", wilayah: "Jakarta Pusat", biayaJasa: 1500000, biayaAntarJemput: 50000 },
      { id: 36, layanan: "Mutasi Luar Daerah", wilayah: "Depok", biayaJasa: 1400000, biayaAntarJemput: 60000 },
      { id: 37, layanan: "Mutasi Luar Daerah", wilayah: "Bekasi", biayaJasa: 1450000, biayaAntarJemput: 55000 },
      { id: 38, layanan: "Mutasi Luar Daerah", wilayah: "Tangerang", biayaJasa: 1450000, biayaAntarJemput: 55000 },
      { id: 39, layanan: "Mutasi Luar Daerah", wilayah: "Bogor", biayaJasa: 1400000, biayaAntarJemput: 65000 },
      { id: 40, layanan: "Mutasi Luar Daerah", wilayah: "Tangerang Selatan", biayaJasa: 1475000, biayaAntarJemput: 52000 },

      // Balik Nama
      { id: 41, layanan: "Balik Nama", wilayah: "Jakarta Timur", biayaJasa: 1200000, biayaAntarJemput: 50000 },
      { id: 42, layanan: "Balik Nama", wilayah: "Jakarta Barat", biayaJasa: 1200000, biayaAntarJemput: 50000 },
      { id: 43, layanan: "Balik Nama", wilayah: "Jakarta Selatan", biayaJasa: 1200000, biayaAntarJemput: 50000 },
      { id: 44, layanan: "Balik Nama", wilayah: "Jakarta Utara", biayaJasa: 1200000, biayaAntarJemput: 50000 },
      { id: 45, layanan: "Balik Nama", wilayah: "Jakarta Pusat", biayaJasa: 1200000, biayaAntarJemput: 50000 },
      { id: 46, layanan: "Balik Nama", wilayah: "Depok", biayaJasa: 1100000, biayaAntarJemput: 60000 },
      { id: 47, layanan: "Balik Nama", wilayah: "Bekasi", biayaJasa: 1150000, biayaAntarJemput: 55000 },
      { id: 48, layanan: "Balik Nama", wilayah: "Tangerang", biayaJasa: 1150000, biayaAntarJemput: 55000 },
      { id: 49, layanan: "Balik Nama", wilayah: "Bogor", biayaJasa: 1100000, biayaAntarJemput: 65000 },
      { id: 50, layanan: "Balik Nama", wilayah: "Tangerang Selatan", biayaJasa: 1175000, biayaAntarJemput: 52000 },

      // Tarik Berkas
      { id: 51, layanan: "Tarik Berkas", wilayah: "Jakarta Timur", biayaJasa: 600000, biayaAntarJemput: 50000 },
      { id: 52, layanan: "Tarik Berkas", wilayah: "Jakarta Barat", biayaJasa: 600000, biayaAntarJemput: 50000 },
      { id: 53, layanan: "Tarik Berkas", wilayah: "Jakarta Selatan", biayaJasa: 600000, biayaAntarJemput: 50000 },
      { id: 54, layanan: "Tarik Berkas", wilayah: "Jakarta Utara", biayaJasa: 600000, biayaAntarJemput: 50000 },
      { id: 55, layanan: "Tarik Berkas", wilayah: "Jakarta Pusat", biayaJasa: 600000, biayaAntarJemput: 50000 },
      { id: 56, layanan: "Tarik Berkas", wilayah: "Depok", biayaJasa: 550000, biayaAntarJemput: 60000 },
      { id: 57, layanan: "Tarik Berkas", wilayah: "Bekasi", biayaJasa: 580000, biayaAntarJemput: 55000 },
      { id: 58, layanan: "Tarik Berkas", wilayah: "Tangerang", biayaJasa: 580000, biayaAntarJemput: 55000 },
      { id: 59, layanan: "Tarik Berkas", wilayah: "Bogor", biayaJasa: 550000, biayaAntarJemput: 65000 },
      { id: 60, layanan: "Tarik Berkas", wilayah: "Tangerang Selatan", biayaJasa: 590000, biayaAntarJemput: 52000 },

      // Duplikat STNK
      { id: 61, layanan: "Duplikat STNK", wilayah: "Jakarta Timur", biayaJasa: 350000, biayaAntarJemput: 50000 },
      { id: 62, layanan: "Duplikat STNK", wilayah: "Jakarta Barat", biayaJasa: 350000, biayaAntarJemput: 50000 },
      { id: 63, layanan: "Duplikat STNK", wilayah: "Jakarta Selatan", biayaJasa: 350000, biayaAntarJemput: 50000 },
      { id: 64, layanan: "Duplikat STNK", wilayah: "Jakarta Utara", biayaJasa: 350000, biayaAntarJemput: 50000 },
      { id: 65, layanan: "Duplikat STNK", wilayah: "Jakarta Pusat", biayaJasa: 350000, biayaAntarJemput: 50000 },
      { id: 66, layanan: "Duplikat STNK", wilayah: "Depok", biayaJasa: 320000, biayaAntarJemput: 60000 },
      { id: 67, layanan: "Duplikat STNK", wilayah: "Bekasi", biayaJasa: 340000, biayaAntarJemput: 55000 },
      { id: 68, layanan: "Duplikat STNK", wilayah: "Tangerang", biayaJasa: 340000, biayaAntarJemput: 55000 },
      { id: 69, layanan: "Duplikat STNK", wilayah: "Bogor", biayaJasa: 320000, biayaAntarJemput: 65000 },
      { id: 70, layanan: "Duplikat STNK", wilayah: "Tangerang Selatan", biayaJasa: 345000, biayaAntarJemput: 52000 },
    ];

    // Seed Service configs per (serviceId, samsatId)
    this.biayaLayananRows.forEach((row) => {
      const serviceId = resolveServiceId(row.layanan);
      const samsatId = resolveSamsatId(row.wilayah);
      const biayaJasa = row.biayaJasa || row.biayaJasaLengkap || 0;
      const biayaAntarJemput = row.biayaAntarJemput || 50000;
      const jasaLengkapNominal = row.biayaJasaLengkap || row.biayaJasa || 0;
      const jasaNembakNominal = row.biayaJasaNembak || Math.round(jasaLengkapNominal * 0.6);

      row.biayaJasaLengkap = jasaLengkapNominal;
      row.jasaLengkapEnabled = row.jasaLengkapEnabled ?? true;
      row.biayaJasaNembak = jasaNembakNominal;
      row.jasaNembakEnabled = row.jasaNembakEnabled ?? false;
      row.biayaPengurusanKhusus = jasaNembakNominal;
      row.pengurusanKhususEnabled = row.jasaNembakEnabled;
      row.biayaAntarJemput = biayaAntarJemput;
      row.antarJemputEnabled = row.antarJemputEnabled ?? true;
      row.swdkllj = row.swdkllj ? { ...row.swdkllj } : { nominal: 143000, enabled: true };
      row.opsenPkb = { ...row.swdkllj };
      row.biayaLainnya = row.biayaLainnya ? row.biayaLainnya.map((b: any) => ({ ...b })) : [];

      // Determine default active components per service type
      const components: ServiceComponentConfig[] = this.getDefaultComponentsForService(serviceId);

      const key = `${serviceId}:${samsatId}`;
      this.serviceConfigs.set(key, {
        serviceId,
        serviceName: row.layanan,
        samsatId,
        wilayah: row.wilayah,
        biayaJasa,
        jasaLengkap: {
          nominal: jasaLengkapNominal,
          enabled: row.jasaLengkapEnabled,
        },
        jasaNembak: {
          nominal: jasaNembakNominal,
          enabled: row.jasaNembakEnabled,
        },
        biayaPengurusanKhusus: {
          nominal: jasaNembakNominal,
          enabled: row.jasaNembakEnabled,
        },
        biayaAntarJemput,
        antarJemputEnabled: row.antarJemputEnabled,
        components,
        swdkllj: { ...row.swdkllj },
        opsenPkb: { ...row.swdkllj },
        biayaLainnya: row.biayaLainnya.map((b: any) => ({ ...b })),
        active: true,
      });
    });
  }

  // Component assignment based on business requirements
  private getDefaultComponentsForService(serviceId: string): ServiceComponentConfig[] {
    switch (serviceId) {
      case "mutasi-antar-samsat":
        // Mutasi Antar Samsat requires only: Legalisir, Cek Fisik, Cek Blokir
        return [
          { pricingItemId: "mutasi-legalisir", enabled: true, required: true },
          { pricingItemId: "mutasi-cf", enabled: true, required: true },
          { pricingItemId: "mutasi-cek-blokir", enabled: true, required: true },
        ];
      case "mutasi-luar-daerah":
        return [
          { pricingItemId: "mutasi-legalisir", enabled: true, required: true },
          { pricingItemId: "mutasi-cf", enabled: true, required: true },
          { pricingItemId: "mutasi-cek-blokir", enabled: true, required: true },
          { pricingItemId: "mutasi-cetak-fiskal", enabled: true, required: true },
        ];
      case "balik-nama":
        return [
          { pricingItemId: "mutasi-cf", enabled: true, required: true },
          { pricingItemId: "mutasi-cek-blokir", enabled: true, required: true },
        ];
      case "perpanjangan-5-tahun":
        return [
          { pricingItemId: "mutasi-cf", enabled: true, required: true },
        ];
      case "perpanjangan-1-tahun":
        return [];
      case "tarik-berkas":
        return [
          { pricingItemId: "mutasi-lok-arsip", enabled: true, required: true },
        ];
      case "duplikat-stnk":
        return [
          { pricingItemId: "mutasi-cetak-stnk", enabled: true, required: true },
        ];
      default:
        return [];
    }
  }

  // ─── Reactive Pub-Sub ───────────────────────────────────────────────────────
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("Error in PricingStore listener:", err);
      }
    });
  }

  // ─── Samsat & Pricing Catalog Methods ───────────────────────────────────────
  public getSamsats(): SamsatMasterItem[] {
    return [...this.samsats];
  }

  public getSamsatList(): SamsatMasterItem[] {
    return this.getSamsats();
  }

  public getSamsatById(samsatId: string): SamsatMasterItem {
    const resolved = resolveSamsatId(samsatId);
    return this.samsats.find((s) => s.id === resolved) || this.samsats[0] || SAMSAT_LIST[0];
  }

  public addSamsat(data: { name: string; wilayah: string; alamat: string }): SamsatMasterItem {
    const slug = `samsat-${data.wilayah.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const id = this.samsats.some((s) => s.id === slug)
      ? `${slug}-${Date.now().toString().slice(-4)}`
      : slug;
    const newSamsat: SamsatMasterItem = {
      id,
      name: data.name,
      wilayah: data.wilayah,
      alamat: data.alamat,
    };
    this.samsats.push(newSamsat);

    // Initialize pricing map
    const defaultMap = new Map();
    const baseRow = this.mutasiASRows[0] || {};
    for (const [key, pricingItemId] of Object.entries(MUTASI_AS_ROW_KEY_MAP)) {
      defaultMap.set(pricingItemId, baseRow[key] || 50000);
    }
    this.samsatPricing.set(id, defaultMap);

    // Add row to mutasiASRows
    this.mutasiASRows.push({
      id: Math.max(...this.mutasiASRows.map((r) => r.id), 0) + 1,
      namaSamsat: newSamsat.name,
      ...baseRow,
    });

    // Add default service fee rows for all standard services
    const services = [
      { name: "Perpanjangan 1 Tahun", jasa: 250000, antarJemput: 50000 },
      { name: "Perpanjangan 5 Tahun", jasa: 500000, antarJemput: 50000 },
      { name: "Mutasi Antar Samsat", jasa: 800000, antarJemput: 50000 },
      { name: "Mutasi Luar Daerah", jasa: 1500000, antarJemput: 50000 },
      { name: "Balik Nama", jasa: 1200000, antarJemput: 50000 },
      { name: "Tarik Berkas", jasa: 600000, antarJemput: 50000 },
      { name: "Duplikat STNK", jasa: 350000, antarJemput: 50000 },
    ];
    services.forEach((svc) => {
      const serviceId = resolveServiceId(svc.name);
      const rowId = Math.max(...this.biayaLayananRows.map((r) => r.id), 0) + 1;
      const newRow = {
        id: rowId,
        layanan: svc.name,
        wilayah: newSamsat.wilayah,
        biayaJasa: svc.jasa,
        biayaJasaLengkap: svc.jasa,
        biayaJasaNembak: Math.round(svc.jasa * 0.6),
        biayaAntarJemput: svc.antarJemput,
      };
      this.biayaLayananRows.push(newRow);
      this.serviceConfigs.set(`${serviceId}:${id}`, {
        serviceId,
        serviceName: svc.name,
        samsatId: id,
        wilayah: newSamsat.wilayah,
        biayaJasa: svc.jasa,
        biayaAntarJemput: svc.antarJemput,
        components: this.getDefaultComponentsForService(serviceId),
        active: true,
      });
    });

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: "Admin Master",
        userRole: "admin",
        action: "CREATE",
        module: "Master Data",
        details: `Samsat baru "${newSamsat.name}" (${newSamsat.wilayah}) berhasil ditambahkan ke Master Data.`,
        metadata: { id, name: newSamsat.name, wilayah: newSamsat.wilayah },
      });
    } catch {
      // safe fallback
    }

    this.notify();
    return newSamsat;
  }

  public updateSamsat(
    id: string,
    updates: Partial<{ name: string; wilayah: string; alamat: string }>
  ): boolean {
    const samsat = this.samsats.find((s) => s.id === id);
    if (!samsat) return false;
    const oldName = samsat.name;
    const oldWilayah = samsat.wilayah;
    if (updates.name) samsat.name = updates.name;
    if (updates.wilayah) samsat.wilayah = updates.wilayah;
    if (updates.alamat) samsat.alamat = updates.alamat;

    // Update in mutasiASRows
    this.mutasiASRows.forEach((r) => {
      if (r.namaSamsat === oldName) r.namaSamsat = samsat.name;
    });
    // Update in biayaLayananRows
    this.biayaLayananRows.forEach((r) => {
      if (r.wilayah === oldWilayah) r.wilayah = samsat.wilayah;
    });

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: "Admin Master",
        userRole: "admin",
        action: "UPDATE",
        module: "Master Data",
        details: `Data Samsat "${samsat.name}" (${samsat.id}) berhasil diperbarui.`,
        metadata: { id, updates },
      });
    } catch {
      // safe fallback
    }

    this.notify();
    return true;
  }

  public deleteSamsat(id: string): boolean {
    const idx = this.samsats.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    const samsat = this.samsats[idx];
    this.samsats.splice(idx, 1);
    this.samsatPricing.delete(id);
    this.mutasiASRows = this.mutasiASRows.filter((r) => r.namaSamsat !== samsat.name);
    this.biayaLayananRows = this.biayaLayananRows.filter((r) => r.wilayah !== samsat.wilayah);

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: "Admin Master",
        userRole: "admin",
        action: "DELETE",
        module: "Master Data",
        details: `Samsat "${samsat.name}" (${samsat.id}) berhasil dihapus dari Master Data.`,
        metadata: { id, name: samsat.name },
      });
    } catch {
      // safe fallback
    }

    this.notify();
    return true;
  }

  public getPricingItems(): PricingItem[] {
    return [...MASTER_PRICING_ITEMS];
  }

  public getPricingItemById(id: string): PricingItem | undefined {
    return MASTER_PRICING_ITEMS.find((i) => i.id === id);
  }

  // ─── Samsat Pricing Methods (Harga Dasar per-Samsat) ────────────────────────
  public getSamsatPrice(samsatId: string, pricingItemId: string): number {
    const resolvedSamsatId = resolveSamsatId(samsatId);
    const priceMap = this.samsatPricing.get(resolvedSamsatId);
    if (priceMap && priceMap.has(pricingItemId)) {
      return priceMap.get(pricingItemId)!;
    }
    // Fallback to default Jaktim price
    const defaultMap = this.samsatPricing.get("samsat-jakarta-timur");
    return defaultMap?.get(pricingItemId) || 0;
  }

  public updateSamsatPrice(samsatId: string, pricingItemId: string, amount: number): boolean {
    const resolvedSamsatId = resolveSamsatId(samsatId);
    let priceMap = this.samsatPricing.get(resolvedSamsatId);
    if (!priceMap) {
      priceMap = new Map();
      this.samsatPricing.set(resolvedSamsatId, priceMap);
    }
    const oldPrice = priceMap.get(pricingItemId) || 0;
    priceMap.set(pricingItemId, amount);

    // Also update mutasiASRows if matching
    const row = this.mutasiASRows.find((r) => resolveSamsatId(r.namaSamsat) === resolvedSamsatId);
    if (row) {
      for (const [k, v] of Object.entries(MUTASI_AS_ROW_KEY_MAP)) {
        if (v === pricingItemId) {
          row[k] = amount;
          break;
        }
      }
    }

    if (this.isApiMode) {
      pricingRepository.updateSamsatItem(pricingItemId, { basePrice: amount });
    }

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: "Admin Master",
        userRole: "admin",
        action: "UPDATE",
        module: "Master Data",
        details: `Harga Samsat ${resolvedSamsatId} untuk item ${pricingItemId} diubah dari Rp ${oldPrice.toLocaleString("id-ID")} ke Rp ${amount.toLocaleString("id-ID")}`,
        metadata: { samsatId: resolvedSamsatId, pricingItemId, oldPrice, newPrice: amount },
      });
    } catch {
      // safe fallback
    }

    this.notify();
    return true;
  }

  // ─── Biaya Layanan Methods (Service Fee Config per Service + Samsat) ────────
  public getServiceFeeConfig(serviceIdOrName: string, samsatIdOrWilayah: string): ServiceFeeConfig | undefined {
    const serviceId = resolveServiceId(serviceIdOrName);
    const samsatId = resolveSamsatId(samsatIdOrWilayah);
    const key = `${serviceId}:${samsatId}`;
    const cfg = this.serviceConfigs.get(key);
    if (!cfg) return undefined;

    if (!cfg.jasaLengkap) {
      cfg.jasaLengkap = { nominal: cfg.biayaJasa || 0, enabled: true };
    }
    if (!cfg.jasaNembak) {
      cfg.jasaNembak = { nominal: Math.round((cfg.biayaJasa || 0) * 0.6), enabled: false };
    }
    if (cfg.antarJemputEnabled === undefined) {
      cfg.antarJemputEnabled = true;
    }
    if (!cfg.swdkllj) {
      cfg.swdkllj = { nominal: 143000, enabled: true };
    }
    if (!cfg.biayaLainnya) {
      cfg.biayaLainnya = [];
    }
    return cfg;
  }

  public updateServiceFeeConfig(
    serviceIdOrName: string,
    samsatIdOrWilayah: string,
    updates: Partial<ServiceFeeConfig>
  ): boolean {
    const serviceId = resolveServiceId(serviceIdOrName);
    const samsatId = resolveSamsatId(samsatIdOrWilayah);
    const key = `${serviceId}:${samsatId}`;
    const existing = this.getServiceFeeConfig(serviceId, samsatId);
    if (!existing) return false;

    const oldBiayaJasa = existing.biayaJasa;

    if (updates.jasaLengkap) existing.jasaLengkap = { ...updates.jasaLengkap };
    if (updates.jasaNembak) {
      existing.jasaNembak = { ...updates.jasaNembak };
      existing.biayaPengurusanKhusus = { ...updates.jasaNembak };
    }
    if (updates.biayaPengurusanKhusus) {
      existing.biayaPengurusanKhusus = { ...updates.biayaPengurusanKhusus };
      existing.jasaNembak = { ...updates.biayaPengurusanKhusus };
    }
    if (updates.antarJemputEnabled !== undefined) existing.antarJemputEnabled = updates.antarJemputEnabled;
    if (updates.biayaAntarJemput !== undefined) existing.biayaAntarJemput = updates.biayaAntarJemput;
    if (updates.swdkllj) {
      existing.swdkllj = { ...updates.swdkllj };
      existing.opsenPkb = { ...updates.swdkllj };
    }
    if (updates.opsenPkb) {
      existing.opsenPkb = { ...updates.opsenPkb };
      existing.swdkllj = { ...updates.opsenPkb };
    }
    if (updates.biayaLainnya) existing.biayaLainnya = updates.biayaLainnya.map((b) => ({ ...b }));
    if (updates.components) existing.components = [...updates.components];
    if (updates.active !== undefined) existing.active = updates.active;

    if (updates.biayaJasa !== undefined) {
      existing.biayaJasa = updates.biayaJasa;
      if (existing.jasaLengkap) existing.jasaLengkap.nominal = updates.biayaJasa;
    } else if (existing.jasaLengkap) {
      existing.biayaJasa = existing.jasaLengkap.nominal;
    }

    // Sync back to biayaLayananRows for UI table
    const row = this.biayaLayananRows.find(
      (r) => resolveServiceId(r.layanan) === serviceId && resolveSamsatId(r.wilayah) === samsatId
    );
    if (row) {
      if (existing.jasaLengkap) {
        row.biayaJasaLengkap = existing.jasaLengkap.nominal;
        row.jasaLengkapEnabled = existing.jasaLengkap.enabled;
        if (row.biayaJasa !== undefined) row.biayaJasa = existing.jasaLengkap.nominal;
      }
      if (existing.jasaNembak) {
        row.biayaJasaNembak = existing.jasaNembak.nominal;
        row.jasaNembakEnabled = existing.jasaNembak.enabled;
        row.biayaPengurusanKhusus = existing.jasaNembak.nominal;
        row.pengurusanKhususEnabled = existing.jasaNembak.enabled;
      }
      row.biayaAntarJemput = existing.biayaAntarJemput;
      row.antarJemputEnabled = existing.antarJemputEnabled;
      if (existing.swdkllj) {
        row.swdkllj = { ...existing.swdkllj };
        row.opsenPkb = { ...existing.swdkllj };
      }
      if (existing.biayaLainnya) row.biayaLainnya = existing.biayaLainnya.map((b) => ({ ...b }));
    }

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: "Admin Master",
        userRole: "admin",
        action: "UPDATE",
        module: "Master Data",
        details: `Biaya Layanan ${existing.serviceName} (${existing.wilayah}) diupdate. Jasa: Rp ${existing.biayaJasa.toLocaleString("id-ID")}, Antar Jemput: Rp ${existing.biayaAntarJemput.toLocaleString("id-ID")}`,
        metadata: { serviceId, samsatId, oldBiayaJasa, newBiayaJasa: existing.biayaJasa },
      });
    } catch {
      // safe fallback
    }

    this.notify();
    return true;
  }

  public getMasterPricingItems(): PricingItem[] {
    return [...MASTER_PRICING_ITEMS];
  }

  public getSamsatComponentsForService(
    serviceIdOrName: string,
    samsatIdOrWilayah: string
  ): Array<{ id: string; label: string; code: string; nominal: number; enabled: boolean }> {
    const serviceId = resolveServiceId(serviceIdOrName);
    const samsatId = resolveSamsatId(samsatIdOrWilayah);
    const config = this.getServiceFeeConfig(serviceId, samsatId);

    return MASTER_PRICING_ITEMS.map((item) => {
      const price = this.getSamsatPrice(samsatId, item.id);
      const isEnabled = config?.components.find((c) => c.pricingItemId === item.id)?.enabled ?? false;
      return {
        id: item.id,
        label: item.name,
        code: item.code,
        nominal: price,
        enabled: isEnabled,
      };
    });
  }

  public addBiayaLainnya(
    serviceIdOrName: string,
    samsatIdOrWilayah: string,
    item: { label: string; nominal: number; enabled?: boolean }
  ): ServiceCostItem | null {
    const config = this.getServiceFeeConfig(serviceIdOrName, samsatIdOrWilayah);
    if (!config) return null;
    if (!config.biayaLainnya) config.biayaLainnya = [];

    const newItem: ServiceCostItem = {
      id: `bl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: item.label.trim(),
      nominal: Math.max(0, Number(item.nominal) || 0),
      enabled: item.enabled ?? true,
    };
    config.biayaLainnya.push(newItem);

    // Sync to row
    const row = this.biayaLayananRows.find(
      (r) => resolveServiceId(r.layanan) === resolveServiceId(serviceIdOrName) &&
             resolveSamsatId(r.wilayah) === resolveSamsatId(samsatIdOrWilayah)
    );
    if (row) {
      row.biayaLainnya = config.biayaLainnya.map((b) => ({ ...b }));
    }

    this.notify();
    return newItem;
  }

  public updateBiayaLainnya(
    serviceIdOrName: string,
    samsatIdOrWilayah: string,
    itemId: string,
    updates: Partial<ServiceCostItem>
  ): boolean {
    const config = this.getServiceFeeConfig(serviceIdOrName, samsatIdOrWilayah);
    if (!config || !config.biayaLainnya) return false;
    const item = config.biayaLainnya.find((b) => b.id === itemId);
    if (!item) return false;

    if (updates.label !== undefined) item.label = updates.label.trim();
    if (updates.nominal !== undefined) item.nominal = Math.max(0, Number(updates.nominal) || 0);
    if (updates.enabled !== undefined) item.enabled = updates.enabled;

    // Sync to row
    const row = this.biayaLayananRows.find(
      (r) => resolveServiceId(r.layanan) === resolveServiceId(serviceIdOrName) &&
             resolveSamsatId(r.wilayah) === resolveSamsatId(samsatIdOrWilayah)
    );
    if (row) {
      row.biayaLainnya = config.biayaLainnya.map((b) => ({ ...b }));
    }

    this.notify();
    return true;
  }

  public deleteBiayaLainnya(
    serviceIdOrName: string,
    samsatIdOrWilayah: string,
    itemId: string
  ): boolean {
    const config = this.getServiceFeeConfig(serviceIdOrName, samsatIdOrWilayah);
    if (!config || !config.biayaLainnya) return false;
    const idx = config.biayaLainnya.findIndex((b) => b.id === itemId);
    if (idx === -1) return false;

    config.biayaLainnya.splice(idx, 1);

    // Sync to row
    const row = this.biayaLayananRows.find(
      (r) => resolveServiceId(r.layanan) === resolveServiceId(serviceIdOrName) &&
             resolveSamsatId(r.wilayah) === resolveSamsatId(samsatIdOrWilayah)
    );
    if (row) {
      row.biayaLainnya = config.biayaLainnya.map((b) => ({ ...b }));
    }

    this.notify();
    return true;
  }

  public toggleComponent(serviceIdOrName: string, samsatIdOrWilayah: string, pricingItemId: string, enabled: boolean): boolean {
    const config = this.getServiceFeeConfig(serviceIdOrName, samsatIdOrWilayah);
    if (!config) return false;
    const comp = config.components.find((c) => c.pricingItemId === pricingItemId);
    if (comp) {
      comp.enabled = enabled;
    } else {
      config.components.push({ pricingItemId, enabled, required: false });
    }
    this.notify();
    return true;
  }

  // ─── UI Table Bindings (Directly Connected to Master Data) ──────────────────
  public getMutasiASRows(): any[] {
    return this.mutasiASRows.map((r) => ({ ...r }));
  }

  public updateMutasiASRow(id: number, updatedRow: any): void {
    const idx = this.mutasiASRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.mutasiASRows[idx] = { ...updatedRow };
      const samsatId = resolveSamsatId(updatedRow.namaSamsat);
      let priceMap = this.samsatPricing.get(samsatId);
      if (!priceMap) {
        priceMap = new Map();
        this.samsatPricing.set(samsatId, priceMap);
      }
      for (const [key, pricingItemId] of Object.entries(MUTASI_AS_ROW_KEY_MAP)) {
        if (updatedRow[key] !== undefined && typeof updatedRow[key] === "number") {
          priceMap.set(pricingItemId, updatedRow[key]);
          if (this.isApiMode) {
            pricingRepository.updateSamsatItem(pricingItemId, { basePrice: updatedRow[key] });
          }
        }
      }
      this.notify();
    }
  }

  public addMutasiASRow(row: any): void {
    this.mutasiASRows.push(row);
    const samsatId = resolveSamsatId(row.namaSamsat);
    let priceMap = this.samsatPricing.get(samsatId);
    if (!priceMap) {
      priceMap = new Map();
      this.samsatPricing.set(samsatId, priceMap);
    }
    for (const [key, pricingItemId] of Object.entries(MUTASI_AS_ROW_KEY_MAP)) {
      if (row[key] !== undefined && typeof row[key] === "number") {
        priceMap.set(pricingItemId, row[key]);
      }
    }
    this.notify();
  }

  public deleteMutasiASRow(id: number): void {
    const idx = this.mutasiASRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.mutasiASRows.splice(idx, 1);
      this.notify();
    }
  }

  public getBiayaLayananRows(): any[] {
    return this.biayaLayananRows.map((r) => ({ ...r }));
  }

  public updateBiayaLayananRow(id: number, updatedRow: any): void {
    const idx = this.biayaLayananRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.biayaLayananRows[idx] = { ...updatedRow };
      const serviceId = resolveServiceId(updatedRow.layanan);
      const samsatId = resolveSamsatId(updatedRow.wilayah);
      const key = `${serviceId}:${samsatId}`;
      const existing = this.serviceConfigs.get(key);
      const newBiayaJasa = updatedRow.biayaJasa || updatedRow.biayaJasaLengkap || 0;
      const newAntarJemput = updatedRow.biayaAntarJemput || 50000;

      if (existing) {
        existing.biayaJasa = newBiayaJasa;
        existing.biayaAntarJemput = newAntarJemput;
        if (updatedRow.biayaJasaLengkap !== undefined || updatedRow.jasaLengkapEnabled !== undefined) {
          existing.jasaLengkap = {
            nominal: updatedRow.biayaJasaLengkap ?? existing.jasaLengkap?.nominal ?? newBiayaJasa,
            enabled: updatedRow.jasaLengkapEnabled ?? existing.jasaLengkap?.enabled ?? true,
          };
        }
        if (
          updatedRow.biayaJasaNembak !== undefined ||
          updatedRow.jasaNembakEnabled !== undefined ||
          updatedRow.biayaPengurusanKhusus !== undefined ||
          updatedRow.pengurusanKhususEnabled !== undefined
        ) {
          const nom =
            updatedRow.biayaPengurusanKhusus ??
            updatedRow.biayaJasaNembak ??
            existing.biayaPengurusanKhusus?.nominal ??
            existing.jasaNembak?.nominal ??
            Math.round(newBiayaJasa * 0.6);
          const en =
            updatedRow.pengurusanKhususEnabled ??
            updatedRow.jasaNembakEnabled ??
            existing.biayaPengurusanKhusus?.enabled ??
            existing.jasaNembak?.enabled ??
            false;
          existing.jasaNembak = { nominal: nom, enabled: en };
          existing.biayaPengurusanKhusus = { nominal: nom, enabled: en };
        }
        if (updatedRow.antarJemputEnabled !== undefined) {
          existing.antarJemputEnabled = updatedRow.antarJemputEnabled;
        }
        if (updatedRow.opsenPkb || updatedRow.swdkllj) {
          const ops = updatedRow.opsenPkb || updatedRow.swdkllj;
          existing.swdkllj = { ...ops };
          existing.opsenPkb = { ...ops };
        }
        if (updatedRow.biayaLainnya) {
          existing.biayaLainnya = updatedRow.biayaLainnya.map((b: any) => ({ ...b }));
        }
      } else {
        const khususNom = updatedRow.biayaPengurusanKhusus ?? updatedRow.biayaJasaNembak ?? Math.round(newBiayaJasa * 0.6);
        const khususEn = updatedRow.pengurusanKhususEnabled ?? updatedRow.jasaNembakEnabled ?? false;
        const opsenObj = updatedRow.opsenPkb ? { ...updatedRow.opsenPkb } : (updatedRow.swdkllj ? { ...updatedRow.swdkllj } : { nominal: 143000, enabled: true });

        this.serviceConfigs.set(key, {
          serviceId,
          serviceName: updatedRow.layanan,
          samsatId,
          wilayah: updatedRow.wilayah,
          biayaJasa: newBiayaJasa,
          jasaLengkap: {
            nominal: updatedRow.biayaJasaLengkap ?? newBiayaJasa,
            enabled: updatedRow.jasaLengkapEnabled ?? true,
          },
          jasaNembak: {
            nominal: khususNom,
            enabled: khususEn,
          },
          biayaPengurusanKhusus: {
            nominal: khususNom,
            enabled: khususEn,
          },
          biayaAntarJemput: newAntarJemput,
          antarJemputEnabled: updatedRow.antarJemputEnabled ?? true,
          components: this.getDefaultComponentsForService(serviceId),
          swdkllj: opsenObj,
          opsenPkb: opsenObj,
          biayaLainnya: updatedRow.biayaLainnya ? updatedRow.biayaLainnya.map((b: any) => ({ ...b })) : [],
          active: true,
        });
      }
      this.notify();
    }
  }

  public addBiayaLayananRow(row: any): void {
    this.biayaLayananRows.push(row);
    const serviceId = resolveServiceId(row.layanan);
    const samsatId = resolveSamsatId(row.wilayah);
    const key = `${serviceId}:${samsatId}`;
    const khususNom = row.biayaPengurusanKhusus || row.biayaJasaNembak || Math.round((row.biayaJasa || 0) * 0.6);
    const khususEn = row.pengurusanKhususEnabled ?? row.jasaNembakEnabled ?? false;
    const opsenObj = row.opsenPkb ? { ...row.opsenPkb } : (row.swdkllj ? { ...row.swdkllj } : { nominal: 143000, enabled: true });

    this.serviceConfigs.set(key, {
      serviceId,
      serviceName: row.layanan,
      samsatId,
      wilayah: row.wilayah,
      biayaJasa: row.biayaJasa || row.biayaJasaLengkap || 0,
      biayaAntarJemput: row.biayaAntarJemput || 50000,
      components: this.getDefaultComponentsForService(serviceId),
      active: true,
    });
    this.notify();
  }

  public deleteBiayaLayananRow(id: number): void {
    const idx = this.biayaLayananRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      const removed = this.biayaLayananRows.splice(idx, 1)[0];
      const serviceId = resolveServiceId(removed.layanan);
      const samsatId = resolveSamsatId(removed.wilayah);
      this.serviceConfigs.delete(`${serviceId}:${samsatId}`);
      this.notify();
    }
  }

  // ─── Mutasi LD Rows ─────────────────────────────────────────────────────────
  public getMutasiLDRows(): any[] {
    return this.mutasiLDRows.map((r) => ({ ...r }));
  }

  public updateMutasiLDRow(id: number, updatedRow: any): void {
    const idx = this.mutasiLDRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.mutasiLDRows[idx] = { ...updatedRow };
      this.notify();
    }
  }

  public addMutasiLDRow(row: any): void {
    const newId = Math.max(...this.mutasiLDRows.map((r) => r.id), 0) + 1;
    this.mutasiLDRows.push({ ...row, id: newId });
    this.notify();
  }

  public deleteMutasiLDRow(id: number): void {
    const idx = this.mutasiLDRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.mutasiLDRows.splice(idx, 1);
      this.notify();
    }
  }

  // ─── Balik Nama Rows ────────────────────────────────────────────────────────
  public getBalikNamaRows(): any[] {
    return this.balikNamaRows.map((r) => ({ ...r }));
  }

  public updateBalikNamaRow(id: number, updatedRow: any): void {
    const idx = this.balikNamaRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.balikNamaRows[idx] = { ...updatedRow };
      this.notify();
    }
  }

  public addBalikNamaRow(row: any): void {
    const newId = Math.max(...this.balikNamaRows.map((r) => r.id), 0) + 1;
    this.balikNamaRows.push({ ...row, id: newId });
    this.notify();
  }

  public deleteBalikNamaRow(id: number): void {
    const idx = this.balikNamaRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.balikNamaRows.splice(idx, 1);
      this.notify();
    }
  }

  // ─── Tarik Berkas Rows ──────────────────────────────────────────────────────
  public getTarikBerkasRows(): any[] {
    return this.tarikBerkasRows.map((r) => ({ ...r }));
  }

  public updateTarikBerkasRow(id: number, updatedRow: any): void {
    const idx = this.tarikBerkasRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.tarikBerkasRows[idx] = { ...updatedRow };
      this.notify();
    }
  }

  public addTarikBerkasRow(row: any): void {
    const newId = Math.max(...this.tarikBerkasRows.map((r) => r.id), 0) + 1;
    this.tarikBerkasRows.push({ ...row, id: newId });
    this.notify();
  }

  public deleteTarikBerkasRow(id: number): void {
    const idx = this.tarikBerkasRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.tarikBerkasRows.splice(idx, 1);
      this.notify();
    }
  }

  // ─── Duplikat STNK Rows ─────────────────────────────────────────────────────
  public getDuplikatSTNKRows(): any[] {
    return this.duplikatSTNKRows.map((r) => ({ ...r }));
  }

  public updateDuplikatSTNKRow(id: number, updatedRow: any): void {
    const idx = this.duplikatSTNKRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.duplikatSTNKRows[idx] = { ...updatedRow };
      this.notify();
    }
  }

  public addDuplikatSTNKRow(row: any): void {
    const newId = Math.max(...this.duplikatSTNKRows.map((r) => r.id), 0) + 1;
    this.duplikatSTNKRows.push({ ...row, id: newId });
    this.notify();
  }

  public deleteDuplikatSTNKRow(id: number): void {
    const idx = this.duplikatSTNKRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.duplikatSTNKRows.splice(idx, 1);
      this.notify();
    }
  }

  // ─── Harga Dasar Rows ───────────────────────────────────────────────────────
  public getHargaDasarRows(): any[] {
    return this.hargaDasarRows.map((r) => ({ ...r }));
  }

  public updateHargaDasarRow(id: number, updatedRow: any): void {
    const idx = this.hargaDasarRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.hargaDasarRows[idx] = { ...updatedRow };
      if (this.isApiMode && updatedRow.hargaDasar !== undefined) {
        pricingRepository.updateSamsatItem(String(id), { basePrice: Number(updatedRow.hargaDasar) });
      }
      this.notify();
    }
  }

  public addHargaDasarRow(row: any): void {
    const newId = Math.max(...this.hargaDasarRows.map((r) => r.id), 0) + 1;
    this.hargaDasarRows.push({ ...row, id: newId });
    this.notify();
  }

  public deleteHargaDasarRow(id: number): void {
    const idx = this.hargaDasarRows.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.hargaDasarRows.splice(idx, 1);
      this.notify();
    }
  }

  // ─── PURE DETERMINISTIC ORDER COST CALCULATOR ───────────────────────────────
  public calculateOrderCost(params: {
    serviceId?: string;
    serviceName?: string;
    samsatId?: string;
    wilayahSamsat?: string;
    metodeLayanan: "Antar Jemput" | "Datang Langsung";
    tipeJasa?: "Lengkap" | "Nembak";
    pkb?: number;
    swdkllj?: number;
    dendaSwdkllj?: number;
    customComponents?: Record<string, boolean>; // pricingItemId -> enabled override
  }): OrderCostSnapshot {
    const serviceId = resolveServiceId(params.serviceId || params.serviceName);
    const samsatId = resolveSamsatId(params.samsatId || params.wilayahSamsat);
    const samsat = this.getSamsatById(samsatId);

    const config = this.getServiceFeeConfig(serviceId, samsatId);
    if (!config) {
      throw new Error(
        `Konfigurasi Biaya Layanan untuk layanan "${params.serviceName || serviceId}" dan Samsat "${samsat.name}" tidak ditemukan.`
      );
    }

    const breakdown: OrderCostBreakdownItem[] = [];

    // 1. Biaya Jasa & Biaya Pengurusan Khusus
    let biayaJasa = 0;
    let biayaPengurusanKhusus = 0;
    if (params.tipeJasa === "Nembak" || (params as any).tipeJasa === "Khusus") {
      const isKhususEnabled = config.biayaPengurusanKhusus ? config.biayaPengurusanKhusus.enabled : (config.jasaNembak ? config.jasaNembak.enabled : false);
      if (isKhususEnabled) {
        biayaPengurusanKhusus = config.biayaPengurusanKhusus?.nominal || config.jasaNembak?.nominal || 0;
        biayaJasa = biayaPengurusanKhusus;
        if (biayaPengurusanKhusus > 0) {
          breakdown.push({
            itemId: "fee-jasa-nembak",
            code: "FEE-PENGURUSAN-KHUSUS",
            name: `Biaya Pengurusan Khusus ${config.serviceName}`,
            amount: biayaPengurusanKhusus,
            category: "Jasa",
            source: "BiayaLayanan",
            isRequired: true,
          });
        }
      }
    } else {
      const isLengkapEnabled = config.jasaLengkap ? config.jasaLengkap.enabled : true;
      if (isLengkapEnabled) {
        biayaJasa = config.jasaLengkap?.nominal ?? config.biayaJasa ?? 0;
        if (biayaJasa > 0) {
          breakdown.push({
            itemId: "fee-jasa",
            code: "FEE-JASA",
            name: `Biaya Jasa ${config.serviceName}`,
            amount: biayaJasa,
            category: "Jasa",
            source: "BiayaLayanan",
            isRequired: true,
          });
        }
      }
    }

    // 2. Active Components (from Harga Dasar Samsat for this specific samsatId)
    let totalBiayaSamsat = 0;
    config.components.forEach((comp) => {
      const isEnabled =
        params.customComponents && params.customComponents[comp.pricingItemId] !== undefined
          ? params.customComponents[comp.pricingItemId]
          : comp.enabled;

      if (isEnabled) {
        const itemMeta = this.getPricingItemById(comp.pricingItemId);
        const itemAmount = this.getSamsatPrice(samsatId, comp.pricingItemId);
        totalBiayaSamsat += itemAmount;

        breakdown.push({
          itemId: comp.pricingItemId,
          code: itemMeta?.code || "SAMSAT-ITEM",
          name: comp.customLabel || itemMeta?.name || comp.pricingItemId,
          amount: itemAmount,
          category: "Samsat",
          source: "HargaDasarSamsat",
          isRequired: comp.required,
        });
      }
    });

    // 3. Operational Courier: Antar Jemput Dokumen
    // RULE: Datang Langsung = Rp 0, Antar Jemput = Configured Fee (only if enabled)
    const isAntarJemput = params.metodeLayanan === "Antar Jemput";
    const isCourierEnabled = config.antarJemputEnabled !== false;
    const biayaAntarJemput = isAntarJemput && isCourierEnabled ? (config.biayaAntarJemput || 0) : 0;

    if (isAntarJemput && biayaAntarJemput > 0) {
      breakdown.push({
        itemId: "fee-antar-jemput",
        code: "OPS-ANTARJEMPUT",
        name: "Layanan Antar Jemput Dokumen",
        amount: biayaAntarJemput,
        category: "Operasional",
        source: "Operasional",
        isRequired: false,
      });
    }

    // 4. Pajak Kendaraan Bermotor (PKB)
    const pkb = Math.max(0, Number(params.pkb) || 0);
    if (pkb > 0) {
      breakdown.push({
        itemId: "pajak-pkb",
        code: "PAJAK-PKB",
        name: "Pajak Kendaraan Bermotor (PKB)",
        amount: pkb,
        category: "Pajak",
        source: "Kendaraan",
        isRequired: true,
      });
    }

    // 5. OPSEN PKB (previously SWDKLLJ)
    const isOpsenEnabled = config.opsenPkb ? config.opsenPkb.enabled : (config.swdkllj ? config.swdkllj.enabled : true);
    let swdkllj = 0;
    if (isOpsenEnabled) {
      const defaultOpsen = config.opsenPkb?.nominal || config.swdkllj?.nominal || 143000;
      swdkllj = params.swdkllj !== undefined && params.swdkllj > 0 ? params.swdkllj : defaultOpsen;
      breakdown.push({
        itemId: "pajak-swdkllj",
        code: "PAJAK-OPSEN-PKB",
        name: "OPSEN PKB",
        amount: swdkllj,
        category: "Pajak",
        source: "Kendaraan",
        isRequired: true,
      });
    }

    // 6. Denda Pajak/OPSEN PKB (if any)
    const dendaSwdkllj = Math.max(0, Number(params.dendaSwdkllj) || 0);
    if (dendaSwdkllj > 0) {
      breakdown.push({
        itemId: "pajak-denda-swdkllj",
        code: "PAJAK-DENDA",
        name: "Denda Pajak/OPSEN PKB",
        amount: dendaSwdkllj,
        category: "Pajak",
        source: "Kendaraan",
        isRequired: false,
      });
    }

    // 7. Biaya Lainnya (dynamic list, only if enabled)
    if (config.biayaLainnya && Array.isArray(config.biayaLainnya)) {
      config.biayaLainnya.forEach((bl) => {
        const nominal = bl.nominal || 0;
        if (bl.enabled && nominal > 0) {
          breakdown.push({
            itemId: bl.id,
            code: "BIAYA-LAIN",
            name: bl.label || "Biaya Tambahan",
            amount: nominal,
            category: "Operasional",
            source: "BiayaLayanan",
            isRequired: false,
          });
        }
      });
    }

    const calculatedTotal = breakdown.reduce((sum, item) => sum + item.amount, 0);

    return {
      serviceId,
      serviceName: config.serviceName,
      samsatId,
      samsatName: samsat.name,
      metodeLayanan: params.metodeLayanan,
      wilayahSamsat: samsat.wilayah,
      biayaJasa,
      biayaPengurusanKhusus,
      biayaSamsat: totalBiayaSamsat,
      biayaAntarJemput,
      pkb,
      swdkllj,
      opsenPkb: swdkllj,
      dendaSwdkllj,
      totalEstimasi: calculatedTotal,
      breakdown,
      createdAt: new Date().toISOString(),
    };
  }

  // ─── Backward Compatibility Helpers ─────────────────────────────────────────
  public getSamsatItems(): SamsatCostItem[] {
    const defaultSamsat = "samsat-jakarta-timur";
    return MASTER_PRICING_ITEMS.map((item) => ({
      ...item,
      basePrice: this.getSamsatPrice(defaultSamsat, item.id),
    }));
  }

  public getSamsatItemById(id: string): SamsatCostItem | undefined {
    const item = this.getPricingItemById(id);
    if (!item) return undefined;
    return {
      ...item,
      basePrice: this.getSamsatPrice("samsat-jakarta-timur", item.id),
    };
  }

  public updateSamsatItem(id: string, updates: Partial<SamsatCostItem>): boolean {
    if (this.isApiMode) {
      pricingRepository.updateSamsatItem(id, updates);
    }
    if (updates.basePrice !== undefined) {
      return this.updateSamsatPrice("samsat-jakarta-timur", id, updates.basePrice);
    }
    return true;
  }

  public addSamsatItem(data: Omit<SamsatCostItem, "id">): SamsatCostItem {
    const id = `samsat-custom-${Date.now()}`;
    const newItem: SamsatCostItem = { ...data, id };
    MASTER_PRICING_ITEMS.push(newItem);
    this.updateSamsatPrice("samsat-jakarta-timur", id, data.basePrice);
    return newItem;
  }

  public getServicePackages(): Record<string, ServicePackageConfig> {
    const result: Record<string, ServicePackageConfig> = {};
    const services = [
      { id: "mutasi-antar-samsat", name: "Mutasi Antar Samsat" },
      { id: "mutasi-luar-daerah", name: "Mutasi Luar Daerah" },
      { id: "perpanjangan-1-tahun", name: "Perpanjangan 1 Tahun" },
      { id: "perpanjangan-5-tahun", name: "Perpanjangan 5 Tahun" },
      { id: "balik-nama", name: "Balik Nama" },
    ];
    services.forEach((s) => {
      const config = this.getServiceFeeConfig(s.id, "samsat-jakarta-timur");
      result[s.name] = {
        serviceId: s.id,
        serviceName: s.name,
        baseJasaPengurusan: config?.biayaJasa || 0,
        biayaAntarJemput: config?.biayaAntarJemput || 50000,
        active: true,
        items: (config?.components || []).map((c, idx) => ({
          id: `sci-${s.id}-${idx}`,
          serviceId: s.id,
          itemId: c.pricingItemId,
          enabled: c.enabled,
          required: c.required,
          sellingPrice: this.getSamsatPrice("samsat-jakarta-timur", c.pricingItemId),
        })),
      };
    });
    return result;
  }

  public getServicePackage(serviceNameOrId: string): ServicePackageConfig | undefined {
    const pkgs = this.getServicePackages();
    const serviceId = resolveServiceId(serviceNameOrId);
    for (const pkg of Object.values(pkgs)) {
      if (pkg.serviceId === serviceId || pkg.serviceName.toLowerCase() === serviceNameOrId.toLowerCase()) {
        return pkg;
      }
    }
    return undefined;
  }

  public updateServicePackage(serviceNameOrId: string, updates: Partial<ServicePackageConfig>): boolean {
    const serviceId = resolveServiceId(serviceNameOrId);
    return this.updateServiceFeeConfig(serviceId, "samsat-jakarta-timur", {
      biayaJasa: updates.baseJasaPengurusan,
      biayaAntarJemput: updates.biayaAntarJemput,
    });
  }
}

// Global Authoritative Singleton Instance
export const pricingStore = new PricingStore();

// React Hook for Reactive Store Subscription
export function usePricingStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return pricingStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return pricingStore;
}
