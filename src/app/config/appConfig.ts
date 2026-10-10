/**
 * Application Configuration and Metadata
 * Admin SUN89 — Biro Jasa Management System
 */

export function resolveApiBaseUrl(): string {
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) {
    return (import.meta as any).env.VITE_API_BASE_URL;
  }
  if (typeof process !== "undefined" && process.env?.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "/api";
    }
  }
  return "http://localhost:3001/api";
}

export const APP_CONFIG = {
  appName: "Admin SUN89",
  systemTitle: "Sistem Manajemen Biro Jasa",
  version: "1.0.0",
  defaultItemsPerPage: 10,
  defaultCurrency: "IDR",
  defaultLocale: "id-ID",
  dateFormat: "DD/MM/YYYY",
  companyName: "SUN89 Biro Jasa",
  supportContact: "support@sunbirojasa.com",
  dataProvider: (typeof process !== "undefined" && process.env?.APP_DATA_PROVIDER === "api") ||
                (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_DATA_PROVIDER === "api")
                  ? ("api" as const)
                  : ("mock" as const),
  apiBaseUrl: resolveApiBaseUrl(),
} as const;
