/**
 * Canonical Payment Status and Normalization Mapping
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Provides unified mapping across Order, Finance, and Backend statuses:
 * - Order Domain: "Belum Lunas" | "Kurang" | "Lunas"
 * - Finance Domain: "Belum Bayar" | "Kurang Bayar" | "Lunas"
 * - Backend / SQLite: "UNPAID" | "PARTIAL" | "PAID"
 */

export type CanonicalPaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export function toCanonicalPaymentStatus(
  status?: string | null,
  totalBiaya?: number,
  dibayar?: number
): CanonicalPaymentStatus {
  if (totalBiaya !== undefined && dibayar !== undefined && totalBiaya > 0) {
    if (dibayar >= totalBiaya) return "PAID";
    if (dibayar > 0) return "PARTIAL";
    return "UNPAID";
  }

  const s = String(status || "").trim().toUpperCase();
  if (s === "PAID" || s === "LUNAS") return "PAID";
  if (s === "PARTIAL" || s === "KURANG" || s === "KURANG BAYAR") return "PARTIAL";
  return "UNPAID";
}

export function toOrderPaymentStatus(canonical: CanonicalPaymentStatus): "Belum Lunas" | "Kurang" | "Lunas" {
  switch (canonical) {
    case "PAID":
      return "Lunas";
    case "PARTIAL":
      return "Kurang";
    case "UNPAID":
    default:
      return "Belum Lunas";
  }
}

export function toFinancePaymentStatus(canonical: CanonicalPaymentStatus): "Belum Bayar" | "Kurang Bayar" | "Lunas" {
  switch (canonical) {
    case "PAID":
      return "Lunas";
    case "PARTIAL":
      return "Kurang Bayar";
    case "UNPAID":
    default:
      return "Belum Bayar";
  }
}

export function isFullyPaid(status?: string | null): boolean {
  return toCanonicalPaymentStatus(status) === "PAID";
}
