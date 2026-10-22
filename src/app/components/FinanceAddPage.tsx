import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "./ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ExternalLink,
  Car,
  User,
  CreditCard,
  FileCheck,
  FolderOpen,
  Upload,
  Download,
  Eye,
  FileText,
  Loader2,
  Lock,
  MapPin,
  Receipt,
  Wallet,
  Building2,
  ShieldCheck,
  AlertCircle,
  Truck,
  Calculator,
} from "lucide-react";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { motion } from "motion/react";
import { formatDateDDMMYYYY, formatRupiah } from "../utils/financeFormatters";
import { PlateNumberInput } from "./PlateNumberInput";
import { SearchableSamsatSelect } from "./SearchableSamsatSelect";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { documentRepository } from "../../data/repositories/documentRepository";
import { processDocumentUpload, formatFileSize } from "../utils/fileCompressor";
import { usePaymentMethods } from "../data/paymentMethodStore";
import { pricingStore, usePricingStore } from "../data/pricingStore";
import { WILAYAH_ADMINISTRATIF_LIST } from "../../domain/pricing/wilayahIndonesiaData";
import { cn } from "./ui/utils";

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "plate-number" | "samsat-select";
  placeholder?: string;
  options?: string[];
  readOnly?: boolean;
  helpText?: string;
}

export interface UploadedDocItem {
  id: string;
  name: string;
  size: number;
  formattedSize: string;
  mimeType: string;
  fileUrl: string;
  downloadUrl?: string;
  createdAt: string;
  phase: "BEFORE" | "AFTER";
}

interface FinanceAddPageProps {
  title: string;
  description: string;
  subTabName?: string;
  category?: string;
  fields: FieldConfig[];
  onBack: () => void;
  onSubmit: (rows: any[]) => void;
}

export function FinanceAddPage({
  title,
  description,
  subTabName,
  category,
  fields,
  onBack,
  onSubmit,
}: FinanceAddPageProps) {
  const navigate = useNavigate();
  const { activeMethods } = usePaymentMethods();
  const pricingStoreState = usePricingStore();

  const isMutasiLD =
    category === "mutasi-ld" ||
    subTabName === "mutasi-ld" ||
    title.toLowerCase().includes("mutasi ld");

  // Helper to lookup Biaya Layanan directly from master store
  const lookupBiayaLayanan = (samsatName: string) => {
    if (!samsatName) return null;
    const cfg = pricingStore.getServiceFeeConfig("Mutasi Luar Daerah", samsatName);
    if (cfg && (cfg.biayaJasa || cfg.biayaAntarJemput)) {
      return {
        biayaJasa: cfg.biayaJasa || 0,
        biayaAntarJemput: cfg.biayaAntarJemput || 0,
        source: "Master Biaya Layanan",
      };
    }
    const rows = pricingStore.getBiayaLayananRows();
    const found = rows.find(
      (r) =>
        r.layanan.toLowerCase().includes("luar") &&
        (samsatName.toLowerCase().includes(r.wilayah.toLowerCase()) ||
          r.wilayah.toLowerCase().includes(samsatName.toLowerCase()))
    );
    if (found) {
      return {
        biayaJasa: found.biayaJasa || 0,
        biayaAntarJemput: found.biayaAntarJemput || 0,
        source: "Master Biaya Layanan",
      };
    }
    return null;
  };

  // Derive dynamic bank options strictly from active master payment methods
  const activeBankNames = Array.from(
    new Set(
      activeMethods
        .filter((m) => m.bank && m.bank !== "Tunai" && m.bank.toUpperCase() !== "QRIS")
        .map((m) => m.bank!)
    )
  );
  if (activeBankNames.length === 0) {
    activeBankNames.push("BCA", "BRI", "Mandiri");
  }

  const bankMasukOptions = Array.from(new Set([...activeBankNames, "Kas Kantor", "Lainnya"]));
  const bankKeluarOptions = Array.from(new Set([...activeBankNames, "Kas Kantor", "Kas Messenger", "Lainnya"]));

  const getEmptyRow = () => {
    const today = new Date().toISOString().split("T")[0];
    const initialPricing = lookupBiayaLayanan("Samsat Jakarta Timur");
    const initBiayaJasa = initialPricing ? initialPricing.biayaJasa : 1500000;
    const initBiayaAntarJemput = initialPricing ? initialPricing.biayaAntarJemput : 50000;
    const initBiayaSamsat = 0;
    const initTotalTagihan = isMutasiLD ? (initBiayaSamsat + initBiayaJasa + initBiayaAntarJemput) : 0;
    const initProfit = initTotalTagihan - initBiayaSamsat;

    const defaultBank = activeBankNames[0] || "BCA";
    const defaultMethod = activeMethods.find((m) => m.bank === defaultBank);

    const row: any = {
      // 1. Informasi Transaksi & Kendaraan
      "Tanggal Masuk Berkas": today,
      "Nomor Order": "",
      "R4 / R2": "R4",
      "Status Kepemilikan": "Pribadi",
      "Plat No": "B",
      "Jenis Pengurusan": isMutasiLD ? "Mutasi Luar Daerah" : "",
      "Samsat Asal": "Samsat Jakarta Timur",
      "Samsat": "Samsat Jakarta Timur",
      "Samsat Tujuan": "",

      // 2. Informasi Konsumen & Alamat
      "Nama Customer": "",
      "Nama Pemilik (STNK/BPKB)": "",
      "Nomor HP": "",
      "No HP": "",
      "Detail Alamat": "",
      "Kota/Kabupaten": "",
      "Kecamatan": "",
      "Kelurahan/Desa": "",
      "RT/RW": "",
      "Nomor Rumah": "",
      "Patokan": "",
      "Link Lokasi": "",
      "Alamat": "",

      // 3. Penerimaan Uang
      "Tanggal Uang Masuk": today,
      "Uang Masuk dari Konsumen": 0,
      "Metode Pembayaran Masuk": "Transfer Bank",
      "Bank Uang Masuk": defaultBank,
      "Nomor Rekening Masuk": defaultMethod?.nomor_rekening || "",
      "Nama Pemilik Rekening Masuk": defaultMethod?.nama_rekening || "",

      // 4. Pengeluaran Samsat
      "Tanggal Uang Keluar": today,
      "Biaya Pokok Samsat": 0,
      "Metode Pembayaran Keluar": "Kas Tunai",
      "Bank Uang Keluar": "-",
      "Nama Rekening/Penerima": "",
      "Nama Pemilik Rekening Keluar": "",

      // 5. Ringkasan Keuangan
      "Biaya Jasa": isMutasiLD ? initBiayaJasa : 0,
      "Biaya Antar Jemput": isMutasiLD ? initBiayaAntarJemput : 0,
      "Total Tagihan Konsumen": initTotalTagihan,
      "Sisa Tagihan": initTotalTagihan,
      "Profit": initProfit,
      "Jumlah Cashback": 0,

      // 6. Invoice & Status Berkas
      "No Invoice": "",
      "Tanggal Invoice": today,
      "Tanda Terima": isMutasiLD ? "" : "TT-(Otomatis)",
      "BPKB": isMutasiLD ? "" : "Ada",
      "Status BPKB": isMutasiLD ? "" : "Proses",
      "TTB BPKB": isMutasiLD ? "" : "TTB-(Otomatis)",
      "Status Pengerjaan": isMutasiLD ? "Pending" : "Dalam Proses",
      "Status Pembayaran": "Belum Bayar",

      // 7. Dokumen Kendaraan
      dokumenAwal: [],
      dokumenAkhir: [],
    };

    // Initialize any extra fields from props for non-Mutasi LD forms
    fields.forEach((field) => {
      if (row[field.key] === undefined) {
        if (field.type === "date") {
          row[field.key] = today;
        } else if (field.type === "number") {
          row[field.key] = 0;
        } else if (field.type === "plate-number") {
          row[field.key] = "B";
        } else {
          row[field.key] = "";
        }
      }
    });

    return row;
  };

  const [rows, setRows] = useState<any[]>([getEmptyRow()]);
  const [initialSnapshot] = useState(() => JSON.stringify([getEmptyRow()]));
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  const isFormDirty = useMemo(() => {
    return JSON.stringify(rows) !== initialSnapshot;
  }, [rows, initialSnapshot]);

  const handleCancelClick = () => {
    if (isFormDirty) {
      setIsDiscardDialogOpen(true);
    } else {
      onBack();
    }
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    onBack();
  };

  // Track "Nama Pemilik sama dengan Nama Customer" per row
  const [sameAsCustomer, setSameAsCustomer] = useState<Record<number, boolean>>({});

  // States for custom text inputs when "Lainnya" is selected
  const [customBankMasuk, setCustomBankMasuk] = useState<Record<number, string>>({});
  const [customMetodeMasuk, setCustomMetodeMasuk] = useState<Record<number, string>>({});
  const [customBankKeluar, setCustomBankKeluar] = useState<Record<number, string>>({});
  const [customMetodeKeluar, setCustomMetodeKeluar] = useState<Record<number, string>>({});

  // Loading states for document uploads
  const [uploadingAwal, setUploadingAwal] = useState<Record<number, boolean>>({});
  const [uploadingAkhir, setUploadingAkhir] = useState<Record<number, boolean>>({});

  // Modal preview state
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    title: string;
    documentName: string;
    rawUrl?: string;
    fileType?: "image" | "pdf" | string;
    documentId?: string;
  } | null>(null);

  // Hidden file input refs
  const fileInputAwalRef = useRef<HTMLInputElement | null>(null);
  const fileInputAkhirRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadRowIndex, setActiveUploadRowIndex] = useState<number>(0);

  const handleAddRow = () => {
    setRows([...rows, getEmptyRow()]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) {
      toast.error("Minimal harus ada satu data transaksi");
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleToggleSameAsCustomer = (rowIndex: number, checked: boolean) => {
    setSameAsCustomer((prev) => ({ ...prev, [rowIndex]: checked }));
    if (checked) {
      const custName = rows[rowIndex]["Nama Customer"] || "";
      handleFieldChange(rowIndex, "Nama Pemilik (STNK/BPKB)", custName);
    }
  };

  const handleFieldChange = (rowIndex: number, fieldKey: string, value: any) => {
    const updated = [...rows];
    updated[rowIndex][fieldKey] = value;

    // If "Nama Customer" changes and sameAsCustomer is active, mirror to "Nama Pemilik"
    if (fieldKey === "Nama Customer" && sameAsCustomer[rowIndex]) {
      updated[rowIndex]["Nama Pemilik (STNK/BPKB)"] = value;
    }

    // Lookup Biaya Layanan when Samsat Asal changes for Mutasi LD
    if (isMutasiLD && (fieldKey === "Samsat Asal" || fieldKey === "Samsat")) {
      const pricing = lookupBiayaLayanan(value);
      if (pricing) {
        updated[rowIndex]["Biaya Jasa"] = pricing.biayaJasa;
        if (pricing.biayaAntarJemput !== undefined) {
          updated[rowIndex]["Biaya Antar Jemput"] = pricing.biayaAntarJemput;
        }
      }
    }

    // Handle cascading payment method resets for Penerimaan Uang (Kas Masuk)
    if (fieldKey === "Metode Pembayaran Masuk") {
      if (value === "Cash / Tunai" || value === "Cash" || value === "Tunai") {
        updated[rowIndex]["Bank Uang Masuk"] = "-";
        updated[rowIndex]["Nomor Rekening Masuk"] = "";
        updated[rowIndex]["Nama Pemilik Rekening Masuk"] = "";
      } else if (value === "Transfer Bank") {
        const defaultBank = activeBankNames[0] || "BCA";
        updated[rowIndex]["Bank Uang Masuk"] = defaultBank;
        const matched = activeMethods.find((m) => m.bank === defaultBank);
        updated[rowIndex]["Nomor Rekening Masuk"] = matched?.nomor_rekening || "";
        updated[rowIndex]["Nama Pemilik Rekening Masuk"] = matched?.nama_rekening || "";
      } else if (value === "QRIS") {
        const qrisMethod = activeMethods.find((m) => m.bank?.toUpperCase() === "QRIS" || m.nama_metode?.toUpperCase() === "QRIS");
        updated[rowIndex]["Bank Uang Masuk"] = "QRIS";
        updated[rowIndex]["Nomor Rekening Masuk"] = qrisMethod?.nomor_rekening || "";
        updated[rowIndex]["Nama Pemilik Rekening Masuk"] = qrisMethod?.nama_rekening || "";
      } else if (value === "Lainnya") {
        updated[rowIndex]["Bank Uang Masuk"] = "Lainnya";
        updated[rowIndex]["Nomor Rekening Masuk"] = "";
        updated[rowIndex]["Nama Pemilik Rekening Masuk"] = "";
      }
    }

    // Handle Bank Uang Masuk changes: Auto-fill account number & account holder from master
    if (fieldKey === "Bank Uang Masuk") {
      if (value && value !== "Lainnya" && value !== "-") {
        const matched = activeMethods.find((m) => m.bank === value);
        if (matched) {
          updated[rowIndex]["Nomor Rekening Masuk"] = matched.nomor_rekening || "";
          updated[rowIndex]["Nama Pemilik Rekening Masuk"] = matched.nama_rekening || "";
        }
      }
    }

    // Handle cascading payment method resets for Pengeluaran Samsat (Kas Keluar)
    if (fieldKey === "Metode Pembayaran Keluar") {
      if (value === "Kas Tunai" || value === "Cash" || value === "Tunai") {
        updated[rowIndex]["Bank Uang Keluar"] = "-";
      } else if (value === "Transfer Bank") {
        updated[rowIndex]["Bank Uang Keluar"] = activeBankNames[0] || "BCA";
      } else if (value === "Kas Kantor") {
        updated[rowIndex]["Bank Uang Keluar"] = "Kas Kantor";
      } else if (value === "Kas Messenger") {
        updated[rowIndex]["Bank Uang Keluar"] = "Kas Messenger";
      } else if (value === "QRIS") {
        updated[rowIndex]["Bank Uang Keluar"] = "QRIS";
      } else if (value === "Lainnya") {
        updated[rowIndex]["Bank Uang Keluar"] = "Lainnya";
      }
    }

    // Synchronize Nama Rekening / Penerima for Pengeluaran Samsat
    if (fieldKey === "Nama Rekening/Penerima") {
      updated[rowIndex]["Nama Pemilik Rekening Keluar"] = value;
    } else if (fieldKey === "Nama Pemilik Rekening Keluar") {
      updated[rowIndex]["Nama Rekening/Penerima"] = value;
    }

    // Financial calculations & status derivations
    if (
      fieldKey === "Uang Masuk dari Konsumen" ||
      fieldKey === "Biaya Pokok Samsat" ||
      fieldKey === "Biaya Jasa" ||
      fieldKey === "Biaya Antar Jemput" ||
      fieldKey === "Total Tagihan Konsumen" ||
      fieldKey === "Samsat Asal" ||
      fieldKey === "Samsat" ||
      fieldKey === "BPKB"
    ) {
      const uangMasuk = Math.max(
        0,
        Number(fieldKey === "Uang Masuk dari Konsumen" ? value : updated[rowIndex]["Uang Masuk dari Konsumen"] || 0)
      );
      const biayaSamsat = Math.max(
        0,
        Number(fieldKey === "Biaya Pokok Samsat" ? value : updated[rowIndex]["Biaya Pokok Samsat"] || 0)
      );
      const biayaJasa = Math.max(
        0,
        Number(fieldKey === "Biaya Jasa" ? value : updated[rowIndex]["Biaya Jasa"] || 0)
      );
      const biayaAntarJemput = Math.max(
        0,
        Number(fieldKey === "Biaya Antar Jemput" ? value : updated[rowIndex]["Biaya Antar Jemput"] || 0)
      );

      let totalTagihan = Number(
        fieldKey === "Total Tagihan Konsumen" ? value : updated[rowIndex]["Total Tagihan Konsumen"] || 0
      );

      // Recalculate Total Tagihan if Biaya Jasa, Biaya Antar Jemput, or Biaya Samsat changed
      if (
        fieldKey === "Biaya Jasa" ||
        fieldKey === "Biaya Antar Jemput" ||
        fieldKey === "Biaya Pokok Samsat" ||
        fieldKey === "Samsat Asal" ||
        fieldKey === "Samsat"
      ) {
        totalTagihan = biayaSamsat + biayaJasa + biayaAntarJemput;
        updated[rowIndex]["Total Tagihan Konsumen"] = totalTagihan;
      } else if (totalTagihan === 0 && uangMasuk > 0 && fieldKey === "Uang Masuk dari Konsumen") {
        totalTagihan = uangMasuk;
        updated[rowIndex]["Total Tagihan Konsumen"] = totalTagihan;
      }

      const sisaTagihan = Math.max(0, totalTagihan - uangMasuk);
      const cashback = Math.max(0, uangMasuk - totalTagihan);
      const profit = Math.max(0, totalTagihan - biayaSamsat);

      updated[rowIndex]["Sisa Tagihan"] = sisaTagihan;
      updated[rowIndex]["Jumlah Cashback"] = cashback;
      updated[rowIndex]["Profit"] = profit;

      // Canonical Status Pembayaran rule
      if (uangMasuk === 0) {
        updated[rowIndex]["Status Pembayaran"] = "Belum Bayar";
      } else if (totalTagihan > 0 && uangMasuk < totalTagihan) {
        updated[rowIndex]["Status Pembayaran"] = "Kurang Bayar";
      } else if (totalTagihan > 0 && uangMasuk > totalTagihan) {
        updated[rowIndex]["Status Pembayaran"] = "Kelebihan Bayar";
      } else {
        updated[rowIndex]["Status Pembayaran"] = "Lunas";
      }

      // TTB BPKB auto preview update (non-Mutasi LD only)
      if (fieldKey === "BPKB" && !isMutasiLD) {
        const orderNoDisplay = updated[rowIndex]["Nomor Order"] || "ORD-XXXX";
        updated[rowIndex]["TTB BPKB"] = value === "Ada" ? `TTB-${orderNoDisplay}` : "-";
      }
    }

    // Sync Samsat Asal and Samsat
    if (fieldKey === "Samsat Asal") {
      updated[rowIndex]["Samsat"] = value;
    } else if (fieldKey === "Samsat") {
      updated[rowIndex]["Samsat Asal"] = value;
    }

    // Sync Nomor HP and No HP
    if (fieldKey === "Nomor HP") {
      updated[rowIndex]["No HP"] = value;
    } else if (fieldKey === "No HP") {
      updated[rowIndex]["Nomor HP"] = value;
    }

    setRows(updated);
  };

  const handleAddressChange = (rowIndex: number, addrKey: string, val: string) => {
    const updated = [...rows];
    updated[rowIndex][addrKey] = val;

    const detail = updated[rowIndex]["Detail Alamat"] || "";
    const nomor = updated[rowIndex]["Nomor Rumah"] || "";
    const rtRw = updated[rowIndex]["RT/RW"] || "";
    const kelurahan = updated[rowIndex]["Kelurahan/Desa"] || "";
    const kecamatan = updated[rowIndex]["Kecamatan"] || "";
    const kota = updated[rowIndex]["Kota/Kabupaten"] || "";

    const fullAlamat = [
      detail,
      nomor ? `No. ${nomor}` : "",
      rtRw ? `RT/RW ${rtRw}` : "",
      kelurahan ? `Kel. ${kelurahan}` : "",
      kecamatan ? `Kec. ${kecamatan}` : "",
      kota,
    ]
      .filter(Boolean)
      .join(", ");

    updated[rowIndex]["Alamat"] = fullAlamat;
    setRows(updated);
  };

  // Upload handlers for Dokumen Awal (BEFORE) & Dokumen Akhir (AFTER)
  const triggerUploadAwal = (rowIndex: number) => {
    setActiveUploadRowIndex(rowIndex);
    if (fileInputAwalRef.current) {
      fileInputAwalRef.current.value = "";
      fileInputAwalRef.current.click();
    }
  };

  const triggerUploadAkhir = (rowIndex: number) => {
    setActiveUploadRowIndex(rowIndex);
    if (fileInputAkhirRef.current) {
      fileInputAkhirRef.current.value = "";
      fileInputAkhirRef.current.click();
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "dokumenAwal" | "dokumenAkhir"
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const rowIndex = activeUploadRowIndex;
    const isAwal = type === "dokumenAwal";
    const setUploading = isAwal ? setUploadingAwal : setUploadingAkhir;

    setUploading((prev) => ({ ...prev, [rowIndex]: true }));

    try {
      const newItems: UploadedDocItem[] = [];
      for (const file of files) {
        // 1. Adaptive client-side compression & validation
        const processed = await processDocumentUpload(file);

        // 2. Upload to authoritative backend / document repository
        const docType = isAwal ? "DOKUMEN_AWAL" : "DOKUMEN_AKHIR";
        const uploaded = await documentRepository.uploadDocument(processed.file, {
          documentType: docType,
          metadata: {
            phase: isAwal ? "BEFORE" : "AFTER",
            category: isAwal ? "Dokumen Awal" : "Dokumen Akhir",
          },
        });

        newItems.push({
          id: uploaded.id,
          name: uploaded.originalName,
          size: uploaded.sizeBytes,
          formattedSize: formatFileSize(uploaded.sizeBytes),
          mimeType: uploaded.mimeType,
          fileUrl: uploaded.fileUrl,
          downloadUrl: uploaded.downloadUrl,
          createdAt: uploaded.createdAt,
          phase: isAwal ? "BEFORE" : "AFTER",
        });
      }

      const currentList = Array.isArray(rows[rowIndex][type]) ? rows[rowIndex][type] : [];
      handleFieldChange(rowIndex, type, [...currentList, ...newItems]);
      toast.success(`${files.length} berkas ${isAwal ? "Dokumen Awal" : "Dokumen Akhir"} berhasil diunggah.`);
    } catch (err: any) {
      toast.error(err?.message || `Gagal mengunggah ${isAwal ? "Dokumen Awal" : "Dokumen Akhir"}`);
    } finally {
      setUploading((prev) => ({ ...prev, [rowIndex]: false }));
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveDoc = (rowIndex: number, type: "dokumenAwal" | "dokumenAkhir", docId: string) => {
    const currentList = Array.isArray(rows[rowIndex][type]) ? rows[rowIndex][type] : [];
    const updated = currentList.filter((d: UploadedDocItem) => d.id !== docId);
    handleFieldChange(rowIndex, type, updated);
    toast.success("Berkas dokumen dihapus dari daftar");
  };

  const handleDownloadDoc = (doc: UploadedDocItem) => {
    const url = doc.downloadUrl || doc.fileUrl;
    if (!url) {
      toast.error("Tautan berkas tidak tersedia.");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validate each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const customer = (row["Nama Customer"] || row.customer || "").trim();
      const nopol = (row["Plat No"] || row.nopol || "").trim();
      const phone = (row["Nomor HP"] || row["No HP"] || row.phone || "").trim();

      if (!customer) {
        toast.error(`Baris ke-${i + 1}: Nama Customer wajib diisi`);
        return;
      }
      if (!nopol || nopol === "B" || nopol === "B -") {
        toast.error(`Baris ke-${i + 1}: Nomor Polisi wajib diisi lengkap`);
        return;
      }

      if (isMutasiLD) {
        const phoneDigits = phone.replace(/[^0-9]/g, "");
        if (!phone || phoneDigits.length < 9) {
          toast.error(`Baris ke-${i + 1}: Nomor HP / WhatsApp Customer wajib diisi (minimal 9 digit angka)`);
          return;
        }

        const isCashMasuk =
          row["Metode Pembayaran Masuk"] === "Cash / Tunai" ||
          row["Metode Pembayaran Masuk"] === "Cash" ||
          row["Metode Pembayaran Masuk"] === "Tunai";

        // Validate custom "Lainnya" selections
        if (!isCashMasuk && row["Bank Uang Masuk"] === "Lainnya" && !(customBankMasuk[i] || "").trim()) {
          toast.error(`Baris ke-${i + 1}: Silakan masukkan nama bank custom untuk Bank Uang Masuk`);
          return;
        }
        if (row["Metode Pembayaran Masuk"] === "Lainnya" && !(customMetodeMasuk[i] || "").trim()) {
          toast.error(`Baris ke-${i + 1}: Silakan masukkan nama metode pembayaran custom untuk Penerimaan Uang`);
          return;
        }

        const isCashKeluar =
          row["Metode Pembayaran Keluar"] === "Kas Tunai" ||
          row["Metode Pembayaran Keluar"] === "Cash" ||
          row["Metode Pembayaran Keluar"] === "Tunai";

        if (!isCashKeluar && row["Bank Uang Keluar"] === "Lainnya" && !(customBankKeluar[i] || "").trim()) {
          toast.error(`Baris ke-${i + 1}: Silakan masukkan nama bank/kas custom untuk Bank Uang Keluar`);
          return;
        }
        if (row["Metode Pembayaran Keluar"] === "Lainnya" && !(customMetodeKeluar[i] || "").trim()) {
          toast.error(`Baris ke-${i + 1}: Silakan masukkan nama metode custom untuk Pengeluaran Samsat`);
          return;
        }
      }
    }

    // Format any date fields and compile structured addresses
    const formattedRows = rows.map((row, idx) => {
      const formatted = { ...row };

      // Apply custom bank/method if 'Lainnya' was selected
      if (formatted["Bank Uang Masuk"] === "Lainnya" && customBankMasuk[idx]) {
        formatted["Bank Uang Masuk"] = customBankMasuk[idx].trim();
      }
      if (formatted["Metode Pembayaran Masuk"] === "Lainnya" && customMetodeMasuk[idx]) {
        formatted["Metode Pembayaran Masuk"] = customMetodeMasuk[idx].trim();
      }
      if (formatted["Bank Uang Keluar"] === "Lainnya" && customBankKeluar[idx]) {
        formatted["Bank Uang Keluar"] = customBankKeluar[idx].trim();
      }
      if (formatted["Metode Pembayaran Keluar"] === "Lainnya" && customMetodeKeluar[idx]) {
        formatted["Metode Pembayaran Keluar"] = customMetodeKeluar[idx].trim();
      }

      // Format date fields
      fields.forEach((f) => {
        if (f.type === "date" && formatted[f.key]) {
          formatted[f.key] = formatDateDDMMYYYY(formatted[f.key]);
        }
      });
      if (formatted["Tanggal Masuk Berkas"]) {
        formatted["Tanggal Masuk Berkas"] = formatDateDDMMYYYY(formatted["Tanggal Masuk Berkas"]);
      }
      if (formatted["Tanggal Uang Masuk"]) {
        formatted["Tanggal Uang Masuk"] = formatDateDDMMYYYY(formatted["Tanggal Uang Masuk"]);
      }
      if (formatted["Tanggal Uang Keluar"]) {
        formatted["Tanggal Uang Keluar"] = formatDateDDMMYYYY(formatted["Tanggal Uang Keluar"]);
      }
      if (formatted["Tanggal Invoice"]) {
        formatted["Tanggal Invoice"] = formatDateDDMMYYYY(formatted["Tanggal Invoice"]);
      }

      // Compile structured address and ensure backward compatibility
      const detail = (formatted["Detail Alamat"] || "").trim();
      const nomor = (formatted["Nomor Rumah"] || "").trim();
      const rtRw = (formatted["RT/RW"] || "").trim();
      const kelurahan = (formatted["Kelurahan/Desa"] || "").trim();
      const kecamatan = (formatted["Kecamatan"] || "").trim();
      const kota = (formatted["Kota/Kabupaten"] || "").trim();
      const fullAlamat = [
        detail,
        nomor ? `No. ${nomor}` : "",
        rtRw ? `RT/RW ${rtRw}` : "",
        kelurahan ? `Kel. ${kelurahan}` : "",
        kecamatan ? `Kec. ${kecamatan}` : "",
        kota,
      ]
        .filter(Boolean)
        .join(", ");

      formatted["Alamat"] = fullAlamat || formatted["Alamat"] || "";
      formatted.detailAlamat = detail;
      formatted.kota = kota;
      formatted.kecamatan = kecamatan;
      formatted.kelurahan = kelurahan;
      formatted.rtRw = rtRw;
      formatted.nomorRumah = nomor;
      formatted.patokan = (formatted["Patokan"] || "").trim();
      formatted.linkLokasi = (formatted["Link Lokasi"] || "").trim();

      // Ensure Samsat sync
      if (formatted["Samsat Asal"]) {
        formatted["Samsat"] = formatted["Samsat Asal"];
      } else if (formatted["Samsat"]) {
        formatted["Samsat Asal"] = formatted["Samsat"];
      }

      // Ensure Biaya Jasa, Biaya Antar Jemput, and Nama Rekening/Penerima are preserved
      formatted["Biaya Jasa"] = Number(formatted["Biaya Jasa"]) || 0;
      formatted.biayaJasa = formatted["Biaya Jasa"];
      formatted["Biaya Antar Jemput"] = Number(formatted["Biaya Antar Jemput"]) || 0;
      formatted.biayaAntarJemput = formatted["Biaya Antar Jemput"];

      const namaPenerima = (
        formatted["Nama Rekening/Penerima"] ||
        formatted["Nama Pemilik Rekening Keluar"] ||
        ""
      ).trim();
      formatted["Nama Rekening/Penerima"] = namaPenerima;
      formatted["Nama Pemilik Rekening Keluar"] = namaPenerima;
      formatted.namaPenerimaKeluar = namaPenerima;

      // Ensure Mutasi LD specific constants
      if (isMutasiLD) {
        formatted["Jenis Pengurusan"] = "Mutasi Luar Daerah";
        formatted["Status Pengerjaan"] = formatted["Status Pengerjaan"] || "Pending";
        formatted["Status Kepemilikan"] = formatted["Status Kepemilikan"] || "Pribadi";
        if (sameAsCustomer[idx]) {
          formatted["Nama Pemilik (STNK/BPKB)"] = formatted["Nama Customer"];
        }
      }

      return formatted;
    });

    onSubmit(formattedRows);
  };

  // Render fallback generic input for non-Mutasi LD forms
  const renderGenericFieldInput = (row: any, rowIndex: number, field: FieldConfig) => {
    if (field.readOnly || field.key === "Nomor Order" || field.key === "No Order") {
      const isOrderNo = field.key === "Nomor Order" || field.key === "No Order";
      const displayVal = isOrderNo
        ? row[field.key] || "(Dibuat otomatis oleh sistem saat simpan)"
        : row[field.key] || "";

      return (
        <div className="space-y-1">
          <Input
            type="text"
            disabled
            readOnly
            className="w-full bg-muted/40 text-muted-foreground border-border h-9 text-xs cursor-not-allowed select-none opacity-85 font-mono"
            value={displayVal}
            placeholder={field.helpText || "(Dihasilkan otomatis oleh sistem)"}
          />
          {field.helpText && (
            <p className="text-[10px] text-muted-foreground leading-tight">{field.helpText}</p>
          )}
        </div>
      );
    }

    if (field.type === "plate-number") {
      return (
        <PlateNumberInput
          value={row[field.key] || ""}
          onChange={(formatted) => handleFieldChange(rowIndex, field.key, formatted)}
        />
      );
    }

    if (field.type === "samsat-select") {
      return (
        <SearchableSamsatSelect
          value={row[field.key] || ""}
          onValueChange={(val) => handleFieldChange(rowIndex, field.key, val)}
          placeholder={field.placeholder || "Pilih wilayah Samsat..."}
        />
      );
    }

    if (field.type === "select" && field.options) {
      return (
        <Select
          value={row[field.key] || ""}
          onValueChange={(val) => handleFieldChange(rowIndex, field.key, val)}
        >
          <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
            <SelectValue placeholder={field.placeholder || `Pilih ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option} className="text-xs">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={field.type}
        placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
        className="w-full bg-input-background border-border h-9 text-xs font-normal"
        value={row[field.key] || ""}
        onChange={(e) => handleFieldChange(rowIndex, field.key, e.target.value)}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-6"
    >
      {/* Hidden Native Datalist of 514 Regency/City names */}
      <datalist id="daftar-wilayah-kota-kab">
        {WILAYAH_ADMINISTRATIF_LIST.map((w) => (
          <option key={w.kode_kabupaten_kota} value={w.nama_kabupaten_kota}>
            {w.nama_kabupaten_kota} ({w.nama_provinsi})
          </option>
        ))}
      </datalist>

      {/* Hidden File Inputs for multi-file upload */}
      <input
        ref={fileInputAwalRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.heic,.heif"
        className="hidden"
        onChange={(e) => handleFileChange(e, "dokumenAwal")}
      />
      <input
        ref={fileInputAkhirRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.heic,.heif"
        className="hidden"
        onChange={(e) => handleFileChange(e, "dokumenAkhir")}
      />

      {/* Banner linking to canonical Buat Order for full workflow (hidden on Mutasi LD per requirement) */}
      {!isMutasiLD && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span>Formulir Buat Order Terpadu</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Ingin membuat order lengkap dengan kalkulasi biaya otomatis, alamat penjemputan berkas, dan persyaratan dokumen lengkap?
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/order/buat")}
            className="h-8.5 text-xs border-primary/30 text-primary hover:bg-primary/10 font-semibold shrink-0 gap-1.5 shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Form Buat Order</span>
          </Button>
        </div>
      )}

      {/* Top Bar with Kembali Button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancelClick}
            className="flex items-center gap-1.5 border-border hover:bg-secondary/50 text-xs h-9 px-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </Button>
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {/* Main Dynamic Form Rows */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {rows.map((row, rowIndex) => {
          const docsAwalList: UploadedDocItem[] = Array.isArray(row.dokumenAwal) ? row.dokumenAwal : [];
          const docsAkhirList: UploadedDocItem[] = Array.isArray(row.dokumenAkhir) ? row.dokumenAkhir : [];

          return (
            <div key={rowIndex} className="space-y-5">
              {rows.length > 1 && (
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {rowIndex + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">
                      Data Transaksi #{rowIndex + 1}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRow(rowIndex)}
                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Hapus baris #{rowIndex + 1}
                  </Button>
                </div>
              )}

              {/* RENDER 7 STRUCTURED SECTIONS FOR MUTASI LD */}
              {isMutasiLD ? (
                <div className="space-y-5">
                  {/* SECTION 1: Informasi Transaksi & Kendaraan */}
                  <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs rounded-xl space-y-4">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/60">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                          1. Informasi Transaksi & Kendaraan
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Registrasi berkas, identitas kendaraan, status kepemilikan, dan wilayah Samsat
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      {/* Row 1: Tanggal Masuk Berkas | Nomor Order */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Tanggal Masuk Berkas <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="date"
                          className="w-full bg-input-background border-border h-9 text-xs"
                          value={row["Tanggal Masuk Berkas"] || ""}
                          onChange={(e) => handleFieldChange(rowIndex, "Tanggal Masuk Berkas", e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                          <span>Nomor Order</span>
                          <Badge variant="secondary" className="text-[10px] h-4 py-0 px-1 font-mono">
                            Kanonis
                          </Badge>
                        </Label>
                        <Input
                          type="text"
                          disabled
                          readOnly
                          className="w-full bg-muted/40 text-muted-foreground border-border h-9 text-xs cursor-not-allowed select-none font-mono"
                          value={row["Nomor Order"] || "(Dibuat otomatis oleh sistem saat simpan)"}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Terhubung langsung ke relasi order kanonis
                        </p>
                      </div>

                      {/* Row 2: R4 / R2 | Status Kepemilikan */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          R4 / R2 (Kategori Kendaraan) <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={row["R4 / R2"] || "R4"}
                          onValueChange={(val) => handleFieldChange(rowIndex, "R4 / R2", val)}
                        >
                          <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
                            <SelectValue placeholder="Pilih R4 atau R2" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="R4" className="text-xs">
                              R4 (Mobil / Roda Empat)
                            </SelectItem>
                            <SelectItem value="R2" className="text-xs">
                              R2 (Motor / Roda Dua)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Status Kepemilikan <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={row["Status Kepemilikan"] || "Pribadi"}
                          onValueChange={(val) => handleFieldChange(rowIndex, "Status Kepemilikan", val)}
                        >
                          <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
                            <SelectValue placeholder="Pilih status kepemilikan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pribadi" className="text-xs">
                              Pribadi
                            </SelectItem>
                            <SelectItem value="Perusahaan" className="text-xs">
                              Perusahaan
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Kepemilikan kendaraan (Pribadi atau PT/Badan Usaha)
                        </p>
                      </div>

                      {/* Row 3: Nomor Polisi | Jenis Pengurusan */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Nomor Polisi (Plat No) <span className="text-destructive">*</span>
                        </Label>
                        <PlateNumberInput
                          value={row["Plat No"] || ""}
                          onChange={(formatted) => handleFieldChange(rowIndex, "Plat No", formatted)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Jenis Pengurusan
                        </Label>
                        <Input
                          type="text"
                          disabled
                          readOnly
                          className="w-full bg-muted/40 text-foreground font-medium border-border h-9 text-xs cursor-not-allowed select-none"
                          value="Mutasi Luar Daerah"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Ditetapkan otomatis sesuai konteks halaman Mutasi Luar Daerah
                        </p>
                      </div>

                      {/* Row 4: Samsat Asal | Samsat Tujuan Side by Side */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Samsat Asal <span className="text-destructive">*</span>
                        </Label>
                        <SearchableSamsatSelect
                          value={row["Samsat Asal"] || row["Samsat"] || ""}
                          onValueChange={(val) => {
                            handleFieldChange(rowIndex, "Samsat Asal", val);
                            handleFieldChange(rowIndex, "Samsat", val);
                          }}
                          placeholder="Pilih wilayah Samsat asal..."
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Wilayah Samsat asal sesuai berkas STNK/BPKB
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Samsat Tujuan (Mutasi){" "}
                          <span className="text-muted-foreground font-normal">(Opsional)</span>
                        </Label>
                        <SearchableSamsatSelect
                          value={row["Samsat Tujuan"] || ""}
                          onValueChange={(val) => handleFieldChange(rowIndex, "Samsat Tujuan", val)}
                          placeholder="Pilih wilayah Samsat tujuan mutasi..."
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Wilayah kantor Samsat tujuan mutasi berkas
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* SECTION 2: Informasi Customer & Pemilik */}
                  <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs rounded-xl space-y-4">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/60">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                          2. Informasi Customer & Pemilik
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Identitas pemesan, nama legal pemilik pada STNK/BPKB, serta kontak aktif
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      {/* Nama Customer */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Nama Customer <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Contoh: Bpk. Bambang Wijaya"
                          className="w-full bg-input-background border-border h-9 text-xs"
                          value={row["Nama Customer"] || ""}
                          onChange={(e) => handleFieldChange(rowIndex, "Nama Customer", e.target.value)}
                        />
                      </div>

                      {/* Checkbox: Nama Pemilik sama dengan Nama Customer */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <input
                          type="checkbox"
                          id={`same-as-customer-${rowIndex}`}
                          checked={!!sameAsCustomer[rowIndex]}
                          onChange={(e) => handleToggleSameAsCustomer(rowIndex, e.target.checked)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/25 cursor-pointer accent-primary"
                        />
                        <label
                          htmlFor={`same-as-customer-${rowIndex}`}
                          className="text-xs text-foreground/90 select-none cursor-pointer font-medium"
                        >
                          Nama Pemilik sama dengan Nama Customer
                        </label>
                      </div>

                      {/* Row: Nama Pemilik (STNK/BPKB) | Nomor HP / WhatsApp */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/90">
                            Nama Pemilik (STNK/BPKB){" "}
                            <span className="text-muted-foreground font-normal">(Opsional)</span>
                          </Label>
                          <Input
                            type="text"
                            disabled={sameAsCustomer[rowIndex]}
                            placeholder={sameAsCustomer[rowIndex] ? "Sama dengan nama customer" : "Nama pemilik yang tertera di STNK..."}
                            className={cn(
                              "w-full bg-input-background border-border h-9 text-xs",
                              sameAsCustomer[rowIndex] && "bg-muted/40 cursor-not-allowed opacity-80"
                            )}
                            value={row["Nama Pemilik (STNK/BPKB)"] || ""}
                            onChange={(e) => handleFieldChange(rowIndex, "Nama Pemilik (STNK/BPKB)", e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {sameAsCustomer[rowIndex]
                              ? "Otomatis diselaraskan dengan Nama Customer"
                              : "Isi jika nama pemilik STNK/BPKB berbeda dengan pemesan"}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/90">
                            Nomor HP / WhatsApp Customer <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="tel"
                            placeholder="Contoh: 081289123456"
                            className="w-full bg-input-background border-border h-9 text-xs"
                            value={row["Nomor HP"] || row["No HP"] || ""}
                            onChange={(e) => {
                              handleFieldChange(rowIndex, "Nomor HP", e.target.value);
                              handleFieldChange(rowIndex, "No HP", e.target.value);
                            }}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Nomor aktif WhatsApp untuk update progres (min 9 digit)
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                    {/* SECTION 3: Penerimaan Uang */}
                  <Card className="p-4 sm:p-5 border border-emerald-500/30 bg-emerald-500/5 shadow-xs rounded-xl space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/20">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                            3. Penerimaan Uang
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Pencatatan kas masuk dari konsumen beserta rincian metode pembayaran dan rekening
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      >
                        Kas Masuk
                      </Badge>
                    </div>

                    <div className="space-y-3.5">
                      {/* Urutan 1 & 2: Tanggal Uang Masuk | Uang Masuk dari Konsumen */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/90">
                            1. Tanggal Uang Masuk <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="date"
                            className="w-full bg-input-background border-border h-9 text-xs"
                            value={row["Tanggal Uang Masuk"] || ""}
                            onChange={(e) => handleFieldChange(rowIndex, "Tanggal Uang Masuk", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/90">
                            2. Uang Masuk dari Konsumen (Rp) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            className="w-full bg-input-background border-border h-9 text-xs font-mono font-medium"
                            value={row["Uang Masuk dari Konsumen"] || ""}
                            onChange={(e) => handleFieldChange(rowIndex, "Uang Masuk dari Konsumen", e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Dapat diisi manual sesuai nominal transfer / tunai diterima
                          </p>
                        </div>
                      </div>

                      {/* Urutan 3 & 4: Metode Pembayaran Masuk | Bank/Saluran Uang Masuk */}
                      {(() => {
                        const isCashMasuk =
                          row["Metode Pembayaran Masuk"] === "Cash / Tunai" ||
                          row["Metode Pembayaran Masuk"] === "Cash" ||
                          row["Metode Pembayaran Masuk"] === "Tunai";

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-foreground/90">
                                3. Metode Pembayaran Masuk
                              </Label>
                              <Select
                                value={row["Metode Pembayaran Masuk"] || "Transfer Bank"}
                                onValueChange={(val) => handleFieldChange(rowIndex, "Metode Pembayaran Masuk", val)}
                              >
                                <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
                                  <SelectValue placeholder="Pilih metode penerimaan" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Transfer Bank" className="text-xs">
                                    Transfer Bank
                                  </SelectItem>
                                  <SelectItem value="Cash / Tunai" className="text-xs">
                                    Cash / Tunai
                                  </SelectItem>
                                  <SelectItem value="QRIS" className="text-xs">
                                    QRIS
                                  </SelectItem>
                                  <SelectItem value="Lainnya" className="text-xs">
                                    Lainnya (Custom)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {row["Metode Pembayaran Masuk"] === "Lainnya" && (
                                <Input
                                  type="text"
                                  placeholder="Nama metode masuk custom..."
                                  className="w-full bg-input-background border-border h-8 text-xs mt-1"
                                  value={customMetodeMasuk[rowIndex] || ""}
                                  onChange={(e) =>
                                    setCustomMetodeMasuk((p) => ({ ...p, [rowIndex]: e.target.value }))
                                  }
                                />
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-foreground/90">
                                4. Bank / Saluran Uang Masuk
                              </Label>
                              {isCashMasuk ? (
                                <Input
                                  type="text"
                                  disabled
                                  readOnly
                                  className="w-full bg-muted/50 text-muted-foreground border-border h-9 text-xs cursor-not-allowed italic"
                                  value="- (Pembayaran Tunai, Bank Tidak Diperlukan)"
                                />
                              ) : (
                                <Select
                                  value={row["Bank Uang Masuk"] || activeBankNames[0] || "BCA"}
                                  onValueChange={(val) => handleFieldChange(rowIndex, "Bank Uang Masuk", val)}
                                >
                                  <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
                                    <SelectValue placeholder="Pilih bank penerima" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {bankMasukOptions.map((b) => (
                                      <SelectItem key={b} value={b} className="text-xs">
                                        {b}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {!isCashMasuk && row["Bank Uang Masuk"] === "Lainnya" && (
                                <Input
                                  type="text"
                                  placeholder="Nama bank masuk custom..."
                                  className="w-full bg-input-background border-border h-8 text-xs mt-1"
                                  value={customBankMasuk[rowIndex] || ""}
                                  onChange={(e) =>
                                    setCustomBankMasuk((p) => ({ ...p, [rowIndex]: e.target.value }))
                                  }
                                />
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Urutan 5: Nomor Rekening & Nama Pemilik Rekening Pengirim */}
                      {(() => {
                        const isCashMasuk =
                          row["Metode Pembayaran Masuk"] === "Cash / Tunai" ||
                          row["Metode Pembayaran Masuk"] === "Cash" ||
                          row["Metode Pembayaran Masuk"] === "Tunai";

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-foreground/80">
                                5a. Nomor Rekening Pengirim{" "}
                                <span className="text-muted-foreground font-normal">(Opsional)</span>
                              </Label>
                              <Input
                                type="text"
                                disabled={isCashMasuk}
                                placeholder={isCashMasuk ? "- (Tidak diperlukan untuk tunai)" : "Contoh: 8830123456"}
                                className={cn(
                                  "w-full border-border h-9 text-xs font-mono",
                                  isCashMasuk ? "bg-muted/50 text-muted-foreground cursor-not-allowed italic" : "bg-input-background"
                                )}
                                value={isCashMasuk ? "" : (row["Nomor Rekening Masuk"] || "")}
                                onChange={(e) => handleFieldChange(rowIndex, "Nomor Rekening Masuk", e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-foreground/80">
                                5b. Nama Pemilik Rekening Pengirim{" "}
                                <span className="text-muted-foreground font-normal">(Opsional)</span>
                              </Label>
                              <Input
                                type="text"
                                disabled={isCashMasuk}
                                placeholder={isCashMasuk ? "- (Tidak diperlukan untuk tunai)" : "Contoh: Bambang Wijaya"}
                                className={cn(
                                  "w-full border-border h-9 text-xs",
                                  isCashMasuk ? "bg-muted/50 text-muted-foreground cursor-not-allowed italic" : "bg-input-background"
                                )}
                                value={isCashMasuk ? "" : (row["Nama Pemilik Rekening Masuk"] || "")}
                                onChange={(e) => handleFieldChange(rowIndex, "Nama Pemilik Rekening Masuk", e.target.value)}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </Card>

                  {/* SECTION 4: Pengeluaran Samsat */}
                  <Card className="p-4 sm:p-5 border border-amber-500/30 bg-amber-500/5 shadow-xs rounded-xl space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-amber-500/20">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300">
                            4. Pengeluaran Samsat
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Pencatatan kas keluar untuk pembayaran biaya riil loket Samsat
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20"
                      >
                        Kas Keluar
                      </Badge>
                    </div>

                    <div className="space-y-3.5">
                      {/* Urutan 1 & 2: Tanggal Uang Keluar | Biaya Pokok Samsat */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/90">
                            1. Tanggal Uang Keluar <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="date"
                            className="w-full bg-input-background border-border h-9 text-xs"
                            value={row["Tanggal Uang Keluar"] || ""}
                            onChange={(e) => handleFieldChange(rowIndex, "Tanggal Uang Keluar", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/90">
                            2. Biaya Pokok Samsat (Rp) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            className="w-full bg-input-background border-border h-9 text-xs font-mono font-medium"
                            value={row["Biaya Pokok Samsat"] || ""}
                            onChange={(e) => handleFieldChange(rowIndex, "Biaya Pokok Samsat", e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Dapat diisi manual sesuai pengeluaran riil di Samsat
                          </p>
                        </div>
                      </div>

                      {/* Urutan 3 & 4: Metode Pembayaran Keluar | Bank/Saluran Uang Keluar */}
                      {(() => {
                        const isCashKeluar =
                          row["Metode Pembayaran Keluar"] === "Kas Tunai" ||
                          row["Metode Pembayaran Keluar"] === "Cash" ||
                          row["Metode Pembayaran Keluar"] === "Tunai";

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-foreground/90">
                                3. Metode Pembayaran Keluar
                              </Label>
                              <Select
                                value={row["Metode Pembayaran Keluar"] || "Kas Tunai"}
                                onValueChange={(val) => handleFieldChange(rowIndex, "Metode Pembayaran Keluar", val)}
                              >
                                <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
                                  <SelectValue placeholder="Pilih metode kas keluar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Kas Tunai" className="text-xs">
                                    Kas Tunai
                                  </SelectItem>
                                  <SelectItem value="Transfer Bank" className="text-xs">
                                    Transfer Bank
                                  </SelectItem>
                                  <SelectItem value="Kas Kantor" className="text-xs">
                                    Kas Kantor
                                  </SelectItem>
                                  <SelectItem value="Kas Messenger" className="text-xs">
                                    Kas Messenger
                                  </SelectItem>
                                  <SelectItem value="QRIS" className="text-xs">
                                    QRIS
                                  </SelectItem>
                                  <SelectItem value="Lainnya" className="text-xs">
                                    Lainnya (Custom)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {row["Metode Pembayaran Keluar"] === "Lainnya" && (
                                <Input
                                  type="text"
                                  placeholder="Nama metode keluar custom..."
                                  className="w-full bg-input-background border-border h-8 text-xs mt-1"
                                  value={customMetodeKeluar[rowIndex] || ""}
                                  onChange={(e) =>
                                    setCustomMetodeKeluar((p) => ({ ...p, [rowIndex]: e.target.value }))
                                  }
                                />
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-foreground/90">
                                4. Bank / Saluran Uang Keluar
                              </Label>
                              {isCashKeluar ? (
                                <Input
                                  type="text"
                                  disabled
                                  readOnly
                                  className="w-full bg-muted/50 text-muted-foreground border-border h-9 text-xs cursor-not-allowed italic"
                                  value="- (Kas Tunai, Bank Tidak Diperlukan)"
                                />
                              ) : (
                                <Select
                                  value={row["Bank Uang Keluar"] || activeBankNames[0] || "BCA"}
                                  onValueChange={(val) => handleFieldChange(rowIndex, "Bank Uang Keluar", val)}
                                >
                                  <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
                                    <SelectValue placeholder="Pilih sumber kas keluar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {bankKeluarOptions.map((b) => (
                                      <SelectItem key={b} value={b} className="text-xs">
                                        {b}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {!isCashKeluar && row["Bank Uang Keluar"] === "Lainnya" && (
                                <Input
                                  type="text"
                                  placeholder="Nama bank/kas keluar custom..."
                                  className="w-full bg-input-background border-border h-8 text-xs mt-1"
                                  value={customBankKeluar[rowIndex] || ""}
                                  onChange={(e) =>
                                    setCustomBankKeluar((p) => ({ ...p, [rowIndex]: e.target.value }))
                                  }
                                />
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Urutan 5: Nama Rekening / Penerima (Pengeluaran Samsat) */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground/80">
                          5. Nama Rekening / Penerima (Samsat){" "}
                          <span className="text-muted-foreground font-normal">(Opsional)</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Contoh: Kasda Samsat Jabar / Petugas Loket Samsat"
                          className="w-full bg-input-background border-border h-9 text-xs"
                          value={row["Nama Rekening/Penerima"] || row["Nama Pemilik Rekening Keluar"] || ""}
                          onChange={(e) => handleFieldChange(rowIndex, "Nama Rekening/Penerima", e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Nama instansi / bendahara / pihak penerima dana pengeluaran Samsat
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* SECTION 5: Ringkasan Keuangan */}
                  <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs rounded-xl space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                            5. Ringkasan Keuangan
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Kalkulasi menyeluruh metrik keuangan: Biaya Jasa, Biaya Antar Jemput, Total Tagihan, Uang Masuk, Biaya Samsat, Sisa, Profit, Cashback, dan Selisih
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Metrik Keuangan Kanonis
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {/* Breakdown Biaya Jasa, Biaya Antar Jemput, dan Total Tagihan */}
                      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-primary/10">
                          <div>
                            <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Calculator className="w-4 h-4 text-primary" />
                              Komponen Biaya Jasa & Total Kesepakatan Tagihan
                            </h5>
                            <p className="text-[11px] text-muted-foreground">
                              Biaya Jasa diambil otomatis dari Master Biaya Layanan berdasarkan kombinasi layanan Mutasi Luar Daerah dan wilayah Samsat
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                          {/* 1. Biaya Jasa */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <span>Biaya Jasa (Rp)</span>
                                <span className="text-destructive">*</span>
                              </Label>
                              {(() => {
                                const pricing = lookupBiayaLayanan(row["Samsat Asal"] || row["Samsat"]);
                                return pricing ? (
                                  <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                    Master Biaya Layanan
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                                    Manual
                                  </Badge>
                                );
                              })()}
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              className="w-full bg-background border-border h-9 text-xs font-mono font-semibold"
                              value={row["Biaya Jasa"] !== undefined ? row["Biaya Jasa"] : ""}
                              onChange={(e) => handleFieldChange(rowIndex, "Biaya Jasa", e.target.value)}
                            />
                            {!lookupBiayaLayanan(row["Samsat Asal"] || row["Samsat"]) && (
                              <p className="text-[10px] text-amber-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                Tarif belum terdaftar di Master Biaya Layanan. Silakan isi manual.
                              </p>
                            )}
                          </div>

                          {/* 2. Biaya Antar Jemput */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Biaya Antar Jemput</span>
                                <span className="text-muted-foreground font-normal text-[10px]">(Opsional)</span>
                              </Label>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              placeholder="0"
                              className="w-full bg-background border-border h-9 text-xs font-mono"
                              value={row["Biaya Antar Jemput"] !== undefined ? row["Biaya Antar Jemput"] : 0}
                              onChange={(e) => handleFieldChange(rowIndex, "Biaya Antar Jemput", e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Biaya logistik pengantaran/penjemputan berkas
                            </p>
                          </div>

                          {/* 3. Total Tagihan Konsumen */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                              <span>Total Tagihan Konsumen (Rp)</span>
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              placeholder="0"
                              className="w-full bg-background border-border h-9 text-sm font-bold font-mono text-primary"
                              value={row["Total Tagihan Konsumen"] !== undefined ? row["Total Tagihan Konsumen"] : ""}
                              onChange={(e) => handleFieldChange(rowIndex, "Total Tagihan Konsumen", e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                              = Biaya Pokok Samsat + Biaya Jasa + Biaya Antar Jemput
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 8 Metric Cards in Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 1. Total Tagihan */}
                        <div className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>1. Total Tagihan</span>
                            <Badge variant="outline" className="text-[9px] h-4">
                              Tagihan
                            </Badge>
                          </div>
                          <div className="text-sm sm:text-base font-bold font-mono text-foreground py-0.5">
                            {formatRupiah(Number(row["Total Tagihan Konsumen"]) || 0)}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            Total kesepakatan tagihan ke konsumen
                          </p>
                        </div>

                        {/* 2. Total Uang Masuk */}
                        <div className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>2. Total Uang Masuk</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            >
                              Masuk
                            </Badge>
                          </div>
                          <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 py-0.5">
                            {formatRupiah(Number(row["Uang Masuk dari Konsumen"]) || 0)}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            Penerimaan pembayaran yang sudah dicatat dari konsumen
                          </p>
                        </div>

                        {/* 3. Biaya Pokok Samsat */}
                        <div className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>3. Biaya Pokok Samsat</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 bg-amber-500/10 text-amber-600 border-amber-500/20"
                            >
                              Samsat
                            </Badge>
                          </div>
                          <div className="text-sm sm:text-base font-bold font-mono text-amber-600 dark:text-amber-400 py-0.5">
                            {formatRupiah(Number(row["Biaya Pokok Samsat"]) || 0)}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            Biaya riil pengurusan yang dibayarkan ke Samsat
                          </p>
                        </div>

                        {/* 4. Biaya Jasa (Ganti Profit (Jasa)) */}
                        <div className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>4. Biaya Jasa</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 bg-primary/10 text-primary border-primary/25"
                            >
                              Master Jasa
                            </Badge>
                          </div>
                          <div className="text-sm sm:text-base font-bold font-mono text-primary py-0.5">
                            {formatRupiah(Number(row["Biaya Jasa"]) || 0)}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            Tarif jasa pengurusan dari Master Biaya Layanan
                          </p>
                        </div>

                        {/* 5. Biaya Antar Jemput */}
                        <div className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>5. Biaya Antar Jemput</span>
                            <Badge variant="outline" className="text-[9px] h-4">
                              Logistik
                            </Badge>
                          </div>
                          <div className="text-sm sm:text-base font-bold font-mono text-foreground py-0.5">
                            {formatRupiah(Number(row["Biaya Antar Jemput"]) || 0)}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            Biaya kurir / antar jemput berkas kendaraan
                          </p>
                        </div>

                        {/* 6. Sisa Tagihan */}
                        <div className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>6. Sisa Tagihan</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] h-4",
                                (Number(row["Sisa Tagihan"]) || 0) > 0
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              )}
                            >
                              {(Number(row["Sisa Tagihan"]) || 0) > 0 ? "Kurang Bayar" : "Lunas"}
                            </Badge>
                          </div>
                          <div className="text-sm sm:text-base font-bold font-mono text-foreground py-0.5">
                            {formatRupiah(Number(row["Sisa Tagihan"]) || 0)}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {(Number(row["Sisa Tagihan"]) || 0) > 0
                              ? "Kekurangan biaya yang masih harus dilunasi oleh konsumen"
                              : "Tagihan konsumen telah terlunasi penuh"}
                          </p>
                        </div>

                        {/* 7. Profit Global */}
                        <div className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>7. Profit (Laba Kotor)</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
                            >
                              Profit
                            </Badge>
                          </div>
                          <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 py-0.5">
                            {formatRupiah(Number(row["Profit"]) || 0)}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            Laba kotor biro jasa (Total Tagihan − Biaya Pokok Samsat)
                          </p>
                        </div>

                        {/* 8. Jumlah Cashback */}
                        {(() => {
                          const cashback = Number(row["Jumlah Cashback"]) || 0;
                          return (
                            <div className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>8. Jumlah Cashback</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] h-4",
                                    cashback > 0
                                      ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/30"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {cashback > 0 ? "Kelebihan" : "Rp 0"}
                                </Badge>
                              </div>
                              <div
                                className={cn(
                                  "text-sm sm:text-base font-bold font-mono py-0.5",
                                  cashback > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"
                                )}
                              >
                                {formatRupiah(cashback)}
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                {cashback > 0
                                  ? "Kelebihan pembayaran dari konsumen yang harus dikembalikan"
                                  : "Tidak ada kelebihan pembayaran konsumen"}
                              </p>
                            </div>
                          );
                        })()}

                        {/* Selisih Uang Masuk vs Biaya Pokok Samsat (Full width on lg) */}
                        {(() => {
                          const selisih =
                            (Number(row["Uang Masuk dari Konsumen"]) || 0) -
                            (Number(row["Biaya Pokok Samsat"]) || 0);
                          const isSurplus = selisih >= 0;
                          return (
                            <div className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5 sm:col-span-2 lg:col-span-4">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>9. Selisih Uang Masuk vs Biaya Samsat</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] h-4",
                                    isSurplus
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                      : "bg-destructive/10 text-destructive border-destructive/30"
                                  )}
                                >
                                  {isSurplus ? "Surplus / Kas Cukup" : "Talangan Kas Kantor"}
                                </Badge>
                              </div>
                              <div
                                className={cn(
                                  "text-sm sm:text-base font-bold font-mono py-0.5",
                                  isSurplus ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                                )}
                              >
                                {(selisih >= 0 ? "+" : "") + formatRupiah(selisih)}
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                {selisih > 0
                                  ? "Penerimaan melebihi biaya pokok Samsat (Margin kotor sementara / surplus kas)."
                                  : selisih === 0
                                  ? "Penerimaan seimbang dengan biaya riil Samsat."
                                  : "Biaya pokok Samsat melampaui uang muka (Talangan sementara kas biro jasa)."}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </Card>

                  {/* SECTION 6: Invoice & Status Berkas */}
                  <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs rounded-xl space-y-4">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/60">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                          6. Invoice & Status Berkas
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Status pengerjaan operasional, status pembayaran, nomor invoice, fisik BPKB, dan tanda terima
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                      {/* Status Pengerjaan (Select Dropdown: Pending (default) / Selesai) */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Status Pengerjaan <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={row["Status Pengerjaan"] || "Pending"}
                          onValueChange={(val) => handleFieldChange(rowIndex, "Status Pengerjaan", val)}
                        >
                          <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
                            <SelectValue placeholder="Pilih status pengerjaan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending" className="text-xs">
                              Pending (Sedang Berjalan)
                            </SelectItem>
                            <SelectItem value="Selesai" className="text-xs">
                              Selesai (Arsip Tuntas)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Default 'Pending' saat form dibuka; pilih 'Selesai' jika pengurusan telah tuntas
                        </p>
                      </div>

                      {/* Status Pembayaran (4 canonical badges: Belum Bayar, Kurang Bayar, Lunas, Kelebihan Bayar) */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Status Pembayaran
                        </Label>
                        {(() => {
                          const status = row["Status Pembayaran"] || "Belum Bayar";
                          let colorClasses = "bg-muted/40 text-muted-foreground border-border";
                          if (status === "Lunas") {
                            colorClasses =
                              "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
                          } else if (status === "Kurang Bayar") {
                            colorClasses =
                              "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
                          } else if (status === "Kelebihan Bayar") {
                            colorClasses =
                              "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30";
                          } else if (status === "Belum Bayar") {
                            colorClasses =
                              "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
                          }

                          return (
                            <div
                              className={cn(
                                "h-9 px-3 rounded-md border flex items-center gap-2 text-xs font-semibold select-none",
                                colorClasses
                              )}
                            >
                              <ShieldCheck className="w-4 h-4 shrink-0" />
                              <span>{status}</span>
                            </div>
                          );
                        })()}
                        <p className="text-[10px] text-muted-foreground">
                          Dihitung otomatis dari perbandingan Total Tagihan dan Uang Masuk
                        </p>
                      </div>

                      {/* No Invoice (Manual, default empty "") */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          No Invoice <span className="text-muted-foreground font-normal">(Opsional)</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Kosong jika belum ada"
                          className="w-full bg-input-background border-border h-9 text-xs font-mono"
                          value={row["No Invoice"] || ""}
                          onChange={(e) => handleFieldChange(rowIndex, "No Invoice", e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Tidak dibuat otomatis; kosongkan jika belum terbit
                        </p>
                      </div>

                      {/* Tanggal Invoice */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Tanggal Invoice <span className="text-muted-foreground font-normal">(Opsional)</span>
                        </Label>
                        <Input
                          type="date"
                          className="w-full bg-input-background border-border h-9 text-xs"
                          value={row["Tanggal Invoice"] || ""}
                          onChange={(e) => handleFieldChange(rowIndex, "Tanggal Invoice", e.target.value)}
                        />
                      </div>

                      {/* BPKB (Select: "" (-), "Ada", "Belum") */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          BPKB (Ketersediaan Berkas)
                        </Label>
                        <Select
                          value={row["BPKB"] || ""}
                          onValueChange={(val) => handleFieldChange(rowIndex, "BPKB", val)}
                        >
                          <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
                            <SelectValue placeholder="Pilih status berkas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="" className="text-xs text-muted-foreground">
                              - (Belum Ditentukan)
                            </SelectItem>
                            <SelectItem value="Ada" className="text-xs">
                              Ada (Fisik Berkas Ada)
                            </SelectItem>
                            <SelectItem value="Belum" className="text-xs">
                              Belum (Belum Diterima)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status BPKB (Select: "" (-), "Proses", "Selesai") */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Status BPKB
                        </Label>
                        <Select
                          value={row["Status BPKB"] || ""}
                          onValueChange={(val) => handleFieldChange(rowIndex, "Status BPKB", val)}
                        >
                          <SelectTrigger className="w-full bg-input-background border-border h-9 text-xs">
                            <SelectValue placeholder="Pilih status pengerjaan BPKB" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="" className="text-xs text-muted-foreground">
                              - (Belum Ditentukan)
                            </SelectItem>
                            <SelectItem value="Proses" className="text-xs">
                              Proses
                            </SelectItem>
                            <SelectItem value="Selesai" className="text-xs">
                              Selesai
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tanda Terima (Manual text, default "") */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          Tanda Terima <span className="text-muted-foreground font-normal">(Opsional)</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Nomor tanda terima berkas..."
                          className="w-full bg-input-background border-border h-9 text-xs font-mono"
                          value={row["Tanda Terima"] || ""}
                          onChange={(e) => handleFieldChange(rowIndex, "Tanda Terima", e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Tidak dibuat otomatis; kosongkan jika belum terbit
                        </p>
                      </div>

                      {/* TTB BPKB (Manual text, default "") */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          TTB BPKB <span className="text-muted-foreground font-normal">(Opsional)</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Nomor tanda terima berkas BPKB..."
                          className="w-full bg-input-background border-border h-9 text-xs font-mono"
                          value={row["TTB BPKB"] || ""}
                          onChange={(e) => handleFieldChange(rowIndex, "TTB BPKB", e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Tidak dibuat otomatis; kosongkan jika belum terbit
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* SECTION 7: Dokumen Kendaraan (Dokumen Awal & Dokumen Akhir) */}
                  <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs rounded-xl space-y-4">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/60">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                          7. Dokumen Kendaraan
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Unggah arsip berkas digital sebelum proses (Dokumen Awal) dan dokumen hasil pengurusan (Dokumen Akhir).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sub-Card 1: Dokumen Awal */}
                      <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <div>
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              Dokumen Awal (Sebelum Pengurusan)
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              STNK, BPKB, KTP pemilik, atau bukti fisik awal sebelum proses Samsat
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-primary/5 text-primary border-primary/20 shrink-0"
                          >
                            {docsAwalList.length} Berkas
                          </Badge>
                        </div>

                        {/* Upload button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingAwal[rowIndex]}
                          onClick={() => triggerUploadAwal(rowIndex)}
                          className="w-full h-9 border-dashed border-primary/40 text-primary hover:bg-primary/5 text-xs flex items-center justify-center gap-2 font-medium"
                        >
                          {uploadingAwal[rowIndex] ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Mengunggah dokumen awal...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Pilih Berkas Dokumen Awal</span>
                            </>
                          )}
                        </Button>

                        {/* List of uploaded Dokumen Awal */}
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {docsAwalList.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground text-center py-2.5 italic">
                              Belum ada Dokumen Awal yang diunggah.
                            </p>
                          ) : (
                            docsAwalList.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-2 rounded-md border border-border bg-card text-xs gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-primary shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground truncate max-w-[170px] text-[11px]">
                                      {doc.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                      <span>{doc.formattedSize}</span>
                                      <span>•</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        Tersimpan
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setPreviewDoc({
                                        isOpen: true,
                                        title: `Preview Dokumen Awal — ${doc.name}`,
                                        documentName: doc.name,
                                        rawUrl: doc.fileUrl,
                                        fileType: doc.mimeType?.includes("pdf") ? "pdf" : "image",
                                        documentId: doc.id,
                                      })
                                    }
                                    className="h-6 px-1.5 text-[11px] text-primary"
                                    title="Lihat Berkas"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Lihat
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadDoc(doc)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    title="Unduh Berkas"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveDoc(rowIndex, "dokumenAwal", doc.id)}
                                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                    title="Hapus Berkas"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Sub-Card 2: Dokumen Akhir */}
                      <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <div>
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Dokumen Akhir (Hasil Pengurusan)
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Notice Pajak, STNK Baru, SKKP, BPKB Jadi, atau dokumen selesai dari Samsat
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0"
                          >
                            {docsAkhirList.length} Berkas
                          </Badge>
                        </div>

                        {/* Upload button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingAkhir[rowIndex]}
                          onClick={() => triggerUploadAkhir(rowIndex)}
                          className="w-full h-9 border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 text-xs flex items-center justify-center gap-2 font-medium"
                        >
                          {uploadingAkhir[rowIndex] ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Mengunggah dokumen akhir...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Pilih Berkas Dokumen Akhir</span>
                            </>
                          )}
                        </Button>

                        {/* List of uploaded Dokumen Akhir */}
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {docsAkhirList.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground text-center py-2.5 italic">
                              Belum ada Dokumen Akhir yang diunggah.
                            </p>
                          ) : (
                            docsAkhirList.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-2 rounded-md border border-border bg-card text-xs gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground truncate max-w-[170px] text-[11px]">
                                      {doc.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                      <span>{doc.formattedSize}</span>
                                      <span>•</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        Tersimpan
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setPreviewDoc({
                                        isOpen: true,
                                        title: `Preview Dokumen Akhir — ${doc.name}`,
                                        documentName: doc.name,
                                        rawUrl: doc.fileUrl,
                                        fileType: doc.mimeType?.includes("pdf") ? "pdf" : "image",
                                        documentId: doc.id,
                                      })
                                    }
                                    className="h-6 px-1.5 text-[11px] text-emerald-600 dark:text-emerald-400"
                                    title="Lihat Berkas"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Lihat
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadDoc(doc)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    title="Unduh Berkas"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveDoc(rowIndex, "dokumenAkhir", doc.id)}
                                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                    title="Hapus Berkas"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                /* Generic Single Card Layout for other non-Mutasi LD forms */
                <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs rounded-xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {fields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/90">
                          {field.label} {!field.readOnly && <span className="text-destructive">*</span>}
                        </Label>
                        {renderGenericFieldInput(row, rowIndex, field)}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          );
        })}

        {/* Add Row Button and Bottom Submit Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/70">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="border-dashed border-primary/40 text-primary hover:bg-primary/5 text-xs h-9 px-3.5 flex items-center gap-1.5 font-medium w-full sm:w-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah baris data</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelClick}
              className="text-xs h-9 px-3.5 w-full sm:w-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Batal</span>
            </Button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              type="submit"
              onClick={handleSubmit}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 px-5 font-semibold shadow-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Data Penjualan {isMutasiLD ? "(Mutasi LD)" : ""}</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Discard Confirmation Alert Dialog */}
      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent className="border-border sm:max-w-md bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              Perubahan Belum Disimpan
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Anda memiliki data yang telah diisi namun belum disimpan. Jika Anda membatalkan sekarang, semua baris data dan dokumen yang telah diunggah akan dibuang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8.5 text-xs font-medium"
              onClick={() => setIsDiscardDialogOpen(false)}
            >
              Lanjutkan Mengedit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={handleConfirmDiscard}
            >
              Buang Perubahan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={previewDoc.isOpen}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          documentName={previewDoc.documentName}
          rawUrl={previewDoc.rawUrl}
          fileType={previewDoc.fileType}
          documentId={previewDoc.documentId}
        />
      )}
    </motion.div>
  );
}
