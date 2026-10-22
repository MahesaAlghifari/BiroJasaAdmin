/**
 * Notification Adapter
 * Derives Header Notifications dynamically from FinanceStore (unpaid invoices) and OrderStore
 * Admin SUN89 — Biro Jasa Management System
 */

import { useState, useEffect } from "react";
import { financeStore } from "./financeStore";
import { orderStore } from "./orderStore";
import { parseDateSafe } from "./dashboardAdapter";

export interface NotificationItem {
  id: number | string;
  type: "tagihan" | "reminder" | "update";
  title: string;
  customer: string;
  nopol: string;
  layanan: string;
  totalTagihan: number;
  terbayar: number;
  sisa: number;
  jatuhTempo: string;
  telepon: string;
  alamat: string;
  priority: "high" | "medium" | "low";
  daysOverdue?: number;
  orderNo?: string;
  isRead?: boolean;
}

const STORAGE_KEY_READ_NOTIFS = "sun89_read_notification_ids";

class NotificationService {
  private readIds: Set<string | number>;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.readIds = this.loadReadIds();
    // Re-notify when finance or order stores update
    financeStore.subscribe(() => this.notify());
    orderStore.subscribe(() => this.notify());
  }

  private loadReadIds(): Set<string | number> {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_READ_NOTIFS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      } catch {}
    }
    return new Set();
  }

  private saveReadIds(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY_READ_NOTIFS, JSON.stringify(Array.from(this.readIds)));
      } catch {}
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public markAsRead(id: string | number): void {
    this.readIds.add(id);
    this.saveReadIds();
    this.notify();
  }

  public markAllAsRead(): void {
    const notifs = this.getNotifications();
    notifs.forEach((n) => this.readIds.add(n.id));
    this.saveReadIds();
    this.notify();
  }

  public clearReadState(): void {
    this.readIds.clear();
    this.saveReadIds();
    this.notify();
  }

  /**
   * Derive notifications dynamically from real unpaid invoices and action-requiring orders
   */
  public getNotifications(): NotificationItem[] {
    const list: NotificationItem[] = [];
    const now = new Date();

    // 1. Unpaid active invoices from FinanceStore
    const activeInvoices = financeStore
      .getTagihanList()
      .filter((inv) => inv.status !== "Lunas" && inv.billingStatus !== "COMPLETED");

    activeInvoices.forEach((inv) => {
      let daysOverdue = 0;
      const dueDate = parseDateSafe(inv.jatuhTempo);
      if (dueDate && dueDate < now) {
        const diffMs = now.getTime() - dueDate.getTime();
        daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      const isHighPriority = (inv.sisa || 0) >= 3000000 || daysOverdue > 3;

      list.push({
        id: inv.id,
        type: "tagihan",
        title: inv.status === "Kurang Bayar" ? "Tagihan Kurang Bayar" : "Tagihan Belum Lunas",
        customer: inv.customer,
        nopol: inv.nopol,
        layanan: inv.jenisLayanan,
        totalTagihan: inv.totalTagihan,
        terbayar: inv.terbayar,
        sisa: inv.sisa,
        jatuhTempo: inv.jatuhTempo,
        telepon: inv.phone || "-",
        alamat: inv.alamat || "Alamat kantor/klien",
        priority: isHighPriority ? "high" : "medium",
        daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
        orderNo: inv.orderNo,
        isRead: this.readIds.has(inv.id),
      });
    });

    // 2. Active orders in Stage 1 requiring Payment Verification for "Bayar di Awal"
    const stage1Orders = orderStore.getOrdersByStage("Verifikasi");
    stage1Orders.forEach((o) => {
      if (
        o.payment.tipePembayaran === "Bayar di Awal" &&
        !o.payment.isPaymentVerified
      ) {
        const notifId = `ord-verif-${o.orderNo}`;
        list.push({
          id: notifId,
          type: "reminder",
          title: "Verifikasi Pembayaran Bayar di Awal Diperlukan",
          customer: o.customer,
          nopol: o.nopol,
          layanan: o.layanan,
          totalTagihan: o.payment.totalBiaya,
          terbayar: o.payment.dibayar,
          sisa: o.payment.kurang,
          jatuhTempo: o.createdAt,
          telepon: o.nomorHP || "-",
          alamat: o.alamatPenjemputan?.detail || o.alamatPenjemputan?.kota || "Jakarta",
          priority: "high",
          orderNo: o.orderNo,
          isRead: this.readIds.has(notifId),
        });
      }
    });

    return list;
  }

  public getUnreadCount(): number {
    const notifs = this.getNotifications();
    return notifs.filter((n) => !this.readIds.has(n.id)).length;
  }
}

export const notificationService = new NotificationService();

/**
 * Reactive hook for Header Notification consumption
 */
export function useNotifications() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return notificationService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const notifications = notificationService.getNotifications();
  const unreadCount = notificationService.getUnreadCount();

  return {
    notifications,
    unreadCount,
    markAsRead: (id: string | number) => notificationService.markAsRead(id),
    markAllAsRead: () => notificationService.markAllAsRead(),
    clearReadState: () => notificationService.clearReadState(),
  };
}
