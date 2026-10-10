/**
 * Canonical Route Configuration & Metadata
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Provides centralized route paths, titles, breadcrumbs, and permission mappings.
 */

export interface RouteMeta {
  path: string;
  id: string; // Permission ID used by permissionStore.canViewPage
  title: string;
  description: string;
  breadcrumbs: string[];
  parentGroupId?: string;
}

export const DATA_PENJUALAN_CATEGORIES: Record<string, string> = {
  "mutasi-ld": "Mutasi LD",
  "mutasi-as": "Mutasi AS",
  "bbn": "BBN",
  "perpanjangan-pajak": "Perpanjangan Pajak",
  "lain-lain": "Lain-Lain",
  "belum-kurang-bayar": "Belum & Kurang Bayar",
  "profit-terpending": "Profit Terpending",
  "cashback-terpending": "Cashback Terpending",
};

export const CANONICAL_ROUTES: Record<string, RouteMeta> = {
  "/dashboard": {
    path: "/dashboard",
    id: "dashboard",
    title: "Dashboard",
    description: "Ringkasan performa operasional dan finansial",
    breadcrumbs: ["Dashboard"],
    parentGroupId: "dashboard",
  },
  // Finance
  "/finance/profit": {
    path: "/finance/profit",
    id: "finance-profit",
    title: "Profit",
    description: "Pantau margin keuntungan dan rincian transaksi per berkas",
    breadcrumbs: ["Finance", "Profit"],
    parentGroupId: "finance",
  },
  "/finance/kas-messenger": {
    path: "/finance/kas-messenger",
    id: "finance-kas-messenger",
    title: "Kas Messenger",
    description: "Kelola pencatatan kas petty cash dan operasional messenger",
    breadcrumbs: ["Finance", "Kas Messenger"],
    parentGroupId: "finance",
  },
  "/finance/kas-kantor": {
    path: "/finance/kas-kantor",
    id: "finance-kas-kantor",
    title: "Kas Kantor",
    description: "Kelola transaksi kas kantor",
    breadcrumbs: ["Finance", "Kas Kantor"],
    parentGroupId: "finance",
  },
  "/finance/pengeluaran": {
    path: "/finance/pengeluaran",
    id: "finance-pengeluaran",
    title: "Pengeluaran",
    description: "Catat dan monitor seluruh pos pengeluaran operasional kantor",
    breadcrumbs: ["Finance", "Pengeluaran"],
    parentGroupId: "finance",
  },
  "/finance/data-penjualan": {
    path: "/finance/data-penjualan",
    id: "finance-penjualan",
    title: "Data Penjualan",
    description: "Kelola dan pantau data penjualan berkas",
    breadcrumbs: ["Finance", "Data Penjualan"],
    parentGroupId: "finance",
  },
  "/finance/tagihan": {
    path: "/finance/tagihan",
    id: "finance-tagihan",
    title: "Tagihan",
    description: "Monitoring status pelunasan dan piutang tagihan berkas",
    breadcrumbs: ["Finance", "Tagihan"],
    parentGroupId: "finance",
  },
  "/finance/laba-rugi": {
    path: "/finance/laba-rugi",
    id: "finance-laba-rugi",
    title: "Laba Rugi",
    description: "Analisis performa keuangan, total pendapatan, dan laba bersih",
    breadcrumbs: ["Finance", "Laba Rugi"],
    parentGroupId: "finance",
  },
  // Master Data
  "/master-data/samsat": {
    path: "/master-data/samsat",
    id: "master-samsat",
    title: "Data Samsat",
    description: "Kelola data Samsat yang digunakan dalam sistem",
    breadcrumbs: ["Master Data", "Samsat"],
    parentGroupId: "master-data",
  },
  "/master-data/biaya-layanan": {
    path: "/master-data/biaya-layanan",
    id: "master-biaya-layanan",
    title: "Biaya Layanan",
    description: "Kelola tarif dan biaya jasa pengurusan dokumen",
    breadcrumbs: ["Master Data", "Biaya Layanan"],
    parentGroupId: "master-data",
  },
  "/master-data/harga-dasar": {
    path: "/master-data/harga-dasar",
    id: "master-harga-dasar-samsat",
    title: "Harga Dasar Samsat",
    description: "Kelola harga dasar penerbitan dan estimasi resmi samsat",
    breadcrumbs: ["Master Data", "Harga Dasar Samsat"],
    parentGroupId: "master-data",
  },
  // Management
  "/manajemen/karyawan": {
    path: "/manajemen/karyawan",
    id: "manajemen-karyawan",
    title: "Karyawan",
    description: "Kelola data karyawan dan staf operasional",
    breadcrumbs: ["Manajemen", "Karyawan"],
    parentGroupId: "manajemen",
  },
  "/manajemen/pengguna": {
    path: "/manajemen/pengguna",
    id: "manajemen-pengguna",
    title: "Pengguna",
    description: "Kelola akun pengguna dan hak akses login",
    breadcrumbs: ["Manajemen", "Pengguna"],
    parentGroupId: "manajemen",
  },
  "/manajemen/hak-akses": {
    path: "/manajemen/hak-akses",
    id: "access-management",
    title: "Hak Akses",
    description: "Konfigurasi matriks perizinan role dan kontrol modul",
    breadcrumbs: ["Manajemen", "Hak Akses"],
    parentGroupId: "manajemen",
  },
  "/manajemen/riwayat-aktivitas": {
    path: "/manajemen/riwayat-aktivitas",
    id: "audit-log",
    title: "Riwayat Aktivitas",
    description: "Audit trail pencatatan aktivitas dan log keamanan sistem",
    breadcrumbs: ["Manajemen", "Riwayat Aktivitas"],
    parentGroupId: "manajemen",
  },
  // Messenger
  "/messenger/tasks": {
    path: "/messenger/tasks",
    id: "messenger-task",
    title: "Messenger Task",
    description: "Kelola penugasan, status kurir, dan pengantaran dokumen",
    breadcrumbs: ["Messenger", "Messenger Task"],
    parentGroupId: "messenger-menu",
  },
  // Order
  "/order/buat": {
    path: "/order/buat",
    id: "buat-order",
    title: "Buat Order",
    description: "Formulir pendaftaran dan estimasi order biro jasa baru",
    breadcrumbs: ["Order", "Buat Order"],
    parentGroupId: "order-menu",
  },
  "/order/tracking": {
    path: "/order/tracking",
    id: "order-tracking",
    title: "Order Tracking",
    description: "Monitoring status dan tahapan pengerjaan order aktif",
    breadcrumbs: ["Order", "Order Tracking"],
    parentGroupId: "order-menu",
  },
  "/order/rekap": {
    path: "/order/rekap",
    id: "order-history",
    title: "Rekap Order",
    description: "Arsip order selesai dan riwayat transaksi terlunasi",
    breadcrumbs: ["Order", "Rekap Order"],
    parentGroupId: "order-menu",
  },
  // Utilities
  "/settings": {
    path: "/settings",
    id: "settings",
    title: "Pengaturan",
    description: "Kelola preferensi dan konfigurasi sistem",
    breadcrumbs: ["Pengaturan"],
  },
  "/profile": {
    path: "/profile",
    id: "profile",
    title: "Profil Saya",
    description: "Informasi profil akun dan kredensial pengguna",
    breadcrumbs: ["Profil Saya"],
  },
  // Messenger Dedicated Workspace
  "/messenger/workspace": {
    path: "/messenger/workspace",
    id: "messenger-task",
    title: "Messenger Workspace",
    description: "Workspace operasional lapangan petugas kurir",
    breadcrumbs: ["Messenger Workspace"],
  },
};

/**
 * Resolve metadata for any pathname, including dynamic parameter routes.
 */
export function getRouteMeta(pathname: string): RouteMeta {
  // Normalize pathname: remove trailing slash except root
  const normalized = pathname.length > 1 && pathname.endsWith("/") 
    ? pathname.slice(0, -1) 
    : pathname;

  // Direct match
  if (CANONICAL_ROUTES[normalized]) {
    return CANONICAL_ROUTES[normalized];
  }

  // Data Penjualan category match: /finance/data-penjualan/:category
  if (normalized.startsWith("/finance/data-penjualan/")) {
    const category = normalized.replace("/finance/data-penjualan/", "").split("/")[0];
    const categoryLabel = DATA_PENJUALAN_CATEGORIES[category] || category;
    return {
      path: normalized,
      id: "finance-penjualan",
      title: `Data Penjualan — ${categoryLabel}`,
      description: `Rekapitulasi transaksi ${categoryLabel} dan kalkulasi samsat`,
      breadcrumbs: ["Finance", "Data Penjualan", categoryLabel],
      parentGroupId: "finance",
    };
  }

  // Default fallback for unknown or unmapped routes
  return {
    path: normalized,
    id: "unknown",
    title: "Admin SUN89",
    description: "Sistem Manajemen Biro Jasa",
    breadcrumbs: ["Beranda"],
  };
}
