/**
 * Canonical Domain Types for Finance, Invoicing, and Accounting
 * Admin SUN89 — Biro Jasa Management System
 */

import { SettlementCondition, RefundStatus } from "../order/types";

export type PaymentStatus = "Belum Bayar" | "Kurang Bayar" | "Lunas";
export type RealizationStatus = "PENDING" | "REALIZED";
export type BillingLifecycleStatus = "ACTIVE" | "COMPLETED";

export type PaymentDueTrigger = "IMMEDIATE" | "AFTER_DOCUMENT_RECEIVED";
export type CollectionState = "BELUM_JATUH_TEMPO" | "JATUH_TEMPO" | "LUNAS";

export interface PaymentSyncPayload {
  orderNo: string;
  statusPembayaran: "Lunas" | "Belum Bayar" | "Kurang Bayar" | "Belum Lunas" | "Kurang";
  dibayar: number;
  kurang: number;
  totalBiaya: number;
  tanggalBayar?: string;
  metodePembayaran?: string;
  settlementCondition?: SettlementCondition;
  refundStatus?: RefundStatus;
  overpayment?: number;
}

export type PaymentSyncCallback = (payload: PaymentSyncPayload) => void;

export interface InvoiceBillingRecord {
  id: number;
  tanggal: string;
  customer: string;
  nopol: string;
  jenisLayanan: string;
  layanan?: string;
  totalTagihan: number;
  terbayar: number;
  dibayar?: number;
  sisa: number;
  status: PaymentStatus;
  billingStatus?: BillingLifecycleStatus; // "ACTIVE" for active tagihan, "COMPLETED" when finalized
  completedAt?: string;
  completedBy?: string;
  jatuhTempo: string;
  invoice: string;
  invoiceNo?: string;
  orderNo?: string;
  namaBerkas?: string;
  samsat?: string;
  r4r2?: "R4" | "R2";
  tandaTerima?: string;
  bpkb?: string;
  ttbBPKB?: string;

  // Customer Contact Details
  phone?: string;
  email?: string;
  alamat?: string;

  // Realization Tracking
  biayaSamsat: number;
  profit: number;
  profitStatus: RealizationStatus;
  cashback: number;
  cashbackPersen?: string | number;
  cashbackStatus: RealizationStatus;

  // Cash Realization into Kas Kantor (Guarantees no duplicate cash inflow)
  isCashRealized: boolean;
  cashRecordedAmount: number; // Cumulative amount already debited to Kas Kantor
  tanggalBayar?: string;
  metodePembayaran?: string;
  bank?: string;
  alasanPending?: string;
  keterangan?: string;

  // Final Cost Reconciliation & Collection Status
  dueTrigger?: PaymentDueTrigger;
  collectionStatus?: CollectionState;
  settlementCondition?: SettlementCondition;
  refundStatus?: RefundStatus;
  overpayment?: number;
}

export type PenjualanContractCategory =
  | "mutasi-ld"
  | "mutasi-as"
  | "bbn"
  | "perpanjangan-pajak"
  | "lain-lain"
  | "belum-kurang-bayar"
  | "profit-terpending"
  | "cashback-terpending";

export interface ProfitItem {
  id: number;
  tanggal: string;
  nopol: string;
  customer: string;
  namaBerkas: string;
  pengurusan: string;
  uangMasuk: number;
  biayaSamsat: number;
  profit: number;
  rekening: string;
  invoice: string;
  tanggalTTB: string;
  ttb: string;
  jemputDokumen?: string;
  prosesSamsat?: string;
  pengantaranKembali?: string;
}

export interface KasMessengerItem {
  id: number;
  tanggal: string;
  jenis: string;
  messenger: string;
  keterangan: string;
  in: number;
  out: number;
  total: number;
}

export interface KasKantorItem {
  id: number;
  tanggal: string;
  status: string;
  keterangan: string;
  debit: number;
  kredit: number;
  total: number;
  invoiceRef?: string;
  penanggungJawab?: string;
}

export interface PengeluaranItem {
  id: number;
  tanggal: string;
  keterangan: string;
  nominal: number;
  penanggungJawab?: string;
}

export interface BelumKurangBayarItem {
  id: number;
  tanggal: string;
  nopol: string;
  customer: string;
  namaBerkas: string;
  pengurusan: string;
  uangMasuk: number;
  biayaSamsat: number;
  profit: number;
  status: string;
  invoice: string;
  sisaPembayaran: number;
  jatuhTempo: string;
}

export function derivePaymentStatus(totalTagihan: number, terbayar: number): PaymentStatus {
  if (terbayar <= 0) return "Belum Bayar";
  if (terbayar < totalTagihan) return "Kurang Bayar";
  return "Lunas";
}
