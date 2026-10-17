/**
 * Real API Order Data Provider
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Implements IOrderDataProvider connecting to the Express REST API.
 * Keeps an in-memory cache synchronized with the backend and handles
 * optimistic updates and background persistence.
 */

import { OperationalOrder, StageName, STAGES } from "../../domain/order/types";
import { IOrderDataProvider } from "../mock/mockOrderProvider";
import { createInitialOrders } from "../mock/orderMockData";
import { APP_CONFIG } from "../../app/config/appConfig";

export class ApiOrderProvider implements IOrderDataProvider {
  private baseUrl: string;
  private activeOrders: Record<StageName, OperationalOrder[]> = createInitialOrders();
  private archivedOrders: OperationalOrder[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  constructor(baseUrl = APP_CONFIG.apiBaseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.initFromApi();
  }

  private getAuthHeader(): Record<string, string> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const token = window.localStorage.getItem("auth_token");
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
      }
      if (typeof process !== "undefined" && process.env?.AUTH_TOKEN) {
        return { Authorization: `Bearer ${process.env.AUTH_TOKEN}` };
      }
    } catch {
      // ignore in non-browser env
    }
    return {};
  }

  public async initFromApi(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/orders`, {
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload.success && payload.data) {
          this.activeOrders = payload.data;
          this.isInitialized = true;
          this.notify();
        }
      }

      const archRes = await fetch(`${this.baseUrl}/orders/archived`, {
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      });
      if (archRes.ok) {
        const archPayload = await archRes.json();
        if (archPayload.success && Array.isArray(archPayload.data)) {
          this.archivedOrders = archPayload.data;
          this.notify();
        }
      }
    } catch {
      // Offline fallback: retains initial orders safely
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public getActiveOrders(): Record<StageName, OperationalOrder[]> {
    return this.activeOrders;
  }

  public getArchivedOrders(): OperationalOrder[] {
    return this.archivedOrders;
  }

  public getAllFlat(): OperationalOrder[] {
    const list: OperationalOrder[] = [];
    for (const stage of STAGES) {
      list.push(...(this.activeOrders[stage] || []));
    }
    list.push(...this.archivedOrders);
    return list;
  }

  public getOrderByNo(orderNo: string): OperationalOrder | undefined {
    for (const stage of STAGES) {
      const found = this.activeOrders[stage]?.find((o) => o.orderNo === orderNo);
      if (found) return found;
    }
    return this.archivedOrders.find((o) => o.orderNo === orderNo);
  }

  public getOrdersByStage(stage: StageName): OperationalOrder[] {
    return this.activeOrders[stage] || [];
  }

  /**
   * Phase 9.4: Synchronizes an order with the backend, reconciling temporary client identity
   * with authoritative backend identity and protecting against ghost rows on failure.
   */
  private async syncOrderToBackend(
    tempOrder: OperationalOrder,
    targetStage: StageName
  ): Promise<OperationalOrder> {
    const tempOrderNo = tempOrder.orderNo;
    const idempotencyKey = (tempOrder as any).clientRequestId || tempOrderNo;
    try {
      const res = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
          ...this.getAuthHeader(),
        },
        body: JSON.stringify({
          ...tempOrder,
          clientRequestId: idempotencyKey,
        }),
      });

      if (!res.ok) {
        let errMessage = `HTTP ${res.status}`;
        try {
          const errPayload = await res.json();
          if (errPayload.message) errMessage = errPayload.message;
        } catch {
          // ignore json parse error
        }
        throw new Error(`Order creation failed on backend: ${errMessage}`);
      }

      const payload = await res.json();
      if (!payload.success || !payload.data) {
        throw new Error(payload.message || "Failed to create order on backend.");
      }

      const canonicalOrder: OperationalOrder = payload.data;
      const canonicalOrderNo = canonicalOrder.orderNo;

      // Reconcile in-memory active orders: remove any instance of tempOrderNo and canonicalOrderNo, then add canonicalOrder
      for (const stage of STAGES) {
        if (!this.activeOrders[stage]) continue;
        this.activeOrders[stage] = this.activeOrders[stage].filter(
          (o) => o.orderNo !== tempOrderNo && o.orderNo !== canonicalOrderNo
        );
      }
      if (!this.activeOrders[targetStage]) {
        this.activeOrders[targetStage] = [];
      }
      this.activeOrders[targetStage].unshift(canonicalOrder);

      // Reconcile linked invoice in financeStore if temporary ID differs from canonical
      if (tempOrderNo !== canonicalOrderNo) {
        try {
          const { financeStore } = await import("../../app/data/financeStore");
          financeStore.reconcileOrderNo(
            tempOrderNo,
            canonicalOrderNo,
            canonicalOrder.payment?.invoiceNo
          );
        } catch {
          // safe fallback
        }
      }

      this.notify();
      return canonicalOrder;
    } catch (err) {
      // Phase 9.4 Finding 1: Anti-ghost row cleanup on failure
      for (const stage of STAGES) {
        if (!this.activeOrders[stage]) continue;
        const idx = this.activeOrders[stage].findIndex((o) => o.orderNo === tempOrderNo);
        if (idx !== -1) {
          this.activeOrders[stage].splice(idx, 1);
          break;
        }
      }
      try {
        const { financeStore } = await import("../../app/data/financeStore");
        financeStore.removeInvoiceByOrderNo(tempOrderNo);
      } catch {
        // safe fallback
      }
      this.notify();
      throw err;
    }
  }

  public addOrder(order: OperationalOrder): void {
    const targetStage: StageName = (STAGES as readonly string[]).includes(order.currentStageName as StageName)
      ? (order.currentStageName as StageName)
      : "Verifikasi";

    if (!this.activeOrders[targetStage]) {
      this.activeOrders[targetStage] = [];
    }
    this.activeOrders[targetStage].unshift(order);
    this.notify();

    // Persist and reconcile in background, rolling back on failure
    this.syncOrderToBackend(order, targetStage).catch((err) => {
      console.error("Background sync for new order failed:", err);
    });
  }

  public async addOrderAsync(order: OperationalOrder): Promise<OperationalOrder> {
    const targetStage: StageName = (STAGES as readonly string[]).includes(order.currentStageName as StageName)
      ? (order.currentStageName as StageName)
      : "Verifikasi";

    if (!this.activeOrders[targetStage]) {
      this.activeOrders[targetStage] = [];
    }
    this.activeOrders[targetStage].unshift(order);
    this.notify();

    return await this.syncOrderToBackend(order, targetStage);
  }

  public updateOrder(orderNo: string, updates: Partial<OperationalOrder>): boolean {
    let updated = false;

    for (const stage of STAGES) {
      const idx = this.activeOrders[stage]?.findIndex((o) => o.orderNo === orderNo) ?? -1;
      if (idx !== -1) {
        this.activeOrders[stage][idx] = {
          ...this.activeOrders[stage][idx],
          ...updates,
        };
        updated = true;
        break;
      }
    }

    if (!updated) {
      const archIdx = this.archivedOrders.findIndex((o) => o.orderNo === orderNo);
      if (archIdx !== -1) {
        this.archivedOrders[archIdx] = {
          ...this.archivedOrders[archIdx],
          ...updates,
        };
        updated = true;
      }
    }

    if (updated) {
      this.notify();

      fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderNo)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
        body: JSON.stringify(updates),
      }).catch(() => {
        // background sync fallback
      });
    }

    return updated;
  }

  public advanceOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}): boolean {
    let foundOrder: OperationalOrder | undefined;
    let originStage: StageName | undefined;

    for (const stage of STAGES) {
      const idx = this.activeOrders[stage]?.findIndex((o) => o.orderNo === orderNo) ?? -1;
      if (idx !== -1) {
        foundOrder = this.activeOrders[stage][idx];
        originStage = stage;
        this.activeOrders[stage].splice(idx, 1);
        break;
      }
    }

    if (!foundOrder) return false;

    const stageIndex = (STAGES as readonly string[]).indexOf(targetStage);
    const updatedOrder: OperationalOrder = {
      ...foundOrder,
      ...updates,
      currentStageName: targetStage,
      currentStep: stageIndex >= 0 ? stageIndex + 1 : foundOrder.currentStep,
    };

    if (!this.activeOrders[targetStage]) {
      this.activeOrders[targetStage] = [];
    }
    this.activeOrders[targetStage].unshift(updatedOrder);
    this.notify();

    fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderNo)}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      body: JSON.stringify({ targetStage, updates }),
    }).catch(() => {
      // background sync fallback
    });

    return true;
  }

  public rollbackOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}): boolean {
    return this.advanceOrder(orderNo, targetStage, updates);
  }

  public archiveOrder(orderNo: string): boolean {
    let foundOrder: OperationalOrder | undefined;

    for (const stage of STAGES) {
      const idx = this.activeOrders[stage]?.findIndex((o) => o.orderNo === orderNo) ?? -1;
      if (idx !== -1) {
        foundOrder = this.activeOrders[stage][idx];
        this.activeOrders[stage].splice(idx, 1);
        break;
      }
    }

    if (!foundOrder) return false;

    this.archivedOrders.unshift({
      ...foundOrder,
      currentStageName: "Dokumen Telah Diterima",
      currentStep: 8,
    });
    this.notify();

    fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderNo)}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
    }).catch(() => {
      // background sync fallback
    });

    return true;
  }

  public verifyPayment(orderNo: string, verifierName: string = "Admin"): boolean {
    const targetOrder = this.getOrderByNo(orderNo);
    if (!targetOrder) return false;

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

    // Update in-memory state
    this.updateOrder(orderNo, { payment: updatedPayment });

    // Persist to dedicated Express endpoint /api/orders/:orderNo/verify-payment
    fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderNo)}/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      body: JSON.stringify({ verifierName }),
    }).catch(() => {
      // background sync fallback
    });

    return true;
  }
}
