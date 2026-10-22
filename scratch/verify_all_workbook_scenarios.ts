import { calculateEstimation } from "../src/domain/estimation/estimationEngine";
import {
  DEFAULT_R4_ANNUAL_TEMPLATE,
  DEFAULT_R2_ANNUAL_TEMPLATE,
  DEFAULT_R4_5YEAR_TEMPLATE,
  DEFAULT_R2_5YEAR_TEMPLATE,
  DEFAULT_R4_BBN_TEMPLATE,
  DEFAULT_R2_BBN_TEMPLATE,
  DEFAULT_R4_MUTASI_AS_TEMPLATE,
  DEFAULT_R2_MUTASI_AS_TEMPLATE,
  DEFAULT_R4_MUTASI_LD_TEMPLATE,
  DEFAULT_R2_MUTASI_LD_TEMPLATE,
} from "../src/domain/estimation/defaultTemplates";

interface VerificationCase {
  id: string;
  name: string;
  sheetRef: string;
  expectedTotal: number;
  run: () => number;
}

const cases: VerificationCase[] = [
  // 1. R4 Tahunan Reference Scenario (Sheet 4)
  {
    id: "r4-annual",
    name: "Perpanjangan Tahunan Mobil (R4)",
    sheetRef: "Sheet 4: PAJAK TAHUNAN  R4 (Official Scenario)",
    expectedTotal: 18363000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 3964000,
        tanggalJatuhTempo: "2023-12-23",
        tanggalEstimasi: "2026-10-17",
        programSamsat: "NORMAL",
        kondisiBerkas: "LENGKAP",
      }, DEFAULT_R4_ANNUAL_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 2. R2 Tahunan Reference Scenario (Sheet 5)
  {
    id: "r2-annual",
    name: "Perpanjangan Tahunan Motor (R2)",
    sheetRef: "Sheet 5: PAJAK TAHUNAN R2 (Official Scenario)",
    expectedTotal: 876000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 51000,
        tanggalJatuhTempo: "2025-09-08",
        tanggalEstimasi: "2026-10-17",
        programSamsat: "NORMAL",
        kondisiBerkas: "TIDAK ADA KTP",
        wilayahAccId: "NON ACC ID",
      }, DEFAULT_R2_ANNUAL_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 3. R4 5 Tahunan On-Time (Sheet 4 with I7="5 tahunan")
  {
    id: "r4-5year-ontime",
    name: "Perpanjangan 5 Tahun Mobil (R4) Tepat Waktu",
    sheetRef: "Sheet 4: PAJAK TAHUNAN  R4 (I7='5 tahunan', On-Time)",
    expectedTotal: 4657000,
    run: () => {
      // PKB: 3.964.000 + SWD: 143.000 + STNK: 200.000 + TNKB: 100.000 + Jasa: 250.000 = 4.657.000
      const res = calculateEstimation({
        pkbDasar: 3964000,
        tanggalJatuhTempo: "2026-09-21",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        kondisiBerkas: "LENGKAP",
      }, DEFAULT_R4_5YEAR_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 4. R4 5 Tahunan Overdue (Sheet 4 with I7="5 tahunan")
  {
    id: "r4-5year-overdue",
    name: "Perpanjangan 5 Tahun Mobil (R4) Terlambat",
    sheetRef: "Sheet 4: PAJAK TAHUNAN  R4 (I7='5 tahunan', Overdue 2 Thn 10 Bln)",
    expectedTotal: 18663000,
    run: () => {
      // R4 Annual (18.363.000) + STNK (200.000) + TNKB (100.000) = 18.663.000
      const res = calculateEstimation({
        pkbDasar: 3964000,
        tanggalJatuhTempo: "2023-12-23",
        tanggalEstimasi: "2026-10-17",
        programSamsat: "NORMAL",
        kondisiBerkas: "LENGKAP",
      }, DEFAULT_R4_5YEAR_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 5. R2 5 Tahunan On-Time (Sheet 5 with I7="5 tahunan")
  {
    id: "r2-5year-ontime",
    name: "Perpanjangan 5 Tahun Motor (R2) Tepat Waktu",
    sheetRef: "Sheet 5: PAJAK TAHUNAN R2 (I7='5 tahunan', On-Time)",
    expectedTotal: 845000,
    run: () => {
      // PKB: 100.000 + SWD: 35.000 + STNK: 100.000 + TNKB: 60.000 + Proses/ACC: 350.000 + Jasa: 200.000 = 845.000
      const res = calculateEstimation({
        pkbDasar: 100000,
        tanggalJatuhTempo: "2026-09-21",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        kondisiBerkas: "TIDAK ADA KTP",
        wilayahAccId: "NON ACC ID",
      }, DEFAULT_R2_5YEAR_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 6. BBN Mobil DKI (Sheet 10)
  {
    id: "bbn-mobil-dki",
    name: "BBN Mobil DKI Jakarta",
    sheetRef: "Sheet 10: BBN JEKARDAH",
    expectedTotal: 12412000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 9041000,
        tanggalJatuhTempo: "2026-09-02",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
        wilayahAsal: "DKI Jakarta",
        wilayahTujuan: "DKI Jakarta",
      }, DEFAULT_R4_BBN_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 7. BBN Mobil Jabar (Sheet 12)
  {
    id: "bbn-mobil-jabar",
    name: "BBN Mobil Jawa Barat",
    sheetRef: "Sheet 12: BBN B Jabar_TRG",
    expectedTotal: 18241000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 2875000,
        tanggalJatuhTempo: "2023-12-06",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
        wilayahAsal: "Bogor",
        wilayahTujuan: "Bogor",
        manualValues: { jasa: 500000 },
      }, DEFAULT_R4_BBN_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 8. BBN Motor Kota Bogor (Sheet 14)
  {
    id: "bbn-motor-bogor",
    name: "BBN Motor Kota Bogor",
    sheetRef: "Sheet 14: BBN Kota Bogor",
    expectedTotal: 2651000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 198000,
        tanggalJatuhTempo: "2025-08-02",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
        wilayahAsal: "Bogor",
        wilayahTujuan: "Bogor",
        manualValues: { "biaya-proses": 1250000 },
      }, DEFAULT_R2_BBN_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 9. BBN Motor Luar Daerah (Sheet 18)
  {
    id: "bbn-motor-ld",
    name: "BBN Motor Luar Daerah",
    sheetRef: "Sheet 18: BBN LD",
    expectedTotal: 4151000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 198000,
        tanggalJatuhTempo: "2025-08-02",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
        wilayahAsal: "Luar Daerah",
        wilayahTujuan: "Bogor",
        manualValues: { "biaya-proses": 2500000, jasa: 750000 },
      }, DEFAULT_R2_BBN_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 10. Mutasi AS Mobil (Sheet 8)
  {
    id: "mutasi-as-mobil",
    name: "Mutasi Antar Samsat Mobil",
    sheetRef: "Sheet 8: Mutasi AS",
    expectedTotal: 3255000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 0,
        tanggalJatuhTempo: "2026-09-10",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
      }, DEFAULT_R4_MUTASI_AS_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 11. Mutasi AS Motor (Sheet 9)
  {
    id: "mutasi-as-motor",
    name: "Mutasi Antar Samsat Motor ke DKI",
    sheetRef: "Sheet 9: Mutasi AS ke DKI",
    expectedTotal: 3323000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 400000,
        tanggalJatuhTempo: "2026-09-14",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
        wilayahAsal: "Bogor",
        wilayahTujuan: "DKI Jakarta",
      }, DEFAULT_R2_MUTASI_AS_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 12. Mutasi LD Motor (Sheet 6)
  {
    id: "mutasi-ld-motor",
    name: "Mutasi Luar Daerah Motor ke DKI",
    sheetRef: "Sheet 6: Mutasi LD F-B ke DKI",
    expectedTotal: 4125000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 201000,
        tanggalJatuhTempo: "2026-07-24",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
        wilayahAsal: "Bogor",
        wilayahTujuan: "DKI Jakarta",
      }, DEFAULT_R2_MUTASI_LD_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 13. Mutasi LD Mobil Jabar-to-Jabar with KIR (Sheet 7)
  {
    id: "mutasi-ld-mobil-jabar",
    name: "Mutasi Luar Daerah Mobil Jabar to Jabar",
    sheetRef: "Sheet 7: Mutasi LD B-F_F-F",
    expectedTotal: 11409000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 2626000,
        tanggalJatuhTempo: "2026-09-21",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
        wilayahAsal: "Bekasi",
        wilayahTujuan: "Bogor",
        manualValues: { kir: 4000000 },
      }, DEFAULT_R4_MUTASI_LD_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 14. Mutasi LD Mobil Jauh Banget non-DKI (Sheet 15)
  {
    id: "mutasi-ld-jauh-banget",
    name: "Mutasi Luar Daerah Jauh Banget non DKI",
    sheetRef: "Sheet 15: Mutasi LD Jauh Banget non DKI",
    expectedTotal: 9814000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 2923000,
        tanggalJatuhTempo: "2026-09-21",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
        wilayahAsal: "Luar Daerah Jauh",
        wilayahTujuan: "Jawa Barat",
        manualValues: {
          "tarik-berkas": 2500000,
          "buka-blokir": 800000,
          "proses-dan-jasa": 1000000,
        },
      }, DEFAULT_R4_MUTASI_LD_TEMPLATE);
      return res.totalEstimasi;
    },
  },

  // 15. Mutasi LD Mobil Jauh Banget ke DKI (Sheet 17)
  {
    id: "mutasi-ld-jb-dki",
    name: "Mutasi Luar Daerah Jauh Banget ke DKI",
    sheetRef: "Sheet 17: Mutasi LDJB ke DKI",
    expectedTotal: 36240000,
    run: () => {
      const res = calculateEstimation({
        pkbDasar: 25611000,
        tanggalJatuhTempo: "2026-09-21",
        tanggalEstimasi: "2026-09-21",
        programSamsat: "NORMAL",
        freeBbn: true,
        wilayahAsal: "Luar Daerah Jauh",
        wilayahTujuan: "Jawa Barat",
        manualValues: {
          "tarik-berkas": 2500000,
          "proses-dan-jasa": 1000000,
        },
      }, DEFAULT_R4_MUTASI_LD_TEMPLATE);
      return res.totalEstimasi;
    },
  },
];

console.log("================================================================================");
console.log("EXTENDED ESTIMATION TEMPLATES — COMPREHENSIVE WORKBOOK VERIFICATION");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

for (const tc of cases) {
  try {
    const actual = tc.run();
    const diff = Math.abs(actual - tc.expectedTotal);
    const isPass = diff === 0;

    if (isPass) {
      passed++;
      console.log(`[PASS] ${tc.name}`);
      console.log(`       Sheet: ${tc.sheetRef}`);
      console.log(`       Result: Rp ${actual.toLocaleString("id-ID")} (Exact Match)\n`);
    } else {
      failed++;
      console.log(`[FAIL] ${tc.name}`);
      console.log(`       Sheet: ${tc.sheetRef}`);
      console.log(`       Expected: Rp ${tc.expectedTotal.toLocaleString("id-ID")}`);
      console.log(`       Actual:   Rp ${actual.toLocaleString("id-ID")}`);
      console.log(`       Diff:     Rp ${diff.toLocaleString("id-ID")}\n`);
    }
  } catch (err: any) {
    failed++;
    console.log(`[ERROR] ${tc.name}: ${err.message}\n`);
  }
}

console.log("================================================================================");
console.log(`SUMMARY: ${passed}/${cases.length} PASSED, ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
