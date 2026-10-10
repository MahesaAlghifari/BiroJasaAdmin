/**
 * Deterministic Test Suite: Batch Roles, Permissions & Buat Order Workflow
 * Admin SUN89 — Biro Jasa Management System
 */

import { permissionStore } from "../src/app/data/permissionStore";
import { pricingStore } from "../src/app/data/pricingStore";
import { orderStore } from "../src/app/data/orderStore";
import { menuItems } from "../src/app/config/navigationConfig";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
  }
}

console.log("==================================================================");
console.log("RUNNING VERIFICATION: BATCH ROLES, PERMISSIONS & WORKFLOW");
console.log("==================================================================\n");

// ------------------------------------------------------------------
// 1. BUAT ORDER CONDITIONAL WORKFLOW & PRICING
// ------------------------------------------------------------------
console.log("[1] Testing Buat Order Conditional Workflow & Pricing:");

// Pricing for Datang Langsung vs Antar Jemput
const costDatangLangsung = pricingStore.calculateOrderCost({
  serviceName: "Perpanjangan STNK Tahunan",
  wilayahSamsat: "Jakarta Timur",
  metodeLayanan: "Datang Langsung",
  pkb: 500000,
});

assert(costDatangLangsung.biayaAntarJemput === 0, "Datang Langsung has biayaAntarJemput = 0");
assert(
  !costDatangLangsung.breakdown.some((b) => b.itemId === "fee-antar-jemput"),
  "Datang Langsung excludes fee-antar-jemput from breakdown"
);

const costAntarJemput = pricingStore.calculateOrderCost({
  serviceName: "Perpanjangan STNK Tahunan",
  wilayahSamsat: "Jakarta Timur",
  metodeLayanan: "Antar Jemput",
  pkb: 500000,
});

assert(costAntarJemput.biayaAntarJemput > 0, "Antar Jemput has positive biayaAntarJemput");
assert(
  costAntarJemput.breakdown.some((b) => b.itemId === "fee-antar-jemput"),
  "Antar Jemput includes fee-antar-jemput in breakdown"
);

// ------------------------------------------------------------------
// 2. BUKTI PEMBAYARAN: BAYAR DI AWAL VS BAYAR DI AKHIR
// ------------------------------------------------------------------
console.log("\n[2] Testing Bukti Pembayaran Validation & Persistence:");

// Create order Bayar di Awal WITH proof
const orderAwalWithProof = orderStore.addOrder({
  customer: "Budi Santoso",
  nomorHP: "081234567890",
  layanan: "Perpanjangan STNK Tahunan",
  metodeLayanan: "Datang Langsung",
  nopol: "B 1234 ABC",
  wilayahSamsatAsal: "Jakarta Timur",
  nominalPkbTerakhir: 500000,
  biayaJasa: costDatangLangsung.biayaJasa,
  pkb: costDatangLangsung.pkb,
  swdkllj: costDatangLangsung.swdkllj,
  dendaSwdkllj: 0,
  totalEstimasi: costDatangLangsung.totalEstimasi,
  payment: {
    tipePembayaran: "Bayar di Awal",
    metodePembayaran: "Transfer Bank BCA",
    statusPembayaran: "Belum Lunas",
    totalBiaya: costDatangLangsung.totalEstimasi,
    dibayar: 0,
    kurang: costDatangLangsung.totalEstimasi,
    buktiPembayaran: {
      fileName: "transfer_bca_budi.jpg",
      fileType: "image",
      fileUrl: "blob:http://localhost/test-proof",
      fileSize: "245 KB",
      uploadedAt: new Date().toISOString(),
    },
    isPaymentVerified: false,
  },
});

assert(
  orderAwalWithProof.payment?.buktiPembayaran?.fileName === "transfer_bca_budi.jpg",
  "Bayar di Awal proof fileName persists into orderStore"
);
assert(
  orderAwalWithProof.payment?.buktiPembayaran?.fileType === "image",
  "Bayar di Awal proof fileType persists into orderStore"
);

// Create order Bayar di Akhir WITHOUT proof
const orderAkhirNoProof = orderStore.addOrder({
  customer: "Dewi Lestari",
  nomorHP: "081987654321",
  layanan: "Perpanjangan STNK Tahunan",
  metodeLayanan: "Datang Langsung",
  nopol: "B 5678 DEF",
  wilayahSamsatAsal: "Jakarta Timur",
  nominalPkbTerakhir: 500000,
  biayaJasa: costDatangLangsung.biayaJasa,
  pkb: costDatangLangsung.pkb,
  swdkllj: costDatangLangsung.swdkllj,
  dendaSwdkllj: 0,
  totalEstimasi: costDatangLangsung.totalEstimasi,
  payment: {
    tipePembayaran: "Bayar di Akhir",
    metodePembayaran: "Cash",
    statusPembayaran: "Belum Lunas",
    totalBiaya: costDatangLangsung.totalEstimasi,
    dibayar: 0,
    kurang: costDatangLangsung.totalEstimasi,
    isPaymentVerified: false,
  },
});

assert(orderAkhirNoProof.orderNo.length > 0, "Bayar di Akhir without proof created successfully");
assert(!orderAkhirNoProof.payment?.buktiPembayaran, "Bayar di Akhir has no attached payment proof");

// ------------------------------------------------------------------
// 3. ORDER TRACKING STAGE ACTIONS: ADMIN VS SVP
// ------------------------------------------------------------------
console.log("\n[3] Testing Order Tracking Stage-Level Action Permissions:");

// Admin Stage Gating
assert(!permissionStore.canManageStage("admin", 4), "Admin CANNOT mutate Stage 4 (Proses Samsat)");
assert(!permissionStore.canManageStage("admin", 6), "Admin CANNOT mutate Stage 6 (Supervisi)");
assert(permissionStore.canManageStage("admin", 1), "Admin CAN mutate Stage 1 (Verifikasi)");
assert(permissionStore.canManageStage("admin", 2), "Admin CAN mutate Stage 2 (Penjadwalan)");
assert(permissionStore.canManageStage("admin", 3), "Admin CAN mutate Stage 3 (Verifikasi Dokumen)");
assert(permissionStore.canManageStage("admin", 5), "Admin CAN mutate Stage 5 (Verifikasi Ulang)");
assert(permissionStore.canManageStage("admin", 7), "Admin CAN mutate Stage 7 (Pengantaran)");
assert(permissionStore.canManageStage("admin", 8), "Admin CAN mutate Stage 8 (Diterima)");

// SVP Full Stage Action Access
assert(permissionStore.canManageStage("svp", 4), "SVP CAN mutate Stage 4 (Proses Samsat)");
assert(permissionStore.canManageStage("svp", 6), "SVP CAN mutate Stage 6 (Supervisi)");
assert(permissionStore.canManageStage("administrator", 4), "Administrator alias CAN mutate Stage 4");
assert(permissionStore.canManageStage("administrator", 6), "Administrator alias CAN mutate Stage 6");

// Finance Stage Gating
assert(!permissionStore.canManageStage("finance", 4), "Finance CANNOT mutate Stage 4");
assert(!permissionStore.canManageStage("finance", 6), "Finance CANNOT mutate Stage 6");

// Messenger Stage Gating
assert(!permissionStore.canManageStage("messenger", 4), "Messenger CANNOT mutate Stage 4 via Order Tracking");
assert(!permissionStore.canManageStage("messenger", 6), "Messenger CANNOT mutate Stage 6 via Order Tracking");

// ------------------------------------------------------------------
// 4. ROLE & PERMISSION MATRIX: PAGE VIEW ACCESS
// ------------------------------------------------------------------
console.log("\n[4] Testing Role & Permission Page View Access:");

// ADMIN ACCESS MATRIX
assert(permissionStore.canViewPage("admin", "dashboard"), "Admin can view Dashboard");
assert(permissionStore.canViewPage("admin", "buat-order"), "Admin can view Buat Order");
assert(permissionStore.canViewPage("admin", "order-tracking"), "Admin can view Order Tracking");
assert(permissionStore.canViewPage("admin", "order-history"), "Admin can view Rekap Order");
assert(permissionStore.canViewPage("admin", "master-samsat"), "Admin can view Master Samsat");
assert(permissionStore.canViewPage("admin", "master-biaya-layanan"), "Admin can view Biaya Layanan");
assert(permissionStore.canViewPage("admin", "master-harga-dasar-samsat"), "Admin can view Harga Dasar Samsat");
assert(permissionStore.canViewPage("admin", "manajemen-karyawan"), "Admin can view Manajemen Karyawan");
assert(permissionStore.canViewPage("admin", "messenger-task"), "Admin can view Messenger Task");

// ADMIN FORBIDDEN PAGES
assert(!permissionStore.canViewPage("admin", "finance"), "Admin CANNOT view Finance");
assert(!permissionStore.canViewPage("admin", "finance-profit"), "Admin CANNOT view Finance Profit");
assert(!permissionStore.canViewPage("admin", "finance-kas-kantor"), "Admin CANNOT view Kas Kantor");
assert(!permissionStore.canViewPage("admin", "manajemen-pengguna"), "Admin CANNOT view Manajemen Pengguna");
assert(!permissionStore.canViewPage("admin", "access-management"), "Admin CANNOT view Hak Akses");
assert(!permissionStore.canViewPage("admin", "audit-log"), "Admin CANNOT view Riwayat Aktivitas");

// FINANCE ACCESS MATRIX
assert(permissionStore.canViewPage("finance", "dashboard"), "Finance can view Dashboard");
assert(permissionStore.canViewPage("finance", "finance-profit"), "Finance can view Profit");
assert(permissionStore.canViewPage("finance", "finance-kas-messenger"), "Finance can view Kas Messenger");
assert(permissionStore.canViewPage("finance", "finance-kas-kantor"), "Finance can view Kas Kantor");
assert(permissionStore.canViewPage("finance", "finance-pengeluaran"), "Finance can view Pengeluaran");
assert(permissionStore.canViewPage("finance", "finance-penjualan"), "Finance can view Data Penjualan");
assert(permissionStore.canViewPage("finance", "finance-tagihan"), "Finance can view Tagihan");
assert(permissionStore.canViewPage("finance", "finance-laba-rugi"), "Finance can view Laba Rugi");
assert(permissionStore.canViewPage("finance", "order-tracking"), "Finance can view Order Tracking (Read-Only)");
assert(permissionStore.canViewPage("finance", "order-history"), "Finance can view Rekap Order");

// FINANCE FORBIDDEN PAGES
assert(!permissionStore.canViewPage("finance", "master-samsat"), "Finance CANNOT view Master Samsat");
assert(!permissionStore.canViewPage("finance", "manajemen-karyawan"), "Finance CANNOT view Manajemen Karyawan");
assert(!permissionStore.canViewPage("finance", "manajemen-pengguna"), "Finance CANNOT view Manajemen Pengguna");
assert(!permissionStore.canViewPage("finance", "access-management"), "Finance CANNOT view Hak Akses");
assert(!permissionStore.canViewPage("finance", "buat-order"), "Finance CANNOT view Buat Order");

// MESSENGER ACCESS MATRIX
assert(permissionStore.canViewPage("messenger", "dashboard"), "Messenger can view Dashboard");
assert(permissionStore.canViewPage("messenger", "messenger-task"), "Messenger can view Messenger Task");

// MESSENGER FORBIDDEN PAGES
assert(!permissionStore.canViewPage("messenger", "finance-profit"), "Messenger CANNOT view Finance");
assert(!permissionStore.canViewPage("messenger", "master-samsat"), "Messenger CANNOT view Master Data");
assert(!permissionStore.canViewPage("messenger", "manajemen-karyawan"), "Messenger CANNOT view Manajemen Karyawan");
assert(!permissionStore.canViewPage("messenger", "manajemen-pengguna"), "Messenger CANNOT view Manajemen Pengguna");
assert(!permissionStore.canViewPage("messenger", "access-management"), "Messenger CANNOT view Hak Akses");
assert(!permissionStore.canViewPage("messenger", "audit-log"), "Messenger CANNOT view Riwayat Aktivitas");
assert(!permissionStore.canViewPage("messenger", "buat-order"), "Messenger CANNOT view Buat Order");

// SVP FULL ACCESS MATRIX
assert(permissionStore.canViewPage("svp", "dashboard"), "SVP can view Dashboard");
assert(permissionStore.canViewPage("svp", "finance-profit"), "SVP can view Finance Profit");
assert(permissionStore.canViewPage("svp", "master-samsat"), "SVP can view Master Samsat");
assert(permissionStore.canViewPage("svp", "manajemen-pengguna"), "SVP can view Manajemen Pengguna");
assert(permissionStore.canViewPage("svp", "access-management"), "SVP can view Hak Akses");
assert(permissionStore.canViewPage("svp", "audit-log"), "SVP can view Audit Log");
assert(permissionStore.canViewPage("svp", "buat-order"), "SVP can view Buat Order");

// ------------------------------------------------------------------
// 5. SIDEBAR MENU FILTERING
// ------------------------------------------------------------------
console.log("\n[5] Testing Sidebar Hierarchical Menu Filtering:");

const adminMenus = permissionStore.getFilteredMenuItems("admin", menuItems);
const adminIds = adminMenus.map((m) => m.id);
assert(adminIds.includes("dashboard"), "Admin menu includes Dashboard");
assert(adminIds.includes("master-data"), "Admin menu includes Master Data");
assert(adminIds.includes("manajemen"), "Admin menu includes Manajemen");
assert(adminIds.includes("messenger-menu"), "Admin menu includes Messenger");
assert(adminIds.includes("order-menu"), "Admin menu includes Order");
assert(!adminIds.includes("finance"), "Admin menu EXCLUDES Finance");

// Check Admin Manajemen sub-items (ONLY Karyawan)
const adminManajemen = adminMenus.find((m) => m.id === "manajemen");
const adminManajemenSubs = adminManajemen?.subItems?.map((s) => s.id) || [];
assert(adminManajemenSubs.includes("manajemen-karyawan"), "Admin Manajemen includes Karyawan");
assert(!adminManajemenSubs.includes("manajemen-pengguna"), "Admin Manajemen EXCLUDES Pengguna");
assert(!adminManajemenSubs.includes("access-management"), "Admin Manajemen EXCLUDES Hak Akses");
assert(!adminManajemenSubs.includes("audit-log"), "Admin Manajemen EXCLUDES Riwayat Aktivitas");

// Check Finance Menus
const financeMenus = permissionStore.getFilteredMenuItems("finance", menuItems);
const financeIds = financeMenus.map((m) => m.id);
assert(financeIds.includes("dashboard"), "Finance menu includes Dashboard");
assert(financeIds.includes("finance"), "Finance menu includes Finance");
assert(financeIds.includes("order-menu"), "Finance menu includes Order (view)");
assert(!financeIds.includes("master-data"), "Finance menu EXCLUDES Master Data");
assert(!financeIds.includes("manajemen"), "Finance menu EXCLUDES Manajemen");

// Check Messenger Menus
const messengerMenus = permissionStore.getFilteredMenuItems("messenger", menuItems);
const messengerIds = messengerMenus.map((m) => m.id);
assert(messengerIds.includes("dashboard"), "Messenger menu includes Dashboard");
assert(messengerIds.includes("messenger-menu"), "Messenger menu includes Messenger");
assert(!messengerIds.includes("finance"), "Messenger menu EXCLUDES Finance");
assert(!messengerIds.includes("master-data"), "Messenger menu EXCLUDES Master Data");
assert(!messengerIds.includes("manajemen"), "Messenger menu EXCLUDES Manajemen");
assert(!messengerIds.includes("order-menu"), "Messenger menu EXCLUDES Order");

// ------------------------------------------------------------------
// 6. ACCESS MANAGEMENT STORE MUTATION & PERSISTENCE
// ------------------------------------------------------------------
console.log("\n[6] Testing Access Management Store Mutation & Persistence:");

// Grant Admin permission to view audit-log
permissionStore.updateModulePermission("admin", "audit-log", { view: true, manage: true });
assert(permissionStore.canViewPage("admin", "audit-log") === true, "Admin permission updated to view audit-log");

// Revoke it back
permissionStore.updateModulePermission("admin", "audit-log", { view: false, manage: false });
assert(permissionStore.canViewPage("admin", "audit-log") === false, "Admin permission reverted to false");

// Stage permission toggle
permissionStore.updateStagePermission("admin", "stage4_prosesSamsat", true);
assert(permissionStore.canManageStage("admin", 4) === true, "Stage 4 action can be enabled dynamically");

permissionStore.updateStagePermission("admin", "stage4_prosesSamsat", false);
assert(permissionStore.canManageStage("admin", 4) === false, "Stage 4 action can be disabled dynamically");

// Reset to canonical defaults
permissionStore.resetToDefaults();
assert(permissionStore.canManageStage("admin", 4) === false, "Canonical default has Stage 4 disabled for Admin");
assert(permissionStore.canManageStage("admin", 6) === false, "Canonical default has Stage 6 disabled for Admin");
assert(permissionStore.canViewPage("admin", "access-management") === false, "Canonical default has Hak Akses disabled for Admin");

// ------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------
console.log("\n==================================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
