/**
 * Canonical Domain Types for Customers
 * Admin SUN89 — Biro Jasa Management System
 */

export interface CustomerContact {
  phone: string;
  email?: string;
  alamat?: string;
  kota?: string;
}

export interface Customer {
  id: string | number;
  nama: string;
  kategori?: "Perorangan" | "Perusahaan" | "Dealer" | string;
  kontak: CustomerContact;
  totalOrders?: number;
  createdAt?: string;
  updatedAt?: string;
}
