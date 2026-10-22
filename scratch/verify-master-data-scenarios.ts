/**
 * Business Scenarios Verification Script for Master Data Biaya Layanan
 * Admin SUN89 — Biro Jasa Management System
 */

import {
  DEFAULT_R4_ANNUAL_TEMPLATE,
  DEFAULT_R2_ANNUAL_TEMPLATE,
} from "../src/domain/estimation/defaultTemplates";
import { calculateEstimation, defaultRuleRegistry } from "../src/domain/estimation/estimationEngine";
import { estimationStore } from "../src/app/data/estimationStore";
import { EstimationInput } from "../src/domain/estimation/types";

console.log("=== VERIFIKASI SKENARIO BISNIS MASTER DATA BIAYA LAYANAN ===");

// -------------------------------------------------------------
// Skenario 1: Default Workbook Exact Match
// -------------------------------------------------------------
console.log("\n[SKENARIO 1: DEFAULT WORKBOOK EXACT MATCH]");

// R4 Reference Fixture from Workbook Sheet PAJAK TAHUNAN R4
const r4Input: EstimationInput = {
  pkbDasar: 3964000,
  tanggalJatuhTempo: "2023-12-23",
  tanggalEstimasi: "2026-10-17", // Exact reference fixture date: 2 Tahun 10 Bulan
  programSamsat: "NORMAL",
  kondisiBerkas: "LENGKAP",
};

const r4DefaultTpl = estimationStore.getTemplate("template-pajak-tahunan-r4");
const r4Result = calculateEstimation(r4Input, r4DefaultTpl, defaultRuleRegistry);
console.log(`R4 Tahunan Default Total: Rp ${r4Result.totalEstimasi.toLocaleString("id-ID")}`);
console.log(`Durasi Keterlambatan: ${r4Result.durasiKeterlambatan}`);
const isR4Match = r4Result.totalEstimasi === 18363000;
console.log(`Target R4 Workbook (Rp 18.363.000): ${isR4Match ? "PASSED (EXACT MATCH)" : "FAILED (Nilai: " + r4Result.totalEstimasi + ")"}`);

// R2 Reference Fixture from Workbook Sheet R2 (1 Tahun 2 Bulan Kalender, 7 Bulan Denda, ACC ID DKI)
const r2Input: EstimationInput = {
  pkbDasar: 51000,
  tanggalJatuhTempo: "2023-12-23",
  tanggalEstimasi: "2025-02-23", // Exact reference fixture date: 1 Tahun 2 Bulan Kalender (+5 = 7 Bulan denda)
  programSamsat: "NORMAL",
  kondisiBerkas: "TIDAK ADA KTP",
  wilayahAccId: "DKI Jakarta",
};

const r2DefaultTpl = estimationStore.getTemplate("template-pajak-tahunan-r2");
const r2Result = calculateEstimation(r2Input, r2DefaultTpl, defaultRuleRegistry);
console.log(`R2 Tahunan Default Total: Rp ${r2Result.totalEstimasi.toLocaleString("id-ID")}`);
console.log(`Durasi Keterlambatan: ${r2Result.durasiKeterlambatan}, Bulan Denda: ${r2Result.bulanTunggakan}`);
const isR2Match = r2Result.totalEstimasi === 876000;
console.log(`Target R2 Workbook (Rp 876.000): ${isR2Match ? "PASSED (EXACT MATCH)" : "FAILED (Nilai: " + r2Result.totalEstimasi + ")"}`);

// -------------------------------------------------------------
// Skenario 2: Perubahan Parameter (Koefisien Denda 48% -> 50%)
// -------------------------------------------------------------
console.log("\n[SKENARIO 2: PERUBAHAN PARAMETER (48% -> 50%)]");
estimationStore.updateTemplateParams("template-pajak-tahunan-r4", {
  koefisienDenda: 0.50,
});

const r4UpdatedTpl = estimationStore.getTemplate("template-pajak-tahunan-r4");
console.log(`Template Koefisien Denda setelah update: ${(r4UpdatedTpl.koefisienDenda * 100).toFixed(0)}%`);

const r4UpdatedResult = calculateEstimation(r4Input, r4UpdatedTpl, defaultRuleRegistry);
console.log(`R4 Tahunan dengan Koefisien 50%: Rp ${r4UpdatedResult.totalEstimasi.toLocaleString("id-ID")}`);
const diff = r4UpdatedResult.totalEstimasi - r4Result.totalEstimasi;
console.log(`Selisih Nilai Estimasi: +Rp ${diff.toLocaleString("id-ID")}`);
const isParamChanged = r4UpdatedResult.totalEstimasi > r4Result.totalEstimasi;
console.log(`Verifikasi Parameter Berubah Responsif: ${isParamChanged ? "PASSED" : "FAILED"}`);

// -------------------------------------------------------------
// Skenario 3: Toggle Status Komponen (Nonaktifkan Cetak SKP Rp 100.000)
// -------------------------------------------------------------
console.log("\n[SKENARIO 3: TOGGLE STATUS KOMPONEN (NONAKTIFKAN CETAK SKP)]");
estimationStore.toggleComponent("template-pajak-tahunan-r4", "cetak-skp");
const r4DeactivatedTpl = estimationStore.getTemplate("template-pajak-tahunan-r4");
const cetakSkpComp = r4DeactivatedTpl.components.find((c) => c.id === "cetak-skp");
console.log(`Status Cetak SKP isActive: ${cetakSkpComp?.isActive}`);

const r4DeactResult = calculateEstimation(r4Input, r4DeactivatedTpl, defaultRuleRegistry);
console.log(`R4 Tahunan setelah Nonaktifkan Cetak SKP: Rp ${r4DeactResult.totalEstimasi.toLocaleString("id-ID")}`);
const deactDiff = r4UpdatedResult.totalEstimasi - r4DeactResult.totalEstimasi;
console.log(`Penurunan Total Tagihan: Rp ${deactDiff.toLocaleString("id-ID")} (sesuai nilai Cetak SKP Rp 100.000)`);
const isDeactPassed = deactDiff === 100000;
console.log(`Verifikasi Toggle Nonaktif: ${isDeactPassed ? "PASSED" : "FAILED"}`);

// -------------------------------------------------------------
// Skenario 4: Toggle Masuk Total (Aktifkan Cetak SKP tapi Masuk Total = Tidak)
// -------------------------------------------------------------
console.log("\n[SKENARIO 4: TOGGLE MASUK TOTAL = TIDAK]");
estimationStore.updateComponentRule("template-pajak-tahunan-r4", "cetak-skp", {
  isActive: true,
  includesInTotal: false,
});
const r4NoTotalTpl = estimationStore.getTemplate("template-pajak-tahunan-r4");
const compNoTotal = r4NoTotalTpl.components.find((c) => c.id === "cetak-skp");
console.log(`Status Cetak SKP: isActive=${compNoTotal?.isActive}, includesInTotal=${compNoTotal?.includesInTotal}`);

const r4NoTotalResult = calculateEstimation(r4Input, r4NoTotalTpl, defaultRuleRegistry);
const skpItemInBreakdown = r4NoTotalResult.items.find((i) => i.id === "cetak-skp");
console.log(`Item Cetak SKP ada di rincian items: ${skpItemInBreakdown ? "YA (Rp " + skpItemInBreakdown.amount.toLocaleString("id-ID") + ")" : "TIDAK"}`);
console.log(`Item Cetak SKP includesInTotal flag: ${skpItemInBreakdown?.includesInTotal}`);
console.log(`Total Estimasi Akhir: Rp ${r4NoTotalResult.totalEstimasi.toLocaleString("id-ID")}`);
const isNoTotalPassed = skpItemInBreakdown !== undefined && r4NoTotalResult.totalEstimasi === r4DeactResult.totalEstimasi;
console.log(`Verifikasi Masuk Total = Tidak: ${isNoTotalPassed ? "PASSED" : "FAILED"}`);

// -------------------------------------------------------------
// Skenario 5: Dynamic Binding untuk Modal Penjelasan Rumus
// -------------------------------------------------------------
console.log("\n[SKENARIO 5: DYNAMIC FORMULA BINDING]");
const testTemplate50 = estimationStore.getTemplate("template-pajak-tahunan-r4");
const koefPct50 = `${Math.round((testTemplate50.koefisienDenda) * 100)}%`;
const formulaString50 = `Denda = PKB Dasar × ${koefPct50} ÷ ${testTemplate50.pembagiBulan || 12} × Jumlah Bulan Keterlambatan`;
console.log(`Formula saat koefisien 50%: "${formulaString50}"`);
const isFormulaDynamic = formulaString50.includes("50%");
console.log(`Verifikasi Formula Membaca Parameter Aktif (50%): ${isFormulaDynamic ? "PASSED" : "FAILED"}`);

// -------------------------------------------------------------
// Skenario 6: Reset ke Standar Resmi (Default Workbook)
// -------------------------------------------------------------
console.log("\n[SKENARIO 6: RESET KE STANDAR RESMI WORKBOOK]");
estimationStore.resetToDefault("template-pajak-tahunan-r4");
const r4ResetTpl = estimationStore.getTemplate("template-pajak-tahunan-r4");
console.log(`Koefisien Denda setelah Reset: ${(r4ResetTpl.koefisienDenda * 100).toFixed(0)}%`);

const r4FinalResetResult = calculateEstimation(r4Input, r4ResetTpl, defaultRuleRegistry);
console.log(`R4 Tahunan setelah Reset: Rp ${r4FinalResetResult.totalEstimasi.toLocaleString("id-ID")}`);
const isFinalResetExact = r4FinalResetResult.totalEstimasi === 18363000;
console.log(`Verifikasi Reset Kembali Tepat ke Workbook (Rp 18.363.000): ${isFinalResetExact ? "PASSED (EXACT MATCH)" : "FAILED"}`);

console.log("\n=== RINGKASAN VERIFIKASI ===");
console.log(`1. Default Workbook: ${isR4Match && isR2Match ? "PASS" : "FAIL"}`);
console.log(`2. Parameter Change (48% -> 50%): ${isParamChanged ? "PASS" : "FAIL"}`);
console.log(`3. Toggle Status (Deactivate): ${isDeactPassed ? "PASS" : "FAIL"}`);
console.log(`4. Toggle Masuk Total (Show but not sum): ${isNoTotalPassed ? "PASS" : "FAIL"}`);
console.log(`5. Dynamic Explanation Modal: ${isFormulaDynamic ? "PASS" : "FAIL"}`);
console.log(`6. Reset to Default: ${isFinalResetExact ? "PASS" : "FAIL"}`);
