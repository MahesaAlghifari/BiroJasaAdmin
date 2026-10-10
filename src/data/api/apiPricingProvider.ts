/**
 * Real API Pricing Data Provider
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Implements IPricingDataProvider connecting to the Express REST API (/api/pricing/samsat).
 * Manages cache synchronized with the backend and handles optimistic updates with rollback.
 */

import { SamsatCostItem } from "../../domain/pricing/types";
import { IPricingDataProvider } from "../mock/mockPricingProvider";
import { APP_CONFIG } from "../../app/config/appConfig";

export class ApiPricingProvider implements IPricingDataProvider {
  private baseUrl: string;
  private samsatItems: SamsatCostItem[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;
  private isLoadingState = false;
  private lastError: Error | null = null;

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
      // ignore
    }
    return {};
  }

  public async initFromApi(): Promise<void> {
    this.isLoadingState = true;
    this.lastError = null;
    try {
      const res = await fetch(`${this.baseUrl}/pricing/samsat`, {
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      });
      if (!res.ok) {
        throw new Error(`Gagal memuat master pricing dari server (HTTP ${res.status})`);
      }
      const payload = await res.json();
      if (payload.success && Array.isArray(payload.data)) {
        this.samsatItems = payload.data;
        this.isInitialized = true;
        this.isLoadingState = false;
        this.notify();
      }
    } catch (err: any) {
      this.isLoadingState = false;
      this.lastError = err instanceof Error ? err : new Error(String(err));
      this.notify();
      // In API mode, do not inject mock items silently on failure
    }
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
        console.error("ApiPricingProvider listener error:", err);
      }
    });
  }

  public isLoading(): boolean {
    return this.isLoadingState;
  }

  public getError(): Error | null {
    return this.lastError;
  }

  public getSamsatItems(): SamsatCostItem[] {
    return this.samsatItems;
  }

  public getSamsatItemById(id: string): SamsatCostItem | undefined {
    return this.samsatItems.find((item) => item.id === id);
  }

  public updateSamsatItem(id: string, updates: Partial<SamsatCostItem>): boolean {
    const idx = this.samsatItems.findIndex((item) => item.id === id);
    if (idx === -1) return false;

    const previousItem = { ...this.samsatItems[idx] };
    this.samsatItems[idx] = { ...this.samsatItems[idx], ...updates };
    this.notify();

    fetch(`${this.baseUrl}/pricing/samsat/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      body: JSON.stringify(updates),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((payload) => {
        if (payload?.success && payload.data) {
          const currentIdx = this.samsatItems.findIndex((item) => item.id === id);
          if (currentIdx !== -1) {
            this.samsatItems[currentIdx] = payload.data;
            this.notify();
          }
        }
      })
      .catch((err) => {
        console.error("Failed to persist pricing item, rolling back:", err);
        const currentIdx = this.samsatItems.findIndex((item) => item.id === id);
        if (currentIdx !== -1) {
          this.samsatItems[currentIdx] = previousItem;
          this.notify();
        }
      });

    return true;
  }

  public addSamsatItem(item: Omit<SamsatCostItem, "id">): SamsatCostItem {
    const newItem: SamsatCostItem = {
      ...item,
      id: `custom-samsat-${Date.now()}`,
    };
    this.samsatItems.push(newItem);
    this.notify();

    fetch(`${this.baseUrl}/pricing/samsat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      body: JSON.stringify(newItem),
    }).catch((err) => {
      console.error("Failed to persist new samsat item:", err);
    });

    return newItem;
  }
}
