/**
 * Mock Pricing Data Provider
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Provides in-memory Samsat master pricing fixtures.
 */

import { SamsatCostItem } from "../../domain/pricing/types";

export interface IPricingDataProvider {
  getSamsatItems(): SamsatCostItem[];
  getSamsatItemById(id: string): SamsatCostItem | undefined;
  updateSamsatItem(id: string, updates: Partial<SamsatCostItem>): Promise<boolean> | boolean;
  addSamsatItem(item: Omit<SamsatCostItem, "id">): SamsatCostItem;
  getServiceConfigs?(): any[];
  getSamsatOffices?(): any[];
  updateServicePricing?(id: string, config: any): Promise<boolean> | boolean;
  createServicePricing?(config: any): Promise<any> | any;
  deleteServicePricing?(id: string): Promise<boolean> | boolean;
  createSamsatOffice?(office: any): Promise<any> | any;
  updateSamsatOffice?(id: string, updates: any): Promise<boolean> | boolean;
  deleteSamsatOffice?(id: string): Promise<boolean> | boolean;
  subscribe(listener: () => void): () => void;
  isLoading?(): boolean;
  getError?(): Error | null;
}

export class MockPricingProvider implements IPricingDataProvider {
  private serviceConfigs: any[] = [];
  private items: SamsatCostItem[] = [
    { id: "mutasi-legalisir", code: "MK-01", name: "Legalisir", category: "Mutasi Keluar", basePrice: 50000, active: true },
    { id: "mutasi-hadir", code: "MK-02", name: "Hadir", category: "Mutasi Keluar", basePrice: 75000, active: true },
    { id: "mutasi-cf", code: "MK-04", name: "Cek Fisik", category: "Mutasi Keluar", basePrice: 100000, active: true },
    { id: "mutasi-cetak-skp", code: "MK-12", name: "Cetak SKP", category: "Mutasi Keluar", basePrice: 150000, active: true },
    { id: "mutasi-cetak-fiskal", code: "MK-13", name: "Cetak Fiskal", category: "Mutasi Keluar", basePrice: 200000, active: true },
    { id: "mutasi-daftar-bpkb", code: "MM-07", name: "Daftar BPKB", category: "Mutasi Masuk", basePrice: 225000, active: true },
    { id: "mutasi-cetak-stnk", code: "MM-10", name: "Cetak STNK", category: "Mutasi Masuk", basePrice: 100000, active: true },
  ];
  private listeners: Set<() => void> = new Set();

  public getSamsatItems(): SamsatCostItem[] {
    return this.items;
  }

  public getSamsatItemById(id: string): SamsatCostItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  public updateSamsatItem(id: string, updates: Partial<SamsatCostItem>): boolean {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this.items[idx] = { ...this.items[idx], ...updates };
    this.notify();
    return true;
  }

  public addSamsatItem(item: Omit<SamsatCostItem, "id">): SamsatCostItem {
    const newItem: SamsatCostItem = { ...item, id: `samsat-mock-${Date.now()}` };
    this.items.push(newItem);
    this.notify();
    return newItem;
  }

  public getServiceConfigs(): any[] {
    return this.serviceConfigs;
  }

  public updateServicePricing(id: string, config: any): boolean {
    const idx = this.serviceConfigs.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.serviceConfigs[idx] = { ...this.serviceConfigs[idx], ...config };
    } else {
      this.serviceConfigs.push({ id, ...config });
    }
    this.notify();
    return true;
  }

  public createServicePricing(config: any): any {
    const id = config.id || `${config.serviceId || "service"}:${config.samsatId || "samsat"}`;
    const newConfig = { ...config, id };
    this.serviceConfigs.push(newConfig);
    this.notify();
    return newConfig;
  }

  public deleteServicePricing(id: string): boolean {
    const idx = this.serviceConfigs.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.serviceConfigs.splice(idx, 1);
      this.notify();
      return true;
    }
    return false;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("MockPricingProvider listener error:", err);
      }
    });
  }

  public createSamsatOffice(office: any): any {
    return { id: `samsat-${Date.now()}`, ...office };
  }

  public updateSamsatOffice(id: string, updates: any): boolean {
    return true;
  }

  public deleteSamsatOffice(id: string): boolean {
    return true;
  }

  public isLoading(): boolean {
    return false;
  }

  public getError(): Error | null {
    return null;
  }
}

export const mockPricingProvider = new MockPricingProvider();
