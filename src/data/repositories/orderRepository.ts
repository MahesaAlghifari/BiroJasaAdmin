/**
 * Order Repository Interface and Implementation
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Provides the data access layer between state management / stores
 * and underlying data providers (Mock provider currently, API provider in Phase 7).
 */

import { OperationalOrder, StageName } from "../../domain/order/types";
import { mockOrderProvider, IOrderDataProvider } from "../mock/mockOrderProvider";
import { ApiOrderProvider } from "../api/apiOrderProvider";

export interface IOrderRepository {
  getActiveOrders(): Record<StageName, OperationalOrder[]>;
  getAllFlat(): OperationalOrder[];
  getByOrderNo(orderNo: string): OperationalOrder | undefined;
  getByStage(stage: StageName): OperationalOrder[];
  getArchivedOrders(): OperationalOrder[];
  subscribe(listener: () => void): () => void;
  saveOrder(order: OperationalOrder): void;
  saveOrderAsync?(order: OperationalOrder): Promise<OperationalOrder>;
  updateOrder(orderNo: string, updates: Partial<OperationalOrder>): boolean;
  advanceOrder(orderNo: string, targetStage: StageName, updates?: Partial<OperationalOrder>): boolean;
  rollbackOrder(orderNo: string, targetStage: StageName, updates?: Partial<OperationalOrder>): boolean;
  archiveOrder(orderNo: string): boolean;
  verifyPayment(orderNo: string, verifierName?: string): boolean;
  setProvider?(provider: IOrderDataProvider): void;
  getProvider?(): IOrderDataProvider;
}

export class OrderRepository implements IOrderRepository {
  private provider: IOrderDataProvider;
  private listeners: Set<() => void> = new Set();
  private unsubscribeProvider?: () => void;

  constructor(provider?: IOrderDataProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      const isApi = (typeof process !== "undefined" && process.env?.APP_DATA_PROVIDER === "api") ||
                    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_DATA_PROVIDER === "api");
      this.provider = isApi ? new ApiOrderProvider() : mockOrderProvider;
    }
    this.wireProvider();
  }

  private wireProvider(): void {
    if (this.unsubscribeProvider) {
      this.unsubscribeProvider();
      this.unsubscribeProvider = undefined;
    }
    if (this.provider && typeof this.provider.subscribe === "function") {
      this.unsubscribeProvider = this.provider.subscribe(() => {
        this.notifyListeners();
      });
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("OrderRepository listener error:", err);
      }
    });
  }

  public setProvider(provider: IOrderDataProvider): void {
    this.provider = provider;
    this.wireProvider();
    this.notifyListeners();
  }

  public getProvider(): IOrderDataProvider {
    return this.provider;
  }

  public getActiveOrders(): Record<StageName, OperationalOrder[]> {
    return this.provider.getActiveOrders();
  }

  public getAllFlat(): OperationalOrder[] {
    return this.provider.getAllFlat();
  }

  public getByOrderNo(orderNo: string): OperationalOrder | undefined {
    return this.provider.getOrderByNo(orderNo);
  }

  public getOrdersByStage(stage: StageName): OperationalOrder[] {
    return this.provider.getOrdersByStage(stage);
  }

  public getByStage(stage: StageName): OperationalOrder[] {
    return this.provider.getOrdersByStage(stage);
  }

  public getArchivedOrders(): OperationalOrder[] {
    return this.provider.getArchivedOrders();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public saveOrder(order: OperationalOrder): void {
    this.provider.addOrder(order);
  }

  public async saveOrderAsync(order: OperationalOrder): Promise<OperationalOrder> {
    if (typeof (this.provider as any).addOrderAsync === "function") {
      return await (this.provider as any).addOrderAsync(order);
    }
    this.provider.addOrder(order);
    return order;
  }

  public updateOrder(orderNo: string, updates: Partial<OperationalOrder>): boolean {
    return this.provider.updateOrder(orderNo, updates);
  }

  public advanceOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}): boolean {
    return this.provider.advanceOrder(orderNo, targetStage, updates);
  }

  public rollbackOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}): boolean {
    return this.provider.rollbackOrder(orderNo, targetStage, updates);
  }

  public archiveOrder(orderNo: string): boolean {
    return this.provider.archiveOrder(orderNo);
  }

  public verifyPayment(orderNo: string, verifierName: string = "Admin"): boolean {
    if (typeof this.provider.verifyPayment === "function") {
      return this.provider.verifyPayment(orderNo, verifierName);
    }
    const target = this.getByOrderNo(orderNo);
    if (!target) return false;
    const nowStr = new Date().toISOString();
    return this.updateOrder(orderNo, {
      payment: {
        ...target.payment,
        isPaymentVerified: true,
        paymentVerifiedAt: nowStr,
        paymentVerifiedBy: verifierName,
        statusPembayaran: "Lunas",
        dibayar: target.payment.totalBiaya,
        kurang: 0,
        tanggalBayar: nowStr.split("T")[0],
      },
    });
  }

  public async initFromApi(): Promise<void> {
    if (typeof (this.provider as any).initFromApi === "function") {
      await (this.provider as any).initFromApi();
    }
  }
}

export const orderRepository = new OrderRepository();
