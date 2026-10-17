/**
 * Single Source of Truth for Operational Orders & Order History
 * Admin SUN89 — Biro Jasa Management System
 */

import { useState, useEffect } from "react";
import { financeStore, PaymentSyncPayload } from "./financeStore";
import { pricingStore } from "./pricingStore";
import { auditLog } from "../utils/auditLog";

import {
  StructuredAddress,
  OrderDocument,
  SamsatProcessItem,
  PaymentProof,
  OrderPayment,
  CustomCostItem,
  OperationalOrder,
  StageName,
  STAGES,
  getDefaultSamsatProcesses,
  SettlementCondition,
  RefundStatus,
  RekapDocument,
} from "../../domain/order/types";
import { createInitialOrders } from "../../data/mock/orderMockData";
import { orderRepository, IOrderRepository } from "../../data/repositories/orderRepository";

export type {
  StructuredAddress,
  OrderDocument,
  SamsatProcessItem,
  PaymentProof,
  OrderPayment,
  CustomCostItem,
  OperationalOrder,
  StageName,
  SettlementCondition,
  RefundStatus,
  RekapDocument,
};
export { STAGES, getDefaultSamsatProcesses, createInitialOrders };


// Global application state boundary for Orders
class OrderStore {
  private repository: IOrderRepository = orderRepository;
  private listeners: Set<() => void> = new Set();
  private orderCounter = 100;

  constructor() {
    // Listen to repository data provider updates
    this.repository.subscribe(() => {
      this.notify();
    });

    // Bi-directional synchronization: Listen to payment updates originating in FinanceStore
    const registerFinanceSync = () => {
      try {
        if (typeof financeStore !== "undefined" && financeStore && typeof financeStore.onPaymentSync === "function") {
          financeStore.onPaymentSync((payload) => {
            this.syncPaymentFromFinance(payload);
          });
          return true;
        }
      } catch {
        // Defer if not yet initialized
      }
      return false;
    };

    if (!registerFinanceSync()) {
      queueMicrotask(() => {
        registerFinanceSync();
      });
    }

    // Phase 9.2: Register canonical order creator with FinanceStore
    const registerFinanceCreator = () => {
      try {
        if (typeof financeStore !== "undefined" && financeStore && typeof financeStore.setOrderCreator === "function") {
          financeStore.setOrderCreator((data) => this.addOrderFromContract(data));
          return true;
        }
      } catch {
        // Defer if not yet initialized
      }
      return false;
    };

    if (!registerFinanceCreator()) {
      queueMicrotask(() => {
        registerFinanceCreator();
      });
    }
  }

  // Subscribe to changes
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getActiveOrders(): Record<StageName, OperationalOrder[]> {
    return this.repository.getActiveOrders();
  }

  public getOrdersByStage(stage: StageName): OperationalOrder[] {
    return this.repository.getByStage(stage);
  }

  public getArchivedOrders(): OperationalOrder[] {
    return this.repository.getArchivedOrders();
  }

  public getAllOrders(): OperationalOrder[] {
    return this.repository.getAllFlat();
  }

  public getOrderByNo(orderNo: string): OperationalOrder | undefined {
    return this.repository.getByOrderNo(orderNo);
  }

  // Phase 9.2: Conditional canonical order creation from Data Penjualan contract data
  public addOrderFromContract(data: {
    customer: string;
    nopol: string;
    layanan: string;
    namaPemilik?: string;
    nomorHP?: string;
    wilayahSamsatAsal?: string;
    jenisKendaraan?: string;
    biayaJasa?: number;
    totalEstimasi?: number;
    uangMasuk?: number;
    uangKeluar?: number;
    r4r2?: string;
    bpkb?: string;
    [key: string]: any;
  }): OperationalOrder | false {
    if (!data.customer?.trim() || !data.nopol?.trim() || !data.layanan?.trim()) {
      return false;
    }

    const totalEst = data.totalEstimasi || data.uangMasuk || 0;
    const initialPaid = data.uangMasuk || 0;
    const explicitInvoice = data.invoiceNo || data["No Invoice"];

    return this.addOrder({
      customer: data.customer.trim(),
      nopol: data.nopol.trim(),
      layanan: data.layanan.trim(),
      namaPemilik: data.namaPemilik?.trim() || data.customer.trim(),
      nomorHP: data.nomorHP?.trim() || "081200000000",
      wilayahSamsatAsal: data.wilayahSamsatAsal || "Jakarta Timur",
      jenisKendaraan: data.jenisKendaraan || (data.r4r2 === "R2" ? "Motor" : "Mobil"),
      biayaJasa: data.biayaJasa || 0,
      totalEstimasi: totalEst,
      catatanOrder: "Order dibuat dari Data Penjualan (+ Tambah Data)",
      clientDocuments: {
        stnk: { name: "STNK_Asli.pdf", status: "Sudah Tersedia", isOptional: false },
        bpkb: { name: "BPKB_Kendaraan.pdf", status: data.bpkb === "Ada" ? "Sudah Tersedia" : "Belum Tersedia", isOptional: false },
        ktp: { name: "KTP_Pemilik.pdf", status: "Sudah Tersedia", isOptional: false },
        skkp: { name: "", status: "Belum Tersedia", isOptional: true },
        lainnya: { name: "", status: "Belum Tersedia", isOptional: true },
      },
      payment: {
        tipePembayaran: initialPaid >= totalEst && totalEst > 0 ? "Bayar di Awal" : "Bayar di Akhir",
        metodePembayaran: "Transfer",
        statusPembayaran: initialPaid >= totalEst && totalEst > 0 ? "Lunas" : initialPaid > 0 ? "Kurang" : "Belum Bayar",
        totalBiaya: totalEst,
        totalEstimasi: totalEst,
        dibayar: initialPaid,
        kurang: Math.max(0, totalEst - initialPaid),
        overpayment: 0,
        settlementCondition: "PENDING_FINALIZATION",
        refundStatus: "NONE",
        isPaymentVerified: initialPaid >= totalEst && totalEst > 0,
        invoiceNo: explicitInvoice,
      },
    });
  }

  // Phase 9.4: Asynchronous order creation from Data Penjualan contract data
  public async addOrderFromContractAsync(data: {
    customer: string;
    nopol: string;
    layanan: string;
    namaPemilik?: string;
    nomorHP?: string;
    wilayahSamsatAsal?: string;
    jenisKendaraan?: string;
    biayaJasa?: number;
    totalEstimasi?: number;
    uangMasuk?: number;
    uangKeluar?: number;
    r4r2?: string;
    bpkb?: string;
    [key: string]: any;
  }): Promise<OperationalOrder | false> {
    if (!data.customer?.trim() || !data.nopol?.trim() || !data.layanan?.trim()) {
      return false;
    }

    const totalEst = data.totalEstimasi || data.uangMasuk || 0;
    const initialPaid = data.uangMasuk || 0;
    const explicitInvoice = data.invoiceNo || data["No Invoice"];

    return await this.addOrderAsync({
      customer: data.customer.trim(),
      nopol: data.nopol.trim(),
      layanan: data.layanan.trim(),
      namaPemilik: data.namaPemilik?.trim() || data.customer.trim(),
      nomorHP: data.nomorHP?.trim() || "081200000000",
      wilayahSamsatAsal: data.wilayahSamsatAsal || "Jakarta Timur",
      jenisKendaraan: data.jenisKendaraan || (data.r4r2 === "R2" ? "Motor" : "Mobil"),
      biayaJasa: data.biayaJasa || 0,
      totalEstimasi: totalEst,
      catatanOrder: "Order dibuat dari Data Penjualan (+ Tambah Data)",
      clientDocuments: {
        stnk: { name: "STNK_Asli.pdf", status: "Sudah Tersedia", isOptional: false },
        bpkb: { name: "BPKB_Kendaraan.pdf", status: data.bpkb === "Ada" ? "Sudah Tersedia" : "Belum Tersedia", isOptional: false },
        ktp: { name: "KTP_Pemilik.pdf", status: "Sudah Tersedia", isOptional: false },
        skkp: { name: "", status: "Belum Tersedia", isOptional: true },
        lainnya: { name: "", status: "Belum Tersedia", isOptional: true },
      },
      payment: {
        tipePembayaran: initialPaid >= totalEst && totalEst > 0 ? "Bayar di Awal" : "Bayar di Akhir",
        metodePembayaran: "Transfer",
        statusPembayaran: initialPaid >= totalEst && totalEst > 0 ? "Lunas" : initialPaid > 0 ? "Kurang" : "Belum Bayar",
        totalBiaya: totalEst,
        totalEstimasi: totalEst,
        dibayar: initialPaid,
        kurang: Math.max(0, totalEst - initialPaid),
        overpayment: 0,
        settlementCondition: "PENDING_FINALIZATION",
        refundStatus: "NONE",
        isPaymentVerified: initialPaid >= totalEst && totalEst > 0,
        invoiceNo: explicitInvoice,
      },
    });
  }

  private buildOrderPayload(data: Partial<OperationalOrder> & {
    customer: string;
    layanan: string;
    namaPemilik: string;
    nomorHP: string;
    nopol: string;
  }): OperationalOrder {
    this.orderCounter++;
    const orderNo = `ORD-${String(this.orderCounter).padStart(4, "0")}`;
    const processes = getDefaultSamsatProcesses(data.layanan);

    const masterServiceFee = (data.layanan && data.wilayahSamsatAsal)
      ? pricingStore.getServiceFeeConfig(data.layanan, data.wilayahSamsatAsal)?.biayaJasa
      : undefined;
    const resolvedBiayaJasa = data.biayaJasa ?? data.costSnapshot?.biayaJasa ?? masterServiceFee ?? 0;

    const totalEstimasi = data.totalEstimasi ?? data.costSnapshot?.totalEstimasi ?? data.payment?.totalBiaya ?? (
      resolvedBiayaJasa +
      (data.pkb || 0) +
      (data.swdkllj ?? 143000) +
      (data.dendaSwdkllj || 0)
    );

    return {
      orderNo,
      clientRequestId: (data as any).clientRequestId,
      customer: data.customer,
      nomorHP: data.nomorHP,
      layanan: data.layanan,
      currentStep: 1,
      currentStageName: "Verifikasi",
      catatanOrder: data.catatanOrder || "Order baru dibuat dari formulir Buat Order.",
      createdAt: new Date().toISOString().split("T")[0],

      namaPemilik: data.namaPemilik,
      kepemilikanKendaraan: data.kepemilikanKendaraan || "Pribadi",
      jenisKendaraan: data.jenisKendaraan || "Mobil",
      tahunKendaraan: data.tahunKendaraan || new Date().getFullYear(),
      nopol: data.nopol,
      pkbBerlakuSd: data.pkbBerlakuSd || "",
      tahunPajak: data.tahunPajak || String(new Date().getFullYear()),
      bulanPajak: data.bulanPajak || "Januari",
      nominalPkbTerakhir: data.nominalPkbTerakhir ?? 0,
      nominalSwdkllj: data.nominalSwdkllj ?? data.costSnapshot?.swdkllj ?? 143000,
      kodePromo: data.kodePromo || "",
      wilayahSamsatAsal: data.wilayahSamsatAsal || "Jakarta Timur",
      wilayahSamsatTujuan: data.wilayahSamsatTujuan || "-",

      alamatPenjemputan: data.alamatPenjemputan || {
        kota: data.wilayahSamsatAsal || "Jakarta Timur",
        kecamatan: "",
        kelurahan: "",
        detail: "Alamat penjemputan belum diisi",
        rtRw: "",
        nomor: "",
        landmark: "",
      },
      alamatPengantaran: data.alamatPengantaran || {
        kota: data.wilayahSamsatAsal || "Jakarta Timur",
        kecamatan: "",
        kelurahan: "",
        detail: "Alamat pengantaran belum diisi",
        rtRw: "",
        nomor: "",
        landmark: "",
      },

      clientDocuments: data.clientDocuments || {
        stnk: { name: "STNK_Asli.pdf", status: "Sudah Tersedia", isOptional: false },
        bpkb: { name: "BPKB_Kendaraan.pdf", status: "Sudah Tersedia", isOptional: false },
        ktp: { name: "KTP_Pemilik.pdf", status: "Sudah Tersedia", isOptional: false },
        skkp: { name: "", status: "Belum Tersedia", isOptional: true },
        lainnya: { name: "", status: "Belum Tersedia", isOptional: true },
      },
      updatedDocuments: [],

      biayaJasa: resolvedBiayaJasa,
      pkb: data.pkb || 0,
      swdkllj: data.swdkllj ?? data.costSnapshot?.swdkllj ?? 143000,
      dendaSwdkllj: data.dendaSwdkllj || 0,
      totalEstimasi,

      // Master Pricing Snapshot & Service Method (Batch 5)
      metodeLayanan: data.metodeLayanan || data.costSnapshot?.metodeLayanan || "Antar Jemput",
      costBreakdown: data.costBreakdown || data.costSnapshot?.breakdown || [],
      costSnapshot: data.costSnapshot,
      estimationResult: data.estimationResult,

      samsatProcesses: processes,
      currentSamsatProcess: processes[0]?.name || "Antrean Samsat",

      payment: data.payment ? {
        ...data.payment,
        totalEstimasi,
        overpayment: data.payment.overpayment || 0,
        settlementCondition: data.payment.settlementCondition || "PENDING_FINALIZATION",
        refundStatus: data.payment.refundStatus || "NONE",
        isPaymentVerified: data.payment.isPaymentVerified ?? false,
      } : {
        tipePembayaran: "Bayar di Akhir",
        metodePembayaran: "Cash",
        statusPembayaran: "Belum Lunas",
        totalBiaya: totalEstimasi,
        totalEstimasi,
        dibayar: 0,
        kurang: totalEstimasi,
        overpayment: 0,
        settlementCondition: "PENDING_FINALIZATION",
        refundStatus: "NONE",
        isPaymentVerified: false,
      },
      orderSource: data.orderSource || "Offline / Loket",
      createdBy: data.createdBy || "Admin Loket",
      createdById: data.createdById,
      createdByRole: data.createdByRole,
      settlementCondition: "PENDING_FINALIZATION",
      refundStatus: "NONE",
      rekapDocuments: [],
    };
  }

  // 1. BUAT ORDER: Tambah Order baru langsung ke Stage 1: VERIFIKASI
  public addOrder(data: Partial<OperationalOrder> & {
    customer: string;
    layanan: string;
    namaPemilik: string;
    nomorHP: string;
    nopol: string;
  }): OperationalOrder {
    const clientRequestId = (data as any).clientRequestId || `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newOrder = this.buildOrderPayload({ ...data, clientRequestId });
    const orderNo = newOrder.orderNo;

    // Register invoice in Finance Store as Single Source of Truth
    try {
      const isLunasInitial = newOrder.payment.tipePembayaran === "Bayar di Awal" && newOrder.payment.isPaymentVerified;
      const initialPaid = isLunasInitial ? newOrder.totalEstimasi : (newOrder.payment.dibayar || 0);
      const invRecord = financeStore.addInvoice({
        orderNo,
        customer: data.customer,
        nopol: data.nopol,
        jenisLayanan: data.layanan,
        totalTagihan: newOrder.totalEstimasi,
        terbayar: initialPaid,
        metodePembayaran: newOrder.payment.metodePembayaran,
        phone: data.nomorHP,
        alamat: data.alamatPenjemputan?.detail || data.alamatPenjemputan?.kota,
        dueTrigger: "AFTER_DOCUMENT_RECEIVED",
        collectionStatus: isLunasInitial ? "LUNAS" : "BELUM_JATUH_TEMPO",
        settlementCondition: "PENDING_FINALIZATION",
        refundStatus: "NONE",
        overpayment: 0,
        invoice: newOrder.payment?.invoiceNo || undefined,
      });
      newOrder.payment.invoiceNo = invRecord.invoice;
    } catch {
      // safe fallback
    }

    // Save to repository (Mock provider or API provider)
    this.repository.saveOrder(newOrder);
    this.notify();

    try {
      auditLog.log({
        userId: data.createdById || "usr-admin",
        userName: data.createdBy || "Admin Loket",
        userRole: (data.createdByRole as any) || "admin",
        action: "CREATE",
        module: "Order",
        details: `Membuat order baru ${orderNo} (${data.customer} - ${data.layanan})`,
        metadata: { orderNo, customer: data.customer, nopol: data.nopol, layanan: data.layanan },
      });
    } catch {
      // safe fallback
    }

    return newOrder;
  }

  // Phase 9.4: Asynchronous order creation waiting for backend confirmation & identity reconciliation
  public async addOrderAsync(data: Partial<OperationalOrder> & {
    customer: string;
    layanan: string;
    namaPemilik: string;
    nomorHP: string;
    nopol: string;
  }): Promise<OperationalOrder> {
    const clientRequestId = (data as any).clientRequestId || `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newOrder = this.buildOrderPayload({ ...data, clientRequestId });
    const tempOrderNo = newOrder.orderNo;

    // Register invoice in Finance Store optimistically
    let invRecord: any = null;
    try {
      const isLunasInitial = newOrder.payment.tipePembayaran === "Bayar di Awal" && newOrder.payment.isPaymentVerified;
      const initialPaid = isLunasInitial ? newOrder.totalEstimasi : (newOrder.payment.dibayar || 0);
      invRecord = financeStore.addInvoice({
        orderNo: tempOrderNo,
        customer: data.customer,
        nopol: data.nopol,
        jenisLayanan: data.layanan,
        totalTagihan: newOrder.totalEstimasi,
        terbayar: initialPaid,
        metodePembayaran: newOrder.payment.metodePembayaran,
        phone: data.nomorHP,
        alamat: data.alamatPenjemputan?.detail || data.alamatPenjemputan?.kota,
        dueTrigger: "AFTER_DOCUMENT_RECEIVED",
        collectionStatus: isLunasInitial ? "LUNAS" : "BELUM_JATUH_TEMPO",
        settlementCondition: "PENDING_FINALIZATION",
        refundStatus: "NONE",
        overpayment: 0,
        invoice: newOrder.payment?.invoiceNo || undefined,
      });
      newOrder.payment.invoiceNo = invRecord.invoice;
    } catch {
      // safe fallback
    }

    try {
      const confirmedOrder = typeof this.repository.saveOrderAsync === "function"
        ? await this.repository.saveOrderAsync(newOrder)
        : (this.repository.saveOrder(newOrder), newOrder);

      // Reconcile invoice if backend assigned a different canonical orderNo
      if (confirmedOrder.orderNo !== tempOrderNo) {
        financeStore.reconcileOrderNo(tempOrderNo, confirmedOrder.orderNo, confirmedOrder.payment?.invoiceNo);
      }

      this.notify();

      try {
        auditLog.log({
          userId: data.createdById || "usr-admin",
          userName: data.createdBy || "Admin Loket",
          userRole: (data.createdByRole as any) || "admin",
          action: "CREATE",
          module: "Order",
          details: `Membuat order baru ${confirmedOrder.orderNo} (${data.customer} - ${data.layanan})`,
          metadata: { orderNo: confirmedOrder.orderNo, customer: data.customer, nopol: data.nopol, layanan: data.layanan },
        });
      } catch {
        // safe fallback
      }

      return confirmedOrder;
    } catch (err) {
      // Phase 9.4: Clean up optimistic invoice on failure
      financeStore.removeInvoiceByOrderNo(tempOrderNo);
      this.notify();
      throw err;
    }
  }

  // Verifikasi Pembayaran (Khususnya untuk Bayar di Awal di Stage 1)
  public verifyPayment(orderNo: string, verifierName: string = "Admin"): boolean {
    const targetOrder = this.repository.getByOrderNo(orderNo);
    if (!targetOrder) return false;

    const success = typeof this.repository.verifyPayment === "function"
      ? this.repository.verifyPayment(orderNo, verifierName)
      : false;
    if (!success) return false;

    const updatedOrder = this.repository.getByOrderNo(orderNo);

    // Synchronize to financeStore
    if (updatedOrder?.payment.invoiceNo) {
      try {
        financeStore.recordPayment(updatedOrder.payment.invoiceNo, updatedOrder.payment.totalBiaya, {
          paymentMethod: updatedOrder.payment.metodePembayaran,
          tanggal: updatedOrder.payment.tanggalBayar || new Date().toISOString().split("T")[0],
          skipAudit: true,
        });
      } catch {
        // safe fallback
      }
    }

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: verifierName || "Admin",
        userRole: "admin",
        action: "UPDATE",
        module: "Order Tracking",
        details: `Verifikasi pembayaran lunas order ${targetOrder.orderNo} (${targetOrder.customer})`,
        metadata: { orderNo: targetOrder.orderNo, totalBiaya: targetOrder.payment.totalBiaya },
      });
    } catch {
      // safe fallback
    }

    this.notify();
    return true;
  }

  // 2. Transisi stage (Misal 1->2, 2->3, dst.)
  public advanceOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder>): boolean {
    const currentOrder = this.repository.getByOrderNo(orderNo);
    if (!currentOrder) return false;
    const currentStageFound = currentOrder.currentStageName;

    const success = this.repository.advanceOrder(orderNo, targetStage, updates);
    if (!success) return false;

    const updatedOrder = this.repository.getByOrderNo(orderNo);

    // If transitioning into Dokumen Telah Diterima (Stage 8), update collection timing to JATUH_TEMPO
    if (targetStage === "Dokumen Telah Diterima" && updatedOrder?.payment.invoiceNo) {
      try {
        financeStore.updateInvoiceFromOrder(orderNo, {
          totalTagihan: updatedOrder.payment.totalBiaya,
          collectionStatus: updatedOrder.payment.kurang > 0 ? "JATUH_TEMPO" : "LUNAS",
        });
      } catch {
        // safe fallback
      }
    }

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: updates.verifiedBy || "Admin",
        userRole: "admin",
        action: "UPDATE",
        module: "Order Tracking",
        details: `Order ${orderNo} berpindah dari tahapan ${currentStageFound} ke ${targetStage}`,
        metadata: { orderNo, fromStage: currentStageFound, toStage: targetStage },
      });
    } catch {
      // safe fallback
    }

    this.notify();
    return true;
  }

  // 3. Update order in-place (tanpa pindah stage)
  public updateOrder(orderNo: string, updates: Partial<OperationalOrder>): boolean {
    const success = this.repository.updateOrder(orderNo, updates);
    if (!success) return false;

    try {
      const msgName = updates.messenger || updates.messengerPengantar;
      if (msgName) {
        auditLog.log({
          userId: "usr-admin",
          userName: "Admin",
          userRole: "admin",
          action: "UPDATE",
          module: "Messenger Task",
          details: `Penugasan messenger ${msgName} pada order ${orderNo}`,
          metadata: { orderNo, messenger: msgName },
        });
      } else {
        auditLog.log({
          userId: "usr-admin",
          userName: "Admin",
          userRole: "admin",
          action: "UPDATE",
          module: "Order Tracking",
          details: `Pembaruan data order ${orderNo}`,
          metadata: { orderNo },
        });
      }
    } catch {
      // safe fallback
    }

    this.notify();
    return true;
  }

  // 4. Sinkronisasi status & pembayaran dari FinanceStore (Arah Balik: Finance -> Order)
  public syncPaymentFromFinance(payload: PaymentSyncPayload): boolean {
    const order = this.repository.getByOrderNo(payload.orderNo);
    if (!order) return false;

    const updatedPayment = {
      ...order.payment,
      statusPembayaran: payload.statusPembayaran,
      dibayar: payload.dibayar,
      kurang: payload.kurang,
      totalBiaya: payload.totalBiaya,
      isPaymentVerified: payload.statusPembayaran === "Lunas" ? true : order.payment.isPaymentVerified,
      tanggalBayar: payload.tanggalBayar || order.payment.tanggalBayar,
      metodePembayaran: payload.metodePembayaran || order.payment.metodePembayaran,
      settlementCondition: payload.settlementCondition || order.payment.settlementCondition,
      refundStatus: payload.refundStatus || order.payment.refundStatus,
      overpayment: payload.overpayment !== undefined ? payload.overpayment : order.payment.overpayment,
    };

    const updates: Partial<OperationalOrder> = {
      payment: updatedPayment,
      ...(payload.settlementCondition ? { settlementCondition: payload.settlementCondition } : {}),
      ...(payload.refundStatus ? { refundStatus: payload.refundStatus } : {}),
    };

    const orderUpdated = this.repository.updateOrder(payload.orderNo, updates);
    if (orderUpdated) {
      this.notify();
    }
    return orderUpdated;
  }

  // 5. Sinkronisasi biaya final aktual dari Stage 5 ke FinanceStore (Arah: Order -> Finance)
  public syncFinalCostToFinance(
    orderNo: string,
    newTotal: number,
    biayaSamsat: number,
    profit: number,
    costItems?: any[]
  ): boolean {
    const targetOrder = this.repository.getByOrderNo(orderNo);

    let settlementCondition: SettlementCondition = "BALANCED";
    let refundStatus: RefundStatus = "NONE";
    let newKurang = 0;
    let newOverpayment = 0;

    if (targetOrder) {
      let newStatus: "Lunas" | "Belum Bayar" | "Kurang Bayar" = "Lunas";
      const paid = targetOrder.payment.dibayar || 0;
      const difference = newTotal - paid;

      if (difference === 0) {
        settlementCondition = "BALANCED";
        refundStatus = "NONE";
        newKurang = 0;
        newOverpayment = 0;
        newStatus = "Lunas";
      } else if (difference > 0) {
        settlementCondition = "UNDERPAID";
        refundStatus = "NONE";
        newKurang = difference;
        newOverpayment = 0;
        newStatus = paid > 0 ? "Kurang Bayar" : "Belum Bayar";
      } else {
        settlementCondition = "OVERPAID";
        refundStatus = "PENDING";
        newKurang = 0;
        newOverpayment = Math.abs(difference);
        newStatus = "Lunas";
      }

      this.repository.updateOrder(orderNo, {
        finalCost: newTotal,
        settlementCondition,
        refundStatus,
        payment: {
          ...targetOrder.payment,
          totalBiaya: newTotal,
          kurang: newKurang,
          overpayment: newOverpayment,
          settlementCondition,
          refundStatus,
          statusPembayaran: newStatus,
        },
        totalEstimasi: newTotal,
      });
      this.notify();
    }

    const collectionStatus = newKurang > 0
      ? (targetOrder && targetOrder.currentStep >= 8 ? "JATUH_TEMPO" : "BELUM_JATUH_TEMPO")
      : "LUNAS";

    const res = financeStore.updateInvoiceFromOrder(orderNo, {
      totalTagihan: newTotal,
      biayaSamsat,
      profit,
      costItems,
      settlementCondition,
      refundStatus,
      overpayment: newOverpayment,
      dueTrigger: "AFTER_DOCUMENT_RECEIVED",
      collectionStatus,
    });
    return res !== null;
  }

  // 6. DOKUMEN TELAH DITERIMA -> SIMPAN KE RIWAYAT ORDER (Archiving)
  public archiveOrder(orderNo: string): boolean {
    const orderToArchive = this.repository.getByOrderNo(orderNo);
    if (!orderToArchive) return false;

    const success = this.repository.archiveOrder(orderNo);
    if (!success) return false;

    try {
      auditLog.log({
        userId: "usr-admin",
        userName: "Admin",
        userRole: "admin",
        action: "UPDATE",
        module: "Order History",
        details: `Order ${orderNo} (${orderToArchive.customer}) selesai alur operasional dan diarsipkan`,
        metadata: { orderNo, customer: orderToArchive.customer },
      });
    } catch {
      // safe fallback
    }

    this.notify();
    return true;
  }

  // 7. Proses Refund Kelebihan Bayar (Section 10)
  public processRefund(orderNo: string, processedBy: string = "Admin"): boolean {
    const targetOrder = this.repository.getByOrderNo(orderNo);
    if (!targetOrder) return false;

    const refundAmount = targetOrder.payment.overpayment || 0;
    if (refundAmount <= 0 || targetOrder.refundStatus === "PROCESSED") return false;

    if (targetOrder.payment.invoiceNo) {
      financeStore.processRefund(targetOrder.payment.invoiceNo, processedBy);
    }

    const nowStr = new Date().toISOString();
    const updatedPayment = {
      ...targetOrder.payment,
      settlementCondition: "SETTLED" as const,
      refundStatus: "PROCESSED" as const,
      refundAmount,
      refundProcessedAt: nowStr,
      refundProcessedBy: processedBy,
    };

    this.repository.updateOrder(orderNo, {
      payment: updatedPayment,
      settlementCondition: "SETTLED",
      refundStatus: "PROCESSED",
    });

    this.notify();
    return true;
  }

  // 8. Tambah Dokumen Rekap Order (BEFORE / AFTER)
  public addRekapDocument(
    orderNo: string,
    doc: Omit<RekapDocument, "id" | "orderId" | "uploadedAt">
  ): boolean {
    const targetOrder = this.repository.getByOrderNo(orderNo);
    if (!targetOrder) return false;

    const currentDocs = targetOrder.rekapDocuments || [];
    const newDoc: RekapDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: orderNo,
      uploadedAt: new Date().toISOString(),
    };

    this.repository.updateOrder(orderNo, {
      rekapDocuments: [...currentDocs, newDoc],
    });

    this.notify();
    return true;
  }

  public async initFromApi(): Promise<void> {
    if (typeof (this.repository as any).initFromApi === "function") {
      await (this.repository as any).initFromApi();
      this.notify();
    }
  }
}

export const orderStore = new OrderStore();

export function useOrderStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return orderStore.subscribe(() => setTick(t => t + 1));
  }, []);

  return {
    activeOrders: orderStore.getActiveOrders(),
    archivedOrders: orderStore.getArchivedOrders(),
    getAllOrders: orderStore.getAllOrders.bind(orderStore),
    addOrder: orderStore.addOrder.bind(orderStore),
    addOrderAsync: orderStore.addOrderAsync.bind(orderStore),
    addOrderFromContract: orderStore.addOrderFromContract.bind(orderStore),
    addOrderFromContractAsync: orderStore.addOrderFromContractAsync.bind(orderStore),
    advanceOrder: orderStore.advanceOrder.bind(orderStore),
    updateOrder: orderStore.updateOrder.bind(orderStore),
    verifyPayment: orderStore.verifyPayment.bind(orderStore),
    archiveOrder: orderStore.archiveOrder.bind(orderStore),
    getOrderByNo: orderStore.getOrderByNo.bind(orderStore),
    getOrdersByStage: orderStore.getOrdersByStage.bind(orderStore),
    syncFinalCostToFinance: orderStore.syncFinalCostToFinance.bind(orderStore),
    processRefund: orderStore.processRefund.bind(orderStore),
    addRekapDocument: orderStore.addRekapDocument.bind(orderStore),
  };
}
