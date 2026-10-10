/**
 * Finance Domain Service
 * Admin SUN89 — Biro Jasa Management System
 */

import { dbFinanceRepository } from "../repositories/dbFinanceRepository";
import { dbOrderRepository } from "../repositories/dbOrderRepository";
import { dbAuditRepository } from "../repositories/dbAuditRepository";
import { runInTransaction } from "../database/db";
import { InvoiceBillingRecord, KasKantorItem } from "../../../src/domain/finance/types";
import { ApiError } from "../middleware/errorHandler";
import { TokenPayload } from "../utils/crypto";

export class FinanceService {
  public getAllInvoices(): InvoiceBillingRecord[] {
    return dbFinanceRepository.getAllInvoices();
  }

  public getInvoiceById(id: number): InvoiceBillingRecord {
    const inv = dbFinanceRepository.getInvoiceById(id);
    if (!inv) {
      throw new ApiError(404, "INVOICE_NOT_FOUND", `Invoice ID '${id}' tidak ditemukan.`);
    }
    return inv;
  }

  public recordPayment(id: number, amount: number, paymentDetails: any, user?: TokenPayload | null): InvoiceBillingRecord {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Nominal pembayaran harus berupa angka positif yang valid.");
    }

    return runInTransaction(() => {
      const inv = this.getInvoiceById(id);
      const newDibayar = inv.dibayar + amount;
      const newSisa = Math.max(0, inv.totalTagihan - newDibayar);
      const newStatus = newSisa === 0 ? "PAID" : "PARTIAL";

      const success = dbFinanceRepository.updateInvoice(id, {
        dibayar: newDibayar,
        sisa: newSisa,
        status: newStatus,
      });

      if (!success) {
        throw new ApiError(500, "PAYMENT_FAILED", "Gagal mencatat pembayaran invoice.");
      }

      // Synchronize to linked Order in SQLite orders table atomically
      if (inv.orderNo) {
        const linkedOrder = dbOrderRepository.getByOrderNo(inv.orderNo);
        if (linkedOrder) {
          const nowStr = new Date().toISOString();
          const orderPaymentStatus = (newSisa === 0 ? "Lunas" : (newDibayar > 0 ? "Kurang" : "Belum Lunas")) as any;
          const updatedOrderPayment = {
            ...linkedOrder.payment,
            dibayar: newDibayar,
            kurang: newSisa,
            statusPembayaran: orderPaymentStatus,
            isPaymentVerified: newSisa === 0,
            tanggalBayar: nowStr.split("T")[0],
            ...(paymentDetails?.metodePembayaran ? { metodePembayaran: paymentDetails.metodePembayaran } : {}),
          };

          dbOrderRepository.saveOrder({
            ...linkedOrder,
            payment: updatedOrderPayment,
          });
        }
      }

      dbAuditRepository.save({
        id: `log-fin-pay-${Date.now()}`,
        userId: user?.userId || "usr-finance",
        userName: user?.nama || "Finance User",
        userRole: user?.role || "finance",
        action: "RECORD_PAYMENT",
        module: "Keuangan",
        details: `Penerimaan pembayaran invoice ${inv.invoiceNo} sejumlah Rp ${amount.toLocaleString("id-ID")}`,
        metadata: { invoiceId: id, orderNo: inv.orderNo, amount, paymentDetails },
        createdAt: new Date().toISOString(),
      });

      return this.getInvoiceById(id);
    });
  }

  public getAllKasKantor(): KasKantorItem[] {
    return dbFinanceRepository.getAllKasKantor();
  }

  public addKasKantor(item: Omit<KasKantorItem, "id">, user?: TokenPayload | null): KasKantorItem {
    const created = dbFinanceRepository.addKasKantor(item);

    dbAuditRepository.save({
      id: `log-kas-${Date.now()}`,
      userId: user?.userId || "usr-finance",
      userName: user?.nama || "Finance User",
      userRole: user?.role || "finance",
      action: "ADD_KAS",
      module: "Kas Kantor",
      details: `Transaksi Kas: ${item.keterangan} (${item.status}) Rp ${(item.debit || item.kredit).toLocaleString("id-ID")}`,
      metadata: { item },
      createdAt: new Date().toISOString(),
    });

    return created;
  }
}

export const financeService = new FinanceService();
