/**
 * Notification Settings & Dispatch Store
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Manages persistent global notification recipients, event types,
 * SMTP sender diagnostics, and delivery history logs.
 */

import { useState, useEffect } from "react";
import { APP_CONFIG } from "../config/appConfig";

export interface NotificationSettings {
  id: string;
  recipientEmails: string[];
  notifyTagihanReminder: boolean;
  notifyTagihanPerubahan: boolean;
  notifyOrderUpdate: boolean;
  notifyProsesGagal: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface SmtpConfigStatus {
  isConfigured: boolean;
  status: "ONLINE" | "OFFLINE";
  statusText: string;
  host: string | null;
  port: number | null;
  senderEmail: string | null;
  hasCredentials: boolean;
  lastChecked: string;
}

export interface NotificationLogItem {
  id: string;
  type: string;
  recipient: string;
  title: string;
  referenceNo: string | null;
  status: "BERHASIL" | "GAGAL";
  errorMessage: string | null;
  createdAt: string;
}

const STORAGE_KEY_SETTINGS = "sun89_notification_settings";
const STORAGE_KEY_LOGS = "sun89_notification_logs";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_SETTINGS: NotificationSettings = {
  id: "global",
  recipientEmails: ["admin@sunbirojasa.com"],
  notifyTagihanReminder: true,
  notifyTagihanPerubahan: true,
  notifyOrderUpdate: true,
  notifyProsesGagal: true,
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

const DEFAULT_SMTP: SmtpConfigStatus = {
  isConfigured: false,
  status: "OFFLINE",
  statusText: "Belum Terkonfigurasi (SMTP Offline)",
  host: null,
  port: null,
  senderEmail: null,
  hasCredentials: false,
  lastChecked: new Date().toISOString(),
};

class NotificationSettingsStore {
  private settings: NotificationSettings = { ...DEFAULT_SETTINGS };
  private smtpStatus: SmtpConfigStatus = { ...DEFAULT_SMTP };
  private logs: NotificationLogItem[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;
  private isLoading = false;
  private isSaving = false;
  private isTesting = false;

  constructor() {
    this.loadFromStorage();
    this.fetchFromApi().catch(() => {});
  }

  private getAuthHeader(): Record<string, string> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const token = window.localStorage.getItem("auth_token");
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
      }
    } catch {
      // ignore
    }
    return {};
  }

  private loadFromStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const cached = window.localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (cached) {
          this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
        }
        const cachedLogs = window.localStorage.getItem(STORAGE_KEY_LOGS);
        if (cachedLogs) {
          this.logs = JSON.parse(cachedLogs);
        }
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
        window.localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.logs));
      }
    } catch {
      // ignore
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((fn) => fn());
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings, recipientEmails: [...this.settings.recipientEmails] };
  }

  public getSmtpStatus(): SmtpConfigStatus {
    return { ...this.smtpStatus };
  }

  public getLogs(): NotificationLogItem[] {
    return [...this.logs];
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getIsSaving(): boolean {
    return this.isSaving;
  }

  public getIsTesting(): boolean {
    return this.isTesting;
  }

  /**
   * Fetch persistent settings and SMTP status from the backend API
   */
  public async fetchFromApi(): Promise<void> {
    this.isLoading = true;
    this.notify();

    try {
      const baseUrl = APP_CONFIG.apiBaseUrl.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/notifications/settings`, {
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload.success && payload.data) {
          if (payload.data.settings) {
            this.settings = {
              ...this.settings,
              ...payload.data.settings,
            };
          }
          if (payload.data.smtpStatus) {
            this.smtpStatus = payload.data.smtpStatus;
          }
        }
      }

      await this.fetchLogs();
    } catch (err) {
      // Backend unreachable or offline mode; keep cached settings safely
    } finally {
      this.isLoading = false;
      this.isInitialized = true;
      this.notify();
    }
  }

  /**
   * Fetch delivery history logs from API
   */
  public async fetchLogs(): Promise<NotificationLogItem[]> {
    try {
      const baseUrl = APP_CONFIG.apiBaseUrl.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/notifications/logs?limit=50`, {
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload.success && Array.isArray(payload.data)) {
          this.logs = payload.data;
          this.notify();
          return this.logs;
        }
      }
    } catch {
      // keep existing logs
    }
    return this.logs;
  }

  /**
   * Update notification settings in backend and local store
   */
  public async saveSettings(customPayload?: Partial<NotificationSettings>): Promise<{ success: boolean; message: string }> {
    this.isSaving = true;
    this.notify();

    const payloadToSave = {
      recipientEmails: customPayload?.recipientEmails ?? this.settings.recipientEmails,
      notifyTagihanReminder: customPayload?.notifyTagihanReminder ?? this.settings.notifyTagihanReminder,
      notifyTagihanPerubahan: customPayload?.notifyTagihanPerubahan ?? this.settings.notifyTagihanPerubahan,
      notifyOrderUpdate: customPayload?.notifyOrderUpdate ?? this.settings.notifyOrderUpdate,
      notifyProsesGagal: customPayload?.notifyProsesGagal ?? this.settings.notifyProsesGagal,
    };

    // Validation
    for (const email of payloadToSave.recipientEmails) {
      if (!EMAIL_REGEX.test(email.trim())) {
        this.isSaving = false;
        this.notify();
        return { success: false, message: `Alamat email tidak valid: '${email}'.` };
      }
    }

    try {
      const baseUrl = APP_CONFIG.apiBaseUrl.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/notifications/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
        body: JSON.stringify(payloadToSave),
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload.success && payload.data?.settings) {
          this.settings = payload.data.settings;
          if (payload.data.smtpStatus) {
            this.smtpStatus = payload.data.smtpStatus;
          }
          this.isSaving = false;
          this.notify();
          return { success: true, message: "Pengaturan notifikasi berhasil disimpan secara persisten." };
        }
      }
    } catch {
      // Fallback local save
    }

    // Local fallback update
    this.settings = {
      ...this.settings,
      ...payloadToSave,
      updatedAt: new Date().toISOString(),
    };
    this.isSaving = false;
    this.notify();
    return { success: true, message: "Pengaturan notifikasi tersimpan (mode offline)." };
  }

  /**
   * Add a recipient email with validation and duplicate prevention
   */
  public addRecipientEmail(email: string): { success: boolean; message: string } {
    const trimmed = email.trim();
    if (!trimmed) {
      return { success: false, message: "Alamat email tidak boleh kosong." };
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return { success: false, message: "Format alamat email tidak valid (contoh: admin@sunbirojasa.com)." };
    }
    if (this.settings.recipientEmails.some((e) => e.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, message: "Alamat email sudah terdaftar dalam daftar penerima." };
    }

    this.settings.recipientEmails.push(trimmed);
    this.notify();
    return { success: true, message: `Email '${trimmed}' berhasil ditambahkan ke daftar penerima.` };
  }

  /**
   * Remove a recipient email by index
   */
  public removeRecipientEmail(index: number): { success: boolean; message: string } {
    if (index < 0 || index >= this.settings.recipientEmails.length) {
      return { success: false, message: "Indeks email tidak ditemukan." };
    }
    const removed = this.settings.recipientEmails[index];
    this.settings.recipientEmails.splice(index, 1);
    this.notify();
    return { success: true, message: `Email '${removed}' dihapus dari daftar penerima.` };
  }

  /**
   * Toggle a specific notification type
   */
  public toggleNotificationType(
    key: "notifyTagihanReminder" | "notifyTagihanPerubahan" | "notifyOrderUpdate" | "notifyProsesGagal",
    value: boolean
  ) {
    this.settings[key] = value;
    this.notify();
  }

  /**
   * Send a test email and capture real diagnostic result and log
   */
  public async sendTestEmail(targetEmail?: string): Promise<{ success: boolean; message: string; log?: NotificationLogItem }> {
    this.isTesting = true;
    this.notify();

    const emailToSend = targetEmail?.trim() || this.settings.recipientEmails[0];

    if (!emailToSend || !EMAIL_REGEX.test(emailToSend)) {
      this.isTesting = false;
      this.notify();
      return {
        success: false,
        message: "Silakan tentukan minimal 1 alamat email penerima yang valid sebelum mengirim email percobaan.",
      };
    }

    try {
      const baseUrl = APP_CONFIG.apiBaseUrl.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/notifications/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
        body: JSON.stringify({ email: emailToSend }),
      });

      const payload = await res.json();
      await this.fetchLogs();

      this.isTesting = false;
      this.notify();

      return {
        success: payload.success,
        message: payload.message,
        log: payload.data?.log,
      };
    } catch (err: any) {
      // Local fallback simulation if server is unreachable
      const localLog: NotificationLogItem = {
        id: `LOG-${Date.now()}`,
        type: "EMAIL_TEST",
        recipient: emailToSend,
        title: "Kirim Email Percobaan Pengaturan",
        referenceNo: "TEST-DIAGNOSTIC",
        status: "GAGAL",
        errorMessage: "Koneksi ke backend gagal atau layanan SMTP pengirim belum aktif.",
        createdAt: new Date().toISOString(),
      };
      this.logs.unshift(localLog);
      this.isTesting = false;
      this.notify();

      return {
        success: false,
        message: "Pengiriman email percobaan gagal: Server backend tidak dapat dihubungi atau SMTP offline.",
        log: localLog,
      };
    }
  }
}

export const notificationSettingsStore = new NotificationSettingsStore();

/**
 * React hook for consuming and reacting to notification settings store updates
 */
export function useNotificationSettings() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return notificationSettingsStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return {
    settings: notificationSettingsStore.getSettings(),
    smtpStatus: notificationSettingsStore.getSmtpStatus(),
    logs: notificationSettingsStore.getLogs(),
    isLoading: notificationSettingsStore.getIsLoading(),
    isSaving: notificationSettingsStore.getIsSaving(),
    isTesting: notificationSettingsStore.getIsTesting(),
    saveSettings: (payload?: Partial<NotificationSettings>) => notificationSettingsStore.saveSettings(payload),
    addRecipientEmail: (email: string) => notificationSettingsStore.addRecipientEmail(email),
    removeRecipientEmail: (index: number) => notificationSettingsStore.removeRecipientEmail(index),
    toggleNotificationType: (
      key: "notifyTagihanReminder" | "notifyTagihanPerubahan" | "notifyOrderUpdate" | "notifyProsesGagal",
      value: boolean
    ) => notificationSettingsStore.toggleNotificationType(key, value),
    sendTestEmail: (email?: string) => notificationSettingsStore.sendTestEmail(email),
    fetchLogs: () => notificationSettingsStore.fetchLogs(),
    refresh: () => notificationSettingsStore.fetchFromApi(),
  };
}
