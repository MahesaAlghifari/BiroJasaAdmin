/**
 * Order Domain Service
 * Admin SUN89 — Biro Jasa Management System
 */

import { dbOrderRepository } from "../repositories/dbOrderRepository";
import { dbFinanceRepository } from "../repositories/dbFinanceRepository";
import { dbAuditRepository } from "../repositories/dbAuditRepository";
import { OperationalOrder, StageName, STAGES, getDefaultSamsatProcesses } from "../../../src/domain/order/types";
import { ApiError } from "../middleware/errorHandler";
import { TokenPayload } from "../utils/crypto";
import { runInTransaction } from "../database/db";

export class OrderService {
  private orderCounter = 100;

  constructor() {
    try {
      const orders = dbOrderRepository.getAllFlat(false);
      if (orders.length > 0) {
        // Find highest order number
        const nums = orders
          .map((o) => parseInt(o.orderNo.replace(/\D/g, ""), 10))
          .filter((n) => !isNaN(n));
        if (nums.length > 0) {
          this.orderCounter = Math.max(100, ...nums);
        }
      }
    } catch {
      // safe fallback if schema not yet initialized
    }
  }

  public getActiveOrders(): Record<StageName, OperationalOrder[]> {
    return dbOrderRepository.getActiveOrders();
  }

  public getAllFlat(archived = false): OperationalOrder[] {
    return dbOrderRepository.getAllFlat(archived);
  }

  public getByOrderNo(orderNo: string): OperationalOrder {
    const order = dbOrderRepository.getByOrderNo(orderNo);
    if (!order) {
      throw new ApiError(404, "ORDER_NOT_FOUND", `Order dengan nomor '${orderNo}' tidak ditemukan.`);
    }
    return order;
  }

  public createOrder(data: any, user?: TokenPayload | null): OperationalOrder {
    if (!data.customer || !data.nomorHP || !data.layanan || !data.nopol) {
      throw new ApiError(400, "VALIDATION_ERROR", "Data wajib belum lengkap (customer, nomorHP, layanan, nopol).");
    }

    this.orderCounter++;
    const orderNo = `ORD-${String(this.orderCounter).padStart(4, "0")}`;
    const nowStr = new Date().toISOString();

    const newOrder: OperationalOrder = {
      orderNo,
      customer: data.customer,
      nomorHP: data.nomorHP,
      layanan: data.layanan,
      currentStep: 1,
      currentStageName: "Verifikasi",
      catatanOrder: data.catatanOrder || "Order baru dibuat dari API Buat Order.",
      createdAt: nowStr.split("T")[0],

      namaPemilik: data.namaPemilik || data.customer,
      kepemilikanKendaraan: data.kepemilikanKendaraan || "Pribadi",
      jenisKendaraan: data.jenisKendaraan || "Mobil",
      tahunKendaraan: data.tahunKendaraan || new Date().getFullYear(),
      nopol: data.nopol,
      pkbBerlakuSd: data.pkbBerlakuSd || "",
      tahunPajak: data.tahunPajak || String(new Date().getFullYear()),
      bulanPajak: data.bulanPajak || "Januari",
      nominalPkbTerakhir: data.nominalPkbTerakhir ?? 0,
      nominalSwdkllj: data.nominalSwdkllj ?? 143000,
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
        stnkAsli: false,
        bpkbAsli: false,
        ktpAsli: false,
        suratKuasa: false,
        faktur: false,
      },

      samsatProcesses: getDefaultSamsatProcesses(data.layanan),

      payment: data.payment || {
        tipePembayaran: data.tipePembayaran || "Bayar di Akhir",
        metodePembayaran: data.metodePembayaran || "Transfer Bank",
        totalBiaya: data.totalEstimasi || data.biayaJasa || 0,
        dibayar: 0,
        kurang: data.totalEstimasi || data.biayaJasa || 0,
        statusPembayaran: "Belum Lunas",
        isPaymentVerified: false,
        invoiceNo: `INV-${orderNo}`,
      },

      rekapDocuments: [],
      costSnapshot: data.costSnapshot,
    };

    return runInTransaction(() => {
      dbOrderRepository.saveOrder(newOrder);

      // Save initial invoice to finance
      dbFinanceRepository.saveInvoice({
        id: this.orderCounter,
        invoiceNo: `INV-${orderNo}`,
        orderNo: orderNo,
        customer: newOrder.customer,
        layanan: newOrder.layanan,
        nopol: newOrder.nopol,
        status: "UNPAID",
        totalTagihan: newOrder.payment.totalBiaya,
        dibayar: 0,
        sisa: newOrder.payment.totalBiaya,
        jatuhTempo: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        tanggalInvoice: nowStr.split("T")[0],
      });

      // Audit Log
      dbAuditRepository.save({
        id: `log-ord-create-${Date.now()}`,
        userId: user?.userId || "usr-system",
        userName: user?.nama || "Admin API",
        userRole: user?.role || "admin",
        action: "CREATE",
        module: "Order",
        details: `Membuat order baru ${orderNo} (${newOrder.customer} - ${newOrder.layanan})`,
        metadata: { orderNo, customer: newOrder.customer, nopol: newOrder.nopol },
        createdAt: nowStr,
      });

      return newOrder;
    });
  }

  public updateOrder(orderNo: string, updates: Partial<OperationalOrder>, user?: TokenPayload | null): OperationalOrder {
    const existing = this.getByOrderNo(orderNo);

    // Milestone 6 IDOR Protection: If messenger, verify order assignment
    if (user && user.role === "messenger") {
      const isAssigned = existing.assignedMessenger === user.nama || (existing as any).assignedMessengerId === user.userId;
      if (!isAssigned) {
        throw new ApiError(403, "FORBIDDEN", `Anda tidak memiliki izin mengedit order ${orderNo} yang tidak ditugaskan kepada Anda.`);
      }
    }

    // Milestone 11: Protect server-controlled immutable fields from client tampering
    const safeUpdates: Partial<OperationalOrder> = { ...updates };
    delete (safeUpdates as any).orderNo;
    delete (safeUpdates as any).currentStep;
    delete (safeUpdates as any).currentStageName;
    delete (safeUpdates as any).isArchived;
    delete (safeUpdates as any).createdAt;
    delete (safeUpdates as any).updatedAt;
    if (safeUpdates.payment) {
      safeUpdates.payment = { ...safeUpdates.payment };
      delete (safeUpdates.payment as any).isPaymentVerified;
      delete (safeUpdates.payment as any).statusPembayaran;
      delete (safeUpdates.payment as any).dibayar;
      delete (safeUpdates.payment as any).kurang;
    }

    const success = dbOrderRepository.updateOrder(orderNo, safeUpdates);
    if (!success) {
      throw new ApiError(500, "UPDATE_FAILED", `Gagal memperbarui order ${orderNo}`);
    }

    const updated = this.getByOrderNo(orderNo);

    // Audit Log with verified actor
    dbAuditRepository.save({
      id: `log-ord-update-${Date.now()}`,
      userId: user?.userId || "usr-system",
      userName: user?.nama || "Admin API",
      userRole: user?.role || "admin",
      action: "UPDATE",
      module: "Order Tracking",
      details: `Memperbarui data order ${orderNo}`,
      metadata: { orderNo, updates: safeUpdates },
      createdAt: new Date().toISOString(),
    });

    return updated;
  }

  public advanceOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}, user?: TokenPayload | null): OperationalOrder {
    const existing = this.getByOrderNo(orderNo);
    if (!(STAGES as readonly string[]).includes(targetStage)) {
      throw new ApiError(400, "INVALID_STAGE", `Target stage '${targetStage}' tidak valid.`);
    }

    const success = dbOrderRepository.advanceOrder(orderNo, targetStage, updates);
    if (!success) {
      throw new ApiError(500, "ADVANCE_FAILED", `Gagal memajukan order ${orderNo} ke stage ${targetStage}`);
    }

    const updated = this.getByOrderNo(orderNo);

    // Audit Log with verified actor
    dbAuditRepository.save({
      id: `log-ord-advance-${Date.now()}`,
      userId: user?.userId || "usr-system",
      userName: user?.nama || "Admin API",
      userRole: user?.role || "admin",
      action: "ADVANCE_STAGE",
      module: "Order Tracking",
      details: `Transisi order ${orderNo} dari '${existing.currentStageName}' ke '${targetStage}'`,
      metadata: { orderNo, fromStage: existing.currentStageName, toStage: targetStage },
      createdAt: new Date().toISOString(),
    });

    return updated;
  }

  public rollbackOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}, user?: TokenPayload | null): OperationalOrder {
    return this.advanceOrder(orderNo, targetStage, updates, user);
  }

  public archiveOrder(orderNo: string, user?: TokenPayload | null): boolean {
    const existing = this.getByOrderNo(orderNo);
    const success = dbOrderRepository.archiveOrder(orderNo);
    if (success) {
      dbAuditRepository.save({
        id: `log-ord-arch-${Date.now()}`,
        userId: user?.userId || "usr-system",
        userName: user?.nama || "Admin API",
        userRole: user?.role || "admin",
        action: "ARCHIVE",
        module: "Order Tracking",
        details: `Mengarsipkan order ${orderNo}`,
        metadata: { orderNo },
        createdAt: new Date().toISOString(),
      });
    }
    return success;
  }

  public verifyPayment(orderNo: string, verifierName: string = "Admin", user?: TokenPayload | null): OperationalOrder {
    return runInTransaction(() => {
      const targetOrder = this.getByOrderNo(orderNo);
      const nowStr = new Date().toISOString();

      const updatedPayment = {
        ...targetOrder.payment,
        isPaymentVerified: true,
        paymentVerifiedAt: nowStr,
        paymentVerifiedBy: verifierName,
        statusPembayaran: "Lunas" as const,
        dibayar: targetOrder.payment.totalBiaya,
        kurang: 0,
        tanggalBayar: nowStr.split("T")[0],
      };

      // Directly update repository with verified payment
      dbOrderRepository.updateOrder(orderNo, { payment: updatedPayment });
      const updated = this.getByOrderNo(orderNo);

      // Sync to finance invoice
      const inv = dbFinanceRepository.getInvoiceByOrderNo(orderNo);
      if (inv) {
        dbFinanceRepository.updateInvoice(inv.id, {
          status: "PAID",
          dibayar: targetOrder.payment.totalBiaya,
          sisa: 0,
        });
      }

      // Record verified audit
      dbAuditRepository.save({
        id: `log-ord-verif-pay-${Date.now()}`,
        userId: user?.userId || "usr-finance",
        userName: user?.nama || verifierName,
        userRole: user?.role || "finance",
        action: "VERIFY_PAYMENT",
        module: "Order Tracking",
        details: `Verifikasi pembayaran order ${orderNo} lunas oleh ${verifierName}`,
        metadata: { orderNo, totalBiaya: targetOrder.payment.totalBiaya },
        createdAt: nowStr,
      });

      return updated;
    });
  }
}

export const orderService = new OrderService();
