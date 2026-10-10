/**
 * Single Source of Truth for Finance, Payment Realization, and Billing
 * Admin SUN89 — Biro Jasa Management System
 */

import { useState, useEffect } from "react";
import { auditLog } from "../utils/auditLog";
import { financeRepository } from "../../data/repositories/financeRepository";
import { APP_CONFIG } from "../config/appConfig";
import { parseDateSafe } from "./dashboardAdapter";
import {
  profitData as rawProfitData,
  kasMessengerData as rawKasMessengerData,
  kasKantorData as rawKasKantorData,
  pengeluaranKantorData as rawPengeluaranData,
  tagihanData as rawTagihanData,
  belumKurangBayarData as rawBelumKurangBayarData,
  profitTerpendingData as rawProfitTerpendingData,
  cashbackTerpendingData as rawCashbackTerpendingData,
  labaRugiData as rawLabaRugiData,
  LabaRugiMonthlyItem,
  ProfitItem,
  KasMessengerItem,
  KasKantorItem,
  PengeluaranItem,
} from "./financeDummyData";

export type { ProfitItem, KasMessengerItem, KasKantorItem, PengeluaranItem, LabaRugiMonthlyItem };

import {
  initialMutasiLDContract,
  initialMutasiASContract,
  initialBBNContract,
  initialPerpanjanganPajakContract,
  initialLainLainContract,
  initialBelumKurangBayarContract,
  initialProfitTerpendingContract,
  initialCashbackTerpendingContract,
} from "./penjualanContractData";

import {
  PaymentStatus,
  RealizationStatus,
  BillingLifecycleStatus,
  PaymentSyncPayload,
  PaymentSyncCallback,
  InvoiceBillingRecord,
  PenjualanContractCategory,
  PaymentDueTrigger,
  CollectionState,
  derivePaymentStatus,
} from "../../domain/finance/types";
import { SettlementCondition, RefundStatus } from "../../domain/order/types";
import type { ReimbursementRequest } from "../../domain/messenger/types";

export type {
  PaymentStatus,
  RealizationStatus,
  BillingLifecycleStatus,
  PaymentSyncPayload,
  PaymentSyncCallback,
  InvoiceBillingRecord,
  PenjualanContractCategory,
  PaymentDueTrigger,
  CollectionState,
  SettlementCondition,
  RefundStatus,
  ReimbursementRequest,
};
export { derivePaymentStatus };


// Phone number dictionary for sample customers to support WhatsApp contact
const SAMPLE_CUSTOMER_PHONES: Record<string, { phone: string; email?: string; alamat?: string }> = {
  "PT. MAJU JAYA": { phone: "081289123456", email: "finance@majujaya.co.id", alamat: "Jl. Sudirman Kav 21, Jakarta" },
  "TOKO SEJAHTERA": { phone: "081987654321", email: "sejahtera.toko@gmail.com", alamat: "Jl. Pasar Anyar No. 14, Bogor" },
  "CV. MANDIRI": { phone: "082155667788", email: "admin@mandiri-cv.com", alamat: "Jl. Ir. H. Juanda No. 88, Depok" },
  "WARUNG MAKAN": { phone: "085699887766", email: "warung.berkah@gmail.com", alamat: "Jl. Raya Bogor KM 35, Cibinong" },
  "SALON CANTIK": { phone: "087711223344", email: "cantiksalon@yahoo.com", alamat: "Ruko Sukahati No. 5, Bogor" },
  "BENGKEL MOTOR": { phone: "081344556677", email: "bengkel.motor@gmail.com", alamat: "Jl. Tegar Beriman No. 12, Cibinong" },
  "TOKO BANGUNAN": { phone: "081288990011", email: "tb.sentosa@gmail.com", alamat: "Jl. Raya Sukabumi No. 45, Bogor" },
  "FOTOCOPY 24 JAM": { phone: "085733445566", email: "fc24jam@gmail.com", alamat: "Jl. Dramaga No. 18, Bogor" },
  "LAUNDRY KILOAN": { phone: "081822334455", email: "cleanlaundry@gmail.com", alamat: "Perum Gaperi 2 Blok B, Bojonggede" },
  "RUMAH MAKAN PADANG": { phone: "082211998877", email: "rmpadang@gmail.com", alamat: "Jl. Raya Pajajaran No. 7, Bogor" },
  "APOTEK SEHAT": { phone: "081199887766", email: "apotek.sehat@gmail.com", alamat: "Jl. Padjadjaran No. 102, Bogor" },
  "COUNTER HP": { phone: "089677889900", email: "countercell@gmail.com", alamat: "ITC Cibinong Lt. 1 Blok C" },
};

// Initial state builder migrating all existing dummy data seamlessly
function buildInitialInvoices(): InvoiceBillingRecord[] {
  const invoiceList: InvoiceBillingRecord[] = [];
  let currentId = 1;

  // 1. Migrate raw Tagihan Data
  rawTagihanData.forEach((tagihan) => {
    const total = tagihan.totalTagihan || 0;
    const paid = tagihan.terbayar || 0;
    const status = derivePaymentStatus(total, paid);
    const isLunas = status === "Lunas";
    const contact = SAMPLE_CUSTOMER_PHONES[tagihan.customer] || {
      phone: undefined,
      email: `${tagihan.customer.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
      alamat: "Kabupaten Bogor, Jawa Barat",
    };

    const profit = Math.round(total * 0.25);
    const biayaSamsat = total - profit;

    invoiceList.push({
      id: currentId++,
      tanggal: tagihan.tanggal,
      customer: tagihan.customer,
      nopol: tagihan.nopol,
      jenisLayanan: tagihan.jenisLayanan,
      totalTagihan: total,
      terbayar: paid,
      sisa: Math.max(0, total - paid),
      status,
      jatuhTempo: tagihan.jatuhTempo,
      invoice: `INV-24-${String(tagihan.id).padStart(4, "0")}`,
      phone: contact.phone,
      email: contact.email,
      alamat: contact.alamat,
      biayaSamsat,
      profit,
      profitStatus: isLunas ? "REALIZED" : "PENDING",
      cashback: isLunas ? Math.round(profit * 0.1) : 0,
      cashbackStatus: isLunas ? "REALIZED" : "PENDING",
      isCashRealized: isLunas,
      cashRecordedAmount: paid, // Already in cash ledger initially if paid
      metodePembayaran: paid > 0 ? "Transfer Bank" : "Tempo",
      bank: paid > 0 ? "BCA" : "Kas Kantor",
      billingStatus: "ACTIVE",
    });
  });

  // 2. Migrate Belum & Kurang Bayar Items (ensuring 0 duplicate nopol/invoice)
  rawBelumKurangBayarData.forEach((bkb) => {
    const existing = invoiceList.find((inv) => inv.nopol === bkb.nopol || inv.invoice === bkb.invoice);
    if (!existing) {
      const total = (bkb.uangMasuk || 0) + (bkb.kekurangan || 0);
      const paid = bkb.uangMasuk || 0;
      const status = derivePaymentStatus(total, paid);
      const contact = SAMPLE_CUSTOMER_PHONES[bkb.customer] || {
        phone: undefined,
        email: "finance@customer.co.id",
        alamat: "Jawa Barat",
      };

      invoiceList.push({
        id: currentId++,
        tanggal: bkb.tanggal,
        customer: bkb.customer,
        nopol: bkb.nopol,
        namaBerkas: bkb.namaBerkas,
        jenisLayanan: bkb.pengurusan,
        totalTagihan: total,
        terbayar: paid,
        sisa: Math.max(0, total - paid),
        status,
        jatuhTempo: "20 November 2024",
        invoice: bkb.invoice || `INV-BKB-${String(bkb.id).padStart(3, "0")}`,
        phone: contact.phone,
        email: contact.email,
        alamat: contact.alamat,
        biayaSamsat: bkb.biayaSamsat,
        profit: bkb.profit,
        profitStatus: "PENDING",
        cashback: 0,
        cashbackStatus: "PENDING",
        isCashRealized: paid > 0,
        cashRecordedAmount: paid,
        metodePembayaran: paid > 0 ? "Transfer Bank" : "Tempo",
        bank: "Kas Kantor",
        billingStatus: "ACTIVE",
      });
    }
  });

  // 3. Migrate Profit Terpending Items
  rawProfitTerpendingData.forEach((pt) => {
    const existing = invoiceList.find((inv) => inv.nopol === pt.nopol || inv.invoice === pt.invoice);
    if (!existing) {
      const total = pt.uangMasuk || 0;
      invoiceList.push({
        id: currentId++,
        tanggal: pt.tanggal,
        customer: pt.customer,
        nopol: pt.nopol,
        namaBerkas: pt.namaBerkas,
        jenisLayanan: pt.pengurusan,
        totalTagihan: total,
        terbayar: total,
        sisa: 0,
        status: "Lunas",
        jatuhTempo: pt.tanggal,
        invoice: pt.invoice,
        phone: "081288776655",
        biayaSamsat: pt.biayaSamsat,
        profit: pt.profit,
        profitStatus: "PENDING", // Explicitly pending as requested
        cashback: 0,
        cashbackStatus: "PENDING",
        isCashRealized: true,
        cashRecordedAmount: total,
        alasanPending: pt.alasan,
        billingStatus: "ACTIVE",
      });
    }
  });

  // 4. Migrate Cashback Terpending Items
  rawCashbackTerpendingData.forEach((cb) => {
    const existing = invoiceList.find((inv) => inv.nopol === cb.nopol || inv.invoice === cb.invoice);
    if (!existing) {
      const total = cb.uangMasuk || 0;
      invoiceList.push({
        id: currentId++,
        tanggal: cb.tanggal,
        customer: cb.customer,
        nopol: cb.nopol,
        namaBerkas: cb.namaBerkas,
        jenisLayanan: cb.pengurusan,
        totalTagihan: total,
        terbayar: total,
        sisa: 0,
        status: "Lunas",
        jatuhTempo: cb.tanggal,
        invoice: cb.invoice,
        phone: "081377889900",
        biayaSamsat: total - cb.profit,
        profit: cb.profit,
        profitStatus: "REALIZED",
        cashback: cb.jumlahCashback,
        cashbackPersen: cb.cashbackPersen,
        cashbackStatus: "PENDING", // Explicitly pending as requested
        isCashRealized: true,
        cashRecordedAmount: total,
        billingStatus: "ACTIVE",
      });
    }
  });

  return invoiceList;
}

class FinanceStore {
  private invoices: InvoiceBillingRecord[];
  private kasKantor: KasKantorItem[];
  private kasMessenger: KasMessengerItem[];
  private pengeluaran: PengeluaranItem[];
  private profitData: ProfitItem[];
  private labaRugiData: LabaRugiMonthlyItem[];
  private isApiMode: boolean;
  private unsubscribeRepo?: () => void;

  constructor() {
    this.isApiMode = APP_CONFIG.dataProvider === "api";
    if (this.isApiMode) {
      this.invoices = [];
      this.kasKantor = [];
      this.kasMessenger = [];
      this.pengeluaran = [];
      this.profitData = [];
      this.labaRugiData = [];
      this.contractDatasets = {
        "mutasi-ld": [],
        "mutasi-as": [],
        bbn: [],
        "perpanjangan-pajak": [],
        "lain-lain": [],
        "belum-kurang-bayar": [],
        "profit-terpending": [],
        "cashback-terpending": [],
      };
      this.syncFromRepository();
      this.unsubscribeRepo = financeRepository.subscribe(() => {
        this.syncFromRepository();
      });
    } else {
      this.invoices = buildInitialInvoices();
      this.kasKantor = [...rawKasKantorData];
      this.kasMessenger = [...rawKasMessengerData];
      this.pengeluaran = [...rawPengeluaranData];
      this.profitData = [...rawProfitData];
      this.labaRugiData = [...rawLabaRugiData];
    }
  }

  public setApiMode(isApi: boolean): void {
    this.isApiMode = isApi;
    if (this.unsubscribeRepo) {
      this.unsubscribeRepo();
      this.unsubscribeRepo = undefined;
    }
    if (isApi) {
      this.invoices = [];
      this.kasKantor = [];
      this.kasMessenger = [];
      this.pengeluaran = [];
      this.profitData = [];
      this.labaRugiData = [];
      this.syncFromRepository();
      this.unsubscribeRepo = financeRepository.subscribe(() => {
        this.syncFromRepository();
      });
    } else {
      this.invoices = buildInitialInvoices();
      this.kasKantor = [...rawKasKantorData];
      this.kasMessenger = [...rawKasMessengerData];
      this.pengeluaran = [...rawPengeluaranData];
      this.profitData = [...rawProfitData];
      this.labaRugiData = [...rawLabaRugiData];
      this.notify();
    }
  }

  public syncFromRepository(): void {
    const repoInvoices = financeRepository.getInvoices();
    if (Array.isArray(repoInvoices) && repoInvoices.length > 0) {
      this.invoices = repoInvoices;
    }
    const repoKas = financeRepository.getKasKantorList();
    if (Array.isArray(repoKas)) {
      this.kasKantor = repoKas;
    }
    const repoProfit = financeRepository.getProfitList();
    if (Array.isArray(repoProfit)) {
      this.profitData = repoProfit;
    }
    this.recomputeLabaRugi();
    this.notify();
  }

  public recomputeLabaRugi(): void {
    if (!this.isApiMode) return;

    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const monthlyMap: Record<string, { pendapatan: number; pengeluaran: number }> = {};

    this.invoices.forEach((inv) => {
      const d = parseDateSafe(inv.tanggal || (inv as any).tanggalInvoice || (inv as any).createdAt);
      if (!d) return;
      const mName = monthNames[d.getMonth()];
      if (!monthlyMap[mName]) {
        monthlyMap[mName] = { pendapatan: 0, pengeluaran: 0 };
      }
      monthlyMap[mName].pendapatan += inv.terbayar || inv.dibayar || 0;
      monthlyMap[mName].pengeluaran += inv.biayaSamsat || 0;
    });

    this.kasKantor.forEach((k) => {
      const d = parseDateSafe(k.tanggal);
      if (!d) return;
      const mName = monthNames[d.getMonth()];
      if (!monthlyMap[mName]) {
        monthlyMap[mName] = { pendapatan: 0, pengeluaran: 0 };
      }
      if (k.kredit > 0) {
        monthlyMap[mName].pengeluaran += k.kredit;
      }
      if (k.debit > 0 && (!k.invoiceRef || k.invoiceRef === "-")) {
        monthlyMap[mName].pendapatan += k.debit;
      }
    });

    const result: LabaRugiMonthlyItem[] = [];
    for (const [mName, stats] of Object.entries(monthlyMap)) {
      result.push({
        bulan: mName,
        pendapatan: stats.pendapatan,
        pengeluaran: stats.pengeluaran,
        laba: stats.pendapatan - stats.pengeluaran,
      });
    }

    this.labaRugiData = result;
  }
  private reimbursementRequests: ReimbursementRequest[] = [
    {
      id: "REIMB-001",
      employeeId: "EMP-MSG-001",
      messengerName: "Budi Santoso",
      orderNo: "ORD-0005",
      category: "Bensin",
      amount: 50000,
      date: "2026-09-25",
      note: "Bensin motor operasional ke Samsat Bekasi",
      status: "Diajukan",
      submittedAt: "2026-09-25T08:30:00.000Z",
    },
    {
      id: "REIMB-002",
      employeeId: "EMP-MSG-001",
      messengerName: "Budi Santoso",
      orderNo: "ORD-0001",
      category: "Parkir",
      amount: 10000,
      date: "2026-09-24",
      note: "Parkir loket Samsat Jakarta Timur",
      status: "Disetujui",
      submittedAt: "2026-09-24T11:00:00.000Z",
      reviewedAt: "2026-09-24T14:00:00.000Z",
      reviewedBy: "Finance User",
    },
    {
      id: "REIMB-003",
      employeeId: "EMP-MSG-002",
      messengerName: "Andi Pratama",
      orderNo: "ORD-0002",
      category: "Tol",
      amount: 25000,
      date: "2026-09-25",
      note: "Tol pengantaran dokumen",
      status: "Diajukan",
      submittedAt: "2026-09-25T09:15:00.000Z",
    },
  ];

  // Contract Datasets for DataPenjualan
  private contractDatasets: Record<PenjualanContractCategory, any[]> = {
    "mutasi-ld": [...initialMutasiLDContract],
    "mutasi-as": [...initialMutasiASContract],
    bbn: [...initialBBNContract],
    "perpanjangan-pajak": [...initialPerpanjanganPajakContract],
    "lain-lain": [...initialLainLainContract],
    "belum-kurang-bayar": [...initialBelumKurangBayarContract],
    "profit-terpending": [...initialProfitTerpendingContract],
    "cashback-terpending": [...initialCashbackTerpendingContract],
  };

  private listeners: Set<() => void> = new Set();
  private paymentSyncListeners: Set<PaymentSyncCallback> = new Set();
  private kasCounter = 100;
  private invoiceCounter = 200;

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onPaymentSync(callback: PaymentSyncCallback): () => void {
    this.paymentSyncListeners.add(callback);
    return () => this.paymentSyncListeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("FinanceStore listener error:", err);
      }
    });
  }

  private notifyPaymentSync(record: InvoiceBillingRecord): void {
    if (!record.orderNo) return;
    const statusPembayaran = record.status;
    const payload: PaymentSyncPayload = {
      orderNo: record.orderNo,
      statusPembayaran,
      dibayar: record.terbayar,
      kurang: record.sisa,
      totalBiaya: record.totalTagihan,
      tanggalBayar: record.tanggalBayar || record.tanggal,
      metodePembayaran: record.metodePembayaran,
      settlementCondition: record.settlementCondition,
      refundStatus: record.refundStatus,
      overpayment: record.overpayment,
    };
    this.paymentSyncListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error("FinanceStore paymentSync listener error:", err);
      }
    });
  }

  // ==========================================
  // GETTERS (SINGLE SOURCE OF TRUTH)
  // ==========================================

  public getInvoices(): InvoiceBillingRecord[] {
    return this.invoices;
  }

  public getTagihanList(): InvoiceBillingRecord[] {
    return this.invoices.filter((inv) => inv.billingStatus !== "COMPLETED");
  }

  public getCompletedTagihanList(): InvoiceBillingRecord[] {
    return this.invoices.filter((inv) => inv.billingStatus === "COMPLETED");
  }

  public getProfitList(): ProfitItem[] {
    return this.profitData;
  }

  public getProfitPendingList(): any[] {
    return this.invoices
      .filter((inv) => inv.profitStatus === "PENDING")
      .map((inv) => ({
        ...inv,
        pengurusan: inv.jenisLayanan,
        uangMasuk: inv.terbayar > 0 ? inv.terbayar : inv.totalTagihan,
        alasan: inv.alasanPending || "Menunggu proses verifikasi tuntas",
      }));
  }

  public getCashbackPendingList(): any[] {
    return this.invoices
      .filter((inv) => inv.cashbackStatus === "PENDING" && inv.cashback > 0)
      .map((inv) => ({
        ...inv,
        pengurusan: inv.jenisLayanan,
        uangMasuk: inv.terbayar > 0 ? inv.terbayar : inv.totalTagihan,
        jumlahCashback: inv.cashback,
      }));
  }

  public getBelumBayarList(): any[] {
    return this.invoices
      .filter((inv) => inv.status !== "Lunas")
      .map((inv) => ({
        ...inv,
        pengurusan: inv.jenisLayanan,
        uangMasuk: inv.terbayar,
        kekurangan: inv.sisa,
      }));
  }

  public getKasKantorList(): KasKantorItem[] {
    return this.kasKantor;
  }

  public getKasMessengerList(): KasMessengerItem[] {
    return this.kasMessenger;
  }

  public getPengeluaranList(): PengeluaranItem[] {
    return this.pengeluaran;
  }

  public getLabaRugiData(): LabaRugiMonthlyItem[] {
    return this.labaRugiData;
  }

  public syncInvoicesFromExternal(externalInvoices: InvoiceBillingRecord[]): void {
    if (!Array.isArray(externalInvoices) || externalInvoices.length === 0) return;
    externalInvoices.forEach((extInv) => {
      const idx = this.invoices.findIndex(
        (inv) => inv.id === extInv.id || inv.invoice === (extInv.invoiceNo || (extInv as any).invoice)
      );
      if (idx !== -1) {
        this.invoices[idx] = { ...this.invoices[idx], ...extInv };
      } else {
        this.invoices.unshift(extInv);
      }
    });
    this.notify();
  }

  // Synchronized contract data for DataPenjualan
  public getContractData(category: PenjualanContractCategory): any[] {
    if (category === "belum-kurang-bayar") {
      // Return dynamic view of pending/unpaid invoices mapped to contract keys
      return this.invoices
        .filter((inv) => inv.status !== "Lunas")
        .map((inv) => ({
          id: inv.id,
          "Tanggal Masuk Berkas": inv.tanggal,
          "R4 / R2": inv.r4r2 || "R4",
          "Plat No": inv.nopol,
          "Nama Customer": inv.customer,
          Nama: inv.namaBerkas || inv.customer,
          "Jenis Pengurusan": inv.jenisLayanan,
          Samsat: inv.samsat || "Samsat",
          "Jenis Bayar": inv.metodePembayaran || "Tempo",
          "Tanggal Uang Masuk": inv.terbayar > 0 ? inv.tanggal : "-",
          "Uang Masuk dari Konsumen": inv.terbayar,
          "Bank Uang Keluar": inv.bank || "Kas Kantor",
          "Tanggal Uang Keluar": inv.tanggal,
          "Uang Keluar dari Biro Jasa": inv.biayaSamsat,
          Profit: inv.profit,
          Status: inv.status,
          "No Invoice": inv.invoice,
          "Tanggal Invoice": inv.tanggal,
          "Tanda Terima": inv.tandaTerima || "-",
          BPKB: inv.bpkb || "Ada",
          "TTB BPKB": inv.ttbBPKB || "-",
          Kekurangan: inv.sisa,
        }));
    }

    if (category === "profit-terpending") {
      return this.invoices
        .filter((inv) => inv.profitStatus === "PENDING")
        .map((inv) => ({
          id: inv.id,
          "Tanggal Masuk Berkas": inv.tanggal,
          "R4 / R2": inv.r4r2 || "R4",
          "Plat No": inv.nopol,
          "Nama Customer": inv.customer,
          Nama: inv.namaBerkas || inv.customer,
          "Jenis Pengurusan": inv.jenisLayanan,
          Samsat: inv.samsat || "Samsat",
          "Jenis Bayar": inv.metodePembayaran || "Transfer",
          "Tanggal Uang Masuk": inv.tanggal,
          "Uang Masuk dari Konsumen": inv.totalTagihan,
          "Bank Uang Keluar": inv.bank || "BCA",
          "Tanggal Uang Keluar": inv.tanggal,
          "Uang Keluar dari Biro Jasa": inv.biayaSamsat,
          Profit: inv.profit,
          Status: "Pending",
          "No Invoice": inv.invoice,
          "Tanggal Invoice": inv.tanggal,
          "Tanda Terima": inv.tandaTerima || "-",
          Alasan: inv.alasanPending || "Menunggu proses verifikasi tuntas",
        }));
    }

    if (category === "cashback-terpending") {
      return this.invoices
        .filter((inv) => inv.cashbackStatus === "PENDING" && inv.cashback > 0)
        .map((inv) => ({
          id: inv.id,
          "Tanggal Masuk Berkas": inv.tanggal,
          "R4 / R2": inv.r4r2 || "R4",
          "Plat No": inv.nopol,
          "Nama Customer": inv.customer,
          Nama: inv.namaBerkas || inv.customer,
          "Jenis Pengurusan": inv.jenisLayanan,
          Samsat: inv.samsat || "Samsat",
          "Jenis Bayar": inv.metodePembayaran || "Transfer",
          "Tanggal Uang Masuk": inv.tanggal,
          "Uang Masuk dari Konsumen": inv.totalTagihan,
          "Bank Uang Keluar": inv.bank || "BCA",
          "Tanggal Uang Keluar": inv.tanggal,
          "Uang Keluar dari Biro Jasa": inv.biayaSamsat,
          Profit: inv.profit,
          Status: "Pending",
          "No Invoice": inv.invoice,
          "Tanggal Invoice": inv.tanggal,
          "Tanda Terima": inv.tandaTerima || "-",
          "Jumlah Cashback": inv.cashback,
          "Cashback Persen": inv.cashbackPersen || "3.5%",
        }));
    }

    return this.contractDatasets[category] || [];
  }

  // =========================================================================
  // CORE OPERATIONS (PAYMENT REALIZATION & PREVENTING DUPLICATE CASH INFLOW)
  // =========================================================================

  /**
   * Record a payment (full or partial) on an invoice.
   * Authoritatively updates invoice, realizes cash in Kas Kantor, and marks profit realized if fully paid.
   */
  public recordPayment(
    invoiceId: number | string,
    amount: number,
    options?: { paymentMethod?: string; bank?: string; tanggal?: string; skipAudit?: boolean }
  ): boolean {
    if (amount <= 0) return false;

    if (this.isApiMode) {
      const ok = financeRepository.recordPayment(invoiceId, amount, options);
      if (ok) {
        this.syncFromRepository();
        const matched = this.invoices.find(
          (inv) => inv.id === invoiceId || inv.invoice === String(invoiceId) || inv.invoiceNo === String(invoiceId)
        );
        if (matched) {
          this.notifyPaymentSync(matched);
        }
      }
      return ok;
    }

    const idx = this.invoices.findIndex((inv) => inv.id === invoiceId || inv.invoice === String(invoiceId));
    if (idx === -1) return false;

    const record = this.invoices[idx];
    const newTerbayar = Math.min(record.totalTagihan, record.terbayar + amount);
    const newSisa = Math.max(0, record.totalTagihan - newTerbayar);
    const newStatus = derivePaymentStatus(record.totalTagihan, newTerbayar);

    // REALIZATION RULE: Calculate cash newly received into company cash
    const cashDelta = newTerbayar - record.cashRecordedAmount;

    // PREVENT DUPLICATE CASH INFLOW: Only debit Kas Kantor if cash was NOT already recorded
    if (cashDelta > 0) {
      const lastTotal = this.kasKantor.length > 0 ? this.kasKantor[this.kasKantor.length - 1].total : 0;
      const paymentDate = options?.tanggal || new Date().toLocaleDateString("id-ID");
      const bankName = options?.bank || record.bank || "Kas Kantor";

      const kasEntry: KasKantorItem = {
        id: this.kasCounter++,
        tanggal: paymentDate,
        status: "Debit",
        keterangan: `Pelunasan: ${record.invoice} - ${record.customer} (${record.nopol} / ${bankName})`,
        debit: cashDelta,
        kredit: 0,
        total: lastTotal + cashDelta,
        invoiceRef: record.invoice,
      };

      this.kasKantor.push(kasEntry);
      record.cashRecordedAmount = newTerbayar;
      record.isCashRealized = true;
    }

    record.terbayar = newTerbayar;
    record.sisa = newSisa;
    record.status = newStatus;
    if (options?.paymentMethod) record.metodePembayaran = options.paymentMethod;
    if (options?.bank) record.bank = options.bank;

    // If fully paid, mark billing lifecycle completed so active tagihan clears
    if (newStatus === "Lunas" && newSisa === 0) {
      record.billingStatus = "COMPLETED";
      record.completedAt = new Date().toISOString();
      record.completedBy = options?.bank || "Finance Admin";
    }

    // Profit realization rule: Bayar di Awal must NOT finalize profit before Stage 5!
    // Profit and cashback can only be marked REALIZED once finalCost is determined at Stage 5.
    const isFinalized = record.settlementCondition && record.settlementCondition !== "PENDING_FINALIZATION";
    if (newStatus === "Lunas" && isFinalized) {
      record.profitStatus = "REALIZED";
      record.cashbackStatus = "REALIZED";

      // Also append or synchronize with profitData if not already present
      const alreadyInProfit = this.profitData.some((p) => p.invoice === record.invoice || p.nopol === record.nopol);
      if (!alreadyInProfit) {
        this.profitData.unshift({
          id: this.profitData.length + 1,
          tanggal: record.tanggal,
          nopol: record.nopol,
          customer: record.customer,
          namaBerkas: record.namaBerkas || record.customer,
          pengurusan: record.jenisLayanan,
          uangMasuk: record.totalTagihan,
          biayaSamsat: record.biayaSamsat,
          profit: record.profit,
          rekening: record.bank || "BCA",
          invoice: record.invoice,
          tanggalTTB: record.tanggal,
          ttb: `TTB_${record.invoice.replace(/[^0-9]/g, "") || "001"}`,
        });
      }
    } else {
      record.profitStatus = "PENDING";
      record.cashbackStatus = "PENDING";
      record.alasanPending = !isFinalized
        ? "Menunggu verifikasi biaya final di Stage 5"
        : "Menunggu pelunasan pembayaran";
    }

    // Synchronize corresponding Penjualan contract row if it exists
    this.syncContractRowFromInvoice(record);

    if (!options?.skipAudit) {
      try {
        auditLog.log({
          userId: "usr-finance",
          userName: "Finance User",
          userRole: "finance",
          action: "UPDATE",
          module: "Finance - Kas Kantor",
          details: `Pencatatan pembayaran ${record.invoice} (${record.customer}): Rp ${amount.toLocaleString('id-ID')} (${newStatus})`,
          metadata: { invoice: record.invoice, amount, status: newStatus },
        });
      } catch {
        // safe fallback
      }
    }

    this.notifyPaymentSync(record);
    this.notify();
    return true;
  }

  /**
   * Action "Selesaikan" for a paid or completing invoice.
   * Settles any remaining balance, debits only the actual remaining cash delta to Kas Kantor,
   * and transitions profit & cashback to REALIZED.
   */
  public resolveInvoice(
    invoiceId: number | string,
    options?: { paymentMethod?: string; bank?: string; skipAudit?: boolean }
  ): boolean {
    const idx = this.invoices.findIndex((inv) => inv.id === invoiceId || inv.invoice === String(invoiceId));
    if (idx === -1) return false;

    const record = this.invoices[idx];
    const remainingBalance = record.sisa;

    // If there is still unpaid balance, record it as cash received
    if (remainingBalance > 0) {
      return this.recordPayment(invoiceId, remainingBalance, options);
    }

    // If already fully paid financially, ensure profit and cashback are marked REALIZED
    record.status = "Lunas";
    record.profitStatus = "REALIZED";
    record.cashbackStatus = "REALIZED";
    this.syncContractRowFromInvoice(record);

    if (!options?.skipAudit) {
      try {
        auditLog.log({
          userId: "usr-finance",
          userName: "Finance User",
          userRole: "finance",
          action: "UPDATE",
          module: "Finance - Tagihan",
          details: `Pelunasan tagihan invoice ${record.invoice} (${record.customer})`,
          metadata: { invoice: record.invoice, customer: record.customer },
        });
      } catch {
        // safe fallback
      }
    }

    this.notifyPaymentSync(record);
    this.notify();
    return true;
  }

  /**
   * Action "Selesai" for Tagihan lifecycle (Requirement 3).
   * Transitions an invoice to COMPLETED lifecycle status so it is archived from active billing.
   * This is NOT a delete; historical financial record and ledger entries are completely preserved.
   */
  public completeInvoice(
    invoiceId: number | string,
    completedBy?: string
  ): boolean {
    const idx = this.invoices.findIndex((inv) => inv.id === invoiceId || inv.invoice === String(invoiceId));
    if (idx === -1) return false;

    const record = this.invoices[idx];
    if (record.billingStatus === "COMPLETED") return true;

    // If not already Lunas, resolve payment first to ensure financial integrity
    if (record.status !== "Lunas") {
      this.resolveInvoice(invoiceId, { skipAudit: true });
    }

    record.billingStatus = "COMPLETED";
    record.completedAt = new Date().toISOString();
    record.completedBy = completedBy || "Admin";

    try {
      auditLog.log({
        userId: "usr-finance",
        userName: completedBy || "Finance User",
        userRole: "finance",
        action: "UPDATE",
        module: "Finance - Tagihan",
        details: `Tagihan invoice ${record.invoice} (${record.customer}) diselesaikan`,
        metadata: { invoice: record.invoice, customer: record.customer },
      });
    } catch {
      // safe fallback
    }

    this.notifyPaymentSync(record);
    this.notify();
    return true;
  }

  /**
   * Process refund for overpaid order (Section 10).
   * Deducts refund from Kas Kantor as Kredit, marks refundStatus = "PROCESSED".
   * Never creates negative tagihan or decreases revenue erroneously.
   */
  public processRefund(invoiceId: number | string, processedBy: string = "Finance"): boolean {
    const idx = this.invoices.findIndex((inv) => inv.id === invoiceId || inv.invoice === String(invoiceId));
    if (idx === -1) return false;
    const record = this.invoices[idx];
    const refundAmount = record.overpayment || 0;
    if (refundAmount <= 0 || record.refundStatus === "PROCESSED") return false;

    record.refundStatus = "PROCESSED";
    record.settlementCondition = "SETTLED";

    const lastTotal = this.kasKantor.length > 0 ? this.kasKantor[this.kasKantor.length - 1].total : 0;
    this.kasKantor.push({
      id: this.kasCounter++,
      tanggal: new Date().toLocaleDateString("id-ID"),
      status: "Kredit",
      keterangan: `Refund kelebihan bayar: ${record.invoice} - ${record.customer} (${record.nopol})`,
      debit: 0,
      kredit: refundAmount,
      total: lastTotal - refundAmount,
      invoiceRef: record.invoice,
    });

    try {
      auditLog.log({
        userId: "usr-finance",
        userName: processedBy,
        userRole: "finance",
        action: "UPDATE",
        module: "Finance - Kas Kantor",
        details: `Proses refund kelebihan bayar ${record.invoice} (${record.customer}): Rp ${refundAmount.toLocaleString("id-ID")}`,
        metadata: { invoice: record.invoice, refundAmount },
      });
    } catch {
      // safe fallback
    }

    this.notifyPaymentSync(record);
    this.notify();
    return true;
  }

  /**
   * Update an invoice when costs are recalculated from operational Order (e.g. Stage 5 Verifikasi Ulang)
   * Prevents revenue leakage and synchronizes remaining balance deterministically.
   */
  public updateInvoiceFromOrder(
    orderNo: string,
    updates: {
      totalTagihan: number;
      biayaSamsat?: number;
      profit?: number;
      costItems?: any[];
      settlementCondition?: SettlementCondition;
      refundStatus?: RefundStatus;
      overpayment?: number;
      dueTrigger?: PaymentDueTrigger;
      collectionStatus?: CollectionState;
    }
  ): InvoiceBillingRecord | null {
    const idx = this.invoices.findIndex((inv) => inv.orderNo === orderNo);
    if (idx === -1) return null;

    const record = this.invoices[idx];
    const newTotal = updates.totalTagihan;
    const currentPaid = record.terbayar;
    const newSisa = Math.max(0, newTotal - currentPaid);
    const newStatus = derivePaymentStatus(newTotal, currentPaid);

    record.totalTagihan = newTotal;
    record.sisa = newSisa;
    record.status = newStatus;
    if (updates.biayaSamsat !== undefined) record.biayaSamsat = updates.biayaSamsat;
    if (updates.profit !== undefined) record.profit = updates.profit;

    if (updates.settlementCondition !== undefined) record.settlementCondition = updates.settlementCondition;
    if (updates.refundStatus !== undefined) record.refundStatus = updates.refundStatus;
    if (updates.overpayment !== undefined) record.overpayment = updates.overpayment;
    if (updates.dueTrigger !== undefined) record.dueTrigger = updates.dueTrigger;
    if (updates.collectionStatus !== undefined) record.collectionStatus = updates.collectionStatus;

    const settlementCond = updates.settlementCondition || record.settlementCondition;
    const isFinalized = settlementCond && settlementCond !== "PENDING_FINALIZATION";
    const isProfitRealized = newStatus === "Lunas" && isFinalized;

    if (isProfitRealized) {
      record.profitStatus = "REALIZED";
      record.cashbackStatus = "REALIZED";
      if (!record.collectionStatus) record.collectionStatus = "LUNAS";

      const existingProfitIdx = this.profitData.findIndex(
        (p) => p.invoice === record.invoice || (record.nopol && p.nopol === record.nopol)
      );
      if (existingProfitIdx >= 0) {
        this.profitData[existingProfitIdx] = {
          ...this.profitData[existingProfitIdx],
          uangMasuk: newTotal, // Final cost (strictly excludes overpayment)
          biayaSamsat: record.biayaSamsat,
          profit: record.profit,
        };
      } else {
        this.profitData.unshift({
          id: this.profitData.length + 1,
          tanggal: record.tanggal,
          nopol: record.nopol,
          customer: record.customer,
          namaBerkas: record.namaBerkas || record.customer,
          pengurusan: record.jenisLayanan,
          uangMasuk: newTotal, // Final cost (strictly excludes overpayment)
          biayaSamsat: record.biayaSamsat,
          profit: record.profit,
          rekening: record.bank || "BCA",
          invoice: record.invoice,
          tanggalTTB: record.tanggal,
          ttb: `TTB_${record.invoice.replace(/[^0-9]/g, "") || "001"}`,
        });
      }
    } else {
      record.profitStatus = "PENDING";
      record.cashbackStatus = "PENDING";
    }

    this.syncContractRowFromInvoice(record);
    this.notifyPaymentSync(record);
    this.notify();
    return record;
  }

  /**
   * Synchronize an Invoice update into the matching Penjualan contract datasets
   */
  private syncContractRowFromInvoice(record: InvoiceBillingRecord): void {
    const categories: PenjualanContractCategory[] = ["mutasi-ld", "mutasi-as", "bbn", "perpanjangan-pajak", "lain-lain"];
    categories.forEach((cat) => {
      const dataset = this.contractDatasets[cat];
      const foundIdx = dataset.findIndex(
        (row) => row["No Invoice"] === record.invoice || row["Plat No"] === record.nopol
      );
      if (foundIdx !== -1) {
        dataset[foundIdx]["Status"] = record.status === "Lunas" ? "Selesai" : record.status;
        dataset[foundIdx]["Uang Masuk dari Konsumen"] = record.terbayar;
      }
    });
  }

  // ==========================================
  // INVOICE CRUD
  // ==========================================

  public addInvoice(data: Partial<InvoiceBillingRecord>): InvoiceBillingRecord {
    const total = data.totalTagihan || 0;
    const paid = data.terbayar || 0;
    const status = derivePaymentStatus(total, paid);
    const isLunas = status === "Lunas";

    const newRecord: InvoiceBillingRecord = {
      id: this.invoiceCounter++,
      tanggal: data.tanggal || new Date().toLocaleDateString("id-ID"),
      customer: data.customer || "Pelanggan Baru",
      nopol: (data.nopol || "B 0000 XXX").toUpperCase(),
      jenisLayanan: data.jenisLayanan || "Pajak Tahunan",
      totalTagihan: total,
      terbayar: paid,
      sisa: Math.max(0, total - paid),
      status,
      billingStatus: data.billingStatus || "ACTIVE",
      jatuhTempo: data.jatuhTempo || new Date().toLocaleDateString("id-ID"),
      invoice: data.invoice || `INV-${new Date().getFullYear()}-${String(this.invoiceCounter).padStart(4, "0")}`,
      orderNo: data.orderNo,
      phone: data.phone?.trim() ? data.phone.trim() : undefined,
      email: data.email,
      alamat: data.alamat,
      biayaSamsat: data.biayaSamsat || Math.round(total * 0.75),
      profit: data.profit || Math.round(total * 0.25),
      profitStatus: isLunas && data.settlementCondition !== "PENDING_FINALIZATION" ? "REALIZED" : "PENDING",
      cashback: data.cashback || 0,
      cashbackStatus: isLunas && data.settlementCondition !== "PENDING_FINALIZATION" ? "REALIZED" : "PENDING",
      isCashRealized: paid > 0,
      cashRecordedAmount: paid, // Set recorded amount to prevent double inflow
      metodePembayaran: data.metodePembayaran || (paid > 0 ? "Transfer Bank" : "Tempo"),
      bank: data.bank || "Kas Kantor",
      settlementCondition: data.settlementCondition || "PENDING_FINALIZATION",
      refundStatus: data.refundStatus || "NONE",
      overpayment: data.overpayment || 0,
      dueTrigger: data.dueTrigger || "AFTER_DOCUMENT_RECEIVED",
      collectionStatus: data.collectionStatus || (isLunas ? "LUNAS" : "BELUM_JATUH_TEMPO"),
    };

    // If paid at creation ("Bayar di Awal"), record single initial debit to Kas Kantor
    if (paid > 0) {
      const lastTotal = this.kasKantor.length > 0 ? this.kasKantor[this.kasKantor.length - 1].total : 0;
      this.kasKantor.push({
        id: this.kasCounter++,
        tanggal: newRecord.tanggal,
        status: "Debit",
        keterangan: `Penerimaan awal: ${newRecord.invoice} - ${newRecord.customer} (${newRecord.nopol})`,
        debit: paid,
        kredit: 0,
        total: lastTotal + paid,
        invoiceRef: newRecord.invoice,
      });
    }

    this.invoices.unshift(newRecord);
    this.notify();
    return newRecord;
  }

  public updateInvoice(id: number | string, updates: Partial<InvoiceBillingRecord>): boolean {
    const idx = this.invoices.findIndex((inv) => inv.id === id);
    if (idx === -1) return false;

    const current = this.invoices[idx];
    const total = updates.totalTagihan !== undefined ? updates.totalTagihan : current.totalTagihan;
    const paid = updates.terbayar !== undefined ? Math.min(total, updates.terbayar) : current.terbayar;
    const status = derivePaymentStatus(total, paid);
    const isLunas = status === "Lunas";

    // REALIZATION RULE: Calculate cash newly received
    const cashDelta = paid - current.cashRecordedAmount;
    if (cashDelta > 0) {
      const lastTotal = this.kasKantor.length > 0 ? this.kasKantor[this.kasKantor.length - 1].total : 0;
      const paymentDate = new Date().toLocaleDateString("id-ID");
      this.kasKantor.push({
        id: this.kasCounter++,
        tanggal: paymentDate,
        status: "Debit",
        keterangan: `Pelunasan: ${current.invoice} - ${current.customer} (${current.nopol})`,
        debit: cashDelta,
        kredit: 0,
        total: lastTotal + cashDelta,
        invoiceRef: current.invoice,
      });
      current.cashRecordedAmount = paid;
      current.isCashRealized = true;
    }

    const settlementCond = updates.settlementCondition || current.settlementCondition;
    const isFinalized = settlementCond && settlementCond !== "PENDING_FINALIZATION";
    const isProfitRealized = isLunas && isFinalized;

    this.invoices[idx] = {
      ...current,
      ...updates,
      totalTagihan: total,
      terbayar: paid,
      sisa: Math.max(0, total - paid),
      status,
      profitStatus: isProfitRealized ? "REALIZED" : "PENDING",
      cashbackStatus: isProfitRealized ? "REALIZED" : "PENDING",
    };

    if (isProfitRealized) {
      const existingProfitIdx = this.profitData.findIndex(
        (p) => p.invoice === current.invoice || (current.nopol && p.nopol === current.nopol)
      );
      if (existingProfitIdx >= 0) {
        this.profitData[existingProfitIdx] = {
          ...this.profitData[existingProfitIdx],
          uangMasuk: total, // Final cost (strictly excludes overpayment)
          biayaSamsat: current.biayaSamsat,
          profit: current.profit,
        };
      } else {
        this.profitData.unshift({
          id: this.profitData.length + 1,
          tanggal: current.tanggal,
          nopol: current.nopol,
          customer: current.customer,
          namaBerkas: current.namaBerkas || current.customer,
          pengurusan: current.jenisLayanan,
          uangMasuk: total, // Final cost (strictly excludes overpayment)
          biayaSamsat: current.biayaSamsat,
          profit: current.profit,
          rekening: current.bank || "BCA",
          invoice: current.invoice,
          tanggalTTB: current.tanggal,
          ttb: `TTB_${current.invoice.replace(/[^0-9]/g, "") || "001"}`,
        });
      }
    }

    this.syncContractRowFromInvoice(this.invoices[idx]);
    this.notifyPaymentSync(this.invoices[idx]);
    this.notify();
    return true;
  }

  public deleteInvoice(id: number | string): boolean {
    const idx = this.invoices.findIndex((inv) => inv.id === id);
    if (idx === -1) return false;
    this.invoices.splice(idx, 1);
    this.notify();
    return true;
  }

  // ==========================================
  // KAS KANTOR CRUD
  // ==========================================

  public addKasKantor(item: Omit<KasKantorItem, "id" | "total"> & { total?: number }): KasKantorItem {
    if (this.isApiMode) {
      const added = financeRepository.addKasKantor ? financeRepository.addKasKantor(item as any) : null;
      if (added) {
        this.syncFromRepository();
        return added;
      }
    }

    const lastTotal = this.kasKantor.length > 0 ? this.kasKantor[this.kasKantor.length - 1].total : 0;
    const runningTotal = item.total !== undefined ? item.total : lastTotal + item.debit - item.kredit;

    const newItem: KasKantorItem = {
      id: this.kasCounter++,
      tanggal: item.tanggal,
      status: item.status,
      keterangan: item.keterangan,
      debit: item.debit,
      kredit: item.kredit,
      total: runningTotal,
      invoiceRef: item.invoiceRef,
    };

    this.kasKantor.push(newItem);
    this.notify();
    return newItem;
  }

  public updateKasKantor(id: number, updates: Partial<KasKantorItem>): boolean {
    const idx = this.kasKantor.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    this.kasKantor[idx] = { ...this.kasKantor[idx], ...updates };
    this.notify();
    return true;
  }

  public deleteKasKantor(id: number): boolean {
    const idx = this.kasKantor.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    this.kasKantor.splice(idx, 1);
    this.notify();
    return true;
  }

  // ==========================================
  // KAS MESSENGER CRUD
  // ==========================================

  public addKasMessenger(item: Omit<KasMessengerItem, "id" | "total"> & { total?: number }): KasMessengerItem {
    const lastTotal = this.kasMessenger.length > 0 ? this.kasMessenger[this.kasMessenger.length - 1].total : 0;
    const runningTotal = item.total !== undefined ? item.total : lastTotal + item.in - item.out;

    const newItem: KasMessengerItem = {
      id: this.kasCounter++,
      tanggal: item.tanggal,
      jenis: item.jenis,
      messenger: item.messenger,
      keterangan: item.keterangan,
      in: item.in,
      out: item.out,
      total: runningTotal,
    };

    this.kasMessenger.push(newItem);
    this.notify();
    return newItem;
  }

  public updateKasMessenger(id: number, updates: Partial<KasMessengerItem>): boolean {
    const idx = this.kasMessenger.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    this.kasMessenger[idx] = { ...this.kasMessenger[idx], ...updates };
    this.notify();
    return true;
  }

  public deleteKasMessenger(id: number): boolean {
    const idx = this.kasMessenger.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    this.kasMessenger.splice(idx, 1);
    this.notify();
    return true;
  }

  // ==========================================
  // PENGELUARAN CRUD
  // ==========================================

  public addPengeluaran(item: Omit<PengeluaranItem, "id">): PengeluaranItem {
    const nextId = Math.max(0, ...this.pengeluaran.map((p) => p.id)) + 1;
    const newItem: PengeluaranItem = {
      id: nextId,
      tanggal: item.tanggal,
      keterangan: item.keterangan,
      nominal: item.nominal,
    };
    this.pengeluaran.unshift(newItem);
    this.notify();
    return newItem;
  }

  public updatePengeluaran(id: number, updates: Partial<PengeluaranItem>): boolean {
    const idx = this.pengeluaran.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.pengeluaran[idx] = { ...this.pengeluaran[idx], ...updates };
    this.notify();
    return true;
  }

  public deletePengeluaran(id: number): boolean {
    const idx = this.pengeluaran.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.pengeluaran.splice(idx, 1);
    this.notify();
    return true;
  }

  // ==========================================
  // DATA PENJUALAN CONTRACT SYNC
  // ==========================================

  public updateContractData(category: PenjualanContractCategory, id: number, updatedFields: Record<string, any>): boolean {
    if (category === "belum-kurang-bayar" || category === "profit-terpending" || category === "cashback-terpending") {
      const inv = this.invoices.find((i) => i.id === id);
      if (inv) {
        if (updatedFields["Uang Masuk dari Konsumen"] !== undefined) {
          const newPaid = Number(updatedFields["Uang Masuk dari Konsumen"]) || 0;
          this.recordPayment(inv.id, newPaid - inv.terbayar);
        } else {
          if (updatedFields["Alasan"]) inv.alasanPending = updatedFields["Alasan"];
          if (updatedFields["Jumlah Cashback"]) inv.cashback = Number(updatedFields["Jumlah Cashback"]) || 0;
          this.notify();
        }
        return true;
      }
    }

    const dataset = this.contractDatasets[category];
    if (!dataset) return false;
    const idx = dataset.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    dataset[idx] = { ...dataset[idx], ...updatedFields };

    // Synchronize to matching invoice if present
    const invoiceNo = dataset[idx]["No Invoice"];
    const nopol = dataset[idx]["Plat No"];
    const matchedInvoice = this.invoices.find((inv) => inv.invoice === invoiceNo || inv.nopol === nopol);

    if (matchedInvoice && updatedFields["Uang Masuk dari Konsumen"] !== undefined) {
      const newPaid = Number(updatedFields["Uang Masuk dari Konsumen"]) || 0;
      this.recordPayment(matchedInvoice.id, newPaid - matchedInvoice.terbayar);
    } else {
      this.notify();
    }

    return true;
  }

  public addContractData(category: PenjualanContractCategory, rows: any[]): boolean {
    const dataset = this.contractDatasets[category];
    if (!dataset) return false;
    const nextId = Math.max(0, ...dataset.map((d: any) => d.id || 0)) + 1;
    const newItems = rows.map((row, i) => ({
      id: nextId + i,
      ...row,
    }));
    this.contractDatasets[category] = [...dataset, ...newItems];
    this.notify();
    return true;
  }

  public deleteContractData(category: PenjualanContractCategory, id: number): boolean {
    if (category === "belum-kurang-bayar" || category === "profit-terpending" || category === "cashback-terpending") {
      return this.deleteInvoice(id);
    }
    const dataset = this.contractDatasets[category];
    if (!dataset) return false;
    this.contractDatasets[category] = dataset.filter((d: any) => d.id !== id);
    this.notify();
    return true;
  }

  // ==========================================
  // REIMBURSEMENT (PENGAJUAN BIAYA)
  // ==========================================

  public getReimbursements(employeeId?: string): ReimbursementRequest[] {
    if (employeeId) {
      return this.reimbursementRequests.filter((r) => r.employeeId === employeeId);
    }
    return this.reimbursementRequests;
  }

  public submitReimbursement(
    data: Omit<ReimbursementRequest, "id" | "status" | "submittedAt">
  ): ReimbursementRequest {
    const nextNum = this.reimbursementRequests.length + 1;
    const newReq: ReimbursementRequest = {
      ...data,
      id: `REIMB-${String(nextNum).padStart(3, "0")}`,
      status: "Diajukan",
      submittedAt: new Date().toISOString(),
    };
    this.reimbursementRequests.unshift(newReq);

    try {
      auditLog.log({
        userId: data.employeeId,
        userName: data.messengerName,
        userRole: "messenger",
        action: "CREATE",
        module: "Reimbursement",
        details: `Pengajuan biaya operasional ${data.category} sebesar Rp ${data.amount.toLocaleString("id-ID")}${data.orderNo ? ` (Order ${data.orderNo})` : ""}`,
        metadata: { reimbursementId: newReq.id, amount: data.amount, category: data.category, orderNo: data.orderNo },
      });
    } catch {}

    this.notify();
    return newReq;
  }

  public reviewReimbursement(
    id: string,
    decision: "Disetujui" | "Ditolak" | "Sedang Ditinjau",
    reviewer: { role: string; userName: string },
    reviewNotes?: string
  ): boolean {
    if (reviewer.role === "messenger") {
      return false; // Messengers cannot review or approve reimbursements!
    }

    const req = this.reimbursementRequests.find((r) => r.id === id);
    if (!req) return false;

    req.status = decision;
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = reviewer.userName;
    if (reviewNotes) req.reviewNotes = reviewNotes;

    try {
      auditLog.log({
        userId: "usr-finance",
        userName: reviewer.userName,
        userRole: reviewer.role as any,
        action: "UPDATE",
        module: "Reimbursement Review",
        details: `Pengajuan biaya ${id} (${req.messengerName}) diubah status menjadi ${decision}`,
        metadata: { id, status: decision },
      });
    } catch {}

    this.notify();
    return true;
  }

  public payReimbursement(
    id: string,
    payer: { role: string; userName: string }
  ): boolean {
    if (payer.role === "messenger") {
      return false; // Messengers cannot disburse payments!
    }

    const req = this.reimbursementRequests.find((r) => r.id === id);
    if (!req) return false;

    const nowStr = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    // Create real cash outflow in pengeluaran
    const pengeluaranItem = this.addPengeluaran({
      tanggal: nowStr,
      keterangan: `Reimbursement ${req.category} - ${req.messengerName}${req.orderNo ? ` (${req.orderNo})` : ""}`,
      nominal: req.amount,
    });

    req.status = "Dibayar";
    req.paidAt = nowIso;
    req.paidBy = payer.userName;
    req.pengeluaranId = pengeluaranItem.id;

    try {
      auditLog.log({
        userId: "usr-finance",
        userName: payer.userName,
        userRole: payer.role as any,
        action: "UPDATE",
        module: "Reimbursement Payout",
        details: `Pembayaran reimbursement ${id} sebesar Rp ${req.amount.toLocaleString("id-ID")} kepada ${req.messengerName} dicairkan`,
        metadata: { id, amount: req.amount, pengeluaranId: pengeluaranItem.id },
      });
    } catch {}

    this.notify();
    return true;
  }
}

// Global Singleton Instance
export const financeStore = new FinanceStore();

// React Hook
export function useFinanceStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return financeStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    invoices: financeStore.getInvoices(),
    tagihanList: financeStore.getTagihanList(),
    completedTagihanList: financeStore.getCompletedTagihanList(),
    profitList: financeStore.getProfitList(),
    profitPendingList: financeStore.getProfitPendingList(),
    cashbackPendingList: financeStore.getCashbackPendingList(),
    belumBayarList: financeStore.getBelumBayarList(),
    kasKantorList: financeStore.getKasKantorList(),
    kasMessengerList: financeStore.getKasMessengerList(),
    pengeluaranList: financeStore.getPengeluaranList(),
    labaRugiData: financeStore.getLabaRugiData(),
    getLabaRugiData: financeStore.getLabaRugiData.bind(financeStore),

    // Contract Data for DataPenjualan
    getContractData: financeStore.getContractData.bind(financeStore),
    updateContractData: financeStore.updateContractData.bind(financeStore),
    addContractData: financeStore.addContractData.bind(financeStore),
    deleteContractData: financeStore.deleteContractData.bind(financeStore),

    // Operations
    recordPayment: financeStore.recordPayment.bind(financeStore),
    resolveInvoice: financeStore.resolveInvoice.bind(financeStore),
    completeInvoice: financeStore.completeInvoice.bind(financeStore),
    addInvoice: financeStore.addInvoice.bind(financeStore),
    updateInvoice: financeStore.updateInvoice.bind(financeStore),
    deleteInvoice: financeStore.deleteInvoice.bind(financeStore),
    addKasKantor: financeStore.addKasKantor.bind(financeStore),
    updateKasKantor: financeStore.updateKasKantor.bind(financeStore),
    deleteKasKantor: financeStore.deleteKasKantor.bind(financeStore),
    addKasMessenger: financeStore.addKasMessenger.bind(financeStore),
    updateKasMessenger: financeStore.updateKasMessenger.bind(financeStore),
    deleteKasMessenger: financeStore.deleteKasMessenger.bind(financeStore),
    addPengeluaran: financeStore.addPengeluaran.bind(financeStore),
    updatePengeluaran: financeStore.updatePengeluaran.bind(financeStore),
    deletePengeluaran: financeStore.deletePengeluaran.bind(financeStore),
    updateInvoiceFromOrder: financeStore.updateInvoiceFromOrder.bind(financeStore),
    processRefund: financeStore.processRefund.bind(financeStore),
    onPaymentSync: financeStore.onPaymentSync.bind(financeStore),

    // Reimbursement (Pengajuan Biaya)
    reimbursements: financeStore.getReimbursements(),
    getReimbursements: financeStore.getReimbursements.bind(financeStore),
    submitReimbursement: financeStore.submitReimbursement.bind(financeStore),
    reviewReimbursement: financeStore.reviewReimbursement.bind(financeStore),
    payReimbursement: financeStore.payReimbursement.bind(financeStore),
  };
}
