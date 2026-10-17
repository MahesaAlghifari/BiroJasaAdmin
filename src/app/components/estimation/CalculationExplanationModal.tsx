import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Calculator,
  HelpCircle,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Building,
  Info,
  Car,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Percent,
} from "lucide-react";
import { cn } from "../ui/utils";
import {
  EstimationResult,
  ProgramSamsat,
  KondisiBerkas,
  WilayahAccId,
} from "../../../domain/estimation/types";

export interface ExplanationItem {
  id: string;
  name: string;
  category: "Pokok Pajak" | "Denda Pajak" | "SWDKLLJ" | "Admin & Jasa" | "Insidental" | "Total & Aturan";
  currentAmount: number;
  includesInTotal: boolean;
  shortDesc: string;
  excelFormula: string;
  mathFormula: string;
  calculationSteps: { label: string; formula: string; result: string }[];
  rulesAndNotes: string[];
  vehicleTag?: "R4" | "R2" | "Semua";
}

export interface CalculationExplanationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItemId?: string | null;
  estimationResult?: EstimationResult | null;
  vehicleType?: "Mobil" | "Motor" | "R4" | "R2" | string;
  serviceType?: string;
  pkbDasar?: number;
  tanggalJatuhTempo?: string;
  tanggalEstimasi?: string;
  programSamsat?: ProgramSamsat;
  kondisiBerkas?: KondisiBerkas;
  wilayahAccId?: WilayahAccId;
}

export function CalculationExplanationModal({
  open,
  onOpenChange,
  initialItemId,
  estimationResult,
  vehicleType = "Mobil",
  serviceType = "Perpanjangan 1 Tahun",
  pkbDasar = 0,
  tanggalJatuhTempo = "",
  tanggalEstimasi = "",
  programSamsat = "NORMAL",
  kondisiBerkas = "LENGKAP",
  wilayahAccId = "DKI Jakarta",
}: CalculationExplanationModalProps) {
  const isR2 = vehicleType.toLowerCase().includes("motor") || vehicleType.toUpperCase().includes("R2");
  const isR4 = !isR2;

  const [selectedItemId, setSelectedItemId] = useState<string>("denda-pkb-pajak-baru");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  // When opened with a specific initialItemId, auto-select it
  useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
    } else if (isR2) {
      setSelectedItemId("denda-pkb-pajak-baru");
    } else {
      setSelectedItemId("denda-pkb-pajak-baru");
    }
  }, [initialItemId, open, isR2]);

  // Safe parameters extraction
  const pkb = Number(pkbDasar) || 0;
  const overdueYears = estimationResult?.tahunTunggakan ?? 0;
  const overdueMonths = estimationResult?.bulanTunggakan ?? 0;
  const calendarMonths = estimationResult?.bulanKalender ?? overdueMonths;
  const durasiText = estimationResult?.durasiKeterlambatan || "0 Tahun 0 Bulan";
  const isFreeDenda = programSamsat === "FREE Biaya Denda";

  // Build the list of explanations dynamically with live values
  const explanationItems = useMemo<ExplanationItem[]>(() => {
    const list: ExplanationItem[] = [];

    // Helper to find amount in estimationResult
    const getAmount = (id: string, fallback = 0) => {
      const found = estimationResult?.items?.find((i) => i.id === id);
      return found ? found.amount : fallback;
    };

    // 1. PKB TERTUNGGAK
    const pkbTertunggakAmount = getAmount("pkb-tertunggak", pkb * overdueYears);
    list.push({
      id: "pkb-tertunggak",
      name: "PKB Tertunggak",
      category: "Pokok Pajak",
      currentAmount: pkbTertunggakAmount,
      includesInTotal: true,
      shortDesc: "Pajak pokok kendaraan bermotor untuk tahun-tahun sebelumnya yang belum dibayarkan.",
      excelFormula: "=B15 * G11 (PKB Dasar × Tahun Tunggakan)",
      mathFormula: "PKB Dasar × Tahun Keterlambatan",
      calculationSteps: [
        { label: "PKB Dasar Tahunan", formula: "Dari lembar STNK", result: `Rp ${pkb.toLocaleString("id-ID")}` },
        { label: "Tahun Tunggakan", formula: "Selisih tahun penuh (DATEDIF)", result: `${overdueYears} Tahun` },
        {
          label: "Perhitungan",
          formula: `Rp ${pkb.toLocaleString("id-ID")} × ${overdueYears}`,
          result: `Rp ${pkbTertunggakAmount.toLocaleString("id-ID")}`,
        },
      ],
      rulesAndNotes: [
        "Jika keterlambatan kurang dari 1 tahun penuh (0 tahun), maka PKB Tertunggak bernilai Rp 0.",
        "Setiap 1 tahun penuh keterlambatan menambah 1 kali lipat PKB dasar.",
      ],
    });

    // 2. PAJAK BARU
    const pajakBaruAmount = getAmount("pajak-baru", pkb);
    list.push({
      id: "pajak-baru",
      name: "Pajak Baru",
      category: "Pokok Pajak",
      currentAmount: pajakBaruAmount,
      includesInTotal: true,
      shortDesc: "Pajak pokok kendaraan bermotor untuk masa 1 tahun ke depan yang sedang diperpanjang.",
      excelFormula: "=B16 (Nilai PKB Dasar dari STNK)",
      mathFormula: "PKB Dasar (1 Tahun Berjalan)",
      calculationSteps: [
        { label: "PKB Dasar Tahunan", formula: "Nilai pokok pada STNK / SKPD", result: `Rp ${pkb.toLocaleString("id-ID")}` },
        { label: "Periode Pajak Baru", formula: "1 Tahun ke depan", result: "1 Periode Pajak" },
        { label: "Total Pajak Baru", formula: "1 × PKB Dasar", result: `Rp ${pajakBaruAmount.toLocaleString("id-ID")}` },
      ],
      rulesAndNotes: [
        "Pajak Baru selalu wajib dibayarkan saat melakukan perpanjangan pajak tahunan.",
        "Nilai ini tidak dipengaruhi oleh ada atau tidaknya keterlambatan.",
      ],
    });

    // 3. DENDA PKB TERTUNGGAK
    const dendaPkbTertunggakAmount = getAmount(
      "denda-pkb-tertunggak",
      isFreeDenda ? 0 : Math.ceil((pkb * 0.48 * overdueYears) / 1000) * 1000
    );
    const rawDendaTertunggak = pkb * 0.48 * overdueYears;
    list.push({
      id: "denda-pkb-tertunggak",
      name: "Denda PKB Tertunggak",
      category: "Denda Pajak",
      currentAmount: dendaPkbTertunggakAmount,
      includesInTotal: true,
      shortDesc: "Denda keterlambatan atas pokok PKB tahun-tahun lalu yang menunggak.",
      excelFormula: isFreeDenda
        ? "=0 (Dibebaskan oleh Program FREE Biaya Denda)"
        : "=ROUNDUP(C15 * $I$9 * G11, -3) atau ROUNDUP(PKB * 48% * Tahun, -3)",
      mathFormula: isFreeDenda ? "Rp 0 (Pemutihan)" : "ROUNDUP(PKB Dasar × 48% × Tahun Tunggakan, -3)",
      calculationSteps: isFreeDenda
        ? [
            { label: "Program Samsat Aktif", formula: "FREE Biaya Denda", result: "Denda PKB Dibebaskan (0%)" },
            { label: "Hasil Akhir", formula: "Otomatis Rp 0", result: "Rp 0" },
          ]
        : [
            { label: "PKB Dasar", formula: "Nilai pokok STNK", result: `Rp ${pkb.toLocaleString("id-ID")}` },
            { label: "Tarif Denda Tahunan", formula: "Koefisien Denda Workbook (48%)", result: "48% per tahun" },
            { label: "Tahun Tunggakan", formula: "Tahun penuh terlambat", result: `${overdueYears} Tahun` },
            {
              label: "Hitungan Dasar",
              formula: `Rp ${pkb.toLocaleString("id-ID")} × 48% × ${overdueYears}`,
              result: `Rp ${Math.round(rawDendaTertunggak).toLocaleString("id-ID")}`,
            },
            {
              label: "Pembulatan ROUNDUP(-3)",
              formula: "Dibulatkan ke atas ke kelipatan Rp 1.000 terdekat",
              result: `Rp ${dendaPkbTertunggakAmount.toLocaleString("id-ID")}`,
            },
          ],
      rulesAndNotes: [
        "Jika Program Samsat disetel ke 'FREE Biaya Denda', maka denda ini otomatis menjadi Rp 0.",
        "Workbook resmi menggunakan koefisien 48% per tahun tunggakan penuh.",
        "Hasil selalu dibulatkan ke atas ke kelipatan seribu (ROUNDUP -3), misal Rp 24.480 menjadi Rp 25.000.",
      ],
    });

    // 4. DENDA PKB PAJAK BARU
    const dendaPkbPajakBaruAmount = getAmount(
      "denda-pkb-pajak-baru",
      isFreeDenda ? 0 : Math.ceil(((pkb * 0.48) / 12 * overdueMonths) / 1000) * 1000
    );
    const monthlyRate = (pkb * 0.48) / 12;
    const rawDendaBaru = monthlyRate * overdueMonths;
    list.push({
      id: "denda-pkb-pajak-baru",
      name: "Denda PKB Pajak Baru",
      category: "Denda Pajak",
      currentAmount: dendaPkbPajakBaruAmount,
      includesInTotal: true,
      shortDesc: "Denda keterlambatan untuk bulan berjalan pada masa perpanjangan pajak baru.",
      excelFormula: isR2
        ? '=ROUNDUP(IF(I11="free biaya denda";0;IF(I11="normal";SUM(I14*I6/12*I13);""));-3)'
        : '=ROUNDUP(IF(I11="free biaya denda";0;IF(I11="normal";SUM(I14*I6/12*I12);""));-3)',
      mathFormula: isFreeDenda ? "Rp 0 (Pemutihan)" : "ROUNDUP((PKB Dasar × 48% ÷ 12) × Bulan Denda, -3)",
      calculationSteps: isFreeDenda
        ? [
            { label: "Program Samsat Aktif (I11)", formula: 'I11 = "free biaya denda"', result: "Denda PKB Dibebaskan (Rp 0)" },
            { label: "Hasil Akhir", formula: "Otomatis Rp 0", result: "Rp 0" },
          ]
        : [
            { label: "1. PKB Dasar (I14)", formula: "Pokok pajak STNK (Cell I14)", result: `Rp ${pkb.toLocaleString("id-ID")}` },
            { label: "2. Koefisien Denda Pertahun (I6)", formula: "Cell I6 (0.48 / 48%)", result: "48% per tahun" },
            { label: "3. Denda Per Bulan (I14 × I6 ÷ 12)", formula: `Rp ${pkb.toLocaleString("id-ID")} × 0.48 ÷ 12`, result: `Rp ${monthlyRate.toFixed(2)} / bln` },
            {
              label: isR2 ? "4. Bulan Denda R2 (I13)" : "4. Bulan Keterlambatan (I12)",
              formula: isR2 ? `Bulan kalender (${calendarMonths}) + 5 bulan (Rumus Excel R2 Sel I13)` : `Bulan kalender keterlambatan (Sel I12)`,
              result: `${overdueMonths} Bulan`,
            },
            {
              label: "5. Nilai Sebelum Pembulatan (SUM(I14*I6/12*I13))",
              formula: `Rp ${monthlyRate.toFixed(2)} × ${overdueMonths} Bulan`,
              result: `Rp ${Math.round(rawDendaBaru).toLocaleString("id-ID")}`,
            },
            {
              label: "6. Pembulatan ROUNDUP(-3)",
              formula: "Dibulatkan ke atas ke kelipatan Rp 1.000 terdekat",
              result: `Rp ${dendaPkbPajakBaruAmount.toLocaleString("id-ID")}`,
            },
          ],
      rulesAndNotes: [
        'RUMUS RESMI WORKBOOK EXCEL (Sheet R2 Sel F16): =ROUNDUP(IF(I11="free biaya denda";0;IF(I11="normal";SUM(I14*I6/12*I13);""));-3)',
        'Keterangan Sel:',
        '• I11 = Program Samsat ("free biaya denda" atau "normal")',
        '• I14 = PKB Dasar dari STNK',
        '• I6 = Koefisien Denda (0.48 atau 48%)',
        '• 12 = 12 Bulan dalam setahun',
        '• I13 = Bulan Denda Motor R2 (Bulan Kalender + 5 Bulan)',
        '• ROUNDUP(..., -3) = Pembulatan ke atas ke kelipatan Rp 1.000 terdekat.',
        isR2
          ? "UNTUK MOTOR (R2): Sesuai formula sel I13 sheet Excel 'PAJAK TAHUNAN R2 ', bulan denda dihitung dari sisa bulan kalender ditambah 5 bulan (+5 bulan), sehingga jika telat 2 bulan kalender, bulan dendanya menjadi 7 bulan."
          : "UNTUK MOBIL (R4): Bulan denda dihitung murni dari bulan kalender keterlambatan (1-12 bulan).",
        "Jika Program Samsat disetel ke 'FREE Biaya Denda', maka denda ini otomatis menjadi Rp 0.",
      ],
      vehicleTag: isR2 ? "R2" : "R4",
    });

    // 5. SWDKLLJ TERTUNGGAK
    const swdklljRate = isR2 ? 35000 : 143000;
    const swdklljTertunggakAmount = getAmount("swdkllj-tertunggak", swdklljRate * overdueYears);
    list.push({
      id: "swdkllj-tertunggak",
      name: "SWDKLLJ Tertunggak",
      category: "SWDKLLJ",
      currentAmount: swdklljTertunggakAmount,
      includesInTotal: true,
      shortDesc: "Sumbangan Wajib Dana Kecelakaan Lalu Lintas Jalan (Jasa Raharja) tahun-tahun sebelumnya yang belum dibayarkan.",
      excelFormula: isR2 ? "=35.000 * G11 (Tarif R2)" : "=143.000 * G11 (Tarif R4)",
      mathFormula: `Tarif SWDKLLJ (${isR2 ? "Motor: Rp 35.000" : "Mobil: Rp 143.000"}) × Tahun Tunggakan`,
      calculationSteps: [
        { label: "Tarif Pokok SWDKLLJ", formula: isR2 ? "Tarif Motor Gol C1" : "Tarif Mobil Gol DP", result: `Rp ${swdklljRate.toLocaleString("id-ID")} / tahun` },
        { label: "Tahun Tunggakan", formula: "Tahun keterlambatan", result: `${overdueYears} Tahun` },
        {
          label: "Total SWDKLLJ Tertunggak",
          formula: `Rp ${swdklljRate.toLocaleString("id-ID")} × ${overdueYears}`,
          result: `Rp ${swdklljTertunggakAmount.toLocaleString("id-ID")}`,
        },
      ],
      rulesAndNotes: [
        `Tarif pokok SWDKLLJ ditetapkan oleh Jasa Raharja: Mobil (R4) = Rp 143.000/tahun, Motor (R2) = Rp 35.000/tahun.`,
        "Komponen ini tidak dipengaruhi oleh denda ataupun program pemutihan daerah.",
      ],
    });

    // 6. SWDKLLJ PAJAK BARU
    const swdklljBaruAmount = getAmount("swdkllj-pajak-baru", swdklljRate);
    list.push({
      id: "swdkllj-pajak-baru",
      name: "SWDKLLJ Pajak Baru",
      category: "SWDKLLJ",
      currentAmount: swdklljBaruAmount,
      includesInTotal: true,
      shortDesc: "Sumbangan Wajib Dana Kecelakaan Lalu Lintas Jalan untuk masa 1 tahun ke depan.",
      excelFormula: isR2 ? "=35.000 (Tarif Motor R2)" : "=143.000 (Tarif Mobil R4)",
      mathFormula: `Tarif SWDKLLJ (${isR2 ? "Rp 35.000" : "Rp 143.000"})`,
      calculationSteps: [
        { label: "Tarif Pokok SWDKLLJ", formula: isR2 ? "Motor (R2)" : "Mobil (R4)", result: `Rp ${swdklljRate.toLocaleString("id-ID")}` },
        { label: "Periode Baru", formula: "1 Tahun ke depan", result: "1 Tahun" },
        { label: "Total", formula: `1 × Rp ${swdklljRate.toLocaleString("id-ID")}`, result: `Rp ${swdklljBaruAmount.toLocaleString("id-ID")}` },
      ],
      rulesAndNotes: [
        "Wajib dibayarkan pada setiap perpanjangan STNK tahunan sebagai asuransi perlindungan kecelakaan korban lalu lintas jalan.",
      ],
    });

    // 7. DENDA SWDKLLJ TERTUNGGAK
    const dendaSwdklljRate = isR2 ? 32000 : 100000;
    const dendaSwdklljTertunggakAmount = getAmount("denda-swdkllj-tertunggak", dendaSwdklljRate * overdueYears);
    list.push({
      id: "denda-swdkllj-tertunggak",
      name: "Denda SWDKLLJ Tertunggak",
      category: "SWDKLLJ",
      currentAmount: dendaSwdklljTertunggakAmount,
      includesInTotal: true,
      shortDesc: "Denda keterlambatan pembayaran SWDKLLJ untuk tahun-tahun masa lalu.",
      excelFormula: isR2 ? "=32.000 * G11 (Tarif Denda R2)" : "=100.000 * G11 (Tarif Denda R4)",
      mathFormula: `Tarif Denda SWDKLLJ (${isR2 ? "Rp 32.000" : "Rp 100.000"}) × Tahun Tunggakan`,
      calculationSteps: [
        { label: "Tarif Denda SWDKLLJ", formula: isR2 ? "Motor (Rp 32.000)" : "Mobil (Rp 100.000)", result: `Rp ${dendaSwdklljRate.toLocaleString("id-ID")} / thn` },
        { label: "Tahun Tunggakan", formula: "Tahun keterlambatan", result: `${overdueYears} Tahun` },
        {
          label: "Total Denda SWDKLLJ Tertunggak",
          formula: `Rp ${dendaSwdklljRate.toLocaleString("id-ID")} × ${overdueYears}`,
          result: `Rp ${dendaSwdklljTertunggakAmount.toLocaleString("id-ID")}`,
        },
      ],
      rulesAndNotes: [
        "PERHATIAN: Denda SWDKLLJ TETAP BERLAKU meskipun Program Samsat disetel ke 'FREE Biaya Denda'.",
        "Alasannya: Program pemutihan Samsat daerah hanya menggratiskan Denda PKB (Pajak Daerah), sedangkan SWDKLLJ dikelola oleh PT Jasa Raharja (BUMN Pusat).",
      ],
    });

    // 8. DENDA SWDKLLJ PAJAK BARU
    const isOverdue = overdueYears > 0 || overdueMonths > 0 || (estimationResult?.durasiKeterlambatan && estimationResult.durasiKeterlambatan !== "0 Tahun 0 Bulan");
    const dendaSwdklljBaruAmount = getAmount("denda-swdkllj-pajak-baru", isOverdue ? dendaSwdklljRate : 0);
    list.push({
      id: "denda-swdkllj-pajak-baru",
      name: "Denda SWDKLLJ Pajak Baru",
      category: "SWDKLLJ",
      currentAmount: dendaSwdklljBaruAmount,
      includesInTotal: true,
      shortDesc: "Denda keterlambatan SWDKLLJ untuk periode tahun berjalan.",
      excelFormula: isR2
        ? "=IF(OR(G11>0, I12>0, J12>0), 32000, 0)"
        : "=IF(OR(G11>0, I12>0, J12>0), 100000, 0)",
      mathFormula: isOverdue ? `Tarif Flat (${isR2 ? "Rp 32.000" : "Rp 100.000"})` : "Rp 0 (Tepat Waktu)",
      calculationSteps: [
        { label: "Status Keterlambatan", formula: "Apakah terlambat > 0 hari?", result: isOverdue ? "Terlambat" : "Tepat Waktu (0 Hari)" },
        {
          label: "Denda Dikenakan",
          formula: isOverdue ? `Dikenakan flat tarif denda ${isR2 ? "R2 (Rp 32.000)" : "R4 (Rp 100.000)"}` : "Tidak kena denda",
          result: `Rp ${dendaSwdklljBaruAmount.toLocaleString("id-ID")}`,
        },
      ],
      rulesAndNotes: [
        "Dikenakan flat sebesar Rp 32.000 (Motor) atau Rp 100.000 (Mobil) apabila melewati tanggal jatuh tempo walau hanya 1 hari.",
        "Jika pembayaran dilakukan tepat waktu atau sebelum jatuh tempo, nilainya adalah Rp 0.",
        "Sama seperti denda tertunggak, denda SWDKLLJ ini tidak dihapus oleh pemutihan denda PKB.",
      ],
    });

    // 9. PROSES DAN ACC ID (R2 ONLY)
    if (isR2) {
      const prosesAccAmount = getAmount("proses-dan-acc-id", kondisiBerkas === "LENGKAP" ? 0 : wilayahAccId === "Bogor" ? 200000 : 350000);
      list.push({
        id: "proses-dan-acc-id",
        name: "Proses dan ACC ID",
        category: "Admin & Jasa",
        currentAmount: prosesAccAmount,
        includesInTotal: true,
        shortDesc: "Biaya proses verifikasi dokumen dan penembakan/ACC KTP pemilik terdaftar untuk Motor (R2).",
        excelFormula: "=350000 (Default DKI/Tangerang/Depok/Bekasi) / 200000 (Bogor) [Sheet R2 Sel C27]",
        mathFormula: kondisiBerkas === "LENGKAP" ? "Rp 0 (Berkas Lengkap)" : `Tarif Wilayah ${wilayahAccId}`,
        calculationSteps: [
          { label: "Kelengkapan Berkas", formula: "Input form KTP", result: kondisiBerkas },
          { label: "Wilayah Samsat", formula: "Lookup tarif wilayah", result: wilayahAccId || "Default DKI" },
          {
            label: "Biaya Proses & ACC ID",
            formula: kondisiBerkas === "LENGKAP" ? "Ada KTP = Rp 0" : `Tanpa KTP ${wilayahAccId}`,
            result: `Rp ${prosesAccAmount.toLocaleString("id-ID")}`,
          },
        ],
        rulesAndNotes: [
          "KHUSUS MOTOR (R2): Sesuai Sheet R2 Excel sel C27, biaya Proses & ACC ID MASUK ke dalam Total Tagihan Order (SUM C15:C29).",
          "Jika klien membawa KTP Asli pemilik kendaraan (LENGKAP), biaya ini bernilai Rp 0.",
          "Jika Tanpa KTP: Wilayah DKI, Tangerang, Bekasi, Depok = Rp 350.000; Wilayah Bogor = Rp 200.000.",
        ],
        vehicleTag: "R2",
      });
    }

    // 10. CETAK SKP
    const cetakSkpAmount = getAmount("cetak-skp", isOverdue ? 50000 : 0);
    list.push({
      id: "cetak-skp",
      name: "Cetak SKP (Surat Ketetapan Pajak)",
      category: "Admin & Jasa",
      currentAmount: cetakSkpAmount,
      includesInTotal: true,
      shortDesc: "Biaya pencetakan ulang notice pajak / lembar SKPD di Samsat karena ada keterlambatan.",
      excelFormula: "=IF(OR(G11>0, I12>0, J12>0), 50000, 0) [Sel C28]",
      mathFormula: isOverdue ? "Rp 50.000 (Terlambat)" : "Rp 0 (Tepat Waktu)",
      calculationSteps: [
        { label: "Kondisi Keterlambatan", formula: "Telat hari/bulan/tahun > 0", result: isOverdue ? "Terlambat" : "Tepat Waktu" },
        { label: "Biaya Cetak SKP", formula: isOverdue ? "Tarif resmi cetak SKP Samsat" : "Tidak dicetak ulang", result: `Rp ${cetakSkpAmount.toLocaleString("id-ID")}` },
      ],
      rulesAndNotes: [
        "Jika ada keterlambatan pembayaran pajak (walau 1 hari), Samsat mengenakan biaya cetak SKP sebesar Rp 50.000.",
        "Jika perpanjangan tepat waktu sebelum tanggal jatuh tempo, biaya ini otomatis Rp 0.",
      ],
    });

    // 11. JASA PENGURUSAN BIRO
    const jasaAmount = getAmount("jasa", isR2 ? 200000 : 250000);
    list.push({
      id: "jasa",
      name: "Jasa Pengurusan Biro (SUN89)",
      category: "Admin & Jasa",
      currentAmount: jasaAmount,
      includesInTotal: true,
      shortDesc: "Biaya jasa penanganan berkas dan antrean loket oleh petugas Biro Jasa SUN89.",
      excelFormula: isR2 ? "=200000 (Tarif Standar Motor R2) [Sel C29]" : "=250000 (Tarif Standar Mobil R4) [Sel C29]",
      mathFormula: `Tarif Jasa Layanan (${isR2 ? "Motor: Rp 200.000" : "Mobil: Rp 250.000"})`,
      calculationSteps: [
        { label: "Jenis Kendaraan", formula: isR2 ? "Motor (R2)" : "Mobil (R4)", result: vehicleType },
        { label: "Biaya Jasa", formula: "Sesuai master template layanan", result: `Rp ${jasaAmount.toLocaleString("id-ID")}` },
      ],
      rulesAndNotes: [
        "Tarif jasa default: Rp 200.000 untuk Motor (R2) dan Rp 250.000 untuk Mobil (R4).",
        "Biaya jasa ini sudah mencakup pengurusan antrean, pengecekan berkas, dan pengesahan di Samsat.",
      ],
    });

    // 12. BIAYA ACC ID (R4 ONLY)
    if (isR4) {
      const accIdAmount = estimationResult?.accIdAmount ?? (kondisiBerkas === "LENGKAP" ? 0 : 350000);
      list.push({
        id: "acc-id",
        name: "Biaya ACC ID (Penembakan KTP)",
        category: "Admin & Jasa",
        currentAmount: accIdAmount,
        includesInTotal: false,
        shortDesc: "Biaya referensi penembakan/ACC KTP apabila pengurusan tanpa membawa KTP Asli pemilik.",
        excelFormula: "=Lookup Wilayah (DKI: 350k, Jabar: 400k, dll) [Sheet R4 Sel I5]",
        mathFormula: kondisiBerkas === "LENGKAP" ? "Rp 0 (Ada KTP)" : `Lookup Tarif (${wilayahAccId})`,
        calculationSteps: [
          { label: "Kelengkapan Berkas", formula: "Status KTP", result: kondisiBerkas },
          { label: "Wilayah Samsat", formula: "Pilihan Wilayah ACC ID", result: wilayahAccId || "DKI Jakarta" },
          { label: "Estimasi ACC ID", formula: "Biaya referensi ACC ID", result: `Rp ${accIdAmount.toLocaleString("id-ID")}` },
          { label: "Status Masuk Total", formula: "Aturan Bisnis R4", result: "TIDAK MASUK TOTAL ESTIMASI" },
        ],
        rulesAndNotes: [
          "PENTING UNTUK MOBIL (R4): Sesuai keputusan bisnis dan workbook R4, Biaya ACC ID ditampilkan hanya sebagai REFERENSI DOKUMEN dan TIDAK DIGABUNGKAN ke Total Tagihan Order.",
          "Jika berkas LENGKAP (Ada KTP), biaya ini Rp 0.",
        ],
        vehicleTag: "R4",
      });
    }

    // 13. INSIDENTAL & OVERRIDES
    list.push({
      id: "insidental",
      name: "Biaya Tambahan / Insidental",
      category: "Insidental",
      currentAmount: estimationResult?.totalInsidental ?? 0,
      includesInTotal: true,
      shortDesc: "Biaya insidental opsional (ETLE, REQ NOPOL, STNK Hilang, Pemekaran Wilayah, JR).",
      excelFormula: "=SUM(ETLE, PNBP_NOPIL, STNK_HILANG, PEMEKARAN, JR)",
      mathFormula: "Input Manual oleh Admin / Petugas (Default Rp 0)",
      calculationSteps: [
        { label: "Nilai Awal", formula: "Komponen default", result: "Rp 0" },
        { label: "Nilai Input Saat Ini", formula: "Diisi hanya jika ada kasus khusus", result: `Rp ${(estimationResult?.totalInsidental ?? 0).toLocaleString("id-ID")}` },
      ],
      rulesAndNotes: [
        "ETLE: Tilang elektronik yang harus dilunasi sebelum STNK bisa disahkan.",
        "REQ NOPOL / PNBP Nopil: Biaya resmi penerbitan nomor polisi khusus/pilihan.",
        "STNK Hilang: Biaya proses administrasi laporan polisi dan surat keterangan hilang.",
        "Pemekaran Wilayah: Biaya mutasi administrasi perpindahan kode wilayah Samsat.",
        "JR: Jasa Raharja insidental jika ada penyesuaian khusus.",
      ],
    });

    // 14. TOTAL ESTIMASI & PEMBULATAN
    const totalRaw = estimationResult?.items
      ? estimationResult.items.filter((i) => i.includesInTotal).reduce((sum, i) => sum + i.amount, 0)
      : 0;
    const totalEstimasi = estimationResult?.totalEstimasi ?? Math.ceil(totalRaw / 1000) * 1000;

    list.push({
      id: "total-estimasi",
      name: "Total Tagihan Estimasi (ROUNDUP)",
      category: "Total & Aturan",
      currentAmount: totalEstimasi,
      includesInTotal: true,
      shortDesc: "Grand total seluruh komponen biaya yang diikutsertakan dengan pembulatan ke atas ke kelipatan Rp 1.000.",
      excelFormula: "=ROUNDUP(SUM(Komponen), -3) [Sheet Excel Sel C30]",
      mathFormula: "ROUNDUP(Total Komponen Masuk Total, -3)",
      calculationSteps: [
        { label: "Jumlah Seluruh Komponen", formula: "Penjumlahan item bertanda (Ikut Total)", result: `Rp ${totalRaw.toLocaleString("id-ID")}` },
        { label: "Formula Pembulatan", formula: "Excel ROUNDUP(..., -3) ke atas kelipatan 1.000", result: "Membulatkan ke Rp 1.000 terdekat" },
        { label: "Total Akhir Tagihan", formula: `ROUNDUP(${totalRaw}, -3)`, result: `Rp ${totalEstimasi.toLocaleString("id-ID")}` },
      ],
      rulesAndNotes: [
        "Seluruh komponen yang diikutsertakan dijumlahkan secara presisi.",
        "Untuk kepraktisan pembayaran di loket dan perbankan, angka akhir dibulatkan ke atas ke kelipatan seribu terdekat (contoh: Rp 875.280 dibulatkan menjadi Rp 876.000).",
        "Angka Total Estimasi ini sinkron 100% antara Ringkasan Order dan Faktur/Invoice Tagihan.",
      ],
    });

    return list;
  }, [
    pkb,
    overdueYears,
    overdueMonths,
    calendarMonths,
    durasiText,
    isFreeDenda,
    isR2,
    isR4,
    estimationResult,
    vehicleType,
    kondisiBerkas,
    wilayahAccId,
  ]);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return explanationItems.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        selectedCategory === "Semua" || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [explanationItems, searchQuery, selectedCategory]);

  // Current active item
  const activeItem = useMemo(() => {
    return (
      explanationItems.find((i) => i.id === selectedItemId) ||
      explanationItems[0]
    );
  }, [explanationItems, selectedItemId]);

  const categories = [
    "Semua",
    "Pokok Pajak",
    "Denda Pajak",
    "SWDKLLJ",
    "Admin & Jasa",
    "Insidental",
    "Total & Aturan",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-background border-border">
        {/* HEADER */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card/60 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  Detail Rumus & Penjelasan Perhitungan Pajak
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] font-mono",
                      isR2
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    )}
                  >
                    {isR2 ? "Motor (R2)" : "Mobil (R4)"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Panduan transparan cara hitung angka estimasi sesuai Workbook resmi Samsat (DATEDIF & ROUNDUP)
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground text-[11px]">Program:</span>
              <Badge
                variant={isFreeDenda ? "default" : "secondary"}
                className={cn(
                  "text-[10px] font-medium",
                  isFreeDenda
                    ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                    : "bg-muted text-foreground"
                )}
              >
                {programSamsat}
              </Badge>
            </div>
          </div>

          {/* PARAMETER SNAPSHOT RIBBON */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">PKB Dasar (STNK)</span>
              <strong className="font-mono text-foreground text-xs">
                Rp {pkb.toLocaleString("id-ID")}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Durasi Terlambat</span>
              <span className="font-mono text-primary font-semibold text-xs flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" />
                {durasiText}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">
                {isR2 ? "Bulan Denda R2 (I13)" : "Bulan Keterlambatan"}
              </span>
              <span className="font-mono text-foreground font-semibold text-xs">
                {overdueMonths} Bulan {isR2 && <span className="text-[10px] text-emerald-600 font-normal">(+5 Bln)</span>}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Total Estimasi</span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                Rp {(estimationResult?.totalEstimasi ?? 0).toLocaleString("id-ID")}
              </strong>
            </div>
          </div>
        </DialogHeader>

        {/* BODY (TWO COLUMNS ON DESKTOP) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* LEFT SIDEBAR: ITEM SELECTOR */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border flex flex-col shrink-0 bg-card/30">
            {/* Search & Filter */}
            <div className="p-3 border-b border-border/60 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari item (misal: Denda)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded-full whitespace-nowrap transition-colors",
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredItems.map((item) => {
                const isSelected = item.id === selectedItemId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs group",
                      isSelected
                        ? "bg-primary/10 border-primary/40 text-foreground font-semibold shadow-xs"
                        : "bg-background/40 hover:bg-muted/50 border-transparent text-muted-foreground"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{item.name}</span>
                        {item.vehicleTag && (
                          <span
                            className={cn(
                              "text-[9px] px-1 rounded font-mono font-normal shrink-0",
                              item.vehicleTag === "R2"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-blue-500/10 text-blue-600"
                            )}
                          >
                            {item.vehicleTag}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                        {item.category}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "font-mono tabular-nums text-xs font-semibold block",
                          isSelected ? "text-primary" : "text-foreground"
                        )}
                      >
                        Rp {item.currentAmount.toLocaleString("id-ID")}
                      </span>
                      {!item.includesInTotal && (
                        <span className="text-[9px] text-amber-600 block">Luar Total</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Tidak ditemukan item yang cocok dengan "{searchQuery}".
                </div>
              )}
            </div>
          </div>

          {/* RIGHT MAIN PANEL: ACTIVE ITEM DETAIL */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background">
            {activeItem ? (
              <div className="space-y-4 max-w-2xl">
                {/* Title & Amount Card */}
                <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                        {activeItem.category}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">
                        {activeItem.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">
                        Nilai Saat Ini di Order
                      </span>
                      <span className="font-mono text-lg sm:text-xl font-bold text-primary">
                        Rp {activeItem.currentAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border/50">
                    {activeItem.shortDesc}
                  </p>
                </div>

                {/* Formula Section */}
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Rumus & Aturan Resmi Excel
                  </div>

                  <div className="p-2.5 rounded-md bg-background/80 border border-border/60 font-mono text-xs text-primary font-bold">
                    {activeItem.excelFormula}
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Format logika: <code className="text-foreground">{activeItem.mathFormula}</code>
                  </p>
                </div>

                {/* Step-by-Step Live Calculation Substitution */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-primary" />
                      Langkah Perhitungan dengan Data Saat Ini
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Substitusi Angka Riil
                    </span>
                  </div>

                  <div className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden bg-background">
                    {activeItem.calculationSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div>
                          <span className="font-medium text-foreground block">
                            {idx + 1}. {step.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {step.formula}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-foreground text-xs sm:text-right shrink-0">
                          {step.result}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes & Special Rules */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2 text-xs">
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    Catatan Penting & Penjelasan Bisnis
                  </h4>
                  <ul className="space-y-1.5 pl-4 list-disc text-[11px] text-muted-foreground leading-relaxed">
                    {activeItem.rulesAndNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-border bg-card/60 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Formula diverifikasi langsung dengan Workbook Otoritatif Samsat SUN89</span>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs px-4"
          >
            Tutup Penjelasan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
