/**
 * Mock Order Data Provider
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Serves as the single mock data provider for order fixtures and in-memory persistence.
 * Can be swapped with ApiOrderProvider when Express backend is connected in Phase 7.
 */

import { OperationalOrder, StageName, STAGES } from "../../domain/order/types";
import { createInitialOrders } from "./orderMockData";

export interface IOrderDataProvider {
  getActiveOrders(): Record<StageName, OperationalOrder[]>;
  getArchivedOrders(): OperationalOrder[];
  getAllFlat(): OperationalOrder[];
  getOrderByNo(orderNo: string): OperationalOrder | undefined;
  getOrdersByStage(stage: StageName): OperationalOrder[];
  addOrder(order: OperationalOrder): void;
  addOrderAsync?(order: OperationalOrder): Promise<OperationalOrder>;
  updateOrder(orderNo: string, updates: Partial<OperationalOrder>): boolean;
  advanceOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder>): boolean;
  rollbackOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder>): boolean;
  archiveOrder(orderNo: string): boolean;
  verifyPayment?(orderNo: string, verifierName?: string): boolean;
  subscribe(listener: () => void): () => void;
}

export class MockOrderProvider implements IOrderDataProvider {
  private activeOrders: Record<StageName, OperationalOrder[]> = createInitialOrders();
  private archivedOrders: OperationalOrder[] = [];
  private listeners: Set<() => void> = new Set();

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
      const found = this.activeOrders[stage].find((o) => o.orderNo === orderNo);
      if (found) return found;
    }
    return this.archivedOrders.find((o) => o.orderNo === orderNo);
  }

  public getOrdersByStage(stage: StageName): OperationalOrder[] {
    return this.activeOrders[stage] || [];
  }

  public addOrder(order: OperationalOrder): void {
    const stageCandidate = order.currentStageName as StageName;
    const targetStage: StageName = (STAGES as readonly string[]).includes(stageCandidate)
      ? stageCandidate
      : "Verifikasi";
    if (!this.activeOrders[targetStage]) {
      this.activeOrders[targetStage] = [];
    }
    this.activeOrders[targetStage].unshift(order);
    this.notify();
  }

  public async addOrderAsync(order: OperationalOrder): Promise<OperationalOrder> {
    this.addOrder(order);
    return order;
  }

  public updateOrder(orderNo: string, updates: Partial<OperationalOrder>): boolean {
    for (const stage of STAGES) {
      const idx = this.activeOrders[stage].findIndex((o) => o.orderNo === orderNo);
      if (idx !== -1) {
        this.activeOrders[stage][idx] = {
          ...this.activeOrders[stage][idx],
          ...updates,
        };
        this.notify();
        return true;
      }
    }

    const archIdx = this.archivedOrders.findIndex((o) => o.orderNo === orderNo);
    if (archIdx !== -1) {
      this.archivedOrders[archIdx] = {
        ...this.archivedOrders[archIdx],
        ...updates,
      };
      this.notify();
      return true;
    }

    return false;
  }

  public advanceOrder(
    orderNo: string,
    targetStage: StageName,
    updates: Partial<OperationalOrder>
  ): boolean {
    let currentOrder: OperationalOrder | undefined;
    let fromStage: StageName | undefined;

    for (const stage of STAGES) {
      const idx = this.activeOrders[stage].findIndex((o) => o.orderNo === orderNo);
      if (idx !== -1) {
        fromStage = stage;
        currentOrder = this.activeOrders[stage][idx];
        this.activeOrders[stage].splice(idx, 1);
        break;
      }
    }

    if (!currentOrder || !fromStage) return false;

    const updatedOrder: OperationalOrder = {
      ...currentOrder,
      ...updates,
      currentStageName: targetStage,
      currentStep: STAGES.indexOf(targetStage) + 1,
    };

    if (!this.activeOrders[targetStage]) {
      this.activeOrders[targetStage] = [];
    }
    this.activeOrders[targetStage].unshift(updatedOrder);
    this.notify();
    return true;
  }

  public rollbackOrder(
    orderNo: string,
    targetStage: StageName,
    updates: Partial<OperationalOrder>
  ): boolean {
    return this.advanceOrder(orderNo, targetStage, updates);
  }

  public archiveOrder(orderNo: string): boolean {
    let orderToArchive: OperationalOrder | undefined;

    for (const stage of STAGES) {
      const idx = this.activeOrders[stage].findIndex((o) => o.orderNo === orderNo);
      if (idx !== -1) {
        orderToArchive = this.activeOrders[stage][idx];
        this.activeOrders[stage].splice(idx, 1);
        break;
      }
    }

    if (!orderToArchive) return false;

    this.archivedOrders.unshift({
      ...orderToArchive,
      currentStageName: "Dokumen Telah Diterima",
      currentStep: 8,
    });
    this.notify();
    return true;
  }

  public verifyPayment(orderNo: string, verifierName: string = "Admin"): boolean {
    const targetOrder = this.getOrderByNo(orderNo);
    if (!targetOrder) return false;
    const nowStr = new Date().toISOString();
    return this.updateOrder(orderNo, {
      payment: {
        ...targetOrder.payment,
        isPaymentVerified: true,
        paymentVerifiedAt: nowStr,
        paymentVerifiedBy: verifierName,
        statusPembayaran: "Lunas",
        dibayar: targetOrder.payment.totalBiaya,
        kurang: 0,
        tanggalBayar: nowStr.split("T")[0],
      },
    });
  }
}

export const mockOrderProvider = new MockOrderProvider();
