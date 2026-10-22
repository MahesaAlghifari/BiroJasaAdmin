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

const tests = [
  {
    no: 1,
    name: "Perpanjangan Tahunan Mobil (R4)",
    sheet: "Sheet 4: PAJAK TAHUNAN  R4",
    expected: 18363000,
    input: {
      pkbDasar: 3964000,
      tanggalJatuhTempo: "2023-12-23",
      tanggalEstimasi: "2026-10-17",
      programSamsat: "NORMAL" as const,
      kondisiBerkas: "LENGKAP" as const,
    },
    template: DEFAULT_R4_ANNUAL_TEMPLATE,
  },
  {
    no: 2,
    name: "Perpanjangan Tahunan Motor (R2)",
    sheet: "Sheet 5: PAJAK TAHUNAN R2",
    expected: 876000,
    input: {
      pkbDasar: 51000,
      tanggalJatuhTempo: "2025-09-08",
      tanggalEstimasi: "2026-10-17",
      programSamsat: "NORMAL" as const,
      kondisiBerkas: "TIDAK ADA KTP" as const,
      wilayahAccId: "NON ACC ID" as const,
    },
    template: DEFAULT_R2_ANNUAL_TEMPLATE,
  },
  {
    no: 3,
    name: "Perpanjangan 5 Tahun Mobil (R4) Tepat Waktu",
    sheet: "Sheet 4: PAJAK TAHUNAN  R4 (I7='5 tahunan', On-Time)",
    expected: 4657000,
    input: {
      pkbDasar: 3964000,
      tanggalJatuhTempo: "2026-09-21",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      kondisiBerkas: "LENGKAP" as const,
    },
    template: DEFAULT_R4_5YEAR_TEMPLATE,
  },
  {
    no: 4,
    name: "Perpanjangan 5 Tahun Mobil (R4) Terlambat",
    sheet: "Sheet 4: PAJAK TAHUNAN  R4 (I7='5 tahunan', Overdue 2 Thn 10 Bln)",
    expected: 18663000,
    input: {
      pkbDasar: 3964000,
      tanggalJatuhTempo: "2023-12-23",
      tanggalEstimasi: "2026-10-17",
      programSamsat: "NORMAL" as const,
      kondisiBerkas: "LENGKAP" as const,
    },
    template: DEFAULT_R4_5YEAR_TEMPLATE,
  },
  {
    no: 5,
    name: "Perpanjangan 5 Tahun Motor (R2) Tepat Waktu",
    sheet: "Sheet 5: PAJAK TAHUNAN R2 (I7='5 tahunan', On-Time)",
    expected: 845000,
    input: {
      pkbDasar: 100000,
      tanggalJatuhTempo: "2026-09-21",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      kondisiBerkas: "TIDAK ADA KTP" as const,
      wilayahAccId: "NON ACC ID" as const,
    },
    template: DEFAULT_R2_5YEAR_TEMPLATE,
  },
  {
    no: 6,
    name: "BBN Mobil DKI Jakarta",
    sheet: "Sheet 10: BBN JEKARDAH",
    expected: 12412000,
    input: {
      pkbDasar: 9041000,
      tanggalJatuhTempo: "2026-09-02",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "DKI Jakarta",
      wilayahTujuan: "DKI Jakarta",
    },
    template: DEFAULT_R4_BBN_TEMPLATE,
  },
  {
    no: 7,
    name: "BBN Mobil Jawa Barat",
    sheet: "Sheet 12: BBN B Jabar_TRG",
    expected: 18241000,
    input: {
      pkbDasar: 2875000,
      tanggalJatuhTempo: "2023-12-06",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "Bogor",
      wilayahTujuan: "Bogor",
      manualValues: { jasa: 500000 },
    },
    template: DEFAULT_R4_BBN_TEMPLATE,
  },
  {
    no: 8,
    name: "BBN Motor Kota Bogor",
    sheet: "Sheet 14: BBN Kota Bogor",
    expected: 2651000,
    input: {
      pkbDasar: 198000,
      tanggalJatuhTempo: "2025-08-02",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "Bogor",
      wilayahTujuan: "Bogor",
      manualValues: { "biaya-proses": 1250000 },
    },
    template: DEFAULT_R2_BBN_TEMPLATE,
  },
  {
    no: 9,
    name: "BBN Motor Luar Daerah",
    sheet: "Sheet 18: BBN LD",
    expected: 4151000,
    input: {
      pkbDasar: 198000,
      tanggalJatuhTempo: "2025-08-02",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "Luar Daerah",
      wilayahTujuan: "Bogor",
      manualValues: { "biaya-proses": 2500000, jasa: 750000 },
    },
    template: DEFAULT_R2_BBN_TEMPLATE,
  },
  {
    no: 10,
    name: "Mutasi Antar Samsat Mobil",
    sheet: "Sheet 8: Mutasi AS",
    expected: 3255000,
    input: {
      pkbDasar: 0,
      tanggalJatuhTempo: "2026-09-10",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "Jawa Barat",
      wilayahTujuan: "Jawa Barat",
    },
    template: DEFAULT_R4_MUTASI_AS_TEMPLATE,
  },
  {
    no: 11,
    name: "Mutasi Antar Samsat Motor ke DKI",
    sheet: "Sheet 9: Mutasi AS ke DKI",
    expected: 3323000,
    input: {
      pkbDasar: 400000,
      tanggalJatuhTempo: "2026-09-14",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "Bogor",
      wilayahTujuan: "DKI Jakarta",
    },
    template: DEFAULT_R2_MUTASI_AS_TEMPLATE,
  },
  {
    no: 12,
    name: "Mutasi Luar Daerah Motor ke DKI",
    sheet: "Sheet 6: Mutasi LD F-B ke DKI",
    expected: 4125000,
    input: {
      pkbDasar: 201000,
      tanggalJatuhTempo: "2026-07-24",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "Bogor",
      wilayahTujuan: "DKI Jakarta",
    },
    template: DEFAULT_R2_MUTASI_LD_TEMPLATE,
  },
  {
    no: 13,
    name: "Mutasi Luar Daerah Mobil Jabar to Jabar",
    sheet: "Sheet 7: Mutasi LD B-F_F-F",
    expected: 11409000,
    input: {
      pkbDasar: 2626000,
      tanggalJatuhTempo: "2026-09-21",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "Bekasi",
      wilayahTujuan: "Bogor",
      manualValues: { kir: 4000000 },
    },
    template: DEFAULT_R4_MUTASI_LD_TEMPLATE,
  },
  {
    no: 14,
    name: "Mutasi Luar Daerah Mobil Jauh Banget non DKI",
    sheet: "Sheet 15: Mutasi LD Jauh Banget non DKI",
    expected: 9814000,
    input: {
      pkbDasar: 2923000,
      tanggalJatuhTempo: "2026-09-21",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "Luar Daerah Jauh",
      wilayahTujuan: "Jawa Barat",
      manualValues: {
        "tarik-berkas": 2500000,
        "buka-blokir": 800000,
        "proses-dan-jasa": 1000000,
      },
    },
    template: DEFAULT_R4_MUTASI_LD_TEMPLATE,
  },
  {
    no: 15,
    name: "Mutasi Luar Daerah Jauh Banget ke DKI",
    sheet: "Sheet 17: Mutasi LDJB ke DKI",
    expected: 36240000,
    input: {
      pkbDasar: 25611000,
      tanggalJatuhTempo: "2026-09-21",
      tanggalEstimasi: "2026-09-21",
      programSamsat: "NORMAL" as const,
      freeBbn: true,
      wilayahAsal: "Luar Daerah Jauh",
      wilayahTujuan: "Jawa Barat",
      manualValues: {
        "tarik-berkas": 2500000,
        "proses-dan-jasa": 1000000,
      },
    },
    template: DEFAULT_R4_MUTASI_LD_TEMPLATE,
  },
];

for (const t of tests) {
  const res = calculateEstimation(t.input as any, t.template);
  const diff = res.totalEstimasi - t.expected;
  console.log(`=== SCENARIO ${t.no}: ${t.name} ===`);
  console.log(`Sheet: ${t.sheet}`);
  console.log(`Input: PKB=${t.input.pkbDasar}, Tempo=${t.input.tanggalJatuhTempo}, Est=${t.input.tanggalEstimasi}`);
  console.log(`Durasi: ${res.durasiKeterlambatan} (Thn: ${res.tahunTunggakan}, Bln: ${res.bulanTunggakan})`);
  console.log(`Workbook: Rp ${t.expected.toLocaleString("id-ID")}`);
  console.log(`Engine:   Rp ${res.totalEstimasi.toLocaleString("id-ID")}`);
  console.log(`Diff:     Rp ${diff.toLocaleString("id-ID")} [${diff === 0 ? "EXACT MATCH / PASS" : "FAIL"}]`);
  console.log("Rincian Komponen Terhitung:");
  res.items.filter(i => i.amount > 0).forEach(i => {
    console.log(`  - ${i.name} (${i.code}): Rp ${i.amount.toLocaleString("id-ID")}`);
  });
  console.log("");
}
