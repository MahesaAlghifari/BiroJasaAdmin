/**
 * Pricing Repository Interface and Implementation
 * Admin SUN89 — Biro Jasa Management System
 */

import {
  SamsatCostItem,
  ServicePackageConfig,
  OrderCostSnapshot,
} from "../../domain/pricing/types";
import { pricingStore } from "../../app/data/pricingStore";
import { mockPricingProvider, IPricingDataProvider } from "../mock/mockPricingProvider";
import { ApiPricingProvider } from "../api/apiPricingProvider";

export interface IPricingRepository {
  getSamsatItems(): SamsatCostItem[];
  getSamsatItemById(id: string): SamsatCostItem | undefined;
  updateSamsatItem(id: string, updates: Partial<SamsatCostItem>): boolean;
  addSamsatItem(item: Omit<SamsatCostItem, "id">): SamsatCostItem;
  getServicePackages(): Record<string, ServicePackageConfig>;
  getServicePackage(serviceNameOrId: string): ServicePackageConfig | undefined;
  updateServicePackage(serviceNameOrId: string, updates: Partial<ServicePackageConfig>): boolean;
  calculateOrderCost(params: {
    serviceName?: string;
    serviceId?: string;
    samsatId?: string;
    wilayahSamsat?: string;
    metodeLayanan: "Antar Jemput" | "Datang Langsung";
    pkb?: number;
    swdkllj?: number;
    dendaSwdkllj?: number;
    customComponents?: Record<string, boolean>;
    customItemToggles?: Record<string, boolean>;
  }): OrderCostSnapshot;
  subscribe(listener: () => void): () => void;
  setProvider?(provider: IPricingDataProvider): void;
  getProvider?(): IPricingDataProvider;
  isLoading?(): boolean;
  getError?(): Error | null;
}

export class PricingRepository implements IPricingRepository {
  private provider: IPricingDataProvider;

  constructor(provider?: IPricingDataProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      const isApi = (typeof process !== "undefined" && process.env?.APP_DATA_PROVIDER === "api") ||
                    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_DATA_PROVIDER === "api");
      this.provider = isApi ? new ApiPricingProvider() : mockPricingProvider;
    }
  }

  public setProvider(provider: IPricingDataProvider): void {
    this.provider = provider;
  }

  public getProvider(): IPricingDataProvider {
    return this.provider;
  }

  getSamsatItems(): SamsatCostItem[] {
    return this.provider.getSamsatItems();
  }

  getSamsatItemById(id: string): SamsatCostItem | undefined {
    return this.provider.getSamsatItemById(id);
  }

  updateSamsatItem(id: string, updates: Partial<SamsatCostItem>): boolean {
    return this.provider.updateSamsatItem(id, updates);
  }

  addSamsatItem(item: Omit<SamsatCostItem, "id">): SamsatCostItem {
    return this.provider.addSamsatItem(item);
  }

  getServicePackages(): Record<string, ServicePackageConfig> {
    return pricingStore.getServicePackages();
  }

  getServicePackage(serviceNameOrId: string): ServicePackageConfig | undefined {
    return pricingStore.getServicePackage(serviceNameOrId);
  }

  updateServicePackage(serviceNameOrId: string, updates: Partial<ServicePackageConfig>): boolean {
    return pricingStore.updateServicePackage(serviceNameOrId, updates);
  }

  calculateOrderCost(params: any): OrderCostSnapshot {
    return pricingStore.calculateOrderCost(params);
  }

  subscribe(listener: () => void): () => void {
    return this.provider.subscribe(listener);
  }

  public isLoading(): boolean {
    return this.provider.isLoading ? this.provider.isLoading() : false;
  }

  public getError(): Error | null {
    return this.provider.getError ? this.provider.getError() : null;
  }
}

export const InMemoryPricingRepository = PricingRepository;
export const pricingRepository = new PricingRepository();
