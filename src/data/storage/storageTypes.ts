/**
 * In-Memory Storage Driver Contracts
 * Admin SUN89 — Biro Jasa Management System
 */

export interface StorageDriver<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
  getAll(): Record<string, T>;
  getAllValues(): T[];
  count(): number;
  subscribe(listener: () => void): () => void;
}
