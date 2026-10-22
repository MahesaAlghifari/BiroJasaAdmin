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
  Clock,
  Search,
  CheckCircle2,
} from "lucide-react";
import { cn } from "../ui/utils";
import {
  EstimationResult,
  EstimationTemplateConfig,
  ProgramSamsat,
  KondisiBerkas,
  WilayahAccId,
} from "../../../domain/estimation/types";
import { estimationStore } from "../../data/estimationStore";

export interface ExplanationItem {
  id: string;
  name: string;
  category: "Pokok Pajak" | "Denda Pajak" | "SWDKLLJ" | "Admin & Jasa" | "Insidental" | "Total & Aturan";
  currentAmount: number;
  includesInTotal: boolean;
  shortDesc: string;
  humanFormula: string;
  formulaCondition?: string;
  roundingRule?: string;
  vehicleTag?: "R4" | "R2" | "Semua";
}

export interface CalculationExplanationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItemId?: string | null;
  estimationResult?: EstimationResult | null;
  template?: EstimationTemplateConfig | null;
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
  template,
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
  const isTahunanOr5Tahunan = serviceType.toLowerCase().includes("tahun") || serviceType.toLowerCase().includes("tahunan");
  const isBbn = serviceType.toLowerCase().includes("balik") || serviceType.toLowerCase().includes("bbn");
  const isMutasi = serviceType.toLowerCase().includes("mutasi");
  const isMutasiLuar = serviceType.toLowerCase().includes("luar") || serviceType.toLowerCase().includes("ld");

  const [selectedItemId, setSelectedItemId] = useState<string>("denda-pkb-pajak-baru");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  // Dynamic template resolution
  const activeTemplate = useMemo(() => {
    if (template) return template;
    let tid = "template-pajak-tahunan-r4";
    if (isR2 && serviceType.includes("1 Tahun")) tid = "template-pajak-tahunan-r2";
    else if (!isR2 && serviceType.includes("1 Tahun")) tid = "template-pajak-tahunan-r4";
    else if (isR2 && serviceType.includes("5 Tahun")) tid = "template-pajak-5-tahunan-r2";
    else if (!isR2 && serviceType.includes("5 Tahun")) tid = "template-pajak-5-tahunan-r4";
    else if (isR2 && (serviceType.includes("Balik") || serviceType.includes("BBN"))) tid = "template-bbn-r2";
    else if (!isR2 && (serviceType.includes("Balik") || serviceType.includes("BBN"))) tid = "template-bbn-r4";
    else if (isR2 && serviceType.includes("Antar Samsat")) tid = "template-mutasi-antar-samsat-r2";
    else if (!isR2 && serviceType.includes("Antar Samsat")) tid = "template-mutasi-antar-samsat-r4";
    else if (isR2 && serviceType.includes("Luar")) tid = "template-mutasi-luar-daerah-r2";
    else if (!isR2 && serviceType.includes("Luar")) tid = "template-mutasi-luar-daerah-r4";
    return estimationStore.getTemplate(tid);
  }, [template, isR2, serviceType]);

  const koefDenda = activeTemplate?.koefisienDenda ?? 0.48;
  const koefPct = `${Math.round(koefDenda * 100)}%`;
  const pembagiBulan = activeTemplate?.pembagiBulan ?? 12;
  const pembulatan = activeTemplate?.kelipatanPembulatan ?? 1000;
  const roundingText = `Hasil dibulatkan ke atas ke kelipatan Rp ${pembulatan.toLocaleString("id-ID")} terdekat.`;

  // Safe parameters extraction
  const pkb = Number(pkbDasar) || 0;
  const overdueYears = estimationResult?.tahunTunggakan ?? 0;
  const overdueMonths = estimationResult?.bulanTunggakan ?? 0;
  const calendarMonths = estimationResult?.bulanKalender ?? overdueMonths;
  const durasiText = estimationResult?.durasiKeterlambatan || "0 Tahun 0 Bulan";
  const isFreeDenda = programSamsat === "FREE Biaya Denda";
  const totalEstimasi = estimationResult?.totalEstimasi ?? 0;

  // Build the list of explanations dynamically with live values
  const explanationItems = useMemo<ExplanationItem[]>(() => {
    const list: ExplanationItem[] = [];

    const swdklljRate = activeTemplate?.swdklljPokok ?? (isR2 ? 35000 : 143000);
    const dendaSwdklljRate = activeTemplate?.dendaSwdklljPokok ?? (isR2 ? 32000 : 100000);

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
      shortDesc: "Pajak pokok kendaraan bermotor untuk masa pajak tahun-tahun sebelumnya yang belum dibayarkan.",
      humanFormula: "PKB Tertunggak = PKB Dasar × Jumlah Tahun Menunggak",
      formulaCondition: overdueYears === 0 ? "Keterlambatan kurang dari 1 tahun penuh, sehingga bernilai Rp 0." : undefined,
    });

    // 2. PAJAK BARU / PKB POKOK
    const pajakBaruAmount = getAmount("pajak-baru", pkb);
    const isPajakBaruPenuh = !isBbn && !isMutasi;
    const isJabarPkb = (isBbn || isMutasi) && Math.abs(pajakBaruAmount - Math.round(pkb * 0.6 * 1.2)) <= 1000;

    list.push({
      id: "pajak-baru",
      name: isBbn || isMutasi ? "PKB Pokok" : "Pajak Baru",
      category: "Pokok Pajak",
      currentAmount: pajakBaruAmount,
      includesInTotal: true,
      shortDesc: isBbn || isMutasi
        ? "Pajak pokok kendaraan bermotor untuk masa 1 tahun ke depan di Samsat tujuan."
        : "Pajak pokok kendaraan bermotor untuk masa 1 tahun ke depan.",
      humanFormula: isPajakBaruPenuh
        ? "Pajak Baru = PKB Dasar (1 Tahun Berjalan)"
        : isJabarPkb
        ? "PKB Pokok = PKB Dasar × 60% × 1.2"
        : "PKB Pokok = PKB Dasar (100% DKI Jakarta)",
    });

    // 3. OPSEN PKB (BBN & MUTASI JABAR)
    const opsenAmount = getAmount("opsen-pkb", 0);
    if (isBbn || isMutasi || opsenAmount > 0) {
      list.push({
        id: "opsen-pkb",
        name: "Opsen PKB",
        category: "Pokok Pajak",
        currentAmount: opsenAmount,
        includesInTotal: true,
        shortDesc: "Pungutan tambahan PKB yang dialokasikan langsung untuk kas daerah kabupaten/kota.",
        humanFormula: opsenAmount > 0
          ? "Opsen PKB = PKB Dasar × 40% × 1.2"
          : "Opsen PKB = Rp 0",
        formulaCondition: opsenAmount > 0
          ? "Diterapkan untuk pendaftaran wilayah Jawa Barat sesuai ketentuan UU HKPD."
          : "Wilayah DKI Jakarta tidak mengenakan opsen kabupaten/kota.",
      });
    }

    // 4. DENDA PKB TERTUNGGAK
    const dendaPkbTertunggakAmount = getAmount(
      "denda-pkb-tertunggak",
      isFreeDenda ? 0 : Math.ceil((pkb * koefDenda * overdueYears) / pembulatan) * pembulatan
    );
    list.push({
      id: "denda-pkb-tertunggak",
      name: "Denda PKB Tertunggak",
      category: "Denda Pajak",
      currentAmount: dendaPkbTertunggakAmount,
      includesInTotal: true,
      shortDesc: "Denda keterlambatan atas pokok PKB tahun-tahun sebelumnya yang menunggak.",
      humanFormula: isFreeDenda
        ? "Denda = Rp 0 (Program Bebas Denda Aktif)"
        : `Denda = PKB Dasar × ${koefPct} × Jumlah Tahun Menunggak`,
      formulaCondition: isFreeDenda ? "Denda menjadi Rp 0 karena program FREE Biaya Denda aktif." : undefined,
      roundingRule: isFreeDenda ? undefined : roundingText,
    });

    // 5. DENDA PKB PAJAK BARU / BERJALAN
    const dendaPkbPajakBaruAmount = getAmount("denda-pkb-pajak-baru") || getAmount("denda-pkb") || (
      isFreeDenda ? 0 : Math.ceil(((pkb * koefDenda) / pembagiBulan * overdueMonths) / pembulatan) * pembulatan
    );

    const humanFormulaDenda = isFreeDenda
      ? "Denda = Rp 0 (Program Bebas Denda Aktif)"
      : isR4
      ? `Denda = PKB Dasar × ${koefPct} ÷ ${pembagiBulan} × Jumlah Bulan Keterlambatan`
      : isTahunanOr5Tahunan
      ? `Denda = PKB Dasar × ${koefPct} ÷ ${pembagiBulan} × (Jumlah Bulan Kalender + 5 Bulan Penyesuaian)`
      : `Denda = PKB Dasar × ${koefPct} ÷ ${pembagiBulan} × Jumlah Bulan Keterlambatan`;

    list.push({
      id: "denda-pkb-pajak-baru",
      name: isBbn || isMutasi ? "Denda PKB" : "Denda PKB Pajak Baru",
      category: "Denda Pajak",
      currentAmount: dendaPkbPajakBaruAmount,
      includesInTotal: true,
      shortDesc: "Denda keterlambatan pembayaran pajak untuk periode tahun berjalan.",
      humanFormula: humanFormulaDenda,
      formulaCondition: isFreeDenda ? "Denda menjadi Rp 0 karena program FREE Biaya Denda aktif." : undefined,
      roundingRule: isFreeDenda ? undefined : roundingText,
      vehicleTag: isR2 ? "R2" : "R4",
    });

    // 6. SWDKLLJ TERTUNGGAK
    const swdklljTertunggakAmount = getAmount("swdkllj-tertunggak", swdklljRate * overdueYears);
    list.push({
      id: "swdkllj-tertunggak",
      name: "SWDKLLJ Tertunggak",
      category: "SWDKLLJ",
      currentAmount: swdklljTertunggakAmount,
      includesInTotal: true,
      shortDesc: "Sumbangan Wajib Dana Kecelakaan Lalu Lintas Jalan (Jasa Raharja) tahun-tahun sebelumnya yang belum dibayarkan.",
      humanFormula: `SWDKLLJ Tertunggak = Tarif Pokok (Rp ${swdklljRate.toLocaleString("id-ID")}) × Jumlah Tahun Menunggak`,
    });

    // 7. SWDKLLJ PAJAK BARU / MASUK
    const swdklljBaruRate = (isBbn || isMutasi)
      ? (isR2 ? 97000 : 205000)
      : swdklljRate;
    const swdklljBaruAmount = getAmount("swdkllj-pajak-baru") || getAmount("swdkllj") || swdklljBaruRate;

    list.push({
      id: "swdkllj-pajak-baru",
      name: isBbn || isMutasi ? "SWDKLLJ Pendaftaran Baru" : "SWDKLLJ Pajak Baru",
      category: "SWDKLLJ",
      currentAmount: swdklljBaruAmount,
      includesInTotal: true,
      shortDesc: isBbn || isMutasi
        ? "Sumbangan Wajib Dana Kecelakaan Lalu Lintas Jalan pendaftaran baru di Samsat tujuan."
        : "Sumbangan Wajib Dana Kecelakaan Lalu Lintas Jalan untuk masa 1 tahun ke depan.",
      humanFormula: `Biaya tetap: Rp ${swdklljBaruAmount.toLocaleString("id-ID")}`,
    });

    // 8. DENDA SWDKLLJ TERTUNGGAK
    const dendaSwdklljTertunggakAmount = getAmount("denda-swdkllj-tertunggak", dendaSwdklljRate * overdueYears);
    list.push({
      id: "denda-swdkllj-tertunggak",
      name: "Denda SWDKLLJ Tertunggak",
      category: "SWDKLLJ",
      currentAmount: dendaSwdklljTertunggakAmount,
      includesInTotal: true,
      shortDesc: "Denda keterlambatan pembayaran SWDKLLJ untuk tahun-tahun masa lalu.",
      humanFormula: isR2
        ? "Denda SWDKLLJ = Tarif Denda (Rp 32.000) × Jumlah Tahun Menunggak"
        : "Denda SWDKLLJ = Tarif Denda (Rp 100.000) × Jumlah Tahun Menunggak",
      formulaCondition: "Denda SWDKLLJ tetap berlaku dan tidak dihapus oleh program pemutihan denda pajak daerah.",
    });

    // 9. DENDA SWDKLLJ PAJAK BARU
    const isOverdue = overdueYears > 0 || overdueMonths > 0 || (estimationResult?.durasiKeterlambatan && estimationResult.durasiKeterlambatan !== "0 Tahun 0 Bulan");
    const dendaSwdklljBaruAmount = getAmount("denda-swdkllj-pajak-baru") || getAmount("denda-swdkllj") || (isOverdue ? dendaSwdklljRate : 0);
    list.push({
      id: "denda-swdkllj-pajak-baru",
      name: "Denda SWDKLLJ Pajak Baru",
      category: "SWDKLLJ",
      currentAmount: dendaSwdklljBaruAmount,
      includesInTotal: true,
      shortDesc: "Denda keterlambatan SWDKLLJ untuk periode tahun berjalan.",
      humanFormula: isOverdue
        ? (isR2 ? "Biaya tetap: Rp 32.000 (Denda Keterlambatan Flat)" : "Biaya tetap: Rp 100.000 (Denda Keterlambatan Flat)")
        : "Biaya: Rp 0 (Tepat Waktu / Sebelum Jatuh Tempo)",
      formulaCondition: isOverdue
        ? "Dikenakan karena masa berlaku telah melewati tanggal jatuh tempo."
        : "Pembayaran dilakukan tepat waktu sebelum jatuh tempo.",
    });

    // 10. PROSES DAN ACC ID (R2 ONLY)
    if (isR2 && (isTahunanOr5Tahunan || getAmount("proses-dan-acc-id") > 0)) {
      const prosesAccAmount = getAmount("proses-dan-acc-id", kondisiBerkas === "LENGKAP" ? 0 : wilayahAccId === "Bogor" ? 200000 : 350000);
      list.push({
        id: "proses-dan-acc-id",
        name: "Proses dan ACC ID",
        category: "Admin & Jasa",
        currentAmount: prosesAccAmount,
        includesInTotal: true,
        shortDesc: "Biaya proses verifikasi dokumen dan pengurusan ACC ID identitas pemilik untuk Motor (R2).",
        humanFormula: kondisiBerkas === "LENGKAP"
          ? "Biaya: Rp 0 (Berkas Ada KTP)"
          : `Biaya tetap: Rp ${prosesAccAmount.toLocaleString("id-ID")}`,
        formulaCondition: kondisiBerkas === "LENGKAP"
          ? "Tidak dikenakan biaya karena melampirkan KTP Asli pemilik."
          : "Biaya masuk ke total tagihan sesuai ketentuan pengurusan tanpa KTP.",
        vehicleTag: "R2",
      });
    }

    // 11. BIAYA ACC ID (R4 ONLY)
    if (isR4 && (isTahunanOr5Tahunan || estimationResult?.accIdAmount !== undefined)) {
      const accIdAmount = estimationResult?.accIdAmount ?? (kondisiBerkas === "LENGKAP" ? 0 : 350000);
      list.push({
        id: "acc-id",
        name: "Biaya ACC ID",
        category: "Admin & Jasa",
        currentAmount: accIdAmount,
        includesInTotal: false,
        shortDesc: "Biaya referensi penembakan/ACC KTP untuk Mobil (R4) apabila tanpa KTP Asli pemilik.",
        humanFormula: kondisiBerkas === "LENGKAP"
          ? "Biaya: Rp 0 (Berkas Ada KTP)"
          : `Biaya referensi: Rp ${accIdAmount.toLocaleString("id-ID")}`,
        formulaCondition: "Khusus Mobil (R4), biaya ini hanya sebagai referensi dokumen dan tidak masuk ke total tagihan.",
        vehicleTag: "R4",
      });
    }

    // 12. CETAK SKP
    const cetakSkpAmount = getAmount("cetak-skp", isOverdue ? (isR2 ? 50000 : 100000) : 0);
    list.push({
      id: "cetak-skp",
      name: "Cetak SKP",
      category: "Admin & Jasa",
      currentAmount: cetakSkpAmount,
      includesInTotal: true,
      shortDesc: "Biaya pencetakan ulang surat penetapan pajak di Samsat apabila terjadi keterlambatan.",
      humanFormula: cetakSkpAmount > 0
        ? `Biaya tetap: Rp ${cetakSkpAmount.toLocaleString("id-ID")}`
        : "Biaya: Rp 0 (Tepat Waktu / Sebelum Jatuh Tempo)",
      formulaCondition: cetakSkpAmount > 0
        ? "Dikenakan oleh pihak Samsat karena ada keterlambatan pembayaran."
        : "Tidak dikenakan jika perpanjangan tepat waktu.",
    });

    // 13. ADMIN STNK (5 TAHUNAN, BBN, MUTASI)
    const adminStnkAmount = getAmount("admin-stnk", isR2 ? 100000 : 200000);
    if (!isTahunanOr5Tahunan || serviceType.includes("5") || adminStnkAmount > 0) {
      list.push({
        id: "admin-stnk",
        name: "Administrasi STNK",
        category: "Admin & Jasa",
        currentAmount: adminStnkAmount,
        includesInTotal: true,
        shortDesc: "Biaya resmi penerbitan STNK baru (PNBP sesuai PP No. 76 Tahun 2020).",
        humanFormula: `Biaya tetap: Rp ${adminStnkAmount.toLocaleString("id-ID")}`,
      });
    }

    // 14. ADMIN TNKB / PLAT NOMOR
    const adminTnkbAmount = getAmount("admin-tnkb", isR2 ? 60000 : 100000);
    if (!isTahunanOr5Tahunan || serviceType.includes("5") || adminTnkbAmount > 0) {
      list.push({
        id: "admin-tnkb",
        name: "Administrasi TNKB",
        category: "Admin & Jasa",
        currentAmount: adminTnkbAmount,
        includesInTotal: true,
        shortDesc: "Biaya resmi pencetakan sepasang plat nomor baru (PNBP sesuai PP No. 76 Tahun 2020).",
        humanFormula: `Biaya tetap: Rp ${adminTnkbAmount.toLocaleString("id-ID")}`,
      });
    }

    // 15. TARIK BERKAS (MUTASI)
    const tarikBerkasAmount = getAmount("tarik-berkas", isMutasiLuar ? 1500000 : 1000000);
    if (isMutasi || tarikBerkasAmount > 0) {
      list.push({
        id: "tarik-berkas",
        name: "Tarik Berkas",
        category: "Admin & Jasa",
        currentAmount: tarikBerkasAmount,
        includesInTotal: true,
        shortDesc: "Biaya penarikan berkas arsip kendaraan dari Samsat asal (Mutasi Keluar).",
        humanFormula: `Biaya tetap: Rp ${tarikBerkasAmount.toLocaleString("id-ID")}`,
      });
    }

    // 16. MUTASI MASUK BPKB
    const mutasiBpkbAmount = getAmount("mutasi-masuk-bpkb", isMutasiLuar ? 1500000 : 1000000);
    if (isMutasi || mutasiBpkbAmount > 0) {
      list.push({
        id: "mutasi-masuk-bpkb",
        name: "Mutasi Masuk BPKB",
        category: "Admin & Jasa",
        currentAmount: mutasiBpkbAmount,
        includesInTotal: true,
        shortDesc: "Biaya pendaftaran arsip mutasi masuk dan penerbitan buku BPKB baru di Samsat/Polda tujuan.",
        humanFormula: `Biaya tetap: Rp ${mutasiBpkbAmount.toLocaleString("id-ID")}`,
      });
    }

    // 17. BIAYA PROSES BBN
    const biayaProsesBbnAmount = getAmount("biaya-proses", 1000000);
    if (isBbn || biayaProsesBbnAmount > 0) {
      list.push({
        id: "biaya-proses",
        name: "Biaya Proses (Cek Fisik, Daftar & BPKB)",
        category: "Admin & Jasa",
        currentAmount: biayaProsesBbnAmount,
        includesInTotal: true,
        shortDesc: "Biaya cek fisik resmi Polda, pendaftaran loket, dan penerbitan BPKB baru atas nama pemilik baru.",
        humanFormula: `Biaya tetap: Rp ${biayaProsesBbnAmount.toLocaleString("id-ID")}`,
      });
    }

    // 18. JASA PENGURUSAN BIRO
    const jasaAmount = getAmount("jasa", isR2 ? 200000 : 250000);
    list.push({
      id: "jasa",
      name: "Jasa Layanan Biro",
      category: "Admin & Jasa",
      currentAmount: jasaAmount,
      includesInTotal: true,
      shortDesc: "Biaya jasa penanganan berkas dan pengurusan loket oleh petugas Biro Jasa SUN89.",
      humanFormula: `Tarif jasa: Rp ${jasaAmount.toLocaleString("id-ID")}`,
    });

    // 19. KOMPONEN MANUAL / INSIDENTAL DARI ESTIMATION RESULT
    const incidentalItems = estimationResult?.items?.filter(
      (it) => it.category === "INSIDENTAL" && it.amount > 0
    ) || [];

    if (incidentalItems.length > 0) {
      incidentalItems.forEach((inc) => {
        list.push({
          id: inc.id,
          name: inc.name,
          category: "Insidental",
          currentAmount: inc.amount,
          includesInTotal: inc.includesInTotal,
          shortDesc: "Biaya insidental tambahan yang diinput sesuai kebutuhan kasus kendaraan.",
          humanFormula: `Nilai diinput secara manual: Rp ${inc.amount.toLocaleString("id-ID")}`,
        });
      });
    } else {
      const totalInsidental = estimationResult?.totalInsidental ?? 0;
      list.push({
        id: "insidental",
        name: "Biaya Tambahan / Insidental",
        category: "Insidental",
        currentAmount: totalInsidental,
        includesInTotal: true,
        shortDesc: "Biaya insidental tambahan (seperti Uji KIR, Buka Blokir, ETLE, Plat Pilihan, atau STNK Hilang).",
        humanFormula: totalInsidental > 0
          ? `Nilai diinput secara manual: Rp ${totalInsidental.toLocaleString("id-ID")}`
          : "Nilai diinput secara manual: Rp 0",
        formulaCondition: "Diisi hanya apabila ada kebutuhan khusus pada kendaraan.",
      });
    }

    // 20. TOTAL ESTIMASI & PEMBULATAN
    list.push({
      id: "total-estimasi",
      name: "Total Tagihan Estimasi",
      category: "Total & Aturan",
      currentAmount: totalEstimasi,
      includesInTotal: true,
      shortDesc: "Total seluruh komponen biaya resmi Samsat dan jasa yang diikutsertakan dalam tagihan.",
      humanFormula: "Total Estimasi = Jumlah Seluruh Komponen Masuk Total",
      roundingRule: "Hasil dibulatkan ke atas ke kelipatan Rp 1.000 terdekat.",
    });

    return list;
  }, [
    pkb,
    overdueYears,
    overdueMonths,
    calendarMonths,
    isFreeDenda,
    isR2,
    isR4,
    isTahunanOr5Tahunan,
    isBbn,
    isMutasi,
    isMutasiLuar,
    estimationResult,
    serviceType,
    kondisiBerkas,
    wilayahAccId,
    totalEstimasi,
  ]);

  // When opened with a specific initialItemId, auto-select it or its alias
  useEffect(() => {
    if (!open) return;
    const target = initialItemId || "denda-pkb-pajak-baru";
    const found = explanationItems.find((i) => i.id === target);
    if (found) {
      setSelectedItemId(found.id);
      return;
    }
    // Check aliases
    if (target === "denda-pkb" || target === "denda-pkb-pajak-baru") {
      const match = explanationItems.find((i) => i.id === "denda-pkb" || i.id === "denda-pkb-pajak-baru");
      if (match) { setSelectedItemId(match.id); return; }
    }
    if (target === "denda-swdkllj" || target === "denda-swdkllj-pajak-baru") {
      const match = explanationItems.find((i) => i.id === "denda-swdkllj" || i.id === "denda-swdkllj-pajak-baru");
      if (match) { setSelectedItemId(match.id); return; }
    }
    if (target === "swdkllj" || target === "swdkllj-pajak-baru") {
      const match = explanationItems.find((i) => i.id === "swdkllj-pajak-baru" || i.id === "swdkllj");
      if (match) { setSelectedItemId(match.id); return; }
    }
    if (target === "proses-dan-acc-id" || target === "acc-id") {
      const match = explanationItems.find((i) => i.id === "proses-dan-acc-id" || i.id === "acc-id");
      if (match) { setSelectedItemId(match.id); return; }
    }
    setSelectedItemId(explanationItems[0]?.id || "denda-pkb-pajak-baru");
  }, [initialItemId, open, explanationItems]);

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
                  Cara Perhitungan & Penjelasan Pajak
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] font-medium",
                      isR2
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    )}
                  >
                    {isR2 ? "Motor (R2)" : "Mobil (R4)"}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] font-medium bg-muted text-muted-foreground">
                    {serviceType}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Panduan transparan cara perhitungan estimasi pajak dan rincian biaya layanan Samsat
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
                {isR2 && isTahunanOr5Tahunan ? "Bulan Denda Motor" : "Bulan Keterlambatan"}
              </span>
              <span className="font-mono text-foreground font-semibold text-xs">
                {isR2 && isTahunanOr5Tahunan ? `${overdueMonths} Bulan (+5 Penyesuaian)` : `${overdueMonths} Bulan`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Total Estimasi</span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                Rp {totalEstimasi.toLocaleString("id-ID")}
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

                {/* Formula & Rule Card */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                    <Calculator className="w-3.5 h-3.5 text-primary" />
                    Cara Perhitungan
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border/70 font-mono text-xs text-primary font-bold leading-relaxed">
                    {activeItem.humanFormula}
                  </div>

                  {activeItem.formulaCondition && (
                    <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      <span>{activeItem.formulaCondition}</span>
                    </div>
                  )}

                  {activeItem.roundingRule && (
                    <div className="flex items-start gap-2 pt-0.5 text-[11px] text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <span>{activeItem.roundingRule}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-border bg-card/60 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Perhitungan diverifikasi sesuai ketentuan tarif dan regulasi Samsat terkini</span>
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
