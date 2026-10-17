/**
 * Unit Tests for Estimation Template 1: Perpanjangan R4 Tahunan
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Verifies all 20 required points from Phase Specification H.
 */

import test from "node:test";
import assert from "node:assert";
import { calculateEstimation, defaultRuleRegistry } from "../src/domain/estimation/estimationEngine";
import { calculateOverdueDuration } from "../src/domain/estimation/excelDateUtils";
import { DEFAULT_R4_ANNUAL_TEMPLATE } from "../src/domain/estimation/defaultTemplates";
import { EstimationInput } from "../src/domain/estimation/types";

test("1. Official Workbook Regression Scenario — Evaluates to exactly Rp 18.363.000", () => {
  const input: EstimationInput = {
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "LENGKAP",
    wilayahAccId: "DKI Jakarta",
    manualValues: {
      jr: 0,
      etle: 0,
      "pnbp-nopil": 0,
      "stnk-hilang": 0,
      "pemekaran-wilayah": 0,
    },
  };

  const res = calculateEstimation(input, DEFAULT_R4_ANNUAL_TEMPLATE);

  // 1. Duration check
  assert.strictEqual(res.tahunTunggakan, 2, "Tahun tunggakan must be 2");
  assert.strictEqual(res.bulanTunggakan, 10, "Bulan tunggakan must be 10");
  assert.strictEqual(res.durasiKeterlambatan, "2 Tahun 10 Bulan");

  // 2. PKB components
  const pkbTertunggak = res.items.find((i) => i.id === "pkb-tertunggak")?.amount;
  const pajakBaru = res.items.find((i) => i.id === "pajak-baru")?.amount;
  assert.strictEqual(pkbTertunggak, 7928000, "PKB Tertunggak must be Rp 7.928.000");
  assert.strictEqual(pajakBaru, 3964000, "Pajak Baru must be Rp 3.964.000");
  assert.strictEqual(res.totalPkb, 11892000, "Total PKB must be Rp 11.892.000");

  // 3. Denda PKB components
  const dendaPkbTertunggak = res.items.find((i) => i.id === "denda-pkb-tertunggak")?.amount;
  const dendaPkbPajakBaru = res.items.find((i) => i.id === "denda-pkb-pajak-baru")?.amount;
  assert.strictEqual(dendaPkbTertunggak, 3806000, "Denda PKB Tertunggak must be Rp 3.806.000");
  assert.strictEqual(dendaPkbPajakBaru, 1586000, "Denda PKB Pajak Baru must be Rp 1.586.000");
  assert.strictEqual(res.totalDendaPkb, 5392000, "Total Denda PKB must be Rp 5.392.000");

  // 4. SWDKLLJ components
  const swdklljTertunggak = res.items.find((i) => i.id === "swdkllj-tertunggak")?.amount;
  const swdklljPajakBaru = res.items.find((i) => i.id === "swdkllj-pajak-baru")?.amount;
  assert.strictEqual(swdklljTertunggak, 286000, "SWDKLLJ Tertunggak must be Rp 286.000");
  assert.strictEqual(swdklljPajakBaru, 143000, "SWDKLLJ Pajak Baru must be Rp 143.000");
  assert.strictEqual(res.totalSwdkllj, 429000, "Total SWDKLLJ must be Rp 429.000");

  // 5. Denda SWDKLLJ components
  const dendaSwdklljTertunggak = res.items.find((i) => i.id === "denda-swdkllj-tertunggak")?.amount;
  const dendaSwdklljPajakBaru = res.items.find((i) => i.id === "denda-swdkllj-pajak-baru")?.amount;
  assert.strictEqual(dendaSwdklljTertunggak, 200000, "Denda SWDKLLJ Tertunggak must be Rp 200.000");
  assert.strictEqual(dendaSwdklljPajakBaru, 100000, "Denda SWDKLLJ Pajak Baru must be Rp 100.000");
  assert.strictEqual(res.totalDendaSwdkllj, 300000, "Total Denda SWDKLLJ must be Rp 300.000");

  // 6. Admin & Jasa
  const adminStnk = res.items.find((i) => i.id === "admin-stnk")?.amount;
  const adminTnkb = res.items.find((i) => i.id === "admin-tnkb")?.amount;
  const cetakSkp = res.items.find((i) => i.id === "cetak-skp")?.amount;
  const jasa = res.items.find((i) => i.id === "jasa")?.amount;
  assert.strictEqual(adminStnk, 0, "Admin STNK must be Rp 0");
  assert.strictEqual(adminTnkb, 0, "Admin TNKB must be Rp 0");
  assert.strictEqual(cetakSkp, 100000, "Cetak SKP must be Rp 100.000 when overdue");
  assert.strictEqual(jasa, 250000, "Jasa must be Rp 250.000 for R4");

  // 7. ACC ID check
  assert.strictEqual(res.accIdAmount, 0, "ACC ID must be Rp 0 when berkas is LENGKAP");
  assert.strictEqual(res.accIdStatus, "LENGKAP");

  // 8. Total Estimasi check (Cell C30)
  assert.strictEqual(res.totalEstimasi, 18363000, "Total Estimasi must be exactly Rp 18.363.000");
});

test("2. Changing PKB dasar dynamically updates all dependent components", () => {
  const inputA: EstimationInput = {
    pkbDasar: 2000000,
    tanggalJatuhTempo: "2024-01-01",
    tanggalEstimasi: "2025-01-01", // exactly 1 year overdue
    programSamsat: "NORMAL",
  };
  const resA = calculateEstimation(inputA);
  assert.strictEqual(resA.totalPkb, 4000000); // 2jt tertunggak + 2jt baru

  const inputB: EstimationInput = {
    ...inputA,
    pkbDasar: 4000000,
  };
  const resB = calculateEstimation(inputB);
  assert.strictEqual(resB.totalPkb, 8000000); // 4jt tertunggak + 4jt baru
  assert.strictEqual(resB.totalDendaPkb, resA.totalDendaPkb * 2);
});

test("3. Calendar date arithmetic handles overdue years and months correctly", () => {
  const dur1 = calculateOverdueDuration("2023-12-23", "2026-10-17");
  assert.strictEqual(dur1.years, 2);
  assert.strictEqual(dur1.months, 10);
  assert.strictEqual(dur1.formatted, "2 Tahun 10 Bulan");

  const dur2 = calculateOverdueDuration("2025-01-01", "2026-01-01");
  assert.strictEqual(dur2.years, 1);
  assert.strictEqual(dur2.months, 0);
  assert.strictEqual(dur2.formatted, "1 Tahun 0 Bulan");
});

test("4. Zero overdue when due date equals current date", () => {
  const res = calculateEstimation({
    pkbDasar: 3000000,
    tanggalJatuhTempo: "2026-10-17",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  });
  assert.strictEqual(res.tahunTunggakan, 0);
  assert.strictEqual(res.bulanTunggakan, 0);
  assert.strictEqual(res.totalDendaPkb, 0);
  assert.strictEqual(res.totalDendaSwdkllj, 0);
  const cetakSkp = res.items.find((i) => i.id === "cetak-skp")?.amount;
  assert.strictEqual(cetakSkp, 0, "Cetak SKP must be Rp 0 when zero overdue");
});

test("5. Remaining days after full months bumps month duration by +1", () => {
  // 1 year and 1 day overdue -> 1 year 1 month
  const dur = calculateOverdueDuration("2025-01-01", "2026-01-02");
  assert.strictEqual(dur.years, 1);
  assert.strictEqual(dur.months, 1);
  assert.strictEqual(dur.formatted, "1 Tahun 1 Bulan");
});

test("6. Future due date is handled safely with zero delay and no negative numbers", () => {
  const res = calculateEstimation({
    pkbDasar: 2500000,
    tanggalJatuhTempo: "2027-05-10",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  });
  assert.strictEqual(res.tahunTunggakan, 0);
  assert.strictEqual(res.bulanTunggakan, 0);
  assert.strictEqual(res.totalDendaPkb, 0);
  assert.strictEqual(res.totalDendaSwdkllj, 0);
  assert.ok(res.totalEstimasi > 0, "Total estimasi must remain positive (basic tax + service fee)");
});

test("7. Program Samsat 'FREE Biaya Denda' zeroes out PKB penalties only", () => {
  const res = calculateEstimation({
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "FREE Biaya Denda",
  });

  const dendaPkbTertunggak = res.items.find((i) => i.id === "denda-pkb-tertunggak")?.amount;
  const dendaPkbPajakBaru = res.items.find((i) => i.id === "denda-pkb-pajak-baru")?.amount;
  assert.strictEqual(dendaPkbTertunggak, 0, "Denda PKB Tertunggak must be 0 in FREE Biaya Denda");
  assert.strictEqual(dendaPkbPajakBaru, 0, "Denda PKB Pajak Baru must be 0 in FREE Biaya Denda");
  assert.strictEqual(res.totalDendaPkb, 0, "Total Denda PKB must be 0 in FREE Biaya Denda");

  // SWDKLLJ penalties must NOT be zeroed out
  assert.strictEqual(res.totalDendaSwdkllj, 300000, "SWDKLLJ penalties must remain active under FREE Biaya Denda");
});

test("8. SWDKLLJ and SWDKLLJ penalty values for R4 are accurate", () => {
  const res = calculateEstimation({
    pkbDasar: 1000000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  });
  const swdPokok = res.items.find((i) => i.id === "swdkllj-pajak-baru")?.amount;
  assert.strictEqual(swdPokok, 143000, "SWDKLLJ Pokok for R4 must be Rp 143.000");

  const dendaSwdTertunggak = res.items.find((i) => i.id === "denda-swdkllj-tertunggak")?.amount;
  assert.strictEqual(dendaSwdTertunggak, 200000, "Denda SWDKLLJ Tertunggak must be Rp 200.000 (2 × 100k)");

  const dendaSwdPajakBaru = res.items.find((i) => i.id === "denda-swdkllj-pajak-baru")?.amount;
  assert.strictEqual(dendaSwdPajakBaru, 100000, "Denda SWDKLLJ Pajak Baru must be Rp 100.000");
});

test("9. Cetak SKP triggers conditionally on overdue delay", () => {
  // Case A: No delay
  const resNoDelay = calculateEstimation({
    pkbDasar: 1500000,
    tanggalJatuhTempo: "2026-10-17",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  });
  assert.strictEqual(resNoDelay.items.find((i) => i.id === "cetak-skp")?.amount, 0);

  // Case B: With delay (e.g. 5 days overdue -> 1 month)
  const resWithDelay = calculateEstimation({
    pkbDasar: 1500000,
    tanggalJatuhTempo: "2026-10-10",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  });
  assert.strictEqual(resWithDelay.items.find((i) => i.id === "cetak-skp")?.amount, 100000);
});

test("10. Jasa fee is included in total estimation", () => {
  const res = calculateEstimation({
    pkbDasar: 1000000,
    tanggalJatuhTempo: "2026-10-17",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  });
  const jasa = res.items.find((i) => i.id === "jasa")?.amount;
  assert.strictEqual(jasa, 250000, "Jasa must be Rp 250.000");
  assert.ok(res.totalEstimasi >= 250000, "Total estimasi must include Jasa");
});

test("11. Incidental manual items default to 0 and their overrides update the total", () => {
  const baseRes = calculateEstimation({
    pkbDasar: 1000000,
    tanggalJatuhTempo: "2026-10-17",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  });
  const baseTotal = baseRes.totalEstimasi;

  const overrideRes = calculateEstimation({
    pkbDasar: 1000000,
    tanggalJatuhTempo: "2026-10-17",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    manualValues: {
      jr: 50000,
      etle: 250000,
      "pnbp-nopil": 500000,
      "stnk-hilang": 150000,
      "pemekaran-wilayah": 50000,
    },
  });

  const expectedAdded = 50000 + 250000 + 500000 + 150000 + 50000;
  assert.strictEqual(overrideRes.totalEstimasi, baseTotal + expectedAdded);
});

test("12. ACC ID is NEVER added to Total Estimasi", () => {
  const resWithAccId = calculateEstimation({
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "DKI Jakarta",
  });

  assert.strictEqual(resWithAccId.accIdAmount, 750000, "ACC ID for DKI Jakarta Mobil must be Rp 750.000");
  assert.strictEqual(resWithAccId.accIdStatus, "CALCULATED");
  // Total must STILL be exactly 18.363.000!
  assert.strictEqual(resWithAccId.totalEstimasi, 18363000, "Total Estimasi MUST NOT include ACC ID");
});

test("13. Missing optional ACC ID inputs do not block calculation", () => {
  const resNoAccId = calculateEstimation({
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    // No kondisiBerkas, no wilayahAccId
  });

  assert.strictEqual(resNoAccId.accIdAmount, null);
  assert.strictEqual(resNoAccId.accIdStatus, "NOT_AVAILABLE");
  assert.strictEqual(resNoAccId.totalEstimasi, 18363000);
});

test("14. Excel ROUNDUP(..., -3) rounds up positive amounts to nearest 1.000", () => {
  // Test with arbitrary PKB dasar producing fractional roundups
  const res = calculateEstimation({
    pkbDasar: 1234567,
    tanggalJatuhTempo: "2024-05-01",
    tanggalEstimasi: "2025-06-01",
    programSamsat: "NORMAL",
  });
  assert.strictEqual(res.totalEstimasi % 1000, 0, "Total Estimasi must be an exact multiple of 1.000");
});
