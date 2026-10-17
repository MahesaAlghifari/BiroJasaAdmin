/**
 * Comprehensive Unit Tests for Estimation Template 2: Perpanjangan R2 Tahunan (Motor)
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Verifies all required points from Phase Specification L.
 */

import test from "node:test";
import assert from "node:assert";
import { calculateEstimation, defaultRuleRegistry } from "../src/domain/estimation/estimationEngine";
import { calculateOverdueDuration } from "../src/domain/estimation/excelDateUtils";
import {
  DEFAULT_R2_ANNUAL_TEMPLATE,
  DEFAULT_R4_ANNUAL_TEMPLATE,
} from "../src/domain/estimation/defaultTemplates";
import { EstimationInput } from "../src/domain/estimation/types";
import { estimationStore } from "../src/app/data/estimationStore";
import { orderStore } from "../src/app/data/orderStore";
import { financeStore } from "../src/app/data/financeStore";

test("1. Official Workbook Regression Scenario — Evaluates to exactly Rp 876.000", () => {
  const input: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "NON ACC ID",
    manualValues: {
      "stnk-hilang": 0,
      etle: 0,
      "req-nopol-ganjil-acak": 0,
      "pemekaran-wilayah": 0,
    },
  };

  const res = calculateEstimation(input, DEFAULT_R2_ANNUAL_TEMPLATE);

  // 1. Duration check
  assert.strictEqual(res.durasiKeterlambatan, "1 Tahun 2 Bulan", "Durasi keterlambatan kalender harus 1 Tahun 2 Bulan");
  assert.strictEqual(res.tahunTunggakan, 1, "Tahun tunggakan harus 1");
  assert.strictEqual(res.bulanKalender, 2, "Bulan kalender harus 2");
  assert.strictEqual(res.bulanTunggakan, 7, "Bulan denda harus 7 (2 bulan + 5 bulan sesuai formula R2 I13)");

  // 2. PKB components
  const pkbTertunggak = res.items.find((i) => i.id === "pkb-tertunggak")?.amount;
  const pajakBaru = res.items.find((i) => i.id === "pajak-baru")?.amount;
  assert.strictEqual(pkbTertunggak, 51000, "PKB Tertunggak harus Rp 51.000");
  assert.strictEqual(pajakBaru, 51000, "Pajak Baru harus Rp 51.000");
  assert.strictEqual(res.totalPkb, 102000, "Total PKB harus Rp 102.000");

  // 3. Denda PKB components
  const dendaPkbTertunggak = res.items.find((i) => i.id === "denda-pkb-tertunggak")?.amount;
  const dendaPkbPajakBaru = res.items.find((i) => i.id === "denda-pkb-pajak-baru")?.amount;
  assert.strictEqual(dendaPkbTertunggak, 25000, "Denda PKB Tertunggak harus Rp 25.000 (ROUNDUP(51000 * 0.48, -3))");
  assert.strictEqual(dendaPkbPajakBaru, 15000, "Denda PKB Pajak Baru harus Rp 15.000 (ROUNDUP(51000 * 0.48 / 12 * 7, -3))");
  assert.strictEqual(res.totalDendaPkb, 40000, "Total Denda PKB harus Rp 40.000");

  // 4. SWDKLLJ components (Motor: Rp 35.000)
  const swdklljTertunggak = res.items.find((i) => i.id === "swdkllj-tertunggak")?.amount;
  const swdklljPajakBaru = res.items.find((i) => i.id === "swdkllj-pajak-baru")?.amount;
  assert.strictEqual(swdklljTertunggak, 35000, "SWDKLLJ Tertunggak harus Rp 35.000");
  assert.strictEqual(swdklljPajakBaru, 35000, "SWDKLLJ Pajak Baru harus Rp 35.000");
  assert.strictEqual(res.totalSwdkllj, 70000, "Total SWDKLLJ harus Rp 70.000");

  // 5. Denda SWDKLLJ components (Motor: Rp 32.000)
  const dendaSwdklljTertunggak = res.items.find((i) => i.id === "denda-swdkllj-tertunggak")?.amount;
  const dendaSwdklljPajakBaru = res.items.find((i) => i.id === "denda-swdkllj-pajak-baru")?.amount;
  assert.strictEqual(dendaSwdklljTertunggak, 32000, "Denda SWDKLLJ Tertunggak harus Rp 32.000 (1 thn * 32.000)");
  assert.strictEqual(dendaSwdklljPajakBaru, 32000, "Denda SWDKLLJ Pajak Baru harus Rp 32.000 (karena bulan denda 7 > 0)");
  assert.strictEqual(res.totalDendaSwdkllj, 64000, "Total Denda SWDKLLJ harus Rp 64.000");

  // 6. Admin, Proses & Jasa
  const adminStnk = res.items.find((i) => i.id === "admin-stnk")?.amount;
  const adminTnkb = res.items.find((i) => i.id === "admin-tnkb")?.amount;
  const stnkHilang = res.items.find((i) => i.id === "stnk-hilang")?.amount;
  const prosesAccId = res.items.find((i) => i.id === "proses-dan-acc-id")?.amount;
  const cetakSkp = res.items.find((i) => i.id === "cetak-skp")?.amount;
  const jasa = res.items.find((i) => i.id === "jasa")?.amount;

  assert.strictEqual(adminStnk, 0, "Admin STNK harus Rp 0 untuk Tahunan");
  assert.strictEqual(adminTnkb, 0, "Admin TNKB harus Rp 0 untuk Tahunan");
  assert.strictEqual(stnkHilang, 0, "STNK Hilang bawaan Rp 0");
  assert.strictEqual(prosesAccId, 350000, "Proses dan ACC ID harus Rp 350.000 sesuai Cell C27");
  assert.strictEqual(cetakSkp, 50000, "Cetak SKP Motor harus Rp 50.000");
  assert.strictEqual(jasa, 200000, "Jasa Motor harus Rp 200.000");

  // 7. Insidentals (ETLE, REQ NOPOL, Pemekaran Wilayah)
  const etle = res.items.find((i) => i.id === "etle")?.amount;
  const reqNopol = res.items.find((i) => i.id === "req-nopol-ganjil-acak")?.amount;
  const pemekaran = res.items.find((i) => i.id === "pemekaran-wilayah")?.amount;
  assert.strictEqual(etle, 0, "ETLE default 0");
  assert.strictEqual(reqNopol, 0, "REQ NOPOL default 0");
  assert.strictEqual(pemekaran, 0, "Pemekaran Wilayah default 0");
  assert.strictEqual(res.totalInsidental, 0, "Total Insidental default 0");

  // 8. Grand Total (Cell C30)
  assert.strictEqual(
    res.totalEstimasi,
    876000,
    "Grand Total Estimasi R2 harus tepat Rp 876.000"
  );
});

test("2. Durasi keterlambatan kalender dan formula bulan denda +5 bulan", () => {
  // Test case A: Due 08/09/2025, Estimate 17/10/2026 => 1 thn 2 bln => bulan denda 7
  const inputA: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  };
  const resA = calculateEstimation(inputA, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(resA.durasiKeterlambatan, "1 Tahun 2 Bulan");
  assert.strictEqual(resA.tahunTunggakan, 1);
  assert.strictEqual(resA.bulanKalender, 2);
  assert.strictEqual(resA.bulanTunggakan, 7);

  // Test case B: Zero delay / on time
  const inputB: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2026-10-17",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  };
  const resB = calculateEstimation(inputB, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(resB.durasiKeterlambatan, "0 Tahun 0 Bulan");
  assert.strictEqual(resB.tahunTunggakan, 0);
  assert.strictEqual(resB.bulanKalender, 0);
  assert.strictEqual(resB.bulanTunggakan, 0, "Tidak telat maka bulan denda harus 0");
  assert.strictEqual(resB.totalDendaPkb, 0, "Tidak telat maka total denda PKB harus 0");
  assert.strictEqual(resB.totalDendaSwdkllj, 0, "Tidak telat maka total denda SWDKLLJ harus 0");
});

test("3. Denda PKB Tertunggak dan Denda PKB Pajak Baru dihitung terpisah", () => {
  const input: EstimationInput = {
    pkbDasar: 100000,
    tanggalJatuhTempo: "2024-05-10",
    tanggalEstimasi: "2026-10-17", // 2 Tahun 6 Bulan => bulan denda = 6 + 5 = 11
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
  };

  const res = calculateEstimation(input, DEFAULT_R2_ANNUAL_TEMPLATE);
  const dendaTertunggak = res.items.find((i) => i.id === "denda-pkb-tertunggak")?.amount;
  const dendaBaru = res.items.find((i) => i.id === "denda-pkb-pajak-baru")?.amount;

  // PKB Tertunggak: 100.000 * 2 = 200.000
  // Denda PKB Tertunggak: ROUNDUP(200.000 * 0.48, -3) = 96.000
  assert.strictEqual(dendaTertunggak, 96000);

  // Denda PKB Pajak Baru: ROUNDUP(100.000 * 0.48 / 12 * 11, -3) = ROUNDUP(44.000, -3) = 44.000
  assert.strictEqual(dendaBaru, 44000);
  assert.strictEqual(res.totalDendaPkb, 140000);
});

test("4. Program FREE Biaya Denda membebaskan Denda PKB tetapi mempertahankan Denda SWDKLLJ sesuai workbook", () => {
  const input: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "FREE Biaya Denda",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "NON ACC ID",
  };

  const res = calculateEstimation(input, DEFAULT_R2_ANNUAL_TEMPLATE);

  // Denda PKB bebas (0)
  assert.strictEqual(res.totalDendaPkb, 0, "Total Denda PKB harus Rp 0 saat FREE Biaya Denda");
  assert.strictEqual(res.items.find((i) => i.id === "denda-pkb-tertunggak")?.amount, 0);
  assert.strictEqual(res.items.find((i) => i.id === "denda-pkb-pajak-baru")?.amount, 0);

  // Denda SWDKLLJ TIDAK dibebaskan di formula Sheet 5
  assert.strictEqual(res.totalDendaSwdkllj, 64000, "Denda SWDKLLJ tetap Rp 64.000 sesuai formula Sheet 5");

  // Total berkurang persis sebesar denda PKB (40.000): 876.000 - 40.000 = 836.000
  assert.strictEqual(res.totalEstimasi, 836000, "Total Estimasi FREE Biaya Denda harus Rp 836.000");
});

test("5. SWDKLLJ R2 menggunakan tarif Motor (Rp 35.000 pokok, Rp 32.000 denda)", () => {
  const input: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2023-09-08", // 3 Tahun keterlambatan
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  };

  const res = calculateEstimation(input, DEFAULT_R2_ANNUAL_TEMPLATE);

  const swdPokok = res.items.find((i) => i.id === "swdkllj-pajak-baru")?.amount;
  const swdTertunggak = res.items.find((i) => i.id === "swdkllj-tertunggak")?.amount;
  const dendaSwdPokok = res.items.find((i) => i.id === "denda-swdkllj-pajak-baru")?.amount;
  const dendaSwdTertunggak = res.items.find((i) => i.id === "denda-swdkllj-tertunggak")?.amount;

  assert.strictEqual(swdPokok, 35000, "SWDKLLJ Pokok Motor harus Rp 35.000");
  assert.strictEqual(swdTertunggak, 35000 * res.tahunTunggakan, "SWDKLLJ Tertunggak harus Rp 35.000 * thn");
  assert.strictEqual(dendaSwdPokok, 32000, "Denda SWDKLLJ Baru Motor harus Rp 32.000");
  assert.strictEqual(dendaSwdTertunggak, 32000 * res.tahunTunggakan, "Denda SWDKLLJ Tertunggak Motor harus Rp 32.000 * thn");
});

test("6. Perilaku Proses dan ACC ID R2 (masuk total, kondisi berkas & wilayah)", () => {
  // A: TIDAK ADA KTP + NON ACC ID -> Rp 350.000 (default)
  const resA = calculateEstimation({
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "NON ACC ID",
  }, DEFAULT_R2_ANNUAL_TEMPLATE);
  const itemA = resA.items.find((i) => i.id === "proses-dan-acc-id");
  assert.strictEqual(itemA?.amount, 350000);
  assert.strictEqual(itemA?.includesInTotal, true);
  assert.strictEqual(resA.totalEstimasi, 876000);

  // B: Berkas LENGKAP -> Rp 0
  const resB = calculateEstimation({
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "LENGKAP",
    wilayahAccId: "NON ACC ID",
  }, DEFAULT_R2_ANNUAL_TEMPLATE);
  const itemB = resB.items.find((i) => i.id === "proses-dan-acc-id");
  assert.strictEqual(itemB?.amount, 0);
  // Total berkurang Rp 350.000: 876.000 - 350.000 = 526.000
  assert.strictEqual(resB.totalEstimasi, 526000);

  // C: TIDAK ADA KTP + Bogor -> Rp 200.000 (sesuai Cell I5 Motor)
  const resC = calculateEstimation({
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "Bogor",
  }, DEFAULT_R2_ANNUAL_TEMPLATE);
  const itemC = resC.items.find((i) => i.id === "proses-dan-acc-id");
  assert.strictEqual(itemC?.amount, 200000);
  // Total berkurang Rp 150.000: 876.000 - 150.000 = 726.000
  assert.strictEqual(resC.totalEstimasi, 726000);

  // D: Berkas kosong -> tidak menebak biaya (Rp 0)
  const resD = calculateEstimation({
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  }, DEFAULT_R2_ANNUAL_TEMPLATE);
  const itemD = resD.items.find((i) => i.id === "proses-dan-acc-id");
  assert.strictEqual(itemD?.amount, 0, "Berkas kosong tidak boleh menebak biaya");
});

test("7. Cetak SKP (Rp 50.000 jika telat, 0 jika tidak telat) dan Jasa Motor (Rp 200.000)", () => {
  // Telat
  const resOverdue = calculateEstimation({
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  }, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(resOverdue.items.find((i) => i.id === "cetak-skp")?.amount, 50000);
  assert.strictEqual(resOverdue.items.find((i) => i.id === "jasa")?.amount, 200000);

  // Tepat waktu (tidak telat)
  const resOnTime = calculateEstimation({
    pkbDasar: 51000,
    tanggalJatuhTempo: "2026-10-17",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  }, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(resOnTime.items.find((i) => i.id === "cetak-skp")?.amount, 0, "Cetak SKP Rp 0 jika tepat waktu");
  assert.strictEqual(resOnTime.items.find((i) => i.id === "jasa")?.amount, 200000, "Jasa tetap Rp 200.000");
});

test("8. Komponen insidental (ETLE, REQ NOPOL, Pemekaran) memperbarui total secara reaktif", () => {
  const baseInput: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "NON ACC ID",
  };

  const resBase = calculateEstimation(baseInput, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(resBase.totalEstimasi, 876000);

  // Tambah ETLE 50.000
  const resWithEtle = calculateEstimation({
    ...baseInput,
    manualValues: { etle: 50000 },
  }, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(resWithEtle.totalEstimasi, 926000);

  // Tambah REQ NOPOL 100.000 & STNK Hilang 25.000
  const resWithMore = calculateEstimation({
    ...baseInput,
    manualValues: {
      etle: 50000,
      "req-nopol-ganjil-acak": 100000,
      "stnk-hilang": 25000,
    },
  }, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(resWithMore.totalEstimasi, 1051000);
});

test("9. R4 Regression Guarantee — R4 must remain strictly at Rp 18.363.000 and unaffected by R2", () => {
  const r4Input: EstimationInput = {
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "LENGKAP",
    wilayahAccId: "DKI Jakarta",
  };

  const resR4 = calculateEstimation(r4Input, DEFAULT_R4_ANNUAL_TEMPLATE);
  assert.strictEqual(resR4.durasiKeterlambatan, "2 Tahun 10 Bulan");
  assert.strictEqual(resR4.tahunTunggakan, 2);
  assert.strictEqual(resR4.bulanTunggakan, 10, "R4 harus tetap memakai bulan kalender 10 tanpa +5 bulan");
  assert.strictEqual(resR4.totalEstimasi, 18363000, "R4 Total Estimasi harus tetap tepat Rp 18.363.000");
  assert.strictEqual(resR4.accIdAmount, 0, "R4 ACC ID berkas lengkap tetap 0 dan di luar total");
});

test("10. EstimationStore integrates both R4 and R2 templates properly", () => {
  const tplR4 = estimationStore.getTemplate("template-pajak-tahunan-r4");
  const tplR2 = estimationStore.getTemplate("template-pajak-tahunan-r2");

  assert.strictEqual(tplR4.id, "template-pajak-tahunan-r4");
  assert.strictEqual(tplR4.vehicleType, "Mobil");
  assert.strictEqual(tplR4.biayaJasa, 250000);

  assert.strictEqual(tplR2.id, "template-pajak-tahunan-r2");
  assert.strictEqual(tplR2.vehicleType, "Motor");
  assert.strictEqual(tplR2.biayaJasa, 200000);
  assert.strictEqual(tplR2.swdklljPokok, 35000);
});

test("11. Dynamic update when PKB or due date changes", () => {
  const baseInput: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "NON ACC ID",
  };
  const res1 = calculateEstimation(baseInput, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(res1.totalPkb, 102000);

  // Ubah PKB dasar jadi 100.000
  const res2 = calculateEstimation({ ...baseInput, pkbDasar: 100000 }, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(res2.totalPkb, 200000); // 100k + 100k
  assert.strictEqual(res2.items.find((i) => i.id === "pkb-tertunggak")?.amount, 100000);
  assert.strictEqual(res2.items.find((i) => i.id === "pajak-baru")?.amount, 100000);

  // Ubah tanggal jatuh tempo jadi lebih telat (2 tahun)
  const res3 = calculateEstimation({ ...baseInput, tanggalJatuhTempo: "2024-09-08" }, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(res3.tahunTunggakan, 2);
  assert.strictEqual(res3.items.find((i) => i.id === "pkb-tertunggak")?.amount, 102000); // 51k * 2
});

test("12. Invalid input handling — Safe handling of negative numbers, invalid dates, and NaN", () => {
  const invalidInput: EstimationInput = {
    pkbDasar: -50000,
    tanggalJatuhTempo: "invalid-date-string",
    tanggalEstimasi: "also-invalid",
    programSamsat: "NORMAL",
    manualValues: {
      etle: -99999,
      "proses-dan-acc-id": NaN,
    },
  };

  const res = calculateEstimation(invalidInput, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.ok(res.totalEstimasi >= 0, "Total estimasi must never be negative");
  assert.strictEqual(res.totalPkb, 0, "Negative PKB must be clamped to 0");
  assert.strictEqual(res.durasiKeterlambatan, "0 Tahun 0 Bulan", "Invalid date must fallback safely");
});

test("13. Pure function guarantee — Calculation never creates orders or invoices", () => {
  const initialOrdersCount = orderStore.getAllOrders().length;
  const initialInvoicesCount = financeStore.getInvoices().length;

  // Run calculation multiple times
  for (let i = 0; i < 5; i++) {
    calculateEstimation({
      pkbDasar: 51000,
      tanggalJatuhTempo: "2025-09-08",
      tanggalEstimasi: "2026-10-17",
      programSamsat: "NORMAL",
      kondisiBerkas: "TIDAK ADA KTP",
    }, DEFAULT_R2_ANNUAL_TEMPLATE);
  }

  assert.strictEqual(orderStore.getAllOrders().length, initialOrdersCount, "Calculation must have 0 side effects on orders");
  assert.strictEqual(financeStore.getInvoices().length, initialInvoicesCount, "Calculation must have 0 side effects on invoices");
});

test("14. Zero double counting between components", () => {
  const input: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "NON ACC ID",
  };

  const res = calculateEstimation(input, DEFAULT_R2_ANNUAL_TEMPLATE);

  // Sum of all items that include in total must match totalEstimasi (before roundup)
  const sumItems = res.items
    .filter((i) => i.includesInTotal)
    .reduce((sum, i) => sum + i.amount, 0);

  const rounded = Math.ceil(sumItems / 1000) * 1000;
  assert.strictEqual(res.totalEstimasi, rounded, "Total Estimasi must match exact sum of items without double counting");
  assert.strictEqual(res.totalEstimasi, 876000);
});

test("15. Template persistence and component update consistency in EstimationStore", () => {
  // Update param
  const updated = estimationStore.updateTemplateParams("template-pajak-tahunan-r2", {
    biayaJasa: 220000,
  });
  assert.strictEqual(updated, true);

  const tplUpdated = estimationStore.getTemplate("template-pajak-tahunan-r2");
  assert.strictEqual(tplUpdated.biayaJasa, 220000);

  // Reset back to default
  estimationStore.resetToDefault("template-pajak-tahunan-r2");
  const tplReset = estimationStore.getTemplate("template-pajak-tahunan-r2");
  assert.strictEqual(tplReset.biayaJasa, 200000);
});

