import { Column } from "../components/EnhancedTableWithDialogs";
import { FieldConfig } from "../components/FinanceAddPage";
import { formatDateDDMMYYYY } from "../utils/financeFormatters";
import type { OperationalOrder } from "../../domain/order/types";
import type { InvoiceBillingRecord, PenjualanContractCategory } from "../../domain/finance/types";
import { pricingStore } from "./pricingStore";
import { paymentMethodStore } from "./paymentMethodStore";

/**
 * EXACT DATA PENJUALAN COLUMN CONTRACT (Requirements 11 & 12)
 * Schema definition - strictly preserved without alterations, translations, abbreviations, or reordering.
 */

export const MUTASI_LD_COLUMNS_CONTRACT = [
  "Tanggal Masuk Berkas",
  "Nomor Order",
  "R4 / R2",
  "Plat No",
  "Nama Customer",
  "Nama Pemilik (STNK/BPKB)",
  "Jenis Pengurusan",
  "Samsat",
  "Skema Pembayaran",
  "Tanggal Uang Masuk",
  "Uang Masuk dari Konsumen",
  "Sisa Tagihan",
  "Bank Uang Keluar",
  "Tanggal Uang Keluar",
  "Uang Keluar Biro Jasa",
  "Profit",
  "Status Pengerjaan",
  "Status Pembayaran",
  "No Invoice",
  "Tanggal Invoice",
  "Tanda Terima",
  "BPKB",
  "Status BPKB",
  "TTB BPKB",
] as const;

export const MUTASI_AS_COLUMNS_CONTRACT = [
  "Tanggal Masuk Berkas",
  "Nomor Order",
  "R4 / R2",
  "Plat No",
  "Nama Customer",
  "Nama Pemilik (STNK/BPKB)",
  "Jenis Pengurusan",
  "Samsat",
  "Skema Pembayaran",
  "Tanggal Uang Masuk",
  "Uang Masuk dari Konsumen",
  "Sisa Tagihan",
  "Bank Uang Keluar",
  "Tanggal Uang Keluar",
  "Biaya Pokok Samsat",
  "Biaya Jasa",
  "Biaya Antar Jemput",
  "Profit",
  "Status Pengerjaan",
  "Status Pembayaran",
  "No Invoice",
  "Tanggal Invoice",
  "Tanda Terima",
  "BPKB",
  "Status BPKB",
  "TTB BPKB",
] as const;

export const BBN_COLUMNS_CONTRACT = [
  "Tanggal Masuk Berkas",
  "Nomor Order",
  "R4 / R2",
  "Plat No",
  "Nama Customer",
  "Nama Pemilik (STNK/BPKB)",
  "Jenis Pengurusan",
  "Samsat",
  "Skema Pembayaran",
  "Tanggal Uang Masuk",
  "Uang Masuk dari Konsumen",
  "Sisa Tagihan",
  "Bank Uang Keluar",
  "Tanggal Uang Keluar",
  "Biaya Pokok Samsat",
  "Biaya Jasa",
  "Biaya Antar Jemput",
  "Profit",
  "Status Pengerjaan",
  "Status Pembayaran",
  "No Invoice",
  "Tanggal Invoice",
  "Tanda Terima",
  "BPKB",
  "Status BPKB",
] as const;

export const PERPANJANGAN_PAJAK_COLUMNS_CONTRACT = [
  "Tanggal Masuk Berkas",
  "Nomor Order",
  "R4 / R2",
  "Plat No",
  "Nama Customer",
  "Nama Pemilik (STNK/BPKB)",
  "Jenis Pengurusan",
  "Samsat",
  "Skema Pembayaran",
  "Tanggal Uang Masuk",
  "Uang Masuk dari Konsumen",
  "Sisa Tagihan",
  "Bank Uang Keluar",
  "Tanggal Uang Keluar",
  "Biaya Pokok Samsat",
  "Biaya Jasa",
  "Biaya Antar Jemput",
  "Profit",
  "Status Pengerjaan",
  "Status Pembayaran",
  "No Invoice",
  "Tanggal Invoice",
  "Tanda Terima",
] as const;

export const LAIN_LAIN_COLUMNS_CONTRACT = [
  "Tanggal Masuk Berkas",
  "Nomor Order",
  "R4 / R2",
  "Plat No",
  "Nama Customer",
  "Nama Pemilik (STNK/BPKB)",
  "Jenis Pengurusan",
  "Samsat",
  "Skema Pembayaran",
  "Tanggal Uang Masuk",
  "Uang Masuk dari Konsumen",
  "Sisa Tagihan",
  "Bank Uang Keluar",
  "Tanggal Uang Keluar",
  "Biaya Pokok Samsat",
  "Biaya Jasa",
  "Biaya Antar Jemput",
  "Profit",
  "Status Pengerjaan",
  "Status Pembayaran",
  "No Invoice",
  "Tanggal Invoice",
  "Tanda Terima",
] as const;

export const BELUM_KURANG_BAYAR_COLUMNS_CONTRACT = [
  "Tanggal Masuk Berkas",
  "R4 / R2",
  "Plat No",
  "Nama Customer",
  "Nama Pemilik (STNK/BPKB)",
  "Jenis Pengurusan",
  "Samsat",
  "Skema Pembayaran",
  "Tanggal Uang Masuk",
  "Uang Masuk dari Konsumen",
  "Bank Uang Keluar",
  "Tanggal Uang Keluar",
  "Biaya Pokok Samsat",
  "Biaya Jasa",
  "Biaya Antar Jemput",
  "Profit",
  "Status Pembayaran",
  "No Invoice",
  "Tanggal Invoice",
  "Tanda Terima",
  "BPKB",
  "TTB BPKB",
] as const;

export const PROFIT_TERPENDING_COLUMNS_CONTRACT = [
  "Tanggal Masuk Berkas",
  "R4 / R2",
  "Plat No",
  "Nama Customer",
  "Nama Pemilik (STNK/BPKB)",
  "Jenis Pengurusan",
  "Samsat",
  "Skema Pembayaran",
  "Tanggal Uang Masuk",
  "Uang Masuk dari Konsumen",
  "Bank Uang Keluar",
  "Tanggal Uang Keluar",
  "Biaya Pokok Samsat",
  "Biaya Jasa",
  "Biaya Antar Jemput",
  "Profit",
  "Status Pembayaran",
  "No Invoice",
  "Tanggal Invoice",
  "Tanda Terima",
] as const;

export const CASHBACK_TERPENDING_COLUMNS_CONTRACT = [
  "Tanggal Masuk Berkas",
  "R4 / R2",
  "Plat No",
  "Nama Customer",
  "Nama Pemilik (STNK/BPKB)",
  "Jenis Pengurusan",
  "Samsat",
  "Skema Pembayaran",
  "Tanggal Uang Masuk",
  "Uang Masuk dari Konsumen",
  "Bank Uang Keluar",
  "Tanggal Uang Keluar",
  "Biaya Pokok Samsat",
  "Biaya Jasa",
  "Biaya Antar Jemput",
  "Profit",
  "Status Pembayaran",
  "No Invoice",
  "Tanggal Invoice",
  "Tanda Terima",
  "Jumlah Cashback",
] as const;

/**
 * Helper to build EnhancedTable Columns for a given contract schema
 */
export function buildTableColumnsFromContract(columnList: readonly string[]): Column[] {
  return columnList.map((colName) => {
    const isDate = colName.toLowerCase().includes("tanggal");
    const isFilterableText =
      colName === "Plat No" ||
      colName === "Nama Customer" ||
      colName === "Nama Pemilik (STNK/BPKB)" ||
      colName === "Nama" ||
      colName === "Jenis Pengurusan" ||
      colName === "No Invoice" ||
      colName === "Tanda Terima" ||
      colName === "TTB BPKB";

    const isR4R2 = colName === "R4 / R2";
    const isSkemaBayar = colName === "Skema Pembayaran" || colName === "Jenis Bayar";
    const isMetodeBayar = colName === "Metode Pembayaran";
    const isPhone = colName === "No HP" || colName === "Nomor HP";
    const isStatusPengerjaan = colName === "Status Pengerjaan";
    const isStatusPembayaran = colName === "Status Pembayaran" || colName === "Status";
    const isStatusBPKB = colName === "Status BPKB";
    const isBPKB = colName === "BPKB";

    const displayLabel = colName === "Plat No" ? "Nomor Polisi" : colName;

    const baseCol: Column = {
      key: colName,
      label: displayLabel,
    };

    if (isDate) {
      baseCol.filterable = true;
      baseCol.filterType = "text";
    } else if (isR4R2) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["R4", "R2"];
    } else if (isPhone) {
      baseCol.filterable = true;
      baseCol.filterType = "text";
    } else if (isSkemaBayar) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["Bayar di Awal", "Bayar di Akhir", "Tempo"];
    } else if (isMetodeBayar) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["Transfer Bank BCA", "Transfer BCA", "Transfer Mandiri", "Transfer BRI", "Cash", "QRIS", "-"];
    } else if (isStatusPengerjaan) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["Dalam Proses", "Menunggu Arsip", "Selesai", "Pending", "-"];
    } else if (isStatusPembayaran) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["Belum Bayar", "Kurang Bayar", "Lunas", "Kelebihan Bayar"];
    } else if (isStatusBPKB) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["Selesai", "Proses", "-"];
    } else if (isBPKB) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["Ada", "Belum", "-"];
    } else if (isFilterableText) {
      baseCol.filterable = true;
      baseCol.filterType = "text";
    }

    return baseCol;
  });
}

/**
 * Helper to build FieldConfig for add/edit pages matching exact contract
 */
export function buildFieldsFromContract(
  columnList: readonly string[],
  category?: PenjualanContractCategory | string
): FieldConfig[] {
  const fields: FieldConfig[] = columnList.map((colName) => {
    const isDate = colName.toLowerCase().includes("tanggal");
    const isNumber =
      colName.toLowerCase().includes("uang") ||
      colName.toLowerCase().includes("profit") ||
      colName.toLowerCase().includes("cashback") ||
      colName.toLowerCase().includes("kekurangan") ||
      colName.toLowerCase().includes("biaya");
    const label = colName === "Plat No" ? "Nomor Polisi" : colName;

    if (colName === "Plat No" || colName === "Nomor Polisi") {
      return {
        key: colName,
        label,
        type: "plate-number" as any,
        placeholder: "B 1234 ABC",
        helpText: "Nomor polisi standar 3 kotak: [Plat Depan] [Nomor] [Plat Belakang]",
      };
    }
    if (colName === "Samsat" || colName === "Samsat Asal" || colName === "Wilayah Samsat") {
      const samsatLabel = (category === "mutasi-ld" && colName === "Samsat") ? "Samsat Asal" : label;
      return {
        key: colName,
        label: samsatLabel,
        type: "samsat-select" as any,
        placeholder: "Pilih kantor Samsat asal...",
        helpText: "Kantor Samsat asal sesuai STNK/BPKB (data master resmi)",
      };
    }
    if (colName === "Samsat Tujuan") {
      return {
        key: colName,
        label,
        type: "samsat-select" as any,
        placeholder: "Pilih kantor Samsat tujuan...",
        helpText: "Kantor Samsat tujuan untuk berkas mutasi (data master resmi)",
      };
    }
    if (colName === "Jenis Pengurusan" || colName === "Layanan") {
      const availServices = typeof pricingStore.getAvailableServices === "function"
        ? pricingStore.getAvailableServices()
        : [];
      return {
        key: colName,
        label,
        type: "select",
        options: availServices.length > 0 ? availServices : ["Perpanjangan 1 Tahun", "Perpanjangan 5 Tahun", "Balik Nama", "Mutasi Antar Samsat", "Mutasi Luar Daerah"],
        placeholder: "Pilih jenis pengurusan",
        helpText: "Pilih jenis layanan resmi biro jasa",
      };
    }

    if (colName === "Nomor Order" || colName === "No Order") {
      return {
        key: colName,
        label,
        type: "text",
        readOnly: true,
        placeholder: "(Dibuat otomatis oleh sistem saat simpan)",
        helpText: "Nomor order kanonis terhubung dengan Order Tracking (otomatis dibuat oleh sistem)",
      };
    }
    if (colName === "Sisa Tagihan" || colName === "Kekurangan") {
      return {
        key: colName,
        label,
        type: "number",
        readOnly: true,
        helpText: "Dihitung otomatis dari Total Tagihan - Uang Masuk Terverifikasi (read-only)",
      };
    }
    if (colName === "Jenis Pengurusan") {
      const isMutasiLD = category === "mutasi-ld";
      return {
        key: colName,
        label,
        type: isMutasiLD ? "text" : "select",
        readOnly: isMutasiLD ? true : false,
        placeholder: "Mutasi Luar Daerah",
        helpText: isMutasiLD
          ? "Otomatis Mutasi Luar Daerah untuk halaman Mutasi LD (read-only)"
          : "Jenis layanan pengurusan berkas",
        options: ["Mutasi Luar Daerah", "Mutasi Antar Samsat", "Balik Nama", "Perpanjangan Pajak", "Lain-Lain"],
      };
    }
    if (colName === "Uang Masuk dari Konsumen") {
      const isMutasiLD = category === "mutasi-ld";
      return {
        key: colName,
        label,
        type: "number",
        readOnly: isMutasiLD ? false : true,
        placeholder: "0",
        helpText: isMutasiLD
          ? "Nominal uang yang diterima dari konsumen (dapat diisi manual)"
          : "Dikelola melalui pencatatan pembayaran terverifikasi dengan bukti transfer (read-only)",
      };
    }
    if (colName === "Nama Pemilik (STNK/BPKB)" || colName === "Nama") {
      return {
        key: colName,
        label,
        type: "text",
        placeholder: "Nama pemilik kendaraan sesuai STNK/BPKB",
        helpText: "Nama wajib pajak yang tertera pada dokumen legal kendaraan",
      };
    }
    if (colName === "Biaya Pokok Samsat" || colName === "Uang Keluar Biro Jasa" || colName === "Uang Keluar dari Biro Jasa") {
      const isMutasiLD = category === "mutasi-ld";
      return {
        key: colName,
        label,
        type: "number",
        readOnly: isMutasiLD ? false : true,
        placeholder: "0",
        helpText: isMutasiLD
          ? "Uang keluar biro jasa untuk biaya pokok pengurusan Samsat (dapat diisi manual sesuai kebutuhan transaksi)"
          : "Dikelola melalui biaya riil Samsat / Kas Kantor (read-only)",
      };
    }
    if (colName === "Jumlah Cashback") {
      return {
        key: colName,
        label,
        type: "number",
        readOnly: true,
        placeholder: "0",
        helpText: "Dihitung otomatis dari kelebihan uang masuk terhadap total tagihan konsumen (read-only)",
      };
    }
    if (colName === "Profit") {
      return {
        key: colName,
        label,
        type: "number",
        readOnly: true,
        helpText: "Dihitung otomatis dari selisih penerimaan dan biaya riil (read-only)",
      };
    }
    if (colName === "No HP" || colName === "Nomor HP") {
      return {
        key: colName,
        label,
        type: "text",
        placeholder: "Contoh: 081289123456",
        helpText: "Nomor kontak / WhatsApp pelanggan",
      };
    }
    if (colName === "Metode Pembayaran") {
      return {
        key: colName,
        label,
        type: "select",
        options: ["Transfer Bank BCA", "Transfer Bank Mandiri", "Transfer Bank BRI", "Cash", "QRIS"],
        helpText: "Metode atau rekening pembayaran",
      };
    }
    if (colName === "Status Pengerjaan") {
      const isMutasiLD = category === "mutasi-ld";
      return {
        key: colName,
        label,
        type: "select",
        readOnly: true,
        options: ["Selesai", "Dalam Proses", "Menunggu Arsip", "Dibatalkan", "-"],
        helpText: isMutasiLD
          ? "Otomatis diset Selesai khusus registrasi transaksi Mutasi LD (read-only)"
          : "Status tahapan pemrosesan berkas ditentukan oleh Order Tracking (read-only)",
      };
    }
    if (colName === "Status Pembayaran" || colName === "Status") {
      return {
        key: colName,
        label,
        type: "select",
        readOnly: true,
        options: ["Belum Bayar", "Kurang Bayar", "Lunas", "Kelebihan Bayar"],
        helpText: "Status pelunasan pembayaran customer ditentukan oleh kas masuk (read-only)",
      };
    }
    if (colName === "No Invoice") {
      return {
        key: colName,
        label,
        type: "text",
        readOnly: true,
        placeholder: "Contoh: INV/2024/001",
        helpText: "Nomor faktur invoice penjualan kanonis (read-only)",
      };
    }
    if (colName === "Tanggal Invoice") {
      return {
        key: colName,
        label,
        type: "date",
        helpText: "Tanggal terbit invoice",
      };
    }
    if (colName === "Tanda Terima") {
      return {
        key: colName,
        label,
        type: "text",
        placeholder: "Nomor tanda terima berkas",
        helpText: "Nomor tanda terima invoice/dokumen",
      };
    }
    if (colName === "Profit") {
      return {
        key: colName,
        label,
        type: "number",
        placeholder: "0",
        helpText: "Margin profit / keuntungan bersih",
      };
    }
    if (colName === "Biaya Pokok Samsat" || colName === "Uang Keluar Biro Jasa" || colName === "Uang Keluar dari Biro Jasa") {
      return {
        key: colName,
        label,
        type: "number",
        placeholder: "0",
        helpText: "Modal / uang keluar pengurusan resmi Samsat (PKB, SWDKLLJ, PNBP)",
      };
    }
    if (colName === "Status BPKB") {
      return {
        key: colName,
        label,
        type: "select",
        options: ["Selesai", "Proses", "Sudah Diambil", "Belum Diambil"],
        helpText: "Status dokumen BPKB",
      };
    }
    if (colName === "TTB BPKB") {
      return {
        key: colName,
        label,
        type: "text",
        placeholder: "Nomor tanda terima berkas BPKB",
        helpText: "Nomor tanda terima BPKB",
      };
    }

    if (isDate) {
      return { key: colName, label, type: "date" };
    }
    if (colName === "R4 / R2") {
      return { key: colName, label, type: "select", options: ["R4", "R2"] };
    }
    if (colName === "Skema Pembayaran" || colName === "Jenis Bayar") {
      return { key: colName, label, type: "select", options: ["Bayar di Awal", "Bayar di Akhir", "Tempo"] };
    }
    if (colName === "Bank Uang Keluar") {
      const activeMethods = paymentMethodStore.getActive().map((m) => m.nama_metode);
      const defaultBankList = ["Transfer BCA", "Transfer Mandiri", "Transfer BRI", "Cash", "QRIS"];
      const baseOptions = activeMethods.length > 0 ? activeMethods : defaultBankList;
      const options = Array.from(new Set([...baseOptions, "Kas Kantor", "Kas Messenger", "Lainnya"]));
      return {
        key: colName,
        label,
        type: "select",
        options,
        placeholder: "Pilih metode pembayaran / kas...",
        helpText: "Metode pembayaran atau kas perbankan keluar",
      };
    }
    if (colName === "BPKB") {
      return { key: colName, label, type: "select", options: ["Ada", "Belum"] };
    }
    if (isNumber) {
      return { key: colName, label, type: "number", placeholder: "0" };
    }
    return { key: colName, label, type: "text" };
  });

  // Complete historical fields: ensure contact, destination, and cashback are accessible
  if (!columnList.includes("Jumlah Cashback" as any)) {
    fields.push({
      key: "Jumlah Cashback",
      label: "Jumlah Cashback (Rp)",
      type: "number",
      placeholder: "0",
      helpText: "Nilai cashback yang dijanjikan/terpending (jika ada)",
    });
  }
  if (!columnList.some(c => c.toLowerCase().includes("telepon") || c.toLowerCase().includes("hp"))) {
    fields.push({
      key: "Nomor HP",
      label: "Nomor HP / WhatsApp Customer",
      type: "text",
      placeholder: "0812...",
      helpText: "Kontak customer untuk konfirmasi & tagihan (wajib)",
    });
  }
  if (!columnList.some(c => c.toLowerCase().includes("alamat"))) {
    fields.push({
      key: "Alamat",
      label: "Alamat Lengkap Customer",
      type: "text",
      placeholder: "Contoh: Jl. Pajajaran No. 12, Bogor",
      helpText: "Alamat aktual domisili/kantor customer (wajib)",
    });
  }
  if (!columnList.includes("Samsat Tujuan" as any)) {
    fields.push({
      key: "Samsat Tujuan",
      label: "Samsat Tujuan (Mutasi)",
      type: "samsat-select" as any,
      placeholder: "Pilih kantor Samsat tujuan (jika mutasi)...",
      helpText: "Kantor Samsat tujuan untuk mutasi berkas (data master resmi)",
    });
  }

  return fields;
}

/**
 * Resolves an operational order's service name to its canonical Data Penjualan tab category.
 * Phase 9.0 Order-to-Sales Projection Architecture.
 */
export function resolveOrderSalesCategory(layanan?: string): PenjualanContractCategory {
  if (!layanan) return "lain-lain";
  const normalized = layanan.toLowerCase().trim();

  // 1. Mutasi Antar Samsat (check before generic Mutasi)
  if (
    normalized.includes("antar samsat") ||
    normalized === "mutasi as" ||
    normalized.includes("mutasi as ") ||
    normalized.endsWith("mutasi as")
  ) {
    return "mutasi-as";
  }

  // 2. Mutasi Luar Daerah (or generic Mutasi)
  if (
    normalized.includes("luar daerah") ||
    normalized === "mutasi ld" ||
    normalized.includes("mutasi ld ") ||
    normalized.endsWith("mutasi ld") ||
    normalized.includes("mutasi")
  ) {
    return "mutasi-ld";
  }

  // 3. Balik Nama (BBN)
  if (normalized.includes("balik nama") || normalized.includes("bbn")) {
    return "bbn";
  }

  // 4. Perpanjangan Pajak
  if (normalized.includes("perpanjangan") || normalized.includes("pajak")) {
    return "perpanjangan-pajak";
  }

  // 5. Default/Other
  return "lain-lain";
}

/**
 * Authoritatively derives Status Pengerjaan from an operational order.
 * - "Dalam Proses": currentStep 1..7
 * - "Menunggu Arsip": currentStep >= 8 and not archived
 * - "Selesai": currentStep >= 8 and archived
 * - "-": non-order fixture, invalid step, NaN, or undefined
 * Phase 9.1 Dual Status Integration.
 */
export function deriveStatusPengerjaan(
  order?: Partial<OperationalOrder> | null,
  isArchived: boolean = false
): string {
  if (!order) {
    return "-";
  }
  if ((order as any).isCancelled || order.currentStageName === "Dibatalkan" || (order as any).status === "Dibatalkan") {
    return "Dibatalkan";
  }
  if (typeof order.currentStep !== "number" || isNaN(order.currentStep)) {
    return "-";
  }
  const step = order.currentStep;
  if (step >= 1 && step <= 7) {
    return "Dalam Proses";
  }
  if (step >= 8) {
    const archived = isArchived || Boolean((order as any).isArchived);
    return archived ? "Selesai" : "Menunggu Arsip";
  }
  return "-";
}

/**
 * Authoritatively derives Status Pembayaran from a linked invoice and optional order context.
 * Strict Accounting Rule:
 * Status Pembayaran ONLY reflects payment received vs. total obligation:
 * - "Belum Bayar": 0 paid, total > 0
 * - "Kurang Bayar": 0 < paid < total
 * - "Lunas": paid >= total (or explicitly marked Lunas)
 * - "Kelebihan Bayar": Overpayment with refund pending
 * - "Tagihan Tidak Tersedia": Missing totals or unlinked
 *
 * NOTE: Status pengerjaan, Profit Terpending, and Cashback Terpending are strictly separated!
 * Transactions paid in full MUST remain "Lunas" even if Samsat work is not yet finished.
 */
export function deriveStatusPembayaran(
  invoice?: InvoiceBillingRecord | null,
  order?: Partial<OperationalOrder> | null
): "Belum Bayar" | "Kurang Bayar" | "Lunas" | "Kelebihan Bayar" | "Tagihan Tidak Tersedia" {
  if (!invoice && !order) {
    return "Tagihan Tidak Tersedia";
  }

  const total =
    typeof invoice?.totalTagihan === "number" && !isNaN(invoice.totalTagihan)
      ? invoice.totalTagihan
      : typeof order?.payment?.totalBiaya === "number" && !isNaN(order.payment.totalBiaya)
      ? order.payment.totalBiaya
      : typeof order?.totalEstimasi === "number" && !isNaN(order.totalEstimasi)
      ? order.totalEstimasi
      : NaN;

  const paid =
    typeof invoice?.terbayar === "number" && !isNaN(invoice.terbayar)
      ? invoice.terbayar
      : typeof invoice?.dibayar === "number" && !isNaN(invoice.dibayar)
      ? invoice.dibayar
      : typeof order?.payment?.dibayar === "number" && !isNaN(order.payment.dibayar)
      ? order.payment.dibayar
      : invoice?.status === "Lunas" && typeof total === "number" && !isNaN(total) && total > 0
      ? total
      : 0;

  if (
    order?.currentStageName === "Dibatalkan" ||
    (order as any)?.isCancelled ||
    (order as any)?.status === "Dibatalkan" ||
    invoice?.billingStatus === "CANCELLED" ||
    (invoice?.status as any) === "CANCELLED" ||
    (invoice as any)?.isCancelled
  ) {
    return "Dibatalkan" as any;
  }

  if (isNaN(total) || total < 0 || isNaN(paid) || paid < 0) {
    return "Tagihan Tidak Tersedia";
  }

  // Decision 5: Canonical 4 payment statuses (refund status is separated)
  // 1. Kelebihan Bayar: pembayaran terverifikasi melebihi total tagihan
  if (paid > total || (invoice as any)?.settlementCondition === "OVERPAID") {
    return "Kelebihan Bayar";
  }

  // 2. Lunas: pembayaran terverifikasi sama dengan total tagihan
  if (paid === total && total > 0) {
    return "Lunas";
  }

  // If explicit Lunas status
  if (invoice?.status === "Lunas" || (order?.payment?.status && order.payment.status.toLowerCase() === "lunas")) {
    return "Lunas";
  }

  // 3. Kurang Bayar: pembayaran terverifikasi lebih dari nol tetapi masih kurang dari total tagihan
  if (paid > 0 && paid < total) {
    return "Kurang Bayar";
  }

  // 4. Belum Bayar: belum ada pembayaran terverifikasi
  if (paid === 0) {
    return "Belum Bayar";
  }

  return "Tagihan Tidak Tersedia";
}

/**
 * Pure projection function converting an OperationalOrder (with optional linked InvoiceBillingRecord)
 * into a canonical Data Penjualan row matching the table contract schema.
 * Phase 9.0 & 9.1 Dual Status Projection Architecture.
 */
export function projectOrderToContractRow(
  order: OperationalOrder,
  invoice?: InvoiceBillingRecord,
  isArchived: boolean = false
): Record<string, any> {
  // R4 / R2 classification
  let r4r2: "R4" | "R2" = "R4";
  if (invoice?.r4r2) {
    r4r2 = invoice.r4r2;
  } else if (order.jenisKendaraan) {
    const jk = order.jenisKendaraan.toLowerCase();
    if (jk.includes("r2") || jk.includes("motor") || jk.includes("sepeda")) {
      r4r2 = "R2";
    } else {
      r4r2 = "R4";
    }
  }

  // Samsat location: category-aware resolution (Phase 9.4 Finding 2)
  const category = resolveOrderSalesCategory(order.layanan);
  const isMutasi = category === "mutasi-ld" || category === "mutasi-as";

  const isValidSamsat = (val?: string | null): boolean => {
    if (!val) return false;
    const trimmed = val.trim();
    return trimmed !== "" && trimmed !== "-";
  };

  let samsat: string;
  if (isMutasi && isValidSamsat(order.wilayahSamsatTujuan)) {
    samsat = order.wilayahSamsatTujuan!.trim();
  } else if (isValidSamsat(order.wilayahSamsatAsal)) {
    samsat = order.wilayahSamsatAsal.trim();
  } else if (invoice?.samsat && isValidSamsat(invoice.samsat)) {
    samsat = invoice.samsat.trim();
  } else {
    samsat = "Samsat";
  }

  // Financial calculations
  // Tanggal Masuk Berkas: actual document intake date, NOT order creation date
  let tanggalBerkas = "-";
  if (order.tanggalMasukBerkas) {
    tanggalBerkas = formatDateDDMMYYYY(order.tanggalMasukBerkas);
  } else if (order.metodeLayanan === "Datang Langsung") {
    tanggalBerkas = formatDateDDMMYYYY(order.createdAt);
  } else if (order.currentStep >= 3) {
    tanggalBerkas = formatDateDDMMYYYY(order.pickupCompletedAt || (order as any).updatedAt || order.createdAt);
  }

  // Financial calculations
  const totalBiaya = order.payment?.totalBiaya ?? invoice?.totalTagihan ?? order.totalEstimasi ?? 0;
  const uangMasuk = order.payment?.dibayar ?? invoice?.terbayar ?? 0;
  
  // Distinguish payment scheme (Jenis Bayar) from payment method (Metode Pembayaran)
  const jenisBayar = order.payment?.tipePembayaran || (invoice as any)?.tipePembayaran || (invoice?.metodePembayaran === "Tempo" ? "Tempo" : "Bayar di Akhir");
  const metodePembayaran = order.payment?.metodePembayaran || invoice?.metodePembayaran || "-";
  const noHp = order.nomorHP || (invoice as any)?.phone || "-";

  // Tanggal Uang Masuk: based on actual payment timestamp, never order creation date if unpaid
  const tanggalUangMasuk = uangMasuk > 0
    ? formatDateDDMMYYYY(
        order.payment?.paymentVerifiedAt ||
        order.payment?.tanggalBayar ||
        (invoice as any)?.tanggalBayar ||
        (invoice?.status === "Lunas" ? invoice?.tanggal : null) ||
        order.createdAt
      )
    : "-";

  const bankUangKeluar = order.payment?.namaBank || invoice?.bank || "BCA";
  
  // Tanggal Uang Keluar: based on actual Samsat / kas disbursement expenditure ONLY
  let tanggalUangKeluar = "-";
  if (order.tanggalPengeluaranSamsat) {
    tanggalUangKeluar = formatDateDDMMYYYY(order.tanggalPengeluaranSamsat);
  } else if ((order as any).tanggalUangKeluar) {
    tanggalUangKeluar = formatDateDDMMYYYY((order as any).tanggalUangKeluar);
  }

  // Uang Keluar dari Biro Jasa (biaya samsat)
  let uangKeluar = 0;
  if (invoice?.biayaSamsat !== undefined && invoice.biayaSamsat !== null) {
    uangKeluar = invoice.biayaSamsat;
  } else {
    uangKeluar = (order.pkb || 0) + (order.swdkllj || 0) + (order.dendaSwdkllj || 0);
  }

  // Profit
  let profit = 0;
  if (invoice?.profit !== undefined && invoice.profit !== null) {
    profit = invoice.profit;
  } else if (order.biayaJasa !== undefined && order.biayaJasa > 0) {
    profit = order.biayaJasa;
  } else {
    profit = Math.max(0, totalBiaya - uangKeluar);
  }

  // Phase 9.1: Authoritative dual statuses
  const isOrderCancelled = Boolean(
    (order as any).isCancelled ||
    order.currentStageName === "Dibatalkan" ||
    (order as any).status === "Dibatalkan" ||
    invoice?.billingStatus === "CANCELLED" ||
    (invoice?.status as any) === "CANCELLED" ||
    (invoice as any)?.isCancelled
  );
  const statusPengerjaan = isOrderCancelled
    ? "Dibatalkan"
    : ((order as any).salesSnapshotStatus || (order as any).statusPengerjaan || deriveStatusPengerjaan(order, isArchived));
  const statusPembayaran = isOrderCancelled
    ? "Dibatalkan"
    : ((order as any).statusPembayaran || deriveStatusPembayaran(invoice, order));

  // Requirement 8: Honor explicit manual values without forced fallback generation for newly added rows
  const noInvoice = (order as any).noInvoice !== undefined
    ? ((order as any).noInvoice || "-")
    : (order.payment?.invoiceNo || invoice?.invoice || (invoice as any)?.invoiceNo || "-");

  // Phase 9.4 Finding 3: Tanggal Invoice strictly prioritizes invoice issuance date, NEVER payment date
  const rawInvoiceDate = (invoice as any)?.tanggalInvoice || invoice?.tanggal || order.createdAt;
  const tanggalInvoice = formatDateDDMMYYYY(rawInvoiceDate);

  const tandaTerima = (order as any).tandaTerima !== undefined
    ? ((order as any).tandaTerima || "-")
    : (invoice?.tandaTerima || "-");

  // BPKB fields: honor explicit manual values, never force fake defaults
  const bpkbDoc = order.clientDocuments?.["BPKB"];
  const bpkb = (order as any).bpkb !== undefined
    ? ((order as any).bpkb || "-")
    : (bpkbDoc?.status === "Sudah Tersedia" ? "Ada" : (order.currentStep >= 5 ? "Ada" : "-"));

  const statusBPKB = (order as any).statusBPKB !== undefined
    ? ((order as any).statusBPKB || "-")
    : (order.currentStep >= 7 ? "Selesai" : "-");

  const ttbBPKB = (order as any).ttbBPKB !== undefined
    ? ((order as any).ttbBPKB || "-")
    : (invoice?.ttbBPKB || "-");

  // Real digital documents count
  let attachedDocsCount = 0;
  if (order.clientDocuments) {
    Object.values(order.clientDocuments).forEach((d: any) => {
      if (d && (d.fileUrl || (d.name && !d.name.toLowerCase().includes("belum")))) {
        attachedDocsCount++;
      }
    });
  }
  if (order.rekapDocuments) {
    attachedDocsCount += order.rekapDocuments.length;
  }
  if (order.uploadedDocs) {
    attachedDocsCount += order.uploadedDocs.length;
  }
  if (order.deliveryHandover?.photoProofUrl) {
    attachedDocsCount++;
  }

  // Decision 2: Nama Pemilik (STNK/BPKB) strictly from vehicle document, NEVER falling back to customer name!
  const namaPemilik = (order.namaPemilik && order.namaPemilik.trim()) ? order.namaPemilik.trim() : "-";
  const cashback = Math.max(0, uangMasuk - totalBiaya);
  const formattedAlamat = (order as any).alamat || (order.alamatPenjemputan?.detail ? [order.alamatPenjemputan.detail, order.alamatPenjemputan.nomor ? `No. ${order.alamatPenjemputan.nomor}` : '', order.alamatPenjemputan.rtRw ? `RT/RW ${order.alamatPenjemputan.rtRw}` : '', order.alamatPenjemputan.kelurahan ? `Kel. ${order.alamatPenjemputan.kelurahan}` : '', order.alamatPenjemputan.kecamatan ? `Kec. ${order.alamatPenjemputan.kecamatan}` : '', order.alamatPenjemputan.kota].filter(Boolean).join(', ') : "-");

  return {
    id: `ord:${order.orderNo}`,
    orderNo: order.orderNo,
    "Nomor Order": order.orderNo,
    "Tanggal Masuk Berkas": tanggalBerkas,
    "R4 / R2": r4r2,
    "Plat No": order.nopol,
    "Nama Customer": order.customer,
    "No HP": noHp,
    "Nomor HP": noHp,
    "Nama Pemilik (STNK/BPKB)": namaPemilik,
    "Nama": namaPemilik,
    "Jenis Pengurusan": order.layanan,
    "Samsat": samsat,
    "Samsat Asal": samsat,
    "Samsat Tujuan": order.wilayahSamsatTujuan || "-",
    "Alamat": formattedAlamat,
    alamatPenjemputan: order.alamatPenjemputan,
    alamatPengantaran: order.alamatPengantaran,
    "Skema Pembayaran": jenisBayar,
    "Jenis Bayar": jenisBayar,
    "Metode Pembayaran": metodePembayaran,
    "Tanggal Uang Masuk": tanggalUangMasuk,
    "Uang Masuk dari Konsumen": uangMasuk,
    "Total Tagihan Konsumen": totalBiaya,
    "Sisa Tagihan": Math.max(0, totalBiaya - uangMasuk),
    "Bank Uang Keluar": bankUangKeluar,
    "Tanggal Uang Keluar": tanggalUangKeluar,
    "Biaya Pokok Samsat": uangKeluar,
    "Uang Keluar Biro Jasa": uangKeluar,
    "Uang Keluar dari Biro Jasa": uangKeluar,
    "Biaya Jasa": (order as any).biayaJasa || profit,
    "Biaya Antar Jemput": (order as any).biayaAntarJemput || 0,
    "Nama Rekening/Penerima": (order as any).namaPenerimaKeluar || (order as any).namaPemilikRekeningKeluar || "-",
    "Nama Rekening / Penerima": (order as any).namaPenerimaKeluar || (order as any).namaPemilikRekeningKeluar || "-",
    biayaJasa: (order as any).biayaJasa || profit,
    biayaAntarJemput: (order as any).biayaAntarJemput || 0,
    namaPenerimaKeluar: (order as any).namaPenerimaKeluar || (order as any).namaPemilikRekeningKeluar || "-",
    metodePembayaranKeluar: (order as any).metodePembayaranKeluar || "",
    "Profit": profit,
    "Jumlah Cashback": cashback,
    "Status Pengerjaan": statusPengerjaan,
    "Status Pembayaran": statusPembayaran,
    "Status": statusPengerjaan,
    "No Invoice": noInvoice,
    "Tanggal Invoice": tanggalInvoice,
    "Tanda Terima": tandaTerima,
    "BPKB": bpkb,
    "Status BPKB": statusBPKB,
    "TTB BPKB": ttbBPKB,
    "Dokumen": attachedDocsCount > 0 ? `${attachedDocsCount} Berkas` : "Belum Ada",
    attachedDocsCount,
  };
}

/**
 * Initial Contract Datasets (Clean Initial State - Transactions Derived from Canonical Orders)
 */
export const initialMutasiLDContract: any[] = [];
export const initialMutasiASContract: any[] = [];
export const initialBBNContract: any[] = [];
export const initialPerpanjanganPajakContract: any[] = [];
export const initialLainLainContract: any[] = [];
export const initialBelumKurangBayarContract: any[] = [];
export const initialProfitTerpendingContract: any[] = [];
export const initialCashbackTerpendingContract: any[] = [];
