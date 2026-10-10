/**
 * Real API User Data Provider
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Implements IUserDataProvider connecting to Express REST API (/api/users and /api/auth).
 * Manages cache synchronized with the backend and handles optimistic updates with rollback.
 */

import { SystemUser } from "../../domain/user/types";
import { IUserDataProvider } from "../mock/mockUserProvider";
import { AuthUserSession, DEMO_CREDENTIALS } from "../repositories/userRepository";
import { APP_CONFIG } from "../../app/config/appConfig";

export class ApiUserProvider implements IUserDataProvider {
  private baseUrl: string;
  private users: SystemUser[] = [];
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
      const res = await fetch(`${this.baseUrl}/users`, {
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      });
      if (!res.ok) {
        throw new Error(`Gagal memuat pengguna dari server (HTTP ${res.status})`);
      }
      const payload = await res.json();
      if (payload.success && Array.isArray(payload.data)) {
        this.users = payload.data;
        this.isInitialized = true;
        this.isLoadingState = false;
        this.notify();
      }
    } catch (err: any) {
      this.isLoadingState = false;
      this.lastError = err instanceof Error ? err : new Error(String(err));
      this.notify();
      // In API mode, do not silently populate mock users on error
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
        console.error("ApiUserProvider listener error:", err);
      }
    });
  }

  public isLoading(): boolean {
    return this.isLoadingState;
  }

  public getError(): string | null {
    return this.lastError ? this.lastError.message : null;
  }

  public getAll(): SystemUser[] {
    return this.users;
  }

  public getById(id: number | string): SystemUser | undefined {
    return this.users.find((u) => String(u.id) === String(id));
  }

  public getByEmail(email: string): SystemUser | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(userData: Omit<SystemUser, "id">): SystemUser {
    const newUser: SystemUser = {
      ...userData,
      id: Date.now(),
    };
    this.users.push(newUser);
    this.notify();

    fetch(`${this.baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      body: JSON.stringify(userData),
    }).catch((err) => {
      console.error("Failed to create user on server:", err);
    });

    return newUser;
  }

  public updateUser(id: number | string, updates: Partial<SystemUser>): boolean {
    const idx = this.users.findIndex((u) => String(u.id) === String(id));
    if (idx === -1) return false;

    const previousUser = { ...this.users[idx] };
    this.users[idx] = { ...this.users[idx], ...updates };
    this.notify();

    fetch(`${this.baseUrl}/users/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      body: JSON.stringify(updates),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (payload?.success && payload.data) {
          const currentIdx = this.users.findIndex((u) => String(u.id) === String(id));
          if (currentIdx !== -1) {
            this.users[currentIdx] = payload.data;
            this.notify();
          }
        }
      })
      .catch((err) => {
        console.error("Failed to update user on server, rolling back:", err);
        const currentIdx = this.users.findIndex((u) => String(u.id) === String(id));
        if (currentIdx !== -1) {
          this.users[currentIdx] = previousUser;
          this.notify();
        }
      });

    return true;
  }

  public deleteUser(id: number | string): boolean {
    const idx = this.users.findIndex((u) => String(u.id) === String(id));
    if (idx === -1) return false;

    const previousUser = this.users[idx];
    this.users.splice(idx, 1);
    this.notify();

    fetch(`${this.baseUrl}/users/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      })
      .catch((err) => {
        console.error("Failed to delete user on server, rolling back:", err);
        this.users.push(previousUser);
        this.notify();
      });

    return true;
  }

  public getDemoCredentials(): typeof DEMO_CREDENTIALS {
    return DEMO_CREDENTIALS;
  }

  public async authenticate(email: string, password: string): Promise<AuthUserSession | null> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload.success && payload.data) {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem("auth_token", payload.data.token);
            window.localStorage.setItem("auth_user", JSON.stringify(payload.data.user));
          }
          return {
            role: payload.data.user.role,
            name: payload.data.user.nama,
            userId: payload.data.user.userId,
            employeeId: payload.data.user.employeeId,
          };
        }
      }
      return null;
    } catch {
      // In API mode, if the backend server is unreachable, do NOT fall back to fake mock sessions.
      return null;
    }
  }
}
