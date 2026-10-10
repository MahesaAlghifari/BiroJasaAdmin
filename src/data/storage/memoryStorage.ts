/**
 * In-Memory Generic Storage Implementation
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Provides deterministic, isolated in-memory caching and reactive state
 * without requiring any network calls or external storage.
 */

import { StorageDriver } from "./storageTypes";

export class InMemoryStorage<T> implements StorageDriver<T> {
  private store: Map<string, T> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor(initialData?: Record<string, T> | [string, T][]) {
    if (initialData) {
      if (Array.isArray(initialData)) {
        initialData.forEach(([k, v]) => this.store.set(k, v));
      } else {
        Object.entries(initialData).forEach(([k, v]) => this.store.set(k, v));
      }
    }
  }

  get(key: string): T | undefined {
    return this.store.get(key);
  }

  set(key: string, value: T): void {
    this.store.set(key, value);
    this.notify();
  }

  remove(key: string): void {
    if (this.store.delete(key)) {
      this.notify();
    }
  }

  clear(): void {
    if (this.store.size > 0) {
      this.store.clear();
      this.notify();
    }
  }

  getAll(): Record<string, T> {
    const obj: Record<string, T> = {};
    for (const [k, v] of this.store.entries()) {
      obj[k] = v;
    }
    return obj;
  }

  getAllValues(): T[] {
    return Array.from(this.store.values());
  }

  count(): number {
    return this.store.size;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Error in storage listener:", err);
      }
    });
  }
}
