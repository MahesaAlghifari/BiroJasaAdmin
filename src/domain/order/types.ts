/**
 * Canonical Domain Types for Orders
 * Admin SUN89 — Biro Jasa Management System
 */

import { OrderCostBreakdownItem, OrderCostSnapshot } from "../pricing/types";
import type {
  MessengerComponentProgress,
  TaskPriority,
  ChecklistSebelumBerangkat,
  PickupProof,
  DeliveryHandoverProof,
  MessengerTimelineEvent,
} from "../messenger/types";

export interface StructuredAddress {
  kota: string;
  kecamatan: string;
  kelurahan: string;
  detail: string;
  rtRw: string;
  nomor: string;
  landmark: string;
  mapsUrl?: string;
}

export interface OrderDocument {
  name: string;
  status: "Sudah Tersedia" | "Belum Tersedia" | "Baru Diupload" | "Diperbarui";
  updatedAt?: string;
  isOptional?: boolean;
  fileType?: "image" | "pdf" | string;
  fileUrl?: string;
  fileSize?: string;
  documentId?: string;
}

export interface SamsatProcessItem {
  id: string;
  name: string;
  category: "Mutasi Keluar" | "Mutasi Masuk" | "Layanan Standar";
  status: "Selesai" | "Sedang Diproses" | "Belum Diproses";
  completedAt?: string;
  basePrice: number;
  actualCost?: number;
}

export interface PaymentProof {
  fileName: string;
  fileType: "image" | "pdf";
  fileUrl?: string;
  uploadedAt: string;
  fileSize?: string;
  documentId?: string;
}

export type SettlementCondition =
  | "PENDING_FINALIZATION"
  | "BALANCED"
  | "UNDERPAID"
  | "OVERPAID"
  | "SETTLED";

export type RefundStatus = "NONE" | "PENDING" | "PROCESSED";

export interface RekapDocument {
  id: string;
  orderId: string;
  phase: "BEFORE" | "AFTER";
  documentType: "STNK" | "BPKB" | "SKKP" | "OTHER";
  label: string;
  fileType: "IMAGE" | "PDF";
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface OrderPayment {
  tipePembayaran: "Bayar di Awal" | "Bayar di Akhir";
  metodePembayaran: string;
  statusPembayaran: "Lunas" | "Belum Bayar" | "Kurang Bayar" | "Belum Lunas" | "Kurang";
  totalBiaya: number;
  totalEstimasi?: number;
  dibayar: number;
  kurang: number;
  overpayment?: number;
  settlementCondition?: SettlementCondition;
  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundProcessedAt?: string;
  refundProcessedBy?: string;
  tanggalBayar?: string;
  namaBank?: string;
  noRekening?: string;
  buktiPembayaran?: PaymentProof;
  isPaymentVerified?: boolean;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  invoiceNo?: string;
}

export interface CustomCostItem {
  id: string;
  name: string;
  category: "Mutasi Keluar" | "Mutasi Masuk" | "Lainnya";
  actualCost: number;
  basePrice: number;
}

export interface OperationalOrder {
  orderNo: string;
  clientRequestId?: string;
  customer: string;
  nomorHP: string;
  layanan: string;
  currentStep: number; // 1 to 8
  currentStageName: string;
  catatanOrder?: string;
  createdAt: string;

  // Data Pemilik & Kendaraan
  namaPemilik: string;
  kepemilikanKendaraan: string;
  jenisKendaraan: string;
  tahunKendaraan: number | string;
  nopol: string;
  pkbBerlakuSd: string;
  tahunPajak: string;
  bulanPajak: string;
  nominalPkbTerakhir: number;
  nominalSwdkllj: number;
  kodePromo?: string;
  wilayahSamsatAsal: string;
  wilayahSamsatTujuan?: string;

  // Alamat Terstruktur
  alamatPenjemputan: StructuredAddress;
  alamatPengantaran: StructuredAddress;

  // Dokumen
  clientDocuments: Record<string, OrderDocument>;
  updatedDocuments: string[]; // Hasil Samsat
  documentNotes?: string;
  documentsVerified?: boolean;

  // Estimasi Biaya
  biayaJasa: number;
  pkb: number;
  swdkllj: number;
  dendaSwdkllj: number;
  totalEstimasi: number;

  // Biaya Final Aktual (Stage 5 & 6)
  finalBiayaJasa?: number;
  finalPkb?: number;
  finalSwdkllj?: number;
  finalDendaSwdkllj?: number;
  finalMutasiKeluar?: number;
  finalMutasiMasuk?: number;
  finalBiayaLainnya?: number;
  customCostItems?: CustomCostItem[];
  keteranganMutasiKeluar?: string;
  keteranganMutasiMasuk?: string;
  keteranganBiayaLainnya?: string;
  isVerified?: boolean;

  // Penjadwalan Jemput
  tanggalJemput?: string;
  messenger?: string;
  catatanPenjadwalan?: string;
  isScheduled?: boolean;

  // Samsat Tracking
  samsatProcesses: SamsatProcessItem[];
  currentSamsatProcess?: string;

  // Supervisi SPV
  approvedBySpv?: boolean;
  spvNotes?: string;
  spvName?: string;
  spvApprovedAt?: string;

  // Pengantaran Dokumen
  tanggalPengantaran?: string;
  messengerPengantar?: string;
  catatanPengantaran?: string;
  isDeliveryScheduled?: boolean;

  // Dokumen Telah Diterima
  tanggalDiterima?: string;
  isReceived?: boolean;
  receiverName?: string;

  // Pembayaran
  payment: OrderPayment;

  // Back-office Order Source & Creator
  orderSource?: "Offline / Loket" | "Walk-in" | "Telepon / WA" | string;
  createdBy?: string;
  createdById?: string;
  createdByRole?: string;

  // Stage 1 Verification Metadata
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;

  // Messenger Task Overrides / Status
  assignedMessengerId?: string;
  assignedMessengerName?: string;
  messengerTaskStatus?: "Belum Diambil" | "Dalam Proses" | "Selesai" | "Pending" | "Dibatalkan";
  messengerTaskNotes?: string;
  messengerTaskPriority?: TaskPriority;
  messengerComponentProgress?: Record<string, MessengerComponentProgress>;
  messengerTimeline?: MessengerTimelineEvent[];
  checklistSebelumBerangkat?: ChecklistSebelumBerangkat;
  pickupProof?: PickupProof;
  deliveryHandover?: DeliveryHandoverProof;
  deadlineAt?: string;
  startedAt?: string;

  // Master Pricing Snapshot & Service Method (Batch 5)
  metodeLayanan?: "Antar Jemput" | "Datang Langsung";
  costBreakdown?: OrderCostBreakdownItem[];
  costSnapshot?: OrderCostSnapshot;
  estimationResult?: any;

  // Final Cost Reconciliation & Rekap Order
  finalCost?: number;
  settlementCondition?: SettlementCondition;
  refundStatus?: RefundStatus;
  rekapDocuments?: RekapDocument[];
  completedAt?: string;
}

export const STAGES = [
  "Verifikasi",
  "Penjadwalan",
  "Verifikasi Dokumen",
  "Proses Samsat",
  "Verifikasi Ulang",
  "Supervisi",
  "Pengantaran",
  "Dokumen Telah Diterima",
] as const;

export type StageName = typeof STAGES[number];

export function getDefaultSamsatProcesses(layanan: string, isFinished: boolean = false): SamsatProcessItem[] {
  if (layanan.includes("Mutasi Keluar")) {
    return [
      { id: "mk-1", name: "Cek Blokir Kendaraan", category: "Mutasi Keluar", status: isFinished ? "Selesai" : "Selesai", completedAt: "09:30", basePrice: 30000, actualCost: 30000 },
      { id: "mk-2", name: "Cek Fisik Bantuan & Hadir", category: "Mutasi Keluar", status: isFinished ? "Selesai" : "Selesai", completedAt: "10:15", basePrice: 80000, actualCost: 80000 },
      { id: "mk-3", name: "Legalisir Hadir & CF", category: "Mutasi Keluar", status: isFinished ? "Selesai" : "Sedang Diproses", completedAt: isFinished ? "11:00" : undefined, basePrice: 60000, actualCost: 60000 },
      { id: "mk-4", name: "Loket Pembukuan & TU", category: "Mutasi Keluar", status: isFinished ? "Selesai" : "Belum Diproses", completedAt: isFinished ? "13:00" : undefined, basePrice: 45000, actualCost: 45000 },
      { id: "mk-5", name: "Cetak SKP & Fiskal Antar Daerah", category: "Mutasi Keluar", status: isFinished ? "Selesai" : "Belum Diproses", completedAt: isFinished ? "14:20" : undefined, basePrice: 70000, actualCost: 75000 },
      { id: "mk-6", name: "Loket Arsip & Pengeluaran Berkas", category: "Mutasi Keluar", status: isFinished ? "Selesai" : "Belum Diproses", completedAt: isFinished ? "15:00" : undefined, basePrice: 40000, actualCost: 40000 },
    ];
  }

  if (layanan.includes("Mutasi Masuk")) {
    return [
      { id: "mm-1", name: "Pendaftaran Berkas Mutasi Masuk", category: "Mutasi Masuk", status: isFinished ? "Selesai" : "Selesai", completedAt: "08:45", basePrice: 50000, actualCost: 50000 },
      { id: "mm-2", name: "Cek Fisik Ulang & Pengesahan", category: "Mutasi Masuk", status: isFinished ? "Selesai" : "Sedang Diproses", completedAt: isFinished ? "10:00" : undefined, basePrice: 80000, actualCost: 80000 },
      { id: "mm-3", name: "Penetapan Pajak Baru (Bapenda)", category: "Mutasi Masuk", status: isFinished ? "Selesai" : "Belum Diproses", completedAt: isFinished ? "11:30" : undefined, basePrice: 0, actualCost: 0 },
      { id: "mm-4", name: "Penerbitan BPKB Baru (Polda)", category: "Mutasi Masuk", status: isFinished ? "Selesai" : "Belum Diproses", completedAt: isFinished ? "13:30" : undefined, basePrice: 225000, actualCost: 225000 },
      { id: "mm-5", name: "Penerbitan STNK & TNKB Plat Baru", category: "Mutasi Masuk", status: isFinished ? "Selesai" : "Belum Diproses", completedAt: isFinished ? "15:00" : undefined, basePrice: 100000, actualCost: 100000 },
    ];
  }

  // Layanan Standar (Perpanjangan STNK, Balik Nama, dll)
  return [
    { id: "std-1", name: "Loket Pendaftaran & Verifikasi Berkas", category: "Layanan Standar", status: isFinished ? "Selesai" : "Selesai", completedAt: "09:00", basePrice: 20000, actualCost: 20000 },
    { id: "std-2", name: "Cek Fisik Kendaraan (Jika ada)", category: "Layanan Standar", status: isFinished ? "Selesai" : "Selesai", completedAt: "10:00", basePrice: 30000, actualCost: 30000 },
    { id: "std-3", name: "Penetapan & Cetak SKPD/Pajak", category: "Layanan Standar", status: isFinished ? "Selesai" : "Sedang Diproses", completedAt: isFinished ? "11:15" : undefined, basePrice: 0, actualCost: 0 },
    { id: "std-4", name: "Loket Pembayaran Kasir Samsat", category: "Layanan Standar", status: isFinished ? "Selesai" : "Belum Diproses", completedAt: isFinished ? "13:00" : undefined, basePrice: 0, actualCost: 0 },
    { id: "std-5", name: "Pencetakan STNK & Penyerahan", category: "Layanan Standar", status: isFinished ? "Selesai" : "Belum Diproses", completedAt: isFinished ? "14:30" : undefined, basePrice: 0, actualCost: 0 },
  ];
}
