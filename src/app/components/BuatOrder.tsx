import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import {
  User,
  MapPin,
  Calculator,
  FileText,
  CreditCard,
  Car,
  CheckCircle2,
  Upload,
  AlertCircle,
  Copy,
  Check,
  QrCode,
  Eye,
  Trash2,
  RefreshCw,
  File as FileIcon,
  Image as ImageIcon,
  Building,
  FileUp,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { orderStore, OperationalOrder, StructuredAddress, OrderDocument, PaymentProof } from "../data/orderStore";
import { pricingStore, usePricingStore } from "../data/pricingStore";
import { documentRepository } from "../../data/repositories/documentRepository";
import { cn } from "./ui/utils";

const layananOptions = [
  "Perpanjangan 1 Tahun",
  "Perpanjangan 5 Tahun",
  "Balik Nama",
  "Mutasi Antar Samsat",
  "Mutasi Luar Daerah",
];

const bulanOptions = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface BuatOrderProps {
  onOrderCreated?: (order: OperationalOrder) => void;
  currentUserName?: string;
  currentUserRole?: string;
  currentUserId?: string;
}

interface AttachedDocState {
  file?: File;
  name: string;
  fileType: "pdf" | "image" | "";
  fileUrl?: string;
  fileSize?: string;
  attached: boolean;
}

export function BuatOrder({
  onOrderCreated,
  currentUserName = "Admin Loket",
  currentUserRole = "admin",
  currentUserId,
}: BuatOrderProps) {
  usePricingStore(); // Reactive subscription to pricingStore configuration

  // Stepper State: 1 = Data Klien, 2 = Dokumen Kendaraan, 3 = Pembayaran & Ringkasan
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSameAddress, setIsSameAddress] = useState(true);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedQris, setCopiedQris] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);

  // 3-part Plate Number state
  const [platePrefix, setPlatePrefix] = useState("B");
  const [plateNumber, setPlateNumber] = useState("");
  const [plateSuffix, setPlateSuffix] = useState("");

  // Preview modal for documents / payment proof
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    name: string;
    fileType: string;
    fileUrl?: string;
  } | null>(null);

  // Validation errors for Step 1
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Confirmation dialogs
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [createdOrderSuccess, setCreatedOrderSuccess] = useState<OperationalOrder | null>(null);

  const clearFieldError = (key: string) => {
    if (step1Errors[key]) {
      setStep1Errors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    // 1. Data Klien & Pemilik
    customer: "",
    namaPemilik: "",
    nomorHP: "",
    kepemilikanKendaraan: "Pribadi",

    // 2. Kendaraan & Layanan
    layanan: "",
    metodeLayanan: "Antar Jemput" as "Antar Jemput" | "Datang Langsung",
    jenisKendaraan: "Mobil",
    tahunKendaraan: new Date().getFullYear().toString(),
    wilayahSamsatAsal: "Jakarta Timur",
    wilayahSamsatTujuan: "Jakarta Timur",

    // 3. Informasi Pajak Kendaraan
    pkbBerlakuSd: "",
    tahunPajak: new Date().getFullYear().toString(),
    bulanPajak: "Januari",
    nominalPkbTerakhir: "",
    nominalSwdkllj: "143000",

    // 4. Pembayaran
    tipePembayaran: "Bayar di Akhir" as "Bayar di Awal" | "Bayar di Akhir",
    metodePembayaran: "Transfer Bank BCA",

    // 5. Alamat Penjemputan
    jemputKota: "Jakarta Timur",
    jemputKecamatan: "",
    jemputKelurahan: "",
    jemputDetail: "",
    jemputRtRw: "",
    jemputNomor: "",
    jemputLandmark: "",
    jemputMapsUrl: "",

    // 6. Alamat Pengantaran
    antarKota: "Jakarta Timur",
    antarKecamatan: "",
    antarKelurahan: "",
    antarDetail: "",
    antarRtRw: "",
    antarNomor: "",
    antarLandmark: "",
    antarMapsUrl: "",
  });

  // 5 Dokumen Kendaraan (Semua Optional)
  const [docs, setDocs] = useState<Record<string, AttachedDocState>>({
    stnk: { name: "", fileType: "", attached: false },
    bpkb: { name: "", fileType: "", attached: false },
    ktp: { name: "", fileType: "", attached: false },
    skkp: { name: "", fileType: "", attached: false },
    lainnya: { name: "", fileType: "", attached: false },
  });

  // Bukti Pembayaran (Khusus Bayar di Awal)
  const [paymentProof, setPaymentProof] = useState<AttachedDocState>({
    name: "",
    fileType: "",
    attached: false,
  });

  const getCombinedNopol = () => {
    const parts = [platePrefix.trim().toUpperCase(), plateNumber.trim(), plateSuffix.trim().toUpperCase()];
    return parts.filter(Boolean).join(" ");
  };

  const currentConfig = formData.layanan
    ? pricingStore.getServiceFeeConfig(formData.layanan, formData.wilayahSamsatAsal)
    : undefined;
  const isOpsenEnabled = currentConfig?.swdkllj ? currentConfig.swdkllj.enabled !== false : true;
  const isAntarJemputEnabled = currentConfig ? currentConfig.antarJemputEnabled !== false : true;

  // Cost calculation via pricingStore SSoT
  const calculateCost = () => {
    const pkb = parseFloat(formData.nominalPkbTerakhir) || 0;
    const swdkllj = isOpsenEnabled ? (parseFloat(formData.nominalSwdkllj) || 0) : 0;
    const dendaSwdkllj = 0;

    if (!formData.layanan) {
      return {
        biayaJasa: 0,
        biayaSamsat: 0,
        biayaAntarJemput: 0,
        subtotalLayanan: 0,
        pkb,
        swdkllj,
        dendaSwdkllj,
        total: pkb + swdkllj,
        breakdown: [] as any[],
        snapshot: undefined,
      };
    }

    const snapshot = pricingStore.calculateOrderCost({
      serviceName: formData.layanan,
      wilayahSamsat: formData.wilayahSamsatAsal,
      metodeLayanan: formData.metodeLayanan,
      tipeJasa: "Lengkap",
      pkb,
      swdkllj: isOpsenEnabled ? (parseFloat(formData.nominalSwdkllj) || undefined) : 0,
      dendaSwdkllj,
    });

    const subtotalLayanan = snapshot.biayaJasa + snapshot.biayaSamsat + snapshot.biayaAntarJemput;

    return {
      biayaJasa: snapshot.biayaJasa,
      biayaSamsat: snapshot.biayaSamsat,
      biayaAntarJemput: snapshot.biayaAntarJemput,
      subtotalLayanan,
      pkb: snapshot.pkb,
      swdkllj: snapshot.swdkllj,
      dendaSwdkllj: snapshot.dendaSwdkllj,
      total: snapshot.totalEstimasi,
      breakdown: snapshot.breakdown,
      snapshot,
    };
  };

  const cost = calculateCost();

  // Document upload handler
  const handleDocFileSelect = (docKey: string, file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const fileType = isPdf ? ("pdf" as const) : ("image" as const);
    const fileUrl = URL.createObjectURL(file);
    const fileSize = (file.size / 1024).toFixed(0) + " KB";

    setDocs((prev) => ({
      ...prev,
      [docKey]: {
        file,
        name: file.name,
        fileType,
        fileUrl,
        fileSize,
        attached: true,
      },
    }));

    toast.success(`Dokumen ${file.name} berhasil dilampirkan.`);
  };

  const handleDocRemove = (docKey: string) => {
    setDocs((prev) => ({
      ...prev,
      [docKey]: {
        file: undefined,
        name: "",
        fileType: "",
        fileUrl: undefined,
        fileSize: undefined,
        attached: false,
      },
    }));
    toast.info("Dokumen dihapus dari lampiran.");
  };

  // Payment proof handler
  const handlePaymentProofSelect = (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const fileType = isPdf ? ("pdf" as const) : ("image" as const);
    const fileUrl = URL.createObjectURL(file);
    const fileSize = (file.size / 1024).toFixed(0) + " KB";

    setPaymentProof({
      file,
      name: file.name,
      fileType,
      fileUrl,
      fileSize,
      attached: true,
    });
    toast.success(`Bukti pembayaran ${file.name} berhasil diunggah.`);
  };

  const handlePaymentProofRemove = () => {
    setPaymentProof({
      file: undefined,
      name: "",
      fileType: "",
      fileUrl: undefined,
      fileSize: undefined,
      attached: false,
    });
    toast.info("Bukti pembayaran dihapus.");
  };

  // Copy to clipboard
  const handleCopy = (text: string, type: "bank" | "qris") => {
    navigator.clipboard.writeText(text);
    if (type === "bank") {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } else {
      setCopiedQris(true);
      setTimeout(() => setCopiedQris(false), 2000);
    }
    toast.success("Tersalin ke clipboard!");
  };

  const handleReset = () => {
    setCurrentStep(1);
    setPlatePrefix("B");
    setPlateNumber("");
    setPlateSuffix("");
    setFormData({
      customer: "",
      namaPemilik: "",
      nomorHP: "",
      kepemilikanKendaraan: "Pribadi",
      layanan: "",
      metodeLayanan: "Antar Jemput",
      jenisKendaraan: "Mobil",
      tahunKendaraan: new Date().getFullYear().toString(),
      wilayahSamsatAsal: "Jakarta Timur",
      wilayahSamsatTujuan: "Jakarta Timur",
      pkbBerlakuSd: "",
      tahunPajak: new Date().getFullYear().toString(),
      bulanPajak: "Januari",
      nominalPkbTerakhir: "",
      nominalSwdkllj: "143000",
      tipePembayaran: "Bayar di Akhir",
      metodePembayaran: "Transfer Bank BCA",
      jemputKota: "Jakarta Timur",
      jemputKecamatan: "",
      jemputKelurahan: "",
      jemputDetail: "",
      jemputRtRw: "",
      jemputNomor: "",
      jemputLandmark: "",
      jemputMapsUrl: "",
      antarKota: "Jakarta Timur",
      antarKecamatan: "",
      antarKelurahan: "",
      antarDetail: "",
      antarRtRw: "",
      antarNomor: "",
      antarLandmark: "",
      antarMapsUrl: "",
    });
    setDocs({
      stnk: { name: "", fileType: "", attached: false },
      bpkb: { name: "", fileType: "", attached: false },
      ktp: { name: "", fileType: "", attached: false },
      skkp: { name: "", fileType: "", attached: false },
      lainnya: { name: "", fileType: "", attached: false },
    });
    setPaymentProof({
      name: "",
      fileType: "",
      attached: false,
    });
    setIsSameAddress(true);
  };

  // Step 1 Validation
  const handleNextStep1 = () => {
    const errors: Record<string, string> = {};

    if (!formData.customer.trim()) {
      errors.customer = "Nama Customer wajib diisi!";
    }
    if (!formData.nomorHP.trim()) {
      errors.nomorHP = "Nomor Telepon wajib diisi!";
    } else if (formData.nomorHP.length < 9) {
      errors.nomorHP = "Nomor Telepon minimal terdiri dari 9 digit angka!";
    }
    if (!formData.layanan) {
      errors.layanan = "Silakan pilih jenis pengurusan terlebih dahulu!";
    }
    if (!plateNumber.trim()) {
      errors.plateNumber = "Nomor polisi kendaraan wajib diisi!";
    }
    if (formData.layanan.includes("Mutasi") && !formData.wilayahSamsatTujuan) {
      errors.wilayahSamsatTujuan = "Wilayah Samsat Tujuan wajib dipilih untuk layanan Mutasi!";
    }
    if (formData.metodeLayanan === "Antar Jemput" && !formData.jemputDetail.trim()) {
      errors.jemputDetail = "Detail alamat penjemputan dokumen wajib diisi untuk layanan Antar Jemput!";
    }

    if (Object.keys(errors).length > 0) {
      setStep1Errors(errors);
      toast.error("Lengkapi data yang wajib diisi terlebih dahulu.");

      // Auto-scroll to first invalid element
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const inputEl = el.querySelector("input") || el;
        if (inputEl && typeof (inputEl as any).focus === "function") {
          (inputEl as any).focus();
        }
      }
      return;
    }

    setStep1Errors({});
    setCurrentStep(2);
  };

  // Step 2 Validation
  const handleNextStep2 = () => {
    setCurrentStep(3);
  };

  const handleSubmitOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const fullNopol = getCombinedNopol();

    // Final Validations
    if (!formData.customer.trim()) {
      toast.error("Nama Customer wajib diisi!");
      setCurrentStep(1);
      return;
    }
    if (!formData.nomorHP.trim() || formData.nomorHP.length < 9) {
      toast.error("Nomor Telepon wajib diisi (minimal 9 digit)!");
      setCurrentStep(1);
      return;
    }
    if (!formData.layanan) {
      toast.error("Silakan pilih jenis pengurusan terlebih dahulu!");
      setCurrentStep(1);
      return;
    }
    if (!plateNumber.trim()) {
      toast.error("Nomor polisi kendaraan wajib diisi!");
      setCurrentStep(1);
      return;
    }
    if (formData.metodeLayanan === "Antar Jemput" && !formData.jemputDetail.trim()) {
      toast.error("Detail alamat penjemputan dokumen wajib diisi untuk layanan Antar Jemput!");
      setCurrentStep(1);
      return;
    }

    if (formData.tipePembayaran === "Bayar di Awal" && !formData.metodePembayaran) {
      toast.error("Untuk pilihan 'Bayar di Awal', metode pembayaran wajib dipilih!");
      return;
    }

    if (formData.tipePembayaran === "Bayar di Awal" && !paymentProof.attached) {
      toast.error("Bukti pembayaran wajib diunggah untuk pembayaran di awal.");
      return;
    }

    setIsSubmitting(true);

    try {
      const defaultJemputDetail = formData.metodeLayanan === "Datang Langsung" && !formData.jemputDetail.trim()
        ? "Loket Biro Jasa SUN89 (Datang Langsung)"
        : formData.jemputDetail;
      const defaultAntarDetail = formData.metodeLayanan === "Datang Langsung" && !formData.antarDetail.trim()
        ? "Loket Biro Jasa SUN89 (Ambil di Loket)"
        : (formData.antarDetail || defaultJemputDetail);

      const alamatPenjemputan: StructuredAddress = {
        kota: formData.jemputKota,
        kecamatan: formData.jemputKecamatan,
        kelurahan: formData.jemputKelurahan,
        detail: defaultJemputDetail,
        rtRw: formData.jemputRtRw,
        nomor: formData.jemputNomor,
        landmark: formData.jemputLandmark,
        mapsUrl: formData.jemputMapsUrl || undefined,
      };

      const alamatPengantaran: StructuredAddress = isSameAddress
        ? { ...alamatPenjemputan }
        : {
            kota: formData.antarKota,
            kecamatan: formData.antarKecamatan,
            kelurahan: formData.antarKelurahan,
            detail: defaultAntarDetail,
            rtRw: formData.antarRtRw,
            nomor: formData.antarNomor,
            landmark: formData.antarLandmark,
            mapsUrl: formData.antarMapsUrl || undefined,
          };

      // Format Client Documents (Semua Optional)
      const clientDocuments: Record<string, OrderDocument> = {};
      for (const key of Object.keys(docs)) {
        const item = docs[key];
        let fileUrl = item.fileUrl;
        if (item.attached && item.file) {
          try {
            const uploaded = await documentRepository.uploadDocument(item.file, { documentType: key });
            fileUrl = uploaded.fileUrl;
          } catch (uploadErr) {
            console.warn(`[BuatOrder] Upload warning for ${key}:`, uploadErr);
          }
        }
        clientDocuments[key] = {
          name: item.attached ? item.name : "",
          status: item.attached ? "Sudah Tersedia" : "Belum Tersedia",
          isOptional: true,
          updatedAt: item.attached ? new Date().toISOString().split("T")[0] : undefined,
          fileType: item.fileType || undefined,
          fileUrl: fileUrl || undefined,
          fileSize: item.fileSize || undefined,
        };
      }

      // Proof of payment for Bayar di Awal
      let buktiBayarPayload: PaymentProof | undefined;
      if (formData.tipePembayaran === "Bayar di Awal" && paymentProof.attached) {
        let paymentUrl = paymentProof.fileUrl;
        if (paymentProof.file) {
          try {
            const uploaded = await documentRepository.uploadDocument(paymentProof.file, { documentType: "BUKTI_PEMBAYARAN" });
            paymentUrl = uploaded.fileUrl;
          } catch (uploadErr) {
            console.warn("[BuatOrder] Payment proof upload warning:", uploadErr);
          }
        }
        buktiBayarPayload = {
          fileName: paymentProof.name,
          fileType: paymentProof.fileType as "image" | "pdf",
          fileUrl: paymentUrl,
          fileSize: paymentProof.fileSize,
          uploadedAt: new Date().toISOString(),
        };
      }

      const paymentMethodResolved =
        formData.tipePembayaran === "Bayar di Awal"
          ? formData.metodePembayaran
          : formData.metodePembayaran || "Cash (Saat Dokumen Diterima)";

      // Tambahkan order ke OrderStore (masuk ke Stage 1: VERIFIKASI)
      const createdOrder = orderStore.addOrder({
        customer: formData.customer.trim(),
        namaPemilik: formData.namaPemilik.trim() || formData.customer.trim(),
        nomorHP: formData.nomorHP.trim(),
        layanan: formData.layanan,
        metodeLayanan: formData.metodeLayanan,
        costBreakdown: cost.breakdown,
        costSnapshot: cost.snapshot,
        kepemilikanKendaraan: formData.kepemilikanKendaraan,
        jenisKendaraan: formData.jenisKendaraan,
        tahunKendaraan: formData.tahunKendaraan,
        nopol: fullNopol,
        wilayahSamsatAsal: formData.wilayahSamsatAsal,
        wilayahSamsatTujuan: formData.layanan.includes("Mutasi") ? (formData.wilayahSamsatTujuan || formData.wilayahSamsatAsal) : formData.wilayahSamsatAsal,
        pkbBerlakuSd: formData.pkbBerlakuSd || "",
        tahunPajak: formData.tahunPajak,
        bulanPajak: formData.bulanPajak,
        nominalPkbTerakhir: parseFloat(formData.nominalPkbTerakhir) || 0,
        nominalSwdkllj: parseFloat(formData.nominalSwdkllj) || 143000,
        biayaJasa: cost.biayaJasa,
        pkb: cost.pkb,
        swdkllj: cost.swdkllj,
        dendaSwdkllj: cost.dendaSwdkllj,
        totalEstimasi: cost.total,
        alamatPenjemputan,
        alamatPengantaran,
        clientDocuments,
        orderSource: "Offline / Loket",
        createdBy: currentUserName,
        createdById: currentUserId,
        createdByRole: currentUserRole,
        payment: {
          tipePembayaran: formData.tipePembayaran,
          metodePembayaran: paymentMethodResolved,
          statusPembayaran: "Belum Lunas",
          totalBiaya: cost.total,
          dibayar: 0,
          kurang: cost.total,
          buktiPembayaran: buktiBayarPayload,
          isPaymentVerified: false,
        },
      });

      setCreatedOrderSuccess(createdOrder);
      toast.success(`Order ${createdOrder.orderNo} berhasil dibuat dan otomatis masuk ke tahap Verifikasi!`);
      handleReset();
      setStep1Errors({});

      if (onOrderCreated) {
        onOrderCreated(createdOrder);
      }
    } catch {
      toast.error("Gagal membuat order. Silakan periksa kembali formulir.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const samsatList = pricingStore.getSamsatList();

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8 min-w-0 text-left">
      {/* HEADER: CLEAN ORDER ENTRY FRAMING */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground ml-auto">
            Petugas: <strong className="text-foreground">{currentUserName}</strong>
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
          Entri Order Baru
        </h1>
        <p className="text-xs text-muted-foreground">
          Formulir pencatatan berkas & order. Pesanan akan otomatis diteruskan ke tahap 1 (Verifikasi).
        </p>
      </motion.div>

      {/* STEPPER NAVIGATION (3 Steps) */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-muted/40 rounded-xl border border-border/60">
        {[
          { step: 1, label: "01 Data Klien", desc: "Klien & Kendaraan" },
          { step: 2, label: "02 Dokumen Kendaraan", desc: "Upload Berkas" },
          { step: 3, label: "03 Pembayaran & Ringkasan", desc: "Estimasi & Simpan" },
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <button
              key={s.step}
              type="button"
              aria-label={`${s.label}: ${s.desc}`}
              aria-current={isActive ? "step" : undefined}
              onClick={() => {
                if (s.step < currentStep) setCurrentStep(s.step as 1 | 2 | 3);
                else if (s.step === 2 && currentStep === 1) handleNextStep1();
                else if (s.step === 3 && currentStep === 2) handleNextStep2();
              }}
              className={cn(
                "flex items-center gap-2 p-2 sm:p-2.5 rounded-lg text-left transition-all",
                isActive
                  ? "bg-card border border-border shadow-xs text-foreground"
                  : isDone
                  ? "hover:bg-muted/60 text-foreground/80 cursor-pointer"
                  : "opacity-60 cursor-not-allowed text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s.step}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="text-xs font-semibold truncate leading-tight">{s.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="p-4 sm:p-5 md:p-6 border-border/80 shadow-xs bg-card">
        <form onSubmit={handleSubmitOrder} className="space-y-6">
          <AnimatePresence mode="wait">
            {/* ======================================================== */}
            {/* STEP 1: DATA KLIEN, KENDARAAN & INFORMASI ORDER           */}
            {/* ======================================================== */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* 1. DATA KLIEN & PEMILIK */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/60">
                    <User className="w-3.5 h-3.5 text-primary" />
                    1. Data Klien & Pemilik Kendaraan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div id="field-customer" className="space-y-1.5">
                      <Label htmlFor="input-customer" className="text-xs">
                        Nama Customer <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="input-customer"
                        required
                        placeholder="Nama pemesan atau instansi klien"
                        value={formData.customer}
                        onChange={(e) => {
                          setFormData({ ...formData, customer: e.target.value });
                          clearFieldError("customer");
                        }}
                        className={cn(
                          "bg-input-background border-border h-9 text-xs",
                          step1Errors.customer && "border-destructive ring-1 ring-destructive/40"
                        )}
                      />
                      {step1Errors.customer && (
                        <p className="text-[11px] text-destructive mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {step1Errors.customer}
                        </p>
                      )}
                    </div>

                    <div id="field-nomorHP" className="space-y-1.5">
                      <Label htmlFor="input-nomorHP" className="text-xs">
                        Nomor Telepon <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="input-nomorHP"
                        required
                        placeholder="Contoh: 081234567890"
                        value={formData.nomorHP}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\D/g, "");
                          setFormData({ ...formData, nomorHP: sanitized });
                          clearFieldError("nomorHP");
                        }}
                        className={cn(
                          "bg-input-background border-border h-9 text-xs font-mono tabular-nums",
                          step1Errors.nomorHP && "border-destructive ring-1 ring-destructive/40"
                        )}
                      />
                      {step1Errors.nomorHP && (
                        <p className="text-[11px] text-destructive mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {step1Errors.nomorHP}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="input-namaPemilik" className="text-xs">Nama Pemilik Sesuai STNK/BPKB</Label>
                      <Input
                        id="input-namaPemilik"
                        placeholder="Kosongkan jika sama dengan nama customer"
                        value={formData.namaPemilik}
                        onChange={(e) => setFormData({ ...formData, namaPemilik: e.target.value })}
                        className="bg-input-background border-border h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Status Kepemilikan</Label>
                      <Select
                        value={formData.kepemilikanKendaraan}
                        onValueChange={(value) => setFormData({ ...formData, kepemilikanKendaraan: value })}
                      >
                        <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                          <SelectValue placeholder="Pilih status kepemilikan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pribadi" className="text-xs">Pribadi</SelectItem>
                          <SelectItem value="Perusahaan" className="text-xs">Perusahaan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 2. DATA KENDARAAN & LAYANAN */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/60">
                    <Car className="w-3.5 h-3.5 text-primary" />
                    2. Data Kendaraan & Layanan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Jenis Layanan */}
                    <div id="field-layanan" className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">
                        Jenis Pengurusan <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.layanan}
                        onValueChange={(value) => {
                          const cfg = pricingStore.getServiceFeeConfig(value, formData.wilayahSamsatAsal);
                          const swdNominal = cfg?.swdkllj?.enabled !== false ? String(cfg?.swdkllj?.nominal || 143000) : "0";
                          setFormData((prev) => ({
                            ...prev,
                            layanan: value,
                            nominalSwdkllj: swdNominal,
                            wilayahSamsatTujuan: value.includes("Mutasi") ? (prev.wilayahSamsatTujuan || prev.wilayahSamsatAsal) : prev.wilayahSamsatAsal,
                          }));
                          clearFieldError("layanan");
                        }}
                      >
                        <SelectTrigger className={cn("bg-input-background border-border h-9 text-xs", step1Errors.layanan && "border-destructive ring-1 ring-destructive/40")}>
                          <SelectValue placeholder="Pilih jenis pengurusan Samsat" />
                        </SelectTrigger>
                        <SelectContent>
                          {layananOptions.map((layanan) => (
                            <SelectItem key={layanan} value={layanan} className="text-xs">
                              {layanan}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {step1Errors.layanan && (
                        <p className="text-[11px] text-destructive mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {step1Errors.layanan}
                        </p>
                      )}
                    </div>

                    {/* Metode Layanan */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold">Metode Layanan</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div
                          onClick={() => setFormData({ ...formData, metodeLayanan: "Antar Jemput" })}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5",
                            formData.metodeLayanan === "Antar Jemput"
                              ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                              : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                              formData.metodeLayanan === "Antar Jemput"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground"
                            )}
                          >
                            {formData.metodeLayanan === "Antar Jemput" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-xs text-foreground">Antar Jemput Dokumen</p>
                              {!isAntarJemputEnabled && (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                                  Nonaktif di Master (Rp 0)
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {isAntarJemputEnabled
                                ? `Kurir menjemput berkas ke alamat klien (Rp ${(currentConfig?.biayaAntarJemput ?? 50000).toLocaleString("id-ID")}).`
                                : "Kurir antar jemput berkas (Tarif dinonaktifkan di Master Data = Rp 0)."}
                            </p>
                          </div>
                        </div>

                        <div
                          onClick={() => {
                            setFormData({ ...formData, metodeLayanan: "Datang Langsung" });
                            clearFieldError("jemputDetail");
                          }}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5",
                            formData.metodeLayanan === "Datang Langsung"
                              ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                              : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                              formData.metodeLayanan === "Datang Langsung"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground"
                            )}
                          >
                            {formData.metodeLayanan === "Datang Langsung" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-foreground">Datang Langsung ke Loket</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Klien menyerahkan berkas langsung di loket.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Jenis Kendaraan */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Jenis Kendaraan</Label>
                      <Select
                        value={formData.jenisKendaraan}
                        onValueChange={(value) => setFormData({ ...formData, jenisKendaraan: value })}
                      >
                        <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                          <SelectValue placeholder="Pilih jenis kendaraan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mobil" className="text-xs">Mobil (Roda 4)</SelectItem>
                          <SelectItem value="Motor" className="text-xs">Motor (Roda 2)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tahun Pembuatan Kendaraan */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tahun Pembuatan Kendaraan</Label>
                      <Input
                        placeholder="Contoh: 2022"
                        value={formData.tahunKendaraan}
                        onChange={(e) => setFormData({ ...formData, tahunKendaraan: e.target.value.replace(/\D/g, "") })}
                        className="bg-input-background border-border h-9 text-xs font-mono tabular-nums"
                      />
                    </div>

                    {/* 3-PART NOMOR POLISI INPUT */}
                    <div id="field-plateNumber" className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="input-plateNumber" className="text-xs font-medium text-foreground">
                        Nomor Polisi <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="w-24 shrink-0">
                          <Input
                            placeholder="B"
                            maxLength={2}
                            aria-label="Plat depan (huruf)"
                            value={platePrefix}
                            onChange={(e) => setPlatePrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                            className="bg-input-background border-border h-9 text-xs font-mono font-bold text-center uppercase tracking-wider"
                            title="Plat Depan (Huruf)"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            id="input-plateNumber"
                            required
                            placeholder="1234"
                            maxLength={4}
                            aria-label="Nomor plat (angka)"
                            value={plateNumber}
                            onChange={(e) => {
                              setPlateNumber(e.target.value.replace(/\D/g, ""));
                              clearFieldError("plateNumber");
                            }}
                            className={cn(
                              "bg-input-background border-border h-9 text-xs font-mono font-bold text-center tracking-widest",
                              step1Errors.plateNumber && "border-destructive ring-1 ring-destructive/40"
                            )}
                            title="Nomor Plat (Angka)"
                          />
                        </div>
                        <div className="w-28 shrink-0">
                          <Input
                            placeholder="ABC"
                            maxLength={3}
                            aria-label="Plat belakang (huruf)"
                            value={plateSuffix}
                            onChange={(e) => setPlateSuffix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                            className="bg-input-background border-border h-9 text-xs font-mono font-bold text-center uppercase tracking-wider"
                            title="Plat Belakang (Huruf)"
                          />
                        </div>
                      </div>
                      {step1Errors.plateNumber && (
                        <p className="text-[11px] text-destructive mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {step1Errors.plateNumber}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Format standar: [Plat Awal] [Nomor Plat] [Plat Akhir] • Hasil:{" "}
                        <strong className="font-mono text-foreground">{getCombinedNopol() || "B 1234 ABC"}</strong>
                      </p>
                    </div>

                    {/* Wilayah Samsat Asal */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Wilayah Samsat Asal</Label>
                      <Select
                        value={formData.wilayahSamsatAsal}
                        onValueChange={(value) => {
                          const cfg = pricingStore.getServiceFeeConfig(formData.layanan, value);
                          const swdNominal = cfg?.swdkllj?.enabled !== false ? String(cfg?.swdkllj?.nominal || 143000) : "0";
                          setFormData((prev) => ({
                            ...prev,
                            wilayahSamsatAsal: value,
                            nominalSwdkllj: swdNominal,
                            wilayahSamsatTujuan: prev.wilayahSamsatTujuan || value,
                          }));
                        }}
                      >
                        <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                          <SelectValue placeholder="Pilih Samsat Asal" />
                        </SelectTrigger>
                        <SelectContent>
                          {samsatList.map((samsat: any) => (
                            <SelectItem key={samsat.id} value={samsat.wilayah} className="text-xs">
                              {samsat.wilayah}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Wilayah Samsat Tujuan (HANYA DITAMPILKAN JIKA LAYANAN = MUTASI) */}
                    {formData.layanan.includes("Mutasi") && (
                      <div id="field-wilayahSamsatTujuan" className="space-y-1.5">
                        <Label className="text-xs">
                          Wilayah Samsat Tujuan <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.wilayahSamsatTujuan || formData.wilayahSamsatAsal}
                          onValueChange={(value) => {
                            setFormData({ ...formData, wilayahSamsatTujuan: value });
                            clearFieldError("wilayahSamsatTujuan");
                          }}
                        >
                          <SelectTrigger className={cn("bg-input-background border-border h-9 text-xs", step1Errors.wilayahSamsatTujuan && "border-destructive ring-1 ring-destructive/40")}>
                            <SelectValue placeholder="Pilih Samsat Tujuan" />
                          </SelectTrigger>
                          <SelectContent>
                            {samsatList.map((samsat: any) => (
                              <SelectItem key={`tujuan-${samsat.id}`} value={samsat.wilayah} className="text-xs">
                                {samsat.wilayah}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {step1Errors.wilayahSamsatTujuan && (
                          <p className="text-[11px] text-destructive mt-1 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3 shrink-0" /> {step1Errors.wilayahSamsatTujuan}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. INFORMASI PAJAK KENDARAAN */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/60">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    3. Informasi Pajak Kendaraan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Masa Berlaku PKB S/D (Tanggal)</Label>
                      <Input
                        type="date"
                        value={formData.pkbBerlakuSd}
                        onChange={(e) => setFormData({ ...formData, pkbBerlakuSd: e.target.value })}
                        className="bg-input-background border-border h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Bulan Jatuh Tempo</Label>
                      <Select
                        value={formData.bulanPajak}
                        onValueChange={(value) => setFormData({ ...formData, bulanPajak: value })}
                      >
                        <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                          <SelectValue placeholder="Pilih bulan" />
                        </SelectTrigger>
                        <SelectContent>
                          {bulanOptions.map((bulan) => (
                            <SelectItem key={bulan} value={bulan} className="text-xs">
                              {bulan}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Tahun Pajak</Label>
                      <Input
                        placeholder="Contoh: 2024"
                        value={formData.tahunPajak}
                        onChange={(e) => setFormData({ ...formData, tahunPajak: e.target.value.replace(/\D/g, "") })}
                        className="bg-input-background border-border h-9 text-xs font-mono tabular-nums"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Nominal PKB Terakhir (Rp)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={formData.nominalPkbTerakhir}
                        onChange={(e) => setFormData({ ...formData, nominalPkbTerakhir: e.target.value })}
                        className="bg-input-background border-border h-9 text-xs font-mono tabular-nums"
                      />
                    </div>

                    {/* OPSEN PKB (STANDARDIZED LABEL) */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Nominal OPSEN PKB (Rp)</Label>
                        {!isOpsenEnabled && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Nonaktif di Master
                          </Badge>
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder={isOpsenEnabled ? "143000" : "0"}
                        disabled={!isOpsenEnabled}
                        value={isOpsenEnabled ? formData.nominalSwdkllj : "0"}
                        onChange={(e) => setFormData({ ...formData, nominalSwdkllj: e.target.value })}
                        className={cn(
                          "bg-input-background border-border h-9 text-xs font-mono tabular-nums",
                          !isOpsenEnabled && "opacity-60 bg-muted cursor-not-allowed"
                        )}
                      />
                      {!isOpsenEnabled && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          OPSEN PKB dinonaktifkan pada Master Data Biaya Layanan dan tidak dihitung ke estimasi.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4 & 5. ALAMAT PENJEMPUTAN & PENGANTARAN (KHUSUS ANTAR JEMPUT) */}
                {formData.metodeLayanan === "Antar Jemput" && (
                  <>
                    {/* 4. ALAMAT PENJEMPUTAN DOKUMEN */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/60">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        4. Alamat Penjemputan Dokumen
                      </h4>

                      <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div id="field-jemputDetail" className="space-y-1 sm:col-span-3">
                            <Label className="text-[11px] text-muted-foreground">
                              Detail Alamat / Jalan <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              required
                              placeholder="Nama jalan, gedung, blok, atau patokan penjemputan berkas"
                              value={formData.jemputDetail}
                              onChange={(e) => {
                                setFormData({ ...formData, jemputDetail: e.target.value });
                                clearFieldError("jemputDetail");
                              }}
                              className={cn(
                                "bg-input-background border-border h-9 text-xs",
                                step1Errors.jemputDetail && "border-destructive ring-1 ring-destructive/40"
                              )}
                            />
                            {step1Errors.jemputDetail && (
                              <p className="text-[11px] text-destructive mt-1 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3 h-3 shrink-0" /> {step1Errors.jemputDetail}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Kota / Kabupaten</Label>
                            <Input
                              placeholder="Jakarta Timur"
                              value={formData.jemputKota}
                              onChange={(e) => setFormData({ ...formData, jemputKota: e.target.value })}
                              className="bg-input-background border-border h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Kecamatan</Label>
                            <Input
                              placeholder="Contoh: Cakung"
                              value={formData.jemputKecamatan}
                              onChange={(e) => setFormData({ ...formData, jemputKecamatan: e.target.value })}
                              className="bg-input-background border-border h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Kelurahan / Desa</Label>
                            <Input
                              placeholder="Contoh: Pulo Gebang"
                              value={formData.jemputKelurahan}
                              onChange={(e) => setFormData({ ...formData, jemputKelurahan: e.target.value })}
                              className="bg-input-background border-border h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">RT / RW</Label>
                            <Input
                              placeholder="001/002"
                              value={formData.jemputRtRw}
                              onChange={(e) => setFormData({ ...formData, jemputRtRw: e.target.value })}
                              className="bg-input-background border-border h-9 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Nomor Rumah/Kantor</Label>
                            <Input
                              placeholder="No. 12B"
                              value={formData.jemputNomor}
                              onChange={(e) => setFormData({ ...formData, jemputNomor: e.target.value })}
                              className="bg-input-background border-border h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Landmark / Patokan</Label>
                            <Input
                              placeholder="Dekat Masjid / Seberang Alfa"
                              value={formData.jemputLandmark}
                              onChange={(e) => setFormData({ ...formData, jemputLandmark: e.target.value })}
                              className="bg-input-background border-border h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-3">
                            <Label className="text-[11px] text-muted-foreground">Link Google Maps (Opsional)</Label>
                            <Input
                              placeholder="https://maps.google.com/?q=..."
                              value={formData.jemputMapsUrl}
                              onChange={(e) => setFormData({ ...formData, jemputMapsUrl: e.target.value })}
                              className="bg-input-background border-border h-9 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5. ALAMAT PENGANTARAN DOKUMEN */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/60">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        5. Alamat Pengantaran Dokumen
                      </h4>

                      <div className="flex items-center gap-2 px-1">
                        <Checkbox
                          id="sameAddress"
                          checked={isSameAddress}
                          onCheckedChange={(checked) => setIsSameAddress(Boolean(checked))}
                        />
                        <label htmlFor="sameAddress" className="text-xs text-foreground cursor-pointer select-none">
                          Alamat Pengantaran Dokumen sama dengan Alamat Penjemputan
                        </label>
                      </div>

                      {!isSameAddress && (
                        <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1 sm:col-span-3">
                              <Label className="text-[11px] text-muted-foreground">Detail Alamat / Jalan Pengantaran</Label>
                              <Input
                                placeholder="Nama jalan atau gedung tujuan pengantaran"
                                value={formData.antarDetail}
                                onChange={(e) => setFormData({ ...formData, antarDetail: e.target.value })}
                                className="bg-input-background border-border h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Kota / Kabupaten</Label>
                              <Input
                                value={formData.antarKota}
                                onChange={(e) => setFormData({ ...formData, antarKota: e.target.value })}
                                className="bg-input-background border-border h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Kecamatan</Label>
                              <Input
                                value={formData.antarKecamatan}
                                onChange={(e) => setFormData({ ...formData, antarKecamatan: e.target.value })}
                                className="bg-input-background border-border h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Kelurahan / Desa</Label>
                              <Input
                                value={formData.antarKelurahan}
                                onChange={(e) => setFormData({ ...formData, antarKelurahan: e.target.value })}
                                className="bg-input-background border-border h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">RT / RW</Label>
                              <Input
                                value={formData.antarRtRw}
                                onChange={(e) => setFormData({ ...formData, antarRtRw: e.target.value })}
                                className="bg-input-background border-border h-9 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Nomor</Label>
                              <Input
                                value={formData.antarNomor}
                                onChange={(e) => setFormData({ ...formData, antarNomor: e.target.value })}
                                className="bg-input-background border-border h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Landmark</Label>
                              <Input
                                value={formData.antarLandmark}
                                onChange={(e) => setFormData({ ...formData, antarLandmark: e.target.value })}
                                className="bg-input-background border-border h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-3">
                              <Label className="text-[11px] text-muted-foreground">Link Google Maps</Label>
                              <Input
                                value={formData.antarMapsUrl}
                                onChange={(e) => setFormData({ ...formData, antarMapsUrl: e.target.value })}
                                className="bg-input-background border-border h-9 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* STEP 1 NAVIGATION BUTTONS */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 text-xs"
                      onClick={() => setShowResetConfirm(true)}
                    >
                      Reset
                    </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep1}
                    className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
                  >
                    <span>Berikutnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: DOKUMEN KENDARAAN (REAL UPLOAD UI)                */}
            {/* ======================================================== */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 pb-2 border-b border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Dokumen Kendaraan yang Dilampirkan Klien
                    </h4>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      (Semua dokumen bersifat opsional)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Unggah berkas fisik atau salinan dokumen yang dibawa oleh klien (PDF, JPG, JPEG, PNG). Order tetap dapat diproses jika dokumen fisik diserahkan saat penjemputan.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "stnk", label: "STNK Asli" },
                    { key: "bpkb", label: "BPKB Asli / Surat Keterangan Leasing" },
                    { key: "ktp", label: "KTP Pemilik Asli Sesuai BPKB" },
                    { key: "skkp", label: "SKKP (Surat Ketetapan Pajak Daerah)" },
                    { key: "lainnya", label: "Dokumen Tambahan (Surat Kuasa / Faktur / Kuitansi)" },
                  ].map((item) => {
                    const doc = docs[item.key];
                    return (
                      <div
                        key={item.key}
                        className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors hover:bg-muted/10"
                      >
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 sm:mt-0",
                              doc.attached
                                ? doc.fileType === "pdf"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {doc.attached ? (
                              doc.fileType === "pdf" ? <FileIcon className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-medium text-foreground">{item.label}</span>
                              {doc.attached ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                                  ✓ {doc.fileType?.toUpperCase()} {doc.fileSize && `(${doc.fileSize})`}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border">
                                  Belum Dilampirkan
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {doc.attached ? doc.name : "Berkas fisik dapat diserahkan saat penjemputan"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-10 sm:pl-0">
                          {doc.attached && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs px-2.5 gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  setPreviewModal({
                                    title: item.label,
                                    name: doc.name,
                                    fileType: doc.fileType,
                                    fileUrl: doc.fileUrl,
                                  })
                                }
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Preview
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs px-2 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDocRemove(item.key)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus
                              </Button>
                            </>
                          )}

                          <label className="cursor-pointer">
                            <span className="inline-flex items-center justify-center h-8 px-2.5 rounded-md text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors gap-1.5">
                              <Upload className="w-3.5 h-3.5" />
                              {doc.attached ? "Ganti File" : "Upload File"}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleDocFileSelect(item.key, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* STEP 2 NAVIGATION BUTTONS */}
                <div className="flex justify-between items-center pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-xs gap-1.5"
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep2}
                    className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
                  >
                    <span>Berikutnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: PEMBAYARAN & RINGKASAN ORDER                     */}
            {/* ======================================================== */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* 1. SKEMA & METODE PEMBAYARAN */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/60">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    Skema & Metode Pembayaran
                  </h4>

                  {/* Scheme Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Bayar di Awal */}
                    <div
                      onClick={() => setFormData({ ...formData, tipePembayaran: "Bayar di Awal" })}
                      className={cn(
                        "p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                        formData.tipePembayaran === "Bayar di Awal"
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                          formData.tipePembayaran === "Bayar di Awal"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground"
                        )}
                      >
                        {formData.tipePembayaran === "Bayar di Awal" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">Bayar di Awal (Pelunasan di Depan)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Klien melunasi biaya saat order diinput di loket. Lampirkan bukti pembayaran untuk verifikasi di Stage 1.
                        </p>
                      </div>
                    </div>

                    {/* Bayar di Akhir */}
                    <div
                      onClick={() => setFormData({ ...formData, tipePembayaran: "Bayar di Akhir" })}
                      className={cn(
                        "p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                        formData.tipePembayaran === "Bayar di Akhir"
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                          formData.tipePembayaran === "Bayar di Akhir"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground"
                        )}
                      >
                        {formData.tipePembayaran === "Bayar di Akhir" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">Bayar di Akhir (COD / Saat Serah Terima)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Klien membayar setelah seluruh dokumen selesai diproses dan diantar ke alamat pengantaran.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Payment Details */}
                  {formData.tipePembayaran === "Bayar di Awal" ? (
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Metode Pembayaran di Loket <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.metodePembayaran}
                          onValueChange={(val) => setFormData({ ...formData, metodePembayaran: val })}
                        >
                          <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                            <SelectValue placeholder="Pilih saluran pembayaran" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Transfer Bank BCA" className="text-xs">Transfer Bank BCA</SelectItem>
                            <SelectItem value="Transfer Bank Mandiri" className="text-xs">Transfer Bank Mandiri</SelectItem>
                            <SelectItem value="QRIS" className="text-xs">QRIS Biro Jasa SUN89</SelectItem>
                            <SelectItem value="Cash" className="text-xs">Cash (Tunai di Loket)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Transfer BCA / Mandiri details */}
                      {formData.metodePembayaran.includes("Transfer") && (
                        <div className="p-3 rounded-lg border border-border bg-card text-xs space-y-2">
                          <p className="font-medium text-foreground text-xs flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-primary" />
                            Rekening Resmi Penerimaan SUN89:
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md bg-muted/30 border border-border/60">
                            <div>
                              <p className="font-semibold text-foreground text-xs">Bank Central Asia (BCA)</p>
                              <p className="font-mono text-sm font-bold text-primary mt-0.5">772-019-2831</p>
                              <p className="text-[11px] text-muted-foreground">a.n. PT Biro Jasa SUN89 Abadi</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy("7720192831", "bank")}
                              className="h-8 text-xs gap-1.5 shrink-0"
                            >
                              {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedBank ? "Tersalin" : "Salin Rekening"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* QRIS details */}
                      {formData.metodePembayaran === "QRIS" && (
                        <div className="p-3 rounded-lg border border-border bg-card text-xs space-y-2">
                          <p className="font-medium text-foreground text-xs flex items-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5 text-primary" />
                            QRIS Standar Nasional SUN89:
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md bg-muted/30 border border-border/60">
                            <div>
                              <p className="font-semibold text-foreground text-xs">NMID: ID936005230001889</p>
                              <p className="text-[11px] text-muted-foreground">Mendukung BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy("ID936005230001889", "qris")}
                                className="h-8 text-xs gap-1.5"
                              >
                                {copiedQris ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedQris ? "Tersalin" : "Salin ID"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={() => setShowQrisModal(true)}
                                className="h-8 text-xs gap-1.5"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                Lihat QRIS
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cash at counter */}
                      {formData.metodePembayaran === "Cash" && (
                        <div className="p-3 rounded-lg border border-border bg-card text-xs flex items-center gap-2.5">
                          <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <p className="text-muted-foreground">
                            Uang tunai diterima langsung oleh petugas loket/kasir kantor dan akan diverifikasi pada Stage 1.
                          </p>
                        </div>
                      )}

                      {/* Proof upload */}
                      <div className="pt-2 border-t border-primary/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <FileUp className="w-3.5 h-3.5 text-primary" />
                            Bukti Pembayaran <span className="text-destructive">*</span>
                          </Label>
                          <span className={cn("text-[11px] font-medium", paymentProof.attached ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                            {paymentProof.attached ? "Terlampir" : "Wajib diunggah"}
                          </span>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                                paymentProof.attached
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {paymentProof.attached ? (
                                paymentProof.fileType === "pdf" ? <FileIcon className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {paymentProof.attached ? paymentProof.name : "Belum ada bukti pembayaran dilampirkan"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {paymentProof.attached
                                  ? `Format: ${paymentProof.fileType?.toUpperCase()} • ${paymentProof.fileSize}`
                                  : "Unggah struk transfer bank atau bukti pembayaran loket (Wajib untuk Bayar di Awal)"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pl-10 sm:pl-0">
                            {paymentProof.attached && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs px-2.5 gap-1 text-muted-foreground hover:text-foreground"
                                  onClick={() =>
                                    setPreviewModal({
                                      title: "Bukti Pembayaran",
                                      name: paymentProof.name,
                                      fileType: paymentProof.fileType,
                                      fileUrl: paymentProof.fileUrl,
                                    })
                                  }
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Preview
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs px-2 gap-1 text-destructive hover:bg-destructive/10"
                                  onClick={handlePaymentProofRemove}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Hapus
                                </Button>
                              </>
                            )}

                            <label className="cursor-pointer">
                              <span className="inline-flex items-center justify-center h-8 px-2.5 rounded-md text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors gap-1.5">
                                <Upload className="w-3.5 h-3.5" />
                                {paymentProof.attached ? "Ganti" : "Upload Bukti Pembayaran"}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handlePaymentProofSelect(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        Skema Bayar di Akhir: Pembayaran ditagihkan saat seluruh dokumen selesai diproses dan diantar kembali ke klien (Stage 7 & 8).
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. RINGKASAN ORDER & RINCIAN BIAYA */}
                <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                      <Calculator className="w-3.5 h-3.5" />
                      Ringkasan Order & Rincian Biaya
                    </h4>
                    <Badge variant="outline" className="text-[10px] bg-background">
                      {formData.metodeLayanan}
                    </Badge>
                  </div>

                  {/* Summary Overview Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg bg-card/60 border border-border/50 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Nama Customer</p>
                      <p className="font-semibold text-foreground">{formData.customer || "-"}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{formData.nomorHP || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Kendaraan & Nomor Polisi</p>
                      <p className="font-semibold text-foreground">{formData.jenisKendaraan} ({formData.tahunKendaraan})</p>
                      <p className="text-xs font-mono font-bold text-primary">{getCombinedNopol() || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Jenis Pengurusan & Metode</p>
                      <p className="font-semibold text-foreground">{formData.layanan || "-"}</p>
                      <p className="text-[11px] text-muted-foreground">{formData.metodeLayanan}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Samsat Asal → Tujuan</p>
                      <p className="font-semibold text-foreground">
                        {formData.wilayahSamsatAsal} → {formData.wilayahSamsatTujuan || formData.wilayahSamsatAsal}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Skema: {formData.tipePembayaran}</p>
                    </div>
                  </div>

                  {/* Itemized Cost Breakdown (ONLY ENABLED COMPONENTS) */}
                  <div className="space-y-2 text-xs">
                    {cost.breakdown && cost.breakdown.length > 0 ? (
                      <div className="space-y-1.5 pb-2.5 border-b border-border/60">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Komponen Biaya Terhitung:
                        </div>
                        <div className="space-y-1 pl-1">
                          {cost.breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-foreground">{item.name}</span>
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded font-medium",
                                  item.category === "Samsat" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                                  item.category === "Jasa" ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                                  item.category === "Operasional" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                                  "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                                )}>
                                  {item.category === "Samsat" ? "Samsat" :
                                   item.category === "Jasa" ? "Jasa" :
                                   item.category === "Operasional" ? "Kurir/Ops" : "Pajak"}
                                </span>
                              </div>
                              <span className="font-mono tabular-nums font-medium text-foreground">
                                Rp {item.amount.toLocaleString("id-ID")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic py-1 pb-2 border-b border-border/60">
                        Pilih jenis pengurusan pada formulir di Step 1 untuk melihat rincian biaya.
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal Biaya Layanan:</span>
                      <span className="font-mono tabular-nums font-semibold text-foreground">
                        Rp {(cost.subtotalLayanan || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimasi Pokok PKB:</span>
                      <span className="font-mono tabular-nums font-medium text-foreground">
                        Rp {cost.pkb.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {isOpsenEnabled && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">OPSEN PKB:</span>
                        <span className="font-mono tabular-nums font-medium text-foreground">
                          {cost.swdkllj > 0 ? `Rp ${cost.swdkllj.toLocaleString("id-ID")}` : "Rp 0 (Nonaktif)"}
                        </span>
                      </div>
                    )}
                    {cost.dendaSwdkllj > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Denda Pajak/OPSEN PKB:</span>
                        <span className="font-mono tabular-nums font-medium text-destructive">
                          Rp {cost.dendaSwdkllj.toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-border/80 pt-2 flex justify-between items-baseline">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Total Estimasi Awal:</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Skema: <strong className="text-foreground">{formData.tipePembayaran}</strong> • Metode: <strong className="text-foreground">{formData.metodeLayanan}</strong>
                        </p>
                      </div>
                      <span className="text-base font-bold text-primary font-mono tabular-nums">
                        Rp {cost.total.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* STEP 3 NAVIGATION & SUBMIT BUTTONS */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2.5 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto h-9 text-xs gap-1.5"
                    onClick={() => setCurrentStep(2)}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan Order...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Buat Order</span>
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Card>

      {/* QRIS POPUP MODAL */}
      <Dialog open={showQrisModal} onOpenChange={setShowQrisModal}>
        <DialogContent className="w-full sm:max-w-sm bg-card text-card-foreground p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              QRIS Resmi Biro Jasa SUN89
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Arahkan kamera smartphone klien untuk memindai kode QR pembayaran
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-border my-2">
            <div className="w-48 h-48 border-2 border-foreground/20 rounded p-2 flex flex-col items-center justify-between bg-white text-slate-900">
              <div className="flex justify-between w-full">
                <div className="w-10 h-10 border-4 border-black rounded-sm flex items-center justify-center">
                  <div className="w-4 h-4 bg-black" />
                </div>
                <div className="text-[10px] font-bold tracking-tight">QRIS STANDAR</div>
                <div className="w-10 h-10 border-4 border-black rounded-sm flex items-center justify-center">
                  <div className="w-4 h-4 bg-black" />
                </div>
              </div>
              <div className="p-2 border border-slate-300 rounded text-center">
                <p className="text-xs font-bold">SUN89 BIRO JASA</p>
                <p className="text-[9px] text-slate-500 font-mono">NMID: ID936005230001889</p>
              </div>
              <div className="flex justify-between w-full items-end">
                <div className="w-10 h-10 border-4 border-black rounded-sm flex items-center justify-center">
                  <div className="w-4 h-4 bg-black" />
                </div>
                <div className="text-[9px] text-slate-400">GPN / ASPI</div>
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-800 mt-3">PT Biro Jasa SUN89 Abadi</p>
            <p className="text-[11px] text-slate-500">Mendukung Seluruh Rekening Bank & E-Wallet</p>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowQrisModal(false)} className="w-full">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DOCUMENT & PAYMENT PROOF PREVIEW MODAL */}
      <Dialog open={!!previewModal} onOpenChange={() => setPreviewModal(null)}>
        <DialogContent className="w-full sm:max-w-xl max-h-[90vh] bg-card text-card-foreground p-4 sm:p-5 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Preview: {previewModal?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground truncate">
              Nama Berkas: <span className="font-mono text-foreground">{previewModal?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-2 my-2 flex items-center justify-center bg-muted/20 border border-border rounded-lg min-h-[240px]">
            {previewModal?.fileUrl ? (
              previewModal.fileType === "image" ? (
                <img
                  src={previewModal.fileUrl}
                  alt={previewModal.name}
                  className="max-h-[60vh] max-w-full object-contain rounded"
                />
              ) : (
                <iframe
                  src={previewModal.fileUrl}
                  title={previewModal.name}
                  className="w-full h-[60vh] rounded border border-border"
                />
              )
            ) : (
              <div className="text-center p-6 space-y-2">
                <FileIcon className="w-12 h-12 text-primary/40 mx-auto" />
                <p className="text-xs font-medium text-foreground">{previewModal?.name}</p>
                <p className="text-[11px] text-muted-foreground">Berkas terdaftar resmi pada sistem operasional</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setPreviewModal(null)} className="w-full sm:w-auto">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESET CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Reset Formulir?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Reset semua data yang sudah diisi? Semua isian yang telah Anda masukkan pada formulir order ini akan dikembalikan ke kondisi awal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-8 text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleReset();
                setStep1Errors({});
                setShowResetConfirm(false);
                toast.info("Formulir berhasil direset.");
              }}
              className="h-8 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-xs"
            >
              Ya, Reset Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CREATE ORDER SUCCESS MODAL */}
      <Dialog open={!!createdOrderSuccess} onOpenChange={(open) => { if (!open) setCreatedOrderSuccess(null); }}>
        <DialogContent className="border-border sm:max-w-md bg-card text-card-foreground p-5">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Order Berhasil Dibuat
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Order telah didaftarkan ke sistem dan otomatis masuk ke tahap Verifikasi (Stage 1).
            </DialogDescription>
          </DialogHeader>

          {createdOrderSuccess && (
            <div className="my-3 p-3.5 rounded-lg border border-border/70 bg-muted/20 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground">No. Order</span>
                <span className="font-mono font-bold text-primary">{createdOrderSuccess.orderNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nama Customer</span>
                <span className="font-medium text-foreground">{createdOrderSuccess.customer}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Jenis Pengurusan</span>
                <span className="font-medium text-foreground">{createdOrderSuccess.layanan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nomor Polisi</span>
                <span className="font-mono font-semibold text-foreground">{createdOrderSuccess.nopol}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Samsat</span>
                <span className="font-medium text-foreground">
                  {createdOrderSuccess.wilayahSamsatAsal}
                  {createdOrderSuccess.layanan.includes("Mutasi") && ` → ${createdOrderSuccess.wilayahSamsatTujuan}`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-muted-foreground font-semibold">Total Estimasi</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  Rp {(createdOrderSuccess.totalEstimasi || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button
              className="w-full h-8.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold"
              onClick={() => setCreatedOrderSuccess(null)}
            >
              Tutup & Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
