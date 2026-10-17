import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge, getStatusBadgeClass } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { MutasiCostField } from "./MutasiCostFields";
import {
  Search,
  CheckCircle,
  CheckCircle2,
  Clock,
  PackageCheck,
  Truck,
  FileCheck,
  User,
  MapPin,
  Eye,
  Calculator,
  RefreshCw,
  Edit,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Upload,
  FileText,
  Phone,
  Car,
  Calendar,
  Check,
  Archive,
  ArrowRight,
  Shield,
  ShieldCheck,
  FileUp,
  ExternalLink,
  ShieldAlert,
  Plus,
  Trash2,
  CreditCard,
  File as FileIcon,
  Image as ImageIcon,
  Info,
  Receipt,
  Download,
} from "lucide-react";
import { cn } from "./ui/utils";
import { toast } from "sonner";
import { documentRepository } from "../../data/repositories/documentRepository";
import {
  useOrderStore,
  orderStore,
  OperationalOrder,
  PaymentProof,
  StageName,
  StructuredAddress,
  SamsatProcessItem,
  CustomCostItem,
  getDefaultSamsatProcesses,
  STAGES,
} from "../data/orderStore";
import { financeStore } from "../data/financeStore";
import {
  hargaDasarMutasiKeluar,
  hargaDasarMutasiMasuk,
} from "../data/pricingReference";
import { permissionStore } from "../data/permissionStore";
import { useKaryawanPengguna } from "../data/karyawanPenggunaAdapter";
import { KNOWN_MESSENGERS } from "../data/messengerTaskAdapter";

// 8 Workflow stages as specified
export const trackingSteps = [
  { id: 1, title: "Verifikasi", icon: CheckCircle },
  { id: 2, title: "Penjadwalan", icon: Clock },
  { id: 3, title: "Verifikasi Dokumen", icon: FileText },
  { id: 4, title: "Proses Samsat", icon: PackageCheck },
  { id: 5, title: "Verifikasi Ulang", icon: RefreshCw },
  { id: 6, title: "Supervisi", icon: FileCheck },
  { id: 7, title: "Pengantaran", icon: Truck },
  { id: 8, title: "Dokumen Telah Diterima", icon: CheckCircle2 },
];

const layananOptions = [
  "Perpanjangan 1 Tahun",
  "Perpanjangan 5 Tahun",
  "Balik Nama",
  "Mutasi Antar Samsat",
  "Mutasi Luar Daerah",
];
const bulanOptions = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Helper to render structured address with fallback
function renderAddress(addr?: StructuredAddress, fallbackDetail?: string, fallbackDomisili?: string) {
  if (addr && (addr.detail || addr.kota || addr.kecamatan)) {
    return (
      <div className="space-y-1 text-xs">
        <p className="font-medium text-foreground">{addr.detail || fallbackDetail || "-"}</p>
        {(addr.rtRw || addr.nomor) && (
          <p className="text-[11px] text-muted-foreground">
            {addr.rtRw ? `RT/RW: ${addr.rtRw}` : ""}{addr.rtRw && addr.nomor ? " • " : ""}{addr.nomor ? `No. ${addr.nomor}` : ""}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {[addr.kelurahan, addr.kecamatan, addr.kota].filter(Boolean).join(", ")}
        </p>
        {addr.landmark && (
          <p className="text-[11px] text-primary/90 font-medium">Patokan: {addr.landmark}</p>
        )}
        {addr.mapsUrl && (
          <a
            href={addr.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
          >
            <ExternalLink className="w-3 h-3" />
            Buka Peta Google Maps
          </a>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-1 text-xs">
      <p className="font-medium text-foreground">{fallbackDetail || "Belum diisi"}</p>
      {fallbackDomisili && <p className="text-[11px] text-muted-foreground">Domisili: {fallbackDomisili}</p>}
    </div>
  );
}

interface OrderTrackingProps {
  userRole?: 'administrator' | 'finance' | 'admin' | 'messenger' | null;
  userName?: string;
  userId?: string;
}

export function OrderTracking({
  userRole = 'administrator',
  userName = 'Admin Operasional',
  userId = 'usr-admin',
}: OrderTrackingProps) {
  const { activeOrders, advanceOrder, updateOrder, archiveOrder, verifyPayment, processRefund, addRekapDocument } = useOrderStore();
  const { karyawan } = useKaryawanPengguna();
  const messengers = useMemo(() => {
    const isApi = (typeof process !== "undefined" && process.env?.APP_DATA_PROVIDER === "api") ||
                  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_DATA_PROVIDER === "api");
    const active = karyawan
      .filter((k) => k.jabatan === "MESSENGER" && k.status === "Aktif")
      .map((k) => k.nama);
    if (active.length > 0) return active;
    return isApi ? [] : [...KNOWN_MESSENGERS];
  }, [karyawan]);

  // Role & Permission stage action checker
  const canManage = (stageNum: number) => permissionStore.canManageStage(userRole, stageNum);
  // Order Tracking directly focuses on active workflow orders, default stage: "Verifikasi"
  const [currentTab, setCurrentTab] = useState<string>("Verifikasi");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Operational Workspaces Dialog States
  const [isVerifyWorkspaceOpen, setIsVerifyWorkspaceOpen] = useState(false);
  const [stage1Note, setStage1Note] = useState("");
  const [isScheduleWorkspaceOpen, setIsScheduleWorkspaceOpen] = useState(false);
  const [isDocVerificationWorkspaceOpen, setIsDocVerificationWorkspaceOpen] = useState(false);
  const [isSamsatProgressDialogOpen, setIsSamsatProgressDialogOpen] = useState(false);
  const [isFinalCostDialogOpen, setIsFinalCostDialogOpen] = useState(false);
  const [isDeliveryWorkspaceOpen, setIsDeliveryWorkspaceOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  // Preview Dialog State
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    type: string;
    fileUrl?: string;
    downloadUrl?: string;
    fileType?: string;
  } | null>(null);

  const handleOpenPreview = async (
    name: string,
    type: string,
    rawUrl?: string,
    fileType?: string,
    documentId?: string
  ) => {
    let resolvedUrl = rawUrl;
    let resolvedDownloadUrl = rawUrl ? rawUrl.replace("/preview", "/download") : undefined;

    const docId = documentId || (rawUrl ? rawUrl.match(/\/documents\/([A-Za-z0-9_-]+)/)?.[1] : undefined);
    if (docId) {
      try {
        resolvedUrl = await documentRepository.getAuthenticatedPreviewUrl(docId);
        resolvedDownloadUrl = await documentRepository.getAuthenticatedDownloadUrl(docId);
      } catch {
        // fallback to base url if ticket generation fails
      }
    }

    setPreviewDoc({
      name,
      type,
      fileUrl: resolvedUrl,
      downloadUrl: resolvedDownloadUrl,
      fileType,
    });
  };

  // Schedule form state
  const [scheduleData, setScheduleData] = useState({
    tanggalJemput: "",
    messenger: "",
    catatanPenjadwalan: "",
  });

  // Document verification workspace state
  const [docState, setDocState] = useState<Record<string, { name: string; status: string }>>({
    stnk: { name: "STNK.pdf", status: "Sudah Tersedia" },
    bpkb: { name: "BPKB.pdf", status: "Sudah Tersedia" },
    ktp: { name: "KTP_Pemilik.pdf", status: "Sudah Tersedia" },
    skkp: { name: "SKKP.pdf", status: "Belum Tersedia" },
    lainnya: { name: "", status: "Belum Tersedia" },
  });
  const [docNotes, setDocNotes] = useState("");

  // Final Cost form state
  const [finalCostData, setFinalCostData] = useState<Record<string, string>>({
    finalBiayaJasa: "",
    finalPkb: "",
    finalSwdkllj: "",
    finalDendaSwdkllj: "",
    finalMutasiKeluar: "",
    finalMutasiMasuk: "",
    finalBiayaLainnya: "",
    keteranganMutasiKeluar: "",
    keteranganMutasiMasuk: "",
    keteranganBiayaLainnya: "",
    mutasiKeluarLegalisir: "",
    mutasiKeluarHadir: "",
    mutasiKeluarLegalisirCf: "",
    mutasiKeluarCf: "",
    mutasiKeluarBantuanHadir: "",
    mutasiKeluarCekBlokir: "",
    mutasiKeluarLokPembukuan: "",
    mutasiKeluarLokTu: "",
    mutasiKeluarLokTuNopil: "",
    mutasiKeluarLoksus: "",
    mutasiKeluarCetakSkp: "",
    mutasiKeluarCetakFiskal: "",
    mutasiKeluarLokArsip: "",
    mutasiKeluarCekProgresif: "",
    mutasiKeluarMatiinNopil: "",
    mutasiKeluarDaftarMutmasNormal: "",
    mutasiKeluarDaftarMutmasKilat: "",
    mutasiMasukLegalisir: "",
    mutasiMasukMutmas: "",
    mutasiMasukBy: "",
    mutasiMasukPendaftaran: "",
    mutasiMasukReqGanjilGenap: "",
    mutasiMasukAcak: "",
    mutasiMasukLokTu: "",
    mutasiMasukLokPembukuan: "",
    mutasiMasukDaftarBpkb: "",
    mutasiMasukPenulisanBpkb: "",
    mutasiMasukCetakNotice: "",
    mutasiMasukCetakStnk: "",
    mutasiMasukCetakPlat: "",
  });

  const [showMutasiKeluar, setShowMutasiKeluar] = useState(false);
  const [showMutasiMasuk, setShowMutasiMasuk] = useState(false);
  const [newSamsatDocs, setNewSamsatDocs] = useState<string[]>([]);

  // Samsat progress state
  const [samsatProgress, setSamsatProgress] = useState({
    mutasiKeluar: {
      legalisirHadir: false,
      legalisirCf: false,
      cfBantuanHadir: false,
      cekBlokir: false,
      lokPembukuan: false,
      lokTu: false,
      lokTuNopil: false,
      loksus: false,
      cetakSkp: false,
      cetakFiskal: false,
      lokArsip: false,
      cekProgresif: false,
      matiinNopil: false,
      daftarMutmasNormal: false,
      daftarMutmasKilat: false,
    },
    mutasiMasuk: {
      legalisirMutmas: false,
      byPendaftaran: false,
      reqGanjilGenap: false,
      acak: false,
      lokTu: false,
      lokPembukuan: false,
      daftarBpkb: false,
      penulisanBpkb: false,
      cetakNotice: false,
      cetakStnk: false,
      cetakPlat: false,
    }
  });

  // Delivery form state
  const [deliveryData, setDeliveryData] = useState({
    tanggalPengantaran: "",
    messenger: "",
    catatanPengantaran: "",
  });

  // Permission check for Supervisi editing (Administrator & Finance)
  const canEditVerified = userRole === 'administrator' || userRole === 'finance';

  // Filter orders by search keyword
  const currentOrders = activeOrders[currentTab as StageName] || [];
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return currentOrders;
    const term = searchTerm.toLowerCase();
    return currentOrders.filter((order: any) =>
      order.orderNo.toLowerCase().includes(term) ||
      order.customer.toLowerCase().includes(term) ||
      order.nopol.toLowerCase().includes(term)
    );
  }, [currentOrders, searchTerm]);

  // Stage 5 & 6 Edit toggle state (Default is VIEW-ONLY as required)
  const [isEditingFinalCost, setIsEditingFinalCost] = useState(false);
  const [customCostItems, setCustomCostItems] = useState<CustomCostItem[]>([]);
  const [newCostItemName, setNewCostItemName] = useState("");
  const [newCostItemCategory, setNewCostItemCategory] = useState<"Mutasi Keluar" | "Mutasi Masuk" | "Lainnya">("Lainnya");
  const [newCostItemAmount, setNewCostItemAmount] = useState("");
  const [newCostItemBasePrice, setNewCostItemBasePrice] = useState("");
  const [isSubmittingFinalCost, setIsSubmittingFinalCost] = useState(false);

  // ----------------------------------------------------
  // WORKFLOW ACTION HANDLERS
  // ----------------------------------------------------

  // Stage 1: Action Tandai Sudah Bayar
  const handleMarkPaymentVerified = () => {
    if (!selectedOrder) return;
    const nowStr = new Date().toISOString();
    verifyPayment(selectedOrder.orderNo, userName);

    const updatedPayment = {
      ...selectedOrder.payment,
      isPaymentVerified: true,
      paymentVerifiedAt: nowStr,
      paymentVerifiedBy: userName,
      statusPembayaran: "Lunas" as const,
      dibayar: selectedOrder.payment?.totalBiaya || 0,
      kurang: 0,
      tanggalBayar: nowStr.split("T")[0],
    };

    setSelectedOrder({
      ...selectedOrder,
      payment: updatedPayment,
    });

    toast.success(`Pembayaran untuk order ${selectedOrder.orderNo} berhasil diverifikasi (Lunas)!`);
  };

  // Stage 1 -> Stage 2 (Verifikasi -> Penjadwalan)
  const handleVerifyOrder = () => {
    if (!selectedOrder) return;

    // GATING RULE:
    // Jika Bayar di Awal: payment verification wajib selesai sebelum Stage 1 dapat dilanjutkan.
    const isBayarDiAwal = selectedOrder.payment?.tipePembayaran === "Bayar di Awal";
    const isPaymentVerified = selectedOrder.payment?.isPaymentVerified;
    if (isBayarDiAwal && !isPaymentVerified) {
      toast.error("Pembayaran 'Bayar di Awal' wajib diverifikasi terlebih dahulu sebelum order dapat dilanjutkan ke tahap Penjadwalan!");
      return;
    }

    const nowStr = new Date().toISOString();
    advanceOrder(selectedOrder.orderNo, "Penjadwalan", {
      isVerified: true,
      verifiedBy: userName,
      verifiedAt: nowStr,
      verificationNotes: stage1Note.trim() || undefined,
    });

    setIsVerifyWorkspaceOpen(false);
    toast.success(`Order ${selectedOrder.orderNo} berhasil diverifikasi dan masuk tahap Penjadwalan!`);
    setSelectedOrder(null);
    setStage1Note("");
  };

  // Stage 2 -> Stage 3 (Penjadwalan -> Verifikasi Dokumen)
  const handleSaveSchedule = () => {
    if (!selectedOrder) return;
    if (!scheduleData.tanggalJemput || !scheduleData.messenger) {
      toast.error("Harap lengkapi tanggal jemput dan pilih messenger!");
      return;
    }
    const selectedMessengerObj = karyawan.find((k) => k.nama === scheduleData.messenger);
    advanceOrder(selectedOrder.orderNo, "Verifikasi Dokumen", {
      tanggalJemput: scheduleData.tanggalJemput,
      messenger: scheduleData.messenger,
      assignedMessengerId: selectedMessengerObj?.id,
      catatanPenjadwalan: scheduleData.catatanPenjadwalan,
      isScheduled: true,
    });
    setIsScheduleWorkspaceOpen(false);
    toast.success(`Jadwal jemput untuk ${selectedOrder.orderNo} berhasil disimpan!`);
    setSelectedOrder(null);
  };

  // Stage 3 -> Stage 4 (Verifikasi Dokumen -> Proses Samsat)
  const handleVerifyDocuments = () => {
    if (!selectedOrder) return;
    advanceOrder(selectedOrder.orderNo, "Proses Samsat", {
      clientDocuments: docState as any,
      documentNotes: docNotes,
      documentsVerified: true,
    });
    setIsDocVerificationWorkspaceOpen(false);
    toast.success(`Verifikasi dokumen fisik selesai. Order ${selectedOrder.orderNo} siap diproses Samsat!`);
    setSelectedOrder(null);
  };

  // Stage 4 -> Stage 5 (Proses Samsat -> Verifikasi Ulang)
  const handleAdvanceFromSamsat = () => {
    if (!selectedOrder) return;
    if (!canManage(4)) {
      toast.error("Akses Ditolak: Anda tidak memiliki izin untuk memproses tahap Samsat.");
      return;
    }
    advanceOrder(selectedOrder.orderNo, "Verifikasi Ulang", {});
    setIsSamsatProgressDialogOpen(false);
    toast.success(`Proses Samsat selesai! Order ${selectedOrder.orderNo} berlanjut ke Verifikasi Ulang.`);
    setSelectedOrder(null);
  };

  // Calculation helpers
  const calculateTotalFinal = () => {
    const utama = (parseFloat(finalCostData.finalBiayaJasa || "0")) +
                  (parseFloat(finalCostData.finalPkb || "0")) +
                  (parseFloat(finalCostData.finalSwdkllj || "0")) +
                  (parseFloat(finalCostData.finalDendaSwdkllj || "0"));
    const tambahan = (parseFloat(finalCostData.finalMutasiKeluar || "0")) +
                     (parseFloat(finalCostData.finalMutasiMasuk || "0")) +
                     (parseFloat(finalCostData.finalBiayaLainnya || "0"));
    const rincianMutasiKeluar = Object.keys(hargaDasarMutasiKeluar).reduce(
      (sum, k) => sum + (parseFloat(finalCostData[k] || "0")),
      0
    );
    const rincianMutasiMasuk = Object.keys(hargaDasarMutasiMasuk).reduce(
      (sum, k) => sum + (parseFloat(finalCostData[k] || "0")),
      0
    );
    const customTotal = customCostItems.reduce((sum, item) => sum + (item.actualCost || 0), 0);
    return utama + tambahan + rincianMutasiKeluar + rincianMutasiMasuk + customTotal;
  };

  // Stage 5 -> Stage 6 (Verifikasi Ulang -> Supervisi) & Stage 6 -> Stage 7 (Supervisi -> Pengantaran)
  const handleSaveFinalCost = (isSupervisi: boolean) => {
    if (!selectedOrder || isSubmittingFinalCost) return;
    if (isSupervisi && !canManage(6)) {
      toast.error("Akses Ditolak: Anda tidak memiliki izin untuk menyetujui tahap Supervisi.");
      return;
    }
    setIsSubmittingFinalCost(true);

    try {
      // Check exceeded items vs base price
    const exceededItems: string[] = [];
    Object.keys(hargaDasarMutasiKeluar).forEach((key) => {
      const val = parseFloat(finalCostData[key] || "0");
      const base = hargaDasarMutasiKeluar[key];
      if (val > base) {
        const readable = key.replace('mutasiKeluar', '').replace(/([A-Z])/g, ' $1').trim();
        exceededItems.push(`Mutasi Keluar - ${readable}: Rp ${val.toLocaleString('id-ID')} (Harga Dasar: Rp ${base.toLocaleString('id-ID')})`);
      }
    });
    Object.keys(hargaDasarMutasiMasuk).forEach((key) => {
      const val = parseFloat(finalCostData[key] || "0");
      const base = hargaDasarMutasiMasuk[key];
      if (val > base) {
        const readable = key.replace('mutasiMasuk', '').replace(/([A-Z])/g, ' $1').trim();
        exceededItems.push(`Mutasi Masuk - ${readable}: Rp ${val.toLocaleString('id-ID')} (Harga Dasar: Rp ${base.toLocaleString('id-ID')})`);
      }
    });

    customCostItems.forEach(ci => {
      if (ci.actualCost > ci.basePrice) {
        exceededItems.push(`${ci.name}: Rp ${ci.actualCost.toLocaleString('id-ID')} (Harga Dasar: Rp ${ci.basePrice.toLocaleString('id-ID')})`);
      }
    });

    const parsedData: any = {};
    Object.keys(finalCostData).forEach(k => {
      if (k.startsWith('keterangan')) {
        parsedData[k] = finalCostData[k];
      } else {
        parsedData[k] = parseFloat(finalCostData[k] || "0");
      }
    });

    // Authoritative calculation of new total and payment status
    const totalFinal = calculateTotalFinal();
    const finalBiayaJasa = parseFloat(finalCostData.finalBiayaJasa || "0") || selectedOrder.biayaJasa || selectedOrder.costSnapshot?.biayaJasa || 0;
    const totalBiayaSamsat = Math.max(0, totalFinal - finalBiayaJasa);

    const paid = selectedOrder.payment?.dibayar || 0;
    const difference = totalFinal - paid;

    let settlementCondition: "BALANCED" | "UNDERPAID" | "OVERPAID" = "BALANCED";
    let refundStatus: "NONE" | "PENDING" = "NONE";
    let newKurang = 0;
    let newOverpayment = 0;
    let newStatus: "Lunas" | "Belum Bayar" | "Kurang Bayar" = "Lunas";

    if (difference === 0) {
      settlementCondition = "BALANCED";
      refundStatus = "NONE";
      newKurang = 0;
      newOverpayment = 0;
      newStatus = "Lunas";
    } else if (difference > 0) {
      settlementCondition = "UNDERPAID";
      refundStatus = "NONE";
      newKurang = difference;
      newOverpayment = 0;
      newStatus = paid > 0 ? "Kurang Bayar" : "Belum Bayar";
    } else {
      settlementCondition = "OVERPAID";
      refundStatus = "PENDING";
      newKurang = 0;
      newOverpayment = Math.abs(difference);
      newStatus = "Lunas";
    }

    const updatedPayment = {
      ...(selectedOrder.payment || {}),
      totalBiaya: totalFinal,
      kurang: newKurang,
      overpayment: newOverpayment,
      settlementCondition,
      refundStatus,
      statusPembayaran: newStatus,
    };

    const payload: Partial<OperationalOrder> = {
      ...parsedData,
      totalEstimasi: totalFinal,
      finalCost: totalFinal,
      settlementCondition,
      refundStatus,
      payment: updatedPayment,
      exceededItems: exceededItems.length > 0 ? exceededItems : null,
      updatedDocuments: newSamsatDocs.length > 0 ? newSamsatDocs : selectedOrder.updatedDocuments || [],
      customCostItems,
      isVerified: true,
    };

    // Synchronize final costs directly to FinanceStore (Order -> Finance SSoT Sync)
    orderStore.syncFinalCostToFinance(
      selectedOrder.orderNo,
      totalFinal,
      totalBiayaSamsat,
      finalBiayaJasa,
      customCostItems
    );

    if (isSupervisi) {
      // Stage 6 -> Stage 7 (Supervisi -> Pengantaran)
      advanceOrder(selectedOrder.orderNo, "Pengantaran", {
        ...payload,
        approvedBySpv: true,
        spvName: "SPV Operasional",
        spvApprovedAt: new Date().toISOString().split("T")[0],
      });
      setIsFinalCostDialogOpen(false);
      toast.success(`Supervisi disetujui! Order ${selectedOrder.orderNo} dipindahkan ke Pengantaran.`);
    } else {
      // Stage 5 -> Stage 6 (Verifikasi Ulang -> Supervisi)
      advanceOrder(selectedOrder.orderNo, "Supervisi", payload);
      setIsFinalCostDialogOpen(false);
      toast.success(`Biaya final disimpan! Order ${selectedOrder.orderNo} diajukan ke Supervisi SPV.`);
    }

    if (exceededItems.length > 0) {
      toast.warning(`${exceededItems.length} item mutasi melebihi harga dasar.`);
    }
    setSelectedOrder(null);
    } finally {
      setIsSubmittingFinalCost(false);
    }
  };

  // Stage 7 -> Stage 8 (Pengantaran -> Dokumen Telah Diterima)
  const handleSaveDelivery = () => {
    if (!selectedOrder) return;
    if (!deliveryData.tanggalPengantaran) {
      toast.error("Harap tentukan tanggal pengantaran dokumen!");
      return;
    }
    const deliveryMessengerName = deliveryData.messenger || selectedOrder.messengerPengantar || selectedOrder.messenger;
    const selectedMessengerObj = karyawan.find((k) => k.nama === deliveryMessengerName);
    advanceOrder(selectedOrder.orderNo, "Dokumen Telah Diterima", {
      tanggalPengantaran: deliveryData.tanggalPengantaran,
      messengerPengantar: deliveryMessengerName,
      assignedMessengerId: selectedMessengerObj?.id || selectedOrder.assignedMessengerId,
      catatanPengantaran: deliveryData.catatanPengantaran,
      isDeliveryScheduled: true,
      tanggalDiterima: new Date().toISOString().split('T')[0],
      isReceived: true,
    });
    setIsDeliveryWorkspaceOpen(false);
    toast.success(`Pengantaran selesai! Order ${selectedOrder.orderNo} berpindah ke tahap Dokumen Telah Diterima.`);
    setSelectedOrder(null);
  };

  // Stage 8 -> Riwayat Order (Final Archiving)
  const handleArchiveOrder = () => {
    if (!selectedOrder) return;
    const ok = archiveOrder(selectedOrder.orderNo);
    if (ok) {
      setIsArchiveDialogOpen(false);
      toast.success(`Order ${selectedOrder.orderNo} berhasil diselesaikan dan diarsipkan ke Riwayat Order!`);
      setSelectedOrder(null);
    } else {
      toast.error(`Gagal mengarsipkan order ${selectedOrder.orderNo}.`);
    }
  };

  // Open Handlers with full data hydration
  const openVerifyWorkspace = (order: any) => {
    setSelectedOrder(order);
    setIsVerifyWorkspaceOpen(true);
  };

  const openScheduleWorkspace = (order: any) => {
    setSelectedOrder(order);
    setScheduleData({
      tanggalJemput: order.tanggalJemput || new Date().toISOString().split('T')[0],
      messenger: order.messenger || messengers[0],
      catatanPenjadwalan: order.catatanPenjadwalan || "",
    });
    setIsScheduleWorkspaceOpen(true);
  };

  const openDocVerificationWorkspace = (order: any) => {
    setSelectedOrder(order);
    setDocState(order.clientDocuments || {
      stnk: { name: "STNK.pdf", status: "Sudah Tersedia" },
      bpkb: { name: "BPKB.pdf", status: "Sudah Tersedia" },
      ktp: { name: "KTP_Pemilik.pdf", status: "Sudah Tersedia" },
      skkp: { name: "SKKP.pdf", status: "Belum Tersedia" },
      lainnya: { name: "", status: "Belum Tersedia" },
    });
    setDocNotes(order.documentNotes || "");
    setIsDocVerificationWorkspaceOpen(true);
  };

  const openSamsatProgressWorkspace = (order: any) => {
    setSelectedOrder(order);
    setIsSamsatProgressDialogOpen(true);
  };

  const openFinalCostWorkspace = (order: any) => {
    setSelectedOrder(order);
    setIsEditingFinalCost(false); // DEFAULT VIEW-ONLY as required
    const populated: Record<string, string> = {
      finalBiayaJasa: (order.finalBiayaJasa ?? order.biayaJasa ?? order.costSnapshot?.biayaJasa ?? 0).toString(),
      finalPkb: (order.finalPkb ?? order.pkb ?? 0).toString(),
      finalSwdkllj: (order.finalSwdkllj ?? order.swdkllj ?? 0).toString(),
      finalDendaSwdkllj: (order.finalDendaSwdkllj ?? order.dendaSwdkllj ?? 0).toString(),
      finalMutasiKeluar: (order.finalMutasiKeluar ?? 0).toString(),
      finalMutasiMasuk: (order.finalMutasiMasuk ?? 0).toString(),
      finalBiayaLainnya: (order.finalBiayaLainnya ?? 0).toString(),
      keteranganMutasiKeluar: order.keteranganMutasiKeluar || "",
      keteranganMutasiMasuk: order.keteranganMutasiMasuk || "",
      keteranganBiayaLainnya: order.keteranganBiayaLainnya || "",
    };

    Object.keys(hargaDasarMutasiKeluar).forEach(k => {
      populated[k] = (order[k] ?? "").toString();
    });
    Object.keys(hargaDasarMutasiMasuk).forEach(k => {
      populated[k] = (order[k] ?? "").toString();
    });

    setFinalCostData(populated);
    setCustomCostItems(order.customCostItems || []);
    setNewCostItemName("");
    setNewCostItemAmount("");
    setNewCostItemBasePrice("");
    setNewSamsatDocs(order.updatedDocuments || ["Notice_Pajak_Baru_2024.pdf", "STNK_Perpanjangan_Baru.pdf"]);
    setIsFinalCostDialogOpen(true);
  };

  const openDeliveryWorkspace = (order: any) => {
    setSelectedOrder(order);
    setDeliveryData({
      tanggalPengantaran: order.tanggalPengantaran || new Date().toISOString().split('T')[0],
      messenger: order.messengerPengantar || order.messenger || messengers[0],
      catatanPengantaran: order.catatanPengantaran || "Antar ke alamat pengantaran dokumen.",
    });
    setIsDeliveryWorkspaceOpen(true);
  };

  const openArchiveWorkspace = (order: any) => {
    setSelectedOrder(order);
    setIsArchiveDialogOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-full space-y-4 p-3 sm:p-4 md:p-6 w-full min-w-0 text-left">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="shrink-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Order Tracking</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Workspace alur pemrosesan pesanan kendaraan secara terstruktur dari verifikasi hingga riwayat order
        </p>
      </motion.div>

      {/* Workflow Stepper Navigation */}
      <Card className="p-3 md:p-5 border border-border/80 bg-card shadow-xs shrink-0">
        {/* Mobile & Tablet (< xl): Stage Selector */}
        <div className="block xl:hidden">
          <Select value={currentTab} onValueChange={setCurrentTab}>
            <SelectTrigger className="bg-input-background border-border h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {trackingSteps.map((step) => {
                const Icon = step.icon;
                const count = activeOrders[step.title as StageName]?.length || 0;
                return (
                  <SelectItem key={step.id} value={step.title}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span>{step.id}. {step.title}</span>
                      <Badge status={step.id} className="ml-auto font-mono tabular-nums">
                        {count}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop (>= xl): Interactive Progress Steps */}
        <div className="hidden xl:flex items-center justify-between min-w-0 w-full overflow-x-auto pb-1">
          {trackingSteps.map((step, index) => {
            const Icon = step.icon;
            const currentIndex = trackingSteps.findIndex(s => s.title === currentTab);
            const isActive = currentIndex >= index;
            const isCurrent = currentIndex === index;
            const count = activeOrders[step.title as StageName]?.length || 0;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-primary/15"
                        : isActive
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    onClick={() => setCurrentTab(step.title)}
                  >
                    <Icon className="w-4 h-4" />
                  </motion.button>
                  <p className={cn(
                    "text-[11px] mt-1.5 text-center leading-tight max-w-[90px]",
                    isCurrent
                      ? "text-primary font-semibold"
                      : isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground font-normal"
                  )}>
                    {step.title}
                  </p>
                  <Badge status={step.id} className="mt-1 text-[10px] px-1.5 py-0 font-mono tabular-nums">
                    {count}
                  </Badge>
                </div>
                {index < trackingSteps.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mx-1.5 transition-all rounded-full",
                    currentIndex > index ? "bg-primary" : "bg-border/60"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main Tabs Container */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="hidden">
          {trackingSteps.map((step) => (
            <TabsTrigger key={step.id} value={step.title}>
              {step.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ======================================================== */}
        {/* STAGE 1: VERIFIKASI                                      */}
        {/* ======================================================== */}
        <TabsContent value="Verifikasi" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 md:p-5 border border-border bg-card flex-1 flex flex-col min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-foreground">Stage 1 — Verifikasi Order Baru</h3>
                <p className="text-xs text-muted-foreground">
                  Review informasi order secara komprehensif dan lakukan verifikasi data pemohon
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari order..."
                  className="pl-9 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
              <Table className={cn("w-full min-w-[700px]", filteredOrders.length === 0 && "h-full")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>No Order</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Nomor Polisi</TableHead>
                    <TableHead>Jenis Pengurusan</TableHead>
                    <TableHead>Wilayah Samsat</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => (
                      <TableRow key={order.orderNo}>
                        <TableCell className="font-mono text-primary font-medium">{order.orderNo}</TableCell>
                        <TableCell className="font-medium text-foreground">{order.customer}</TableCell>
                        <TableCell className="font-mono tabular-nums">{order.nopol}</TableCell>
                        <TableCell>{order.layanan}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {order.wilayahSamsatAsal} {order.wilayahSamsatTujuan ? `→ ${order.wilayahSamsatTujuan}` : ''}
                        </TableCell>
                        <TableCell>
                          <Badge status={order.currentStep}>Menunggu Verifikasi</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {/* ONE PRIMARY ACTION: Verifikasi (View + Verifikasi Dialog) */}
                          <Button
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => openVerifyWorkspace(order)}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Verifikasi
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="h-full hover:bg-transparent">
                      <TableCell colSpan={7} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-sm">
                        Tidak ada order pada tahap Verifikasi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* STAGE 2: PENJADWALAN                                     */}
        {/* ======================================================== */}
        <TabsContent value="Penjadwalan" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 md:p-5 border border-border bg-card flex-1 flex flex-col min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-foreground">Stage 2 — Penjadwalan Penjemputan</h3>
                <p className="text-xs text-muted-foreground">
                  Atur tanggal jemput dokumen fisik dan tentukan messenger operasional yang bertugas
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari order..."
                  className="pl-9 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
              <Table className={cn("w-full min-w-[750px]", filteredOrders.length === 0 && "h-full")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>No Order</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Nomor Polisi</TableHead>
                    <TableHead>Jenis Pengurusan</TableHead>
                    <TableHead>Lokasi Jemput</TableHead>
                    <TableHead>Messenger</TableHead>
                    <TableHead>Jadwal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => (
                      <TableRow key={order.orderNo}>
                        <TableCell className="font-mono text-primary font-medium">{order.orderNo}</TableCell>
                        <TableCell className="font-medium text-foreground">{order.customer}</TableCell>
                        <TableCell className="font-mono tabular-nums">{order.nopol}</TableCell>
                        <TableCell>{order.layanan}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {order.detailAlamatPengambilan}
                        </TableCell>
                        <TableCell>{order.messenger || "--"}</TableCell>
                        <TableCell className="font-mono text-xs">{order.tanggalJemput || "--"}</TableCell>
                        <TableCell>
                          <Badge status={order.isScheduled ? "success" : "warning"}>
                            {order.isScheduled ? "Terjadwal" : "Belum Dijadwal"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {/* ONE PRIMARY ACTION: Jadwalkan */}
                          <Button
                            size="sm"
                            variant={order.isScheduled ? "outline" : "default"}
                            className="h-8 gap-1.5"
                            onClick={() => openScheduleWorkspace(order)}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {order.isScheduled ? "Ubah Jadwal" : "Jadwalkan"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="h-full hover:bg-transparent">
                      <TableCell colSpan={9} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-sm">
                        Tidak ada order pada tahap Penjadwalan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* STAGE 3: VERIFIKASI DOKUMEN                             */}
        {/* ======================================================== */}
        <TabsContent value="Verifikasi Dokumen" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 md:p-5 border border-border bg-card flex-1 flex flex-col min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-foreground">Stage 3 — Verifikasi Dokumen Fisik</h3>
                <p className="text-xs text-muted-foreground">
                  Validasi berkas yang telah dijemput (STNK, BPKB, KTP Pemilik, SKKP) sebelum diteruskan ke Samsat
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari order..."
                  className="pl-9 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
              <Table className={cn("w-full min-w-[750px]", filteredOrders.length === 0 && "h-full")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>No Order</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Nomor Polisi</TableHead>
                    <TableHead>Jenis Pengurusan</TableHead>
                    <TableHead>Messenger</TableHead>
                    <TableHead>Kelengkapan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => (
                      <TableRow key={order.orderNo}>
                        <TableCell className="font-mono text-primary font-medium">{order.orderNo}</TableCell>
                        <TableCell className="font-medium text-foreground">{order.customer}</TableCell>
                        <TableCell className="font-mono tabular-nums">{order.nopol}</TableCell>
                        <TableCell>{order.layanan}</TableCell>
                        <TableCell>{order.messenger}</TableCell>
                        <TableCell className="text-xs">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">STNK, BPKB, KTP</span>
                        </TableCell>
                        <TableCell>
                          <Badge status={order.documentsVerified ? "success" : "warning"}>
                            {order.documentsVerified ? "Terverifikasi" : "Perlu Verifikasi"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {/* ONE PRIMARY ACTION: Verifikasi Dokumen */}
                          <Button
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => openDocVerificationWorkspace(order)}
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Verifikasi Dokumen
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="h-full hover:bg-transparent">
                      <TableCell colSpan={8} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-sm">
                        Tidak ada order pada tahap Verifikasi Dokumen
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* STAGE 4: PROSES SAMSAT                                   */}
        {/* ======================================================== */}
        <TabsContent value="Proses Samsat" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 md:p-5 border border-border bg-card flex-1 flex flex-col min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-foreground">Stage 4 — Proses Samsat</h3>
                <p className="text-xs text-muted-foreground">
                  Pantau dan catat seluruh tahapan mutasi keluar & masuk yang sedang dikerjakan di kantor Samsat
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari order..."
                  className="pl-9 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
              <Table className={cn("w-full min-w-[750px]", filteredOrders.length === 0 && "h-full")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>No Order</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Nomor Polisi</TableHead>
                    <TableHead>Jenis Pengurusan</TableHead>
                    <TableHead>Messenger</TableHead>
                    <TableHead>Estimasi Awal</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => {
                      const totalEstimasi = (order.biayaJasa || 0) + (order.pkb || 0) + (order.swdkllj || 0) + (order.dendaSwdkllj || 0);
                      const doneMutkel = order.samsatProgress?.mutasiKeluar ? Object.values(order.samsatProgress.mutasiKeluar).filter(Boolean).length : 0;
                      const doneMutmas = order.samsatProgress?.mutasiMasuk ? Object.values(order.samsatProgress.mutasiMasuk).filter(Boolean).length : 0;
                      const totalDone = doneMutkel + doneMutmas;

                      return (
                        <TableRow key={order.orderNo}>
                          <TableCell className="font-mono text-primary font-medium">{order.orderNo}</TableCell>
                          <TableCell className="font-medium text-foreground">{order.customer}</TableCell>
                          <TableCell className="font-mono tabular-nums">{order.nopol}</TableCell>
                          <TableCell>{order.layanan}</TableCell>
                          <TableCell>{order.messenger}</TableCell>
                          <TableCell className="font-mono tabular-nums text-xs">
                            Rp {totalEstimasi.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Badge status="info" className="font-mono tabular-nums">
                              {totalDone} Item Selesai
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage(4) ? (
                              <Button
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => openSamsatProgressWorkspace(order)}
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                Simpan Progress
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                                onClick={() => openSamsatProgressWorkspace(order)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Lihat Detail
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow className="h-full hover:bg-transparent">
                      <TableCell colSpan={8} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-sm">
                        Tidak ada order pada tahap Proses Samsat
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* STAGE 5: VERIFIKASI ULANG (ADMIN)                       */}
        {/* ======================================================== */}
        <TabsContent value="Verifikasi Ulang" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 md:p-5 border border-border bg-card flex-1 flex flex-col min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-foreground">Stage 5 — Verifikasi Ulang Biaya (Admin)</h3>
                <p className="text-xs text-muted-foreground">
                  Admin menginput dan mencocokkan biaya aktual realisasi Samsat dengan referensi harga dasar
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari order..."
                  className="pl-9 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
              <Table className={cn("w-full min-w-[750px]", filteredOrders.length === 0 && "h-full")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>No Order</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Nomor Polisi</TableHead>
                    <TableHead>Jenis Pengurusan</TableHead>
                    <TableHead>Estimasi Awal</TableHead>
                    <TableHead>Biaya Aktual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => {
                      const totalEstimasi = (order.biayaJasa || 0) + (order.pkb || 0) + (order.swdkllj || 0) + (order.dendaSwdkllj || 0);
                      const finalTotal = (order.finalBiayaJasa || 0) + (order.finalPkb || 0) + (order.finalSwdkllj || 0) + (order.finalDendaSwdkllj || 0) + (order.finalMutasiKeluar || 0) + (order.finalMutasiMasuk || 0) + (order.finalBiayaLainnya || 0);

                      return (
                        <TableRow key={order.orderNo}>
                          <TableCell className="font-mono text-primary font-medium">{order.orderNo}</TableCell>
                          <TableCell className="font-medium text-foreground">{order.customer}</TableCell>
                          <TableCell className="font-mono tabular-nums">{order.nopol}</TableCell>
                          <TableCell>{order.layanan}</TableCell>
                          <TableCell className="font-mono tabular-nums text-xs text-muted-foreground">
                            Rp {totalEstimasi.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums text-xs font-semibold text-foreground">
                            {order.isVerified ? `Rp ${finalTotal.toLocaleString('id-ID')}` : "--"}
                          </TableCell>
                          <TableCell>
                            <Badge status={order.isVerified ? "success" : "warning"}>
                              {order.isVerified ? "Siap Supervisi" : "Input Biaya"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {/* ONE PRIMARY ACTION: Verifikasi Ulang */}
                            <Button
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => openFinalCostWorkspace(order)}
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              Verifikasi Ulang
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow className="h-full hover:bg-transparent">
                      <TableCell colSpan={8} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-sm">
                        Tidak ada order pada tahap Verifikasi Ulang
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* STAGE 6: SUPERVISI (SPV)                                */}
        {/* ======================================================== */}
        <TabsContent value="Supervisi" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 md:p-5 border border-border bg-card flex-1 flex flex-col min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-foreground">Stage 6 — Supervisi & Review SPV</h3>
                <p className="text-xs text-muted-foreground">
                  Supervisor meninjau rincian biaya final, item melebihi harga dasar, dan menyetujui order ke tahap pengantaran
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari order..."
                  className="pl-9 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
              <Table className={cn("w-full min-w-[750px]", filteredOrders.length === 0 && "h-full")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>No Order</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Nomor Polisi</TableHead>
                    <TableHead>Jenis Pengurusan</TableHead>
                    <TableHead>Total Biaya Final</TableHead>
                    <TableHead>Status Harga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => {
                      const finalTotal = (order.finalBiayaJasa || 0) + (order.finalPkb || 0) + (order.finalSwdkllj || 0) + (order.finalDendaSwdkllj || 0) + (order.finalMutasiKeluar || 0) + (order.finalMutasiMasuk || 0) + (order.finalBiayaLainnya || 0);
                      const hasExceeded = order.exceededItems && order.exceededItems.length > 0;

                      return (
                        <TableRow key={order.orderNo}>
                          <TableCell className="font-mono text-primary font-medium">{order.orderNo}</TableCell>
                          <TableCell className="font-medium text-foreground">{order.customer}</TableCell>
                          <TableCell className="font-mono tabular-nums">{order.nopol}</TableCell>
                          <TableCell>{order.layanan}</TableCell>
                          <TableCell className="font-mono tabular-nums text-xs font-semibold text-primary">
                            Rp {finalTotal.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            {hasExceeded ? (
                              <Badge status="warning" className="gap-1 text-[11px]">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                Melebihi Harga Dasar
                              </Badge>
                            ) : (
                              <Badge status="success">Sesuai Standar</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge status="info">Menunggu Approval</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage(6) ? (
                              <Button
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => openFinalCostWorkspace(order)}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Supervisi
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                                onClick={() => openFinalCostWorkspace(order)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Lihat Detail
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow className="h-full hover:bg-transparent">
                      <TableCell colSpan={8} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-sm">
                        Tidak ada order pada tahap Supervisi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* STAGE 7: PENGANTARAN                                     */}
        {/* ======================================================== */}
        <TabsContent value="Pengantaran" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 md:p-5 border border-border bg-card flex-1 flex flex-col min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-foreground">Stage 7 — Pengantaran Dokumen</h3>
                <p className="text-xs text-muted-foreground">
                  Atur jadwal dan tugaskan messenger untuk mengantarkan kembali berkas selesai kepada customer
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari order..."
                  className="pl-9 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
              <Table className={cn("w-full min-w-[750px]", filteredOrders.length === 0 && "h-full")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>No Order</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Nomor Polisi</TableHead>
                    <TableHead>Alamat Antar</TableHead>
                    <TableHead>Messenger</TableHead>
                    <TableHead>Tanggal Antar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => (
                      <TableRow key={order.orderNo}>
                        <TableCell className="font-mono text-primary font-medium">{order.orderNo}</TableCell>
                        <TableCell className="font-medium text-foreground">{order.customer}</TableCell>
                        <TableCell className="font-mono tabular-nums">{order.nopol}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {order.detailAlamatPengembalian}
                        </TableCell>
                        <TableCell>{order.messenger}</TableCell>
                        <TableCell className="font-mono text-xs">{order.tanggalPengantaran || "--"}</TableCell>
                        <TableCell>
                          <Badge status={order.isDeliveryScheduled ? "success" : "warning"}>
                            {order.isDeliveryScheduled ? "Terjadwal" : "Belum Dijadwal"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {/* ONE PRIMARY ACTION: Atur Pengantaran */}
                          <Button
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => openDeliveryWorkspace(order)}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Atur Pengantaran
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="h-full hover:bg-transparent">
                      <TableCell colSpan={8} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-sm">
                        Tidak ada order pada tahap Pengantaran
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* STAGE 8: DOKUMEN TELAH DITERIMA (FINAL STAGE)           */}
        {/* ======================================================== */}
        <TabsContent value="Dokumen Telah Diterima" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 md:p-5 border border-border bg-card flex-1 flex flex-col min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-foreground">Stage 8 — Dokumen Telah Diterima</h3>
                <p className="text-xs text-muted-foreground">
                  Proses akhir konfirmasi serah terima berkas selesai sebelum order diarsipkan ke Riwayat Order
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari order..."
                  className="pl-9 h-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
              <Table className={cn("w-full min-w-[750px]", filteredOrders.length === 0 && "h-full")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>No Order</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Nomor Polisi</TableHead>
                    <TableHead>Jenis Pengurusan</TableHead>
                    <TableHead>Messenger</TableHead>
                    <TableHead>Tanggal Selesai</TableHead>
                    <TableHead>Total Biaya</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => {
                      const finalTotal = (order.finalBiayaJasa || 0) + (order.finalPkb || 0) + (order.finalSwdkllj || 0) + (order.finalDendaSwdkllj || 0) + (order.finalMutasiKeluar || 0) + (order.finalMutasiMasuk || 0) + (order.finalBiayaLainnya || 0);

                      return (
                        <TableRow key={order.orderNo}>
                          <TableCell className="font-mono text-primary font-medium">{order.orderNo}</TableCell>
                          <TableCell className="font-medium text-foreground">{order.customer}</TableCell>
                          <TableCell className="font-mono tabular-nums">{order.nopol}</TableCell>
                          <TableCell>{order.layanan}</TableCell>
                          <TableCell>{order.messenger}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{order.tanggalDiterima || "2024-11-22"}</TableCell>
                          <TableCell className="font-mono tabular-nums text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Rp {finalTotal.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge status="success" className="text-[10px] w-fit">
                                Operasional: Selesai
                              </Badge>
                              {(order.payment?.kurang || 0) > 0 ? (
                                <Badge status="error" className="text-[10px] w-fit font-semibold">
                                  Kurang: Rp {(order.payment?.kurang || 0).toLocaleString('id-ID')} (Jatuh Tempo)
                                </Badge>
                              ) : order.payment?.refundStatus === "PENDING" ? (
                                <Badge status="info" className="text-[10px] w-fit">
                                  Refund Pending
                                </Badge>
                              ) : (
                                <Badge status="success" className="text-[10px] w-fit">
                                  Finansial: Lunas
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {/* ONE PRIMARY ACTION: Simpan ke Riwayat Order */}
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => openArchiveWorkspace(order)}
                            >
                              <Archive className="w-3.5 h-3.5" />
                              Simpan ke Riwayat Order
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow className="h-full hover:bg-transparent">
                      <TableCell colSpan={9} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-sm">
                        Tidak ada order pada tahap Dokumen Telah Diterima
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* 1. OPERATIONAL WORKSPACE: VERIFIKASI (VIEW + VERIFIKASI) */}
      {/* ======================================================== */}
      <Dialog open={isVerifyWorkspaceOpen} onOpenChange={setIsVerifyWorkspaceOpen}>
        <DialogContent className="w-full sm:max-w-2xl lg:max-w-4xl max-h-[90dvh] bg-card text-card-foreground p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge status={1} className="text-xs">
                  Stage 1 — Verifikasi Order Baru
                </Badge>
                <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary bg-primary/5">
                  {selectedOrder?.orderSource || "Offline / Loket"}
                </Badge>
              </div>
              <span className="font-mono text-xs font-semibold text-foreground">{selectedOrder?.nopol}</span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-semibold text-foreground mt-1">
              Verifikasi Order — {selectedOrder?.orderNo}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pemohon: <span className="font-medium text-foreground">{selectedOrder?.customer}</span> ({selectedOrder?.nomorHP}) • Layanan: <span className="font-medium text-foreground">{selectedOrder?.layanan}</span> • Petugas Entri: <span className="font-medium text-foreground">{selectedOrder?.createdBy || "Admin"}</span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4 sm:p-5 overflow-y-auto">
            {selectedOrder && (
              <div className="space-y-4 sm:space-y-5 text-xs">
                {/* 1. Data Pemilik & Kontak */}
                <div>
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 mb-2.5">
                    <User className="w-4 h-4 text-primary" />
                    Data Pemilik Kendaraan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="text-muted-foreground">Nama Pemilik</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.namaPemilik}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nomor Telepon</p>
                      <p className="font-mono text-foreground mt-0.5">{selectedOrder.nomorHP}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status Kepemilikan</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.kepemilikanKendaraan}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Layanan & Kendaraan */}
                <div>
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 mb-2.5">
                    <Car className="w-4 h-4 text-primary" />
                    Detail Layanan & Identitas Kendaraan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="text-muted-foreground">Jenis Pengurusan</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.layanan}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nomor Polisi</p>
                      <p className="font-mono text-foreground font-semibold mt-0.5">{selectedOrder.nopol}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jenis Kendaraan</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.jenisKendaraan}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tahun Pembuatan</p>
                      <p className="font-mono text-foreground mt-0.5">{selectedOrder.tahunKendaraan}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Informasi Pajak & Samsat */}
                <div>
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 mb-2.5">
                    <Shield className="w-4 h-4 text-primary" />
                    Informasi Pajak & Wilayah Samsat
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="text-muted-foreground">PKB Berlaku S/D</p>
                      <p className="font-mono text-foreground mt-0.5">{selectedOrder.pkbBerlakuSd || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Periode Pajak</p>
                      <p className="text-foreground mt-0.5">{selectedOrder.bulanPajak} {selectedOrder.tahunPajak}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Samsat Asal</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.wilayahSamsatAsal}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Samsat Tujuan</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.wilayahSamsatTujuan || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* 4. Alamat Jemput & Antar Terstruktur */}
                <div>
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 mb-2.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    Alamat Penjemputan & Pengantaran (Terstruktur)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg bg-muted/30 border border-border">
                      <p className="text-muted-foreground font-medium mb-1">Alamat Penjemputan Dokumen</p>
                      {renderAddress(
                        selectedOrder.alamatPenjemputan,
                        selectedOrder.detailAlamatPengambilan,
                        selectedOrder.domisiliPengambilan || selectedOrder.wilayahSamsatAsal
                      )}
                    </div>
                    <div className="p-3.5 rounded-lg bg-muted/30 border border-border">
                      <p className="text-muted-foreground font-medium mb-1">Alamat Pengantaran Dokumen</p>
                      {renderAddress(
                        selectedOrder.alamatPengantaran,
                        selectedOrder.detailAlamatPengembalian,
                        selectedOrder.domisiliPengembalian || selectedOrder.wilayahSamsatTujuan || selectedOrder.wilayahSamsatAsal
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. PAYMENT INFORMATION (AUTHORITATIVE) */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Informasi Pembayaran & Status Pelunasan
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-2 py-0.5",
                          selectedOrder.payment?.tipePembayaran === "Bayar di Awal"
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {selectedOrder.payment?.tipePembayaran || "Bayar di Akhir"}
                      </Badge>
                      <Badge
                        status={selectedOrder.payment?.statusPembayaran === "Lunas" ? "success" : "warning"}
                        className="text-xs px-2 py-0.5"
                      >
                        {selectedOrder.payment?.statusPembayaran || "Belum Lunas"}
                      </Badge>
                    </div>
                  </div>

                  <Card className="p-4 border-border bg-card space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                        <span className="text-muted-foreground">Total Tagihan</span>
                        <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                          Rp {(selectedOrder.payment?.totalBiaya || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                        <span className="text-muted-foreground">Terbayar</span>
                        <p className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          Rp {(selectedOrder.payment?.dibayar || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                        <span className="text-muted-foreground">Sisa Tagihan</span>
                        <p className="font-mono text-sm font-semibold text-destructive mt-0.5">
                          Rp {(selectedOrder.payment?.kurang || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                        <span className="text-muted-foreground">Metode Pembayaran</span>
                        <p className="font-medium text-foreground mt-0.5 truncate">
                          {selectedOrder.payment?.metodePembayaran || "-"}
                        </p>
                      </div>
                    </div>

                    {/* KHUSUS BAYAR DI AWAL: VERIFIKASI BUKTI PEMBAYARAN (VIEW/REVIEW ONLY) */}
                    {selectedOrder.payment?.tipePembayaran === "Bayar di Awal" ? (
                      <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-primary" />
                            Verifikasi Bukti Pembayaran
                          </p>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                              selectedOrder.payment?.isPaymentVerified
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {selectedOrder.payment?.isPaymentVerified ? "Terverifikasi" : "Belum Diverifikasi"}
                          </span>
                        </div>

                        {selectedOrder.payment?.buktiPembayaran?.fileName ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-background/90 border border-primary/20">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                {selectedOrder.payment.buktiPembayaran.fileType === "pdf" ? (
                                  <FileText className="w-5 h-5 text-rose-500" />
                                ) : (
                                  <FileUp className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {selectedOrder.payment.buktiPembayaran.fileName}
                                </p>
                                <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="uppercase font-mono font-medium px-1 rounded bg-muted text-[10px]">
                                    {selectedOrder.payment.buktiPembayaran.fileType}
                                  </span>
                                  {selectedOrder.payment.buktiPembayaran.fileSize && (
                                    <span>• {selectedOrder.payment.buktiPembayaran.fileSize}</span>
                                  )}
                                  {selectedOrder.payment.buktiPembayaran.uploadedAt && (
                                    <span>• Diunggah {new Date(selectedOrder.payment.buktiPembayaran.uploadedAt).toLocaleDateString('id-ID')}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5"
                                onClick={() =>
                                  handleOpenPreview(
                                    selectedOrder.payment.buktiPembayaran.fileName,
                                    "Bukti Pembayaran",
                                    selectedOrder.payment.buktiPembayaran.fileUrl,
                                    selectedOrder.payment.buktiPembayaran.fileType,
                                    (selectedOrder.payment.buktiPembayaran as any)?.documentId
                                  )
                                }
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{selectedOrder.payment.buktiPembayaran.fileType === "pdf" ? "Buka / View PDF" : "Preview Gambar"}</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Klien belum melampirkan berkas bukti transfer saat pembuatan order di Buat Order. Pastikan dana telah masuk rekening/kas kantor sebelum memverifikasi.</span>
                          </div>
                        )}

                        {/* VERIFICATION STATE & ACTION */}
                        <div className="pt-2 border-t border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {selectedOrder.payment?.isPaymentVerified ? (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span className="text-xs font-medium">
                                Pembayaran Terverifikasi Lunas oleh {selectedOrder.payment.paymentVerifiedBy || userName} ({selectedOrder.payment.paymentVerifiedAt ? new Date(selectedOrder.payment.paymentVerifiedAt).toLocaleDateString('id-ID') : "Hari ini"})
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span className="text-xs">
                                Pembayaran 'Bayar di Awal' belum diverifikasi. Pastikan dana masuk kas kantor/rekening.
                              </span>
                            </div>
                          )}

                          {!selectedOrder.payment?.isPaymentVerified && (
                            <Button
                              type="button"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1.5 shrink-0"
                              onClick={handleMarkPaymentVerified}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Tandai Sudah Bayar
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                        <span>
                          Skema Bayar di Akhir: Pembayaran ditagihkan pada tahap serah terima berkas (Pengantaran/Diterima). Tidak memerlukan bukti pembayaran di Stage 1.
                        </span>
                      </div>
                    )}
                  </Card>
                </div>

                {/* 6. Dokumen Kendaraan Terlampir (Semua Optional) */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-2.5">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      Dokumen Kendaraan yang Dilampirkan Klien
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      (Semua dokumen opsional — tidak memblokir verifikasi order)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { key: 'stnk', label: 'STNK Asli' },
                      { key: 'bpkb', label: 'BPKB Asli' },
                      { key: 'ktp', label: 'KTP Pemilik Asli' },
                      { key: 'skkp', label: 'SKKP (Surat Ketetapan Pajak)' },
                      { key: 'lainnya', label: 'Dokumen Tambahan / Surat Kuasa' },
                    ].map(doc => {
                      const item = selectedOrder.clientDocuments?.[doc.key];
                      const isAvailable = Boolean(item?.name && item?.status !== "Belum Tersedia");
                      const fileName = item?.name;

                      return (
                        <div
                          key={doc.key}
                          className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                              isAvailable ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                            )}>
                              {item?.fileType === "pdf" ? <FileIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground text-xs">{doc.label}</p>
                                <Badge status={isAvailable ? "success" : "default"} className="text-[10px] px-1.5 py-0">
                                  {isAvailable ? (item?.status || "Tersedia") : "Belum Tersedia"}
                                </Badge>
                                {item?.fileType && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-border text-muted-foreground uppercase">
                                    {item.fileType}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {fileName ? fileName : "Berkas fisik belum diunggah"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pl-11 sm:pl-0">
                            {fileName && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() =>
                                    handleOpenPreview(
                                      fileName,
                                      doc.label,
                                      item?.fileUrl,
                                      item?.fileType,
                                      (item as any)?.documentId
                                    )
                                  }
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Preview
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs px-2 gap-1 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    const updatedDocs = {
                                      ...(selectedOrder.clientDocuments || {}),
                                      [doc.key]: {
                                        name: "",
                                        status: "Belum Tersedia",
                                        isOptional: true,
                                      },
                                    };
                                    updateOrder(selectedOrder.orderNo, { clientDocuments: updatedDocs });
                                    setSelectedOrder({ ...selectedOrder, clientDocuments: updatedDocs });
                                    toast.info(`Lampiran ${doc.label} dihapus.`);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}

                            <label className="cursor-pointer">
                              <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors gap-1">
                                <Upload className="w-3.5 h-3.5" />
                                {fileName ? "Ganti" : "Upload"}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                                    const fileSize = (file.size / 1024).toFixed(0) + " KB";
                                    try {
                                      const uploaded = await documentRepository.uploadDocument(file, {
                                        orderNo: selectedOrder.orderNo,
                                        documentType: doc.key,
                                      });
                                      const updatedDocs = {
                                        ...(selectedOrder.clientDocuments || {}),
                                        [doc.key]: {
                                          name: file.name,
                                          status: "Baru Diupload",
                                          updatedAt: new Date().toISOString().split("T")[0],
                                          fileType: isPdf ? "pdf" : "image",
                                          fileUrl: uploaded.fileUrl,
                                          fileSize,
                                          isOptional: true,
                                        }
                                      };
                                      updateOrder(selectedOrder.orderNo, { clientDocuments: updatedDocs });
                                      setSelectedOrder({ ...selectedOrder, clientDocuments: updatedDocs });
                                      toast.success(`${doc.label} (${file.name}) berhasil diunggah.`);
                                    } catch (err: any) {
                                      toast.error(err.message || "Gagal mengunggah berkas.");
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7. Catatan Verifikasi Stage 1 */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <Label className="text-xs font-semibold text-foreground">
                    Catatan Verifikator Stage 1 (Opsional)
                  </Label>
                  <Input
                    placeholder="Contoh: Berkas fisik telah dicek lengkap, siap untuk diatur jadwal penjemputan"
                    value={stage1Note}
                    onChange={(e) => setStage1Note(e.target.value)}
                    className="bg-input-background h-9 text-xs"
                  />
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/10 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              {selectedOrder?.payment?.tipePembayaran === "Bayar di Awal" && !selectedOrder?.payment?.isPaymentVerified && (
                <p className="text-[11px] text-destructive font-medium">
                  * Verifikasi Pembayaran 'Bayar di Awal' wajib dilakukan sebelum dapat melanjutkan ke tahap Penjadwalan.
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsVerifyWorkspaceOpen(false)} className="w-full sm:w-auto">
                Tutup
              </Button>
              <Button
                onClick={handleVerifyOrder}
                disabled={selectedOrder?.payment?.tipePembayaran === "Bayar di Awal" && !selectedOrder?.payment?.isPaymentVerified}
                className="gap-2 w-full sm:w-auto"
              >
                <CheckCircle className="w-4 h-4" />
                Verifikasi & Lanjut
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 2. OPERATIONAL WORKSPACE: PENJADWALAN                    */}
      {/* ======================================================== */}
      <Dialog open={isScheduleWorkspaceOpen} onOpenChange={setIsScheduleWorkspaceOpen}>
        <DialogContent className="w-full sm:max-w-2xl lg:max-w-3xl max-h-[90dvh] bg-card text-card-foreground p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <Badge status={2} className="text-xs">
                Stage 2 — Penjadwalan Jemput
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{selectedOrder?.nopol}</span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-semibold text-foreground mt-1">
              Atur Jadwal Penjemputan — {selectedOrder?.orderNo}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tinjau konteks lokasi pengambilan dokumen sebelum menugaskan messenger
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4 sm:p-5 overflow-y-auto">
            {selectedOrder && (
              <div className="space-y-4 text-xs">
                {/* Order Context Banner */}
                <div className="p-3.5 sm:p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Konteks Order & Lokasi Jemput
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <p className="text-muted-foreground">Nama Customer</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.customer}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{selectedOrder.nomorHP}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jenis Pengurusan</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.layanan}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Kendaraan & Nomor Polisi</p>
                      <p className="font-mono text-foreground font-semibold mt-0.5">{selectedOrder.nopol}</p>
                      <p className="text-muted-foreground text-[11px]">{selectedOrder.jenisKendaraan} ({selectedOrder.tahunKendaraan})</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Samsat</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.wilayahSamsatAsal}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground font-medium">Alamat Penjemputan Dokumen:</p>
                    <p className="text-foreground font-medium mt-0.5 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{selectedOrder.detailAlamatPengambilan} (Domisili: {selectedOrder.domisiliPengambilan})</span>
                    </p>
                  </div>
                </div>

                {/* Scheduling Fields */}
                <Card className="p-3.5 sm:p-4 border border-border bg-card space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" />
                    Konfigurasi Penjemputan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground">Tanggal Jemput Dokumen</Label>
                      <Input
                        type="date"
                        value={scheduleData.tanggalJemput}
                        onChange={(e) => setScheduleData({ ...scheduleData, tanggalJemput: e.target.value })}
                        className="bg-input-background h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground">Tugaskan Messenger</Label>
                      <Select
                        value={scheduleData.messenger}
                        onValueChange={(val) => setScheduleData({ ...scheduleData, messenger: val })}
                      >
                        <SelectTrigger className="bg-input-background h-9 text-xs">
                          <SelectValue placeholder="Pilih Messenger" />
                        </SelectTrigger>
                        <SelectContent>
                          {messengers.map((m) => (
                            <SelectItem key={m} value={m} className="text-xs">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground">Catatan Penjemputan (Opsional)</Label>
                    <Input
                      placeholder="Contoh: Jemput dokumen sebelum jam 12 siang, hubungi satpam komplek"
                      value={scheduleData.catatanPenjadwalan}
                      onChange={(e) => setScheduleData({ ...scheduleData, catatanPenjadwalan: e.target.value })}
                      className="bg-input-background h-9 text-xs"
                    />
                  </div>
                </Card>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/10 shrink-0 flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsScheduleWorkspaceOpen(false)} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button onClick={handleSaveSchedule} className="gap-2 w-full sm:w-auto">
              <Calendar className="w-4 h-4" />
              Simpan Jadwal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 3. OPERATIONAL WORKSPACE: VERIFIKASI DOKUMEN             */}
      {/* ======================================================== */}
      <Dialog open={isDocVerificationWorkspaceOpen} onOpenChange={setIsDocVerificationWorkspaceOpen}>
        <DialogContent className="w-full sm:max-w-2xl lg:max-w-3xl max-h-[90dvh] bg-card text-card-foreground p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <Badge status={3} className="text-xs">
                Stage 3 — Verifikasi Dokumen Fisik
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{selectedOrder?.nopol}</span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-semibold text-foreground mt-1">
              Verifikasi & Upload Dokumen — {selectedOrder?.orderNo}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pastikan berkas fisik yang diterima lengkap, terbaca jelas, dan siap diproses ke Samsat
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4 sm:p-5 overflow-y-auto">
            {selectedOrder && (
              <div className="space-y-5 text-xs">
                {/* Context Strip */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{selectedOrder.customer}</p>
                      <p className="text-[11px] text-muted-foreground">{selectedOrder.layanan} • {selectedOrder.nopol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-[11px]">Messenger Penjemput</p>
                    <p className="font-medium text-foreground">{selectedOrder.messenger || "Belum Ditugaskan"}</p>
                  </div>
                </div>

                {/* Section Dokumen Wajib */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    Dokumen Wajib
                  </h4>

                  {[
                    { key: 'stnk', label: 'STNK Asli' },
                    { key: 'bpkb', label: 'BPKB Asli' },
                    { key: 'ktp', label: 'KTP Pemilik Asli' },
                  ].map((doc) => {
                    const item = docState[doc.key] || { name: "", status: "Belum Tersedia" };
                    const isAvailable = item.status === "Sudah Tersedia" || item.status === "Baru Diupload" || item.status === "Diperbarui";

                    return (
                      <div
                        key={doc.key}
                        className="p-3.5 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                            isAvailable ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                          )}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground text-xs">{doc.label}</p>
                              <Badge status={isAvailable ? "success" : "warning"} className="text-[10px] px-1.5 py-0">
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {item.name ? item.name : "Berkas fisik belum diunggah"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.name && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setPreviewDoc({ name: item.name, type: doc.label })}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Preview
                            </Button>
                          )}
                          <label className="cursor-pointer">
                            <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              {item.name ? "Ganti File" : "Upload File"}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setDocState(prev => ({
                                    ...prev,
                                    [doc.key]: { name: file.name, status: "Baru Diupload" }
                                  }));
                                  toast.success(`${doc.label} (${file.name}) berhasil diunggah.`);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Section Dokumen Opsional */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    Dokumen Opsional / Tambahan
                  </h4>

                  {[
                    { key: 'skkp', label: 'SKKP (Surat Ketetapan Kewajiban Pembayaran)' },
                    { key: 'lainnya', label: 'Dokumen Lainnya (Surat Kuasa / Faktur / Kwitansi)' },
                  ].map((doc) => {
                    const item = docState[doc.key] || { name: "", status: "Belum Tersedia" };
                    const isAvailable = item.status === "Sudah Tersedia" || item.status === "Baru Diupload" || item.status === "Diperbarui";

                    return (
                      <div
                        key={doc.key}
                        className="p-3.5 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                            isAvailable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground text-xs">{doc.label}</p>
                              <Badge status={isAvailable ? "success" : "neutral"} className="text-[10px] px-1.5 py-0">
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {item.name ? item.name : "Opsional jika dibutuhkan"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.name && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setPreviewDoc({ name: item.name, type: doc.label })}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Preview
                            </Button>
                          )}
                          <label className="cursor-pointer">
                            <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              {item.name ? "Ganti" : "Upload"}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setDocState(prev => ({
                                    ...prev,
                                    [doc.key]: { name: file.name, status: "Baru Diupload" }
                                  }));
                                  toast.success(`${doc.label} (${file.name}) berhasil diunggah.`);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Catatan Verifikasi Dokumen */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground">Catatan Verifikasi Dokumen</Label>
                  <Input
                    placeholder="Catatan kondisi fisik dokumen, legalisir, nomor mesin/rangka..."
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    className="bg-input-background h-9 text-xs"
                  />
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/10 shrink-0 flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDocVerificationWorkspaceOpen(false)} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button onClick={handleVerifyDocuments} className="gap-2 w-full sm:w-auto">
              <CheckCircle className="w-4 h-4" />
              Verifikasi & Lanjut ke Samsat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 4. OPERATIONAL WORKSPACE: PROSES SAMSAT                  */}
      {/* ======================================================== */}
      <Dialog open={isSamsatProgressDialogOpen} onOpenChange={setIsSamsatProgressDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl lg:max-w-4xl max-h-[90dvh] bg-card text-card-foreground p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <Badge status={4} className="text-xs">
                Stage 4 — Proses Samsat (Progress Tracking)
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{selectedOrder?.nopol}</span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-semibold text-foreground mt-1">
              Tracking Real-time Proses Samsat — {selectedOrder?.orderNo}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Status tahapan dipantau langsung dari operasional messenger di kantor Samsat (View-Only)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4 sm:p-5 overflow-y-auto">
            {selectedOrder && (() => {
              const processes: SamsatProcessItem[] =
                selectedOrder.samsatProcesses && selectedOrder.samsatProcesses.length > 0
                  ? selectedOrder.samsatProcesses
                  : getDefaultSamsatProcesses(selectedOrder.layanan || "");

              const completedProcesses = processes.filter((p: any) => p.status === "Selesai");
              const inProgressProcess = processes.find((p: any) => p.status === "Sedang Diproses");
              const pendingProcesses = processes.filter((p: any) => p.status === "Belum Diproses");
              const completionPercent = Math.round((completedProcesses.length / (processes.length || 1)) * 100);

              return (
                <div className="space-y-4 sm:space-y-5 text-xs">
                  {/* Context & Estimasi Awal */}
                  <div className="p-3.5 sm:p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <p className="text-muted-foreground">Nama Customer</p>
                        <p className="font-medium text-foreground mt-0.5">{selectedOrder.customer}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Nomor Polisi</p>
                        <p className="font-mono text-foreground font-semibold mt-0.5">{selectedOrder.nopol}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Jenis Pengurusan</p>
                        <p className="font-medium text-foreground mt-0.5">{selectedOrder.layanan}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Petugas Messenger</p>
                        <p className="font-medium text-primary mt-0.5">{selectedOrder.messenger || "Ahmad Rizki (Samsat Team)"}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Progress Bar & Counter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground">
                          Progress Keseluruhan: {completedProcesses.length} dari {processes.length} Tahapan Selesai
                        </span>
                        <span className="font-mono font-semibold text-primary">{completionPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Highlight Tahapan Sedang Berjalan */}
                  {inProgressProcess ? (
                    <Card className="p-3.5 bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 animate-pulse">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Sedang Diproses Saat Ini:</p>
                          <p className="text-sm font-semibold text-foreground">
                            {inProgressProcess.category} — {inProgressProcess.name}
                          </p>
                        </div>
                      </div>
                      <Badge status="info" className="shrink-0 animate-pulse">
                        In Progress
                      </Badge>
                    </Card>
                  ) : (
                    <Card className="p-3 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium text-foreground text-xs">
                        Seluruh proses Samsat pada berkas ini telah tuntas diselesaikan oleh messenger!
                      </span>
                    </Card>
                  )}

                  {/* 1. Tahapan yang Sudah Selesai (Di Posisi Paling Atas dengan Checkmark) */}
                  <div className="space-y-2.5">
                    <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Tahapan Samsat Selesai ({completedProcesses.length})
                      </span>
                      <span className="text-[11px] text-muted-foreground font-normal">Diurutkan teratas</span>
                    </h4>

                    {completedProcesses.length > 0 ? (
                      <div className="space-y-1.5">
                        {completedProcesses.map((proc: any) => (
                          <div
                            key={proc.id}
                            className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">{proc.name}</span>
                                <span className="text-[11px] text-muted-foreground ml-2">({proc.category})</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                              {proc.completedAt && (
                                <span className="text-muted-foreground">Pukul {proc.completedAt} WIB</span>
                              )}
                              <Badge status="success">Selesai</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs italic p-3 bg-muted/20 rounded border border-border">
                        Belum ada tahapan yang diselesaikan.
                      </p>
                    )}
                  </div>

                  {/* 2. Tahapan Berikutnya / Menunggu */}
                  {pendingProcesses.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Tahapan Menunggu Antrean Loket ({pendingProcesses.length})
                      </h4>
                      <div className="space-y-1.5">
                        {pendingProcesses.map((proc: any) => (
                          <div
                            key={proc.id}
                            className="p-3 rounded-lg border border-border bg-muted/10 flex items-center justify-between text-xs opacity-70"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-5 h-5 rounded-full border border-muted-foreground/30 flex items-center justify-center shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                              </div>
                              <div>
                                <span className="font-medium text-foreground">{proc.name}</span>
                                <span className="text-[11px] text-muted-foreground ml-2">({proc.category})</span>
                              </div>
                            </div>
                            <Badge status="neutral" className="text-[10px]">
                              Menunggu
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </ScrollArea>

          <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/10 shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsSamsatProgressDialogOpen(false)} className="w-full sm:w-auto">
              Tutup
            </Button>
            {canManage(4) && (
              <Button onClick={handleAdvanceFromSamsat} className="gap-2 w-full sm:w-auto">
                <ArrowRight className="w-4 h-4" />
                Lanjut ke Verifikasi Ulang
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 5 & 6. OPERATIONAL WORKSPACE: VERIFIKASI ULANG & SUPERVISI */}
      {/* ======================================================== */}
      <Dialog open={isFinalCostDialogOpen} onOpenChange={setIsFinalCostDialogOpen}>
        <DialogContent className="w-full sm:max-w-3xl lg:max-w-5xl max-h-[90dvh] bg-card text-card-foreground p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <Badge status={currentTab === "Supervisi" ? 6 : 5} className="text-xs">
                {currentTab === "Supervisi" ? "Stage 6 — Supervisi (SPV)" : "Stage 5 — Verifikasi Ulang Biaya Final (Admin)"}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{selectedOrder?.nopol}</span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-semibold text-foreground mt-1">
              {currentTab === "Supervisi" ? "Review & Supervisi Biaya" : "Verifikasi Ulang Biaya Final"} — {selectedOrder?.orderNo}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nama Customer: <span className="font-medium text-foreground">{selectedOrder?.customer}</span> • Jenis Pengurusan: <span className="font-medium text-foreground">{selectedOrder?.layanan}</span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4 sm:p-5 overflow-y-auto">
            {selectedOrder && (() => {
              const isMutasiKeluar = selectedOrder.layanan?.includes("Mutasi Keluar") || selectedOrder.layanan?.includes("Luar Daerah");
              const isMutasiMasuk = selectedOrder.layanan?.includes("Mutasi Masuk") || selectedOrder.layanan?.includes("Antar Samsat");

              return (
                <div className="space-y-5 text-xs">
                  {/* Mode Banner & Toggle Button */}
                  <div className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border gap-3",
                    isEditingFinalCost ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/30 border-border"
                  )}>
                    <div className="flex items-center gap-2.5">
                      <Badge status={isEditingFinalCost ? "warning" : "neutral"} className="text-xs shrink-0">
                        {isEditingFinalCost ? "Mode: Edit Biaya" : "Mode: View-Only"}
                      </Badge>
                      <p className="text-xs text-foreground/80">
                        {isEditingFinalCost
                          ? "Anda dapat mengubah nominal atau menambahkan item biaya yang terlewat."
                          : "Tinjau rincian biaya realisasi Samsat. Klik tombol Edit jika ada penyesuaian biaya."}
                      </p>
                    </div>

                    {(currentTab !== "Supervisi" || canEditVerified) && (
                      <div className="shrink-0 flex items-center gap-2">
                        {isEditingFinalCost ? (
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground"
                            onClick={() => {
                              setIsEditingFinalCost(false);
                              toast.success("Mode edit ditutup. Perubahan biaya telah diperbarui di tampilan.");
                            }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Selesai Edit
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => setIsEditingFinalCost(true)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit / Sesuaikan Biaya
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1. Biaya Utama (Aktual) */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-primary" />
                      Biaya Utama (Aktual)
                    </h4>

                    {isEditingFinalCost ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg bg-card border border-border">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground">Biaya Jasa</Label>
                          <Input
                            type="number"
                            value={finalCostData.finalBiayaJasa}
                            onChange={(e) => setFinalCostData({ ...finalCostData, finalBiayaJasa: e.target.value })}
                            className="bg-input-background h-9 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground">PKB Aktual</Label>
                          <Input
                            type="number"
                            value={finalCostData.finalPkb}
                            onChange={(e) => setFinalCostData({ ...finalCostData, finalPkb: e.target.value })}
                            className="bg-input-background h-9 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground">SWDKLLJ</Label>
                          <Input
                            type="number"
                            value={finalCostData.finalSwdkllj}
                            onChange={(e) => setFinalCostData({ ...finalCostData, finalSwdkllj: e.target.value })}
                            className="bg-input-background h-9 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground">Denda SWDKLLJ</Label>
                          <Input
                            type="number"
                            value={finalCostData.finalDendaSwdkllj}
                            onChange={(e) => setFinalCostData({ ...finalCostData, finalDendaSwdkllj: e.target.value })}
                            className="bg-input-background h-9 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Card className="p-3 bg-muted/20 border-border">
                          <span className="text-muted-foreground text-[11px]">Biaya Jasa</span>
                          <p className="font-mono font-semibold text-sm text-foreground mt-1">
                            Rp {(parseFloat(finalCostData.finalBiayaJasa || "0")).toLocaleString('id-ID')}
                          </p>
                        </Card>
                        <Card className="p-3 bg-muted/20 border-border">
                          <span className="text-muted-foreground text-[11px]">PKB Aktual</span>
                          <p className="font-mono font-semibold text-sm text-foreground mt-1">
                            Rp {(parseFloat(finalCostData.finalPkb || "0")).toLocaleString('id-ID')}
                          </p>
                        </Card>
                        <Card className="p-3 bg-muted/20 border-border">
                          <span className="text-muted-foreground text-[11px]">SWDKLLJ</span>
                          <p className="font-mono font-semibold text-sm text-foreground mt-1">
                            Rp {(parseFloat(finalCostData.finalSwdkllj || "0")).toLocaleString('id-ID')}
                          </p>
                        </Card>
                        <Card className="p-3 bg-muted/20 border-border">
                          <span className="text-muted-foreground text-[11px]">Denda SWDKLLJ</span>
                          <p className="font-mono font-semibold text-sm text-foreground mt-1">
                            Rp {(parseFloat(finalCostData.finalDendaSwdkllj || "0")).toLocaleString('id-ID')}
                          </p>
                        </Card>
                      </div>
                    )}
                  </div>

                  {/* 2. Biaya Tambahan Global */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                      Biaya Tambahan Operasional & Keterangan
                    </h4>

                    {isEditingFinalCost ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-card border border-border">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground">Mutasi Keluar</Label>
                          <Input
                            type="number"
                            value={finalCostData.finalMutasiKeluar}
                            onChange={(e) => setFinalCostData({ ...finalCostData, finalMutasiKeluar: e.target.value })}
                            className="bg-input-background h-9 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                          <Input
                            placeholder="Keterangan Mutasi Keluar"
                            value={finalCostData.keteranganMutasiKeluar}
                            onChange={(e) => setFinalCostData({ ...finalCostData, keteranganMutasiKeluar: e.target.value })}
                            className="bg-input-background h-8 text-[11px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground">Mutasi Masuk</Label>
                          <Input
                            type="number"
                            value={finalCostData.finalMutasiMasuk}
                            onChange={(e) => setFinalCostData({ ...finalCostData, finalMutasiMasuk: e.target.value })}
                            className="bg-input-background h-9 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                          <Input
                            placeholder="Keterangan Mutasi Masuk"
                            value={finalCostData.keteranganMutasiMasuk}
                            onChange={(e) => setFinalCostData({ ...finalCostData, keteranganMutasiMasuk: e.target.value })}
                            className="bg-input-background h-8 text-[11px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground">Biaya Lainnya</Label>
                          <Input
                            type="number"
                            value={finalCostData.finalBiayaLainnya}
                            onChange={(e) => setFinalCostData({ ...finalCostData, finalBiayaLainnya: e.target.value })}
                            className="bg-input-background h-9 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                          <Input
                            placeholder="Keterangan Biaya Lainnya"
                            value={finalCostData.keteranganBiayaLainnya}
                            onChange={(e) => setFinalCostData({ ...finalCostData, keteranganBiayaLainnya: e.target.value })}
                            className="bg-input-background h-8 text-[11px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="p-3 bg-muted/20 border-border">
                          <span className="text-muted-foreground text-[11px]">Mutasi Keluar</span>
                          <p className="font-mono font-semibold text-sm text-foreground mt-0.5">
                            Rp {(parseFloat(finalCostData.finalMutasiKeluar || "0")).toLocaleString('id-ID')}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate mt-1">
                            {finalCostData.keteranganMutasiKeluar || "Tidak ada keterangan"}
                          </p>
                        </Card>
                        <Card className="p-3 bg-muted/20 border-border">
                          <span className="text-muted-foreground text-[11px]">Mutasi Masuk</span>
                          <p className="font-mono font-semibold text-sm text-foreground mt-0.5">
                            Rp {(parseFloat(finalCostData.finalMutasiMasuk || "0")).toLocaleString('id-ID')}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate mt-1">
                            {finalCostData.keteranganMutasiMasuk || "Tidak ada keterangan"}
                          </p>
                        </Card>
                        <Card className="p-3 bg-muted/20 border-border">
                          <span className="text-muted-foreground text-[11px]">Biaya Lainnya</span>
                          <p className="font-mono font-semibold text-sm text-foreground mt-0.5">
                            Rp {(parseFloat(finalCostData.finalBiayaLainnya || "0")).toLocaleString('id-ID')}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate mt-1">
                            {finalCostData.keteranganBiayaLainnya || "Tidak ada keterangan"}
                          </p>
                        </Card>
                      </div>
                    )}
                  </div>

                  {/* 3. Rincian Item Mutasi yang Relevan (Filtered by Service) */}
                  {(isMutasiKeluar || isMutasiMasuk) && (
                    <div className="space-y-4">
                      {isMutasiKeluar && (
                        <div className="rounded-xl border border-destructive/20 bg-destructive/5 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowMutasiKeluar(!showMutasiKeluar)}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-destructive/10 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-destructive" />
                              <span className="font-semibold text-xs text-foreground">Rincian Item Mutasi Keluar</span>
                              <span className="text-[11px] text-muted-foreground">• Referensi Harga Dasar</span>
                            </div>
                            {showMutasiKeluar ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>

                          {showMutasiKeluar && (
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 border-t border-destructive/10 bg-card">
                              {Object.keys(hargaDasarMutasiKeluar).map((key) => {
                                const label = key.replace('mutasiKeluar', '').replace(/([A-Z])/g, ' $1').trim();
                                const basePrice = hargaDasarMutasiKeluar[key];
                                const currentVal = parseFloat(finalCostData[key] || "0");
                                const exceeds = currentVal > basePrice;

                                if (!isEditingFinalCost) {
                                  if (currentVal <= 0) return null;
                                  return (
                                    <div key={key} className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1">
                                      <p className="font-medium text-foreground text-xs">{label}</p>
                                      <p className="font-mono text-xs font-semibold">Rp {currentVal.toLocaleString('id-ID')}</p>
                                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>Dasar: Rp {basePrice.toLocaleString('id-ID')}</span>
                                        {exceeds && (
                                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                                            +Rp {(currentVal - basePrice).toLocaleString('id-ID')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <MutasiCostField
                                    key={key}
                                    label={label}
                                    value={finalCostData[key] || ""}
                                    basePrice={basePrice}
                                    onChange={(val) => setFinalCostData({ ...finalCostData, [key]: val })}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {isMutasiMasuk && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowMutasiMasuk(!showMutasiMasuk)}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-emerald-500/10 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="font-semibold text-xs text-foreground">Rincian Item Mutasi Masuk</span>
                              <span className="text-[11px] text-muted-foreground">• Referensi Harga Dasar</span>
                            </div>
                            {showMutasiMasuk ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>

                          {showMutasiMasuk && (
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 border-t border-emerald-500/10 bg-card">
                              {Object.keys(hargaDasarMutasiMasuk).map((key) => {
                                const label = key.replace('mutasiMasuk', '').replace(/([A-Z])/g, ' $1').trim();
                                const basePrice = hargaDasarMutasiMasuk[key];
                                const currentVal = parseFloat(finalCostData[key] || "0");
                                const exceeds = currentVal > basePrice;

                                if (!isEditingFinalCost) {
                                  if (currentVal <= 0) return null;
                                  return (
                                    <div key={key} className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1">
                                      <p className="font-medium text-foreground text-xs">{label}</p>
                                      <p className="font-mono text-xs font-semibold">Rp {currentVal.toLocaleString('id-ID')}</p>
                                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>Dasar: Rp {basePrice.toLocaleString('id-ID')}</span>
                                        {exceeds && (
                                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                                            +Rp {(currentVal - basePrice).toLocaleString('id-ID')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <MutasiCostField
                                    key={key}
                                    label={label}
                                    value={finalCostData[key] || ""}
                                    basePrice={basePrice}
                                    onChange={(val) => setFinalCostData({ ...finalCostData, [key]: val })}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Item Biaya Kustom (+ Tambah Item yang Terlewat) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        Item Biaya Tambahan yang Terlewat ({customCostItems.length})
                      </h4>
                    </div>

                    {customCostItems.length > 0 && (
                      <div className="space-y-2">
                        {customCostItems.map((item) => {
                          const diff = item.actualCost - item.basePrice;
                          return (
                            <div
                              key={item.id}
                              className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <span className="font-medium text-foreground">{item.name}</span>
                                <Badge status="neutral" className="ml-2 text-[10px]">{item.category}</Badge>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  Harga Dasar: Rp {item.basePrice.toLocaleString('id-ID')}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="font-mono font-semibold text-foreground">
                                    Rp {item.actualCost.toLocaleString('id-ID')}
                                  </span>
                                  {diff > 0 && (
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                      +Rp {diff.toLocaleString('id-ID')}
                                    </p>
                                  )}
                                </div>
                                {isEditingFinalCost && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                    onClick={() => setCustomCostItems(prev => prev.filter(c => c.id !== item.id))}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isEditingFinalCost && (
                      <Card className="p-3.5 bg-muted/20 border-dashed border border-border space-y-3">
                        <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          Tambah Item Biaya Terlewat
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <Input
                            placeholder="Nama item biaya..."
                            value={newCostItemName}
                            onChange={(e) => setNewCostItemName(e.target.value)}
                            className="bg-input-background h-8 text-xs sm:col-span-1"
                          />
                          <Select
                            value={newCostItemCategory}
                            onValueChange={(val: any) => setNewCostItemCategory(val)}
                          >
                            <SelectTrigger className="bg-input-background h-8 text-xs">
                              <SelectValue placeholder="Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mutasi Keluar" className="text-xs">Mutasi Keluar</SelectItem>
                              <SelectItem value="Mutasi Masuk" className="text-xs">Mutasi Masuk</SelectItem>
                              <SelectItem value="Lainnya" className="text-xs">Lainnya</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Biaya Aktual (Rp)"
                            value={newCostItemAmount}
                            onChange={(e) => setNewCostItemAmount(e.target.value)}
                            className="bg-input-background h-8 text-xs font-mono"
                          />
                          <Input
                            type="number"
                            placeholder="Harga Dasar (Rp)"
                            value={newCostItemBasePrice}
                            onChange={(e) => setNewCostItemBasePrice(e.target.value)}
                            className="bg-input-background h-8 text-xs font-mono"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => {
                            if (!newCostItemName.trim()) {
                              toast.error("Nama item biaya wajib diisi!");
                              return;
                            }
                            const amount = parseFloat(newCostItemAmount || "0");
                            const base = parseFloat(newCostItemBasePrice || "0");
                            const newItem: CustomCostItem = {
                              id: `custom-${Date.now()}`,
                              name: newCostItemName.trim(),
                              category: newCostItemCategory,
                              actualCost: amount,
                              basePrice: base,
                            };
                            setCustomCostItems(prev => [...prev, newItem]);
                            setNewCostItemName("");
                            setNewCostItemAmount("");
                            setNewCostItemBasePrice("");
                            toast.success(`Item "${newItem.name}" ditambahkan.`);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Item Biaya
                        </Button>
                      </Card>
                    )}
                  </div>

                  {/* 5. Total Biaya Final & Financial Reconciliation Card */}
                  {(() => {
                    const totalFinal = calculateTotalFinal();
                    const totalEstimasiAwal = selectedOrder.costSnapshot?.totalEstimasi || selectedOrder.totalEstimasi || 0;
                    const paid = selectedOrder.payment?.dibayar || 0;
                    const diff = totalFinal - paid;
                    const isBalanced = diff === 0;
                    const isUnderpaid = diff > 0;
                    const isOverpaid = diff < 0;
                    const overpaidAmt = Math.abs(diff);

                    return (
                      <Card className="p-4 sm:p-5 bg-muted/40 border border-border space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                              REKONSILIASI BIAYA
                            </span>
                          </div>
                          {isBalanced && (
                            <Badge status="success" className="text-[11px] px-2.5 py-0.5 font-semibold">
                              BALANCED (Lunas)
                            </Badge>
                          )}
                          {isUnderpaid && (
                            <Badge status="warning" className="text-[11px] px-2.5 py-0.5 font-semibold">
                              UNDERPAID (Kurang Bayar)
                            </Badge>
                          )}
                          {isOverpaid && (
                            <Badge status="info" className="text-[11px] px-2.5 py-0.5 font-semibold">
                              OVERPAID (Lebih Bayar)
                            </Badge>
                          )}
                        </div>

                        {/* Financial Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-card border border-border">
                            <span className="text-[10px] text-muted-foreground block font-medium">Estimasi Awal</span>
                            <span className="font-mono font-semibold text-foreground text-xs sm:text-sm">
                              Rp {totalEstimasiAwal.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-card border border-border">
                            <span className="text-[10px] text-muted-foreground block font-medium">Total Terbayar (Paid)</span>
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                              Rp {paid.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-card border border-border">
                            <span className="text-[10px] text-muted-foreground block font-medium">Total Biaya Final</span>
                            <span className="font-mono font-bold text-primary text-xs sm:text-sm">
                              Rp {totalFinal.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-card border border-border">
                            <span className="text-[10px] text-muted-foreground block font-medium">Selisih Rekonsiliasi</span>
                            <span className={`font-mono font-bold text-xs sm:text-sm ${
                              isUnderpaid ? 'text-amber-600 dark:text-amber-400' : isOverpaid ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {isUnderpaid ? `+ Rp ${diff.toLocaleString('id-ID')} (Kurang)` : isOverpaid ? `- Rp ${overpaidAmt.toLocaleString('id-ID')} (Lebih)` : 'Rp 0 (Pas)'}
                            </span>
                          </div>
                        </div>

                        {/* Distinct Case Presentation (Sections 3 & 4) */}
                        {isBalanced && (
                          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                              <div>
                                <p className="font-semibold text-foreground">Final Cost = Paid (Rp {totalFinal.toLocaleString('id-ID')})</p>
                                <p className="text-[11px] opacity-90 mt-0.5">
                                  Pembayaran awal sesuai dengan realisasi biaya final. Status: <strong>LUNAS / BALANCED</strong>.
                                </p>
                              </div>
                            </div>
                            <Badge status="success" className="text-[10px] font-bold shrink-0 self-start sm:self-center">
                              LUNAS / BALANCED
                            </Badge>
                          </div>
                        )}

                        {isUnderpaid && (
                          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                <div>
                                  <p className="font-semibold">Kurang Bayar (Outstanding): Rp {diff.toLocaleString('id-ID')}</p>
                                  <p className="text-[11px] opacity-90 mt-0.5">
                                    Final Cost: <strong>Rp {totalFinal.toLocaleString('id-ID')}</strong> • Paid: <strong>Rp {paid.toLocaleString('id-ID')}</strong> • Outstanding: <strong>Rp {diff.toLocaleString('id-ID')}</strong>
                                  </p>
                                </div>
                              </div>
                              <Badge status="warning" className="text-[10px] font-bold shrink-0 self-start sm:self-center">
                                KURANG BAYAR
                              </Badge>
                            </div>

                            {/* Non-blocking operational reassurance callout */}
                            <div className="p-2.5 rounded bg-amber-500/15 border border-amber-500/30 text-[11px] font-medium text-amber-950 dark:text-amber-100 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Order tetap dapat dilanjutkan ke tahap berikutnya (Supervisi, Pengantaran & Serah Terima).</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              * Sisa kewajiban pembayaran otomatis tercatat di menu <strong>Tagihan</strong> dengan status Belum Jatuh Tempo selama alur berlangsung.
                            </p>
                          </div>
                        )}

                        {isOverpaid && (
                          <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-xs text-blue-900 dark:text-blue-200 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                                <div>
                                  <p className="font-semibold">Kelebihan Pembayaran (Overpayment): Rp {overpaidAmt.toLocaleString('id-ID')}</p>
                                  <p className="text-[11px] opacity-90 mt-0.5">
                                    Paid: <strong>Rp {paid.toLocaleString('id-ID')}</strong> • Final Cost: <strong>Rp {totalFinal.toLocaleString('id-ID')}</strong> • Overpayment: <strong>Rp {overpaidAmt.toLocaleString('id-ID')}</strong>
                                  </p>
                                </div>
                              </div>
                              <Badge status="info" className="text-[10px] font-bold shrink-0 self-start sm:self-center">
                                STATUS REFUND: {selectedOrder.payment?.refundStatus || "PENDING"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 italic">
                              * Kelebihan pembayaran dicatat sebagai hak pengembalian (liabilitas refund) bagi customer dan tidak dihitung sebagai omzet/profit kantor.
                            </p>
                          </div>
                        )}
                      </Card>
                    );
                  })()}

                  {/* 6. Section Dokumen Terpisah: Dokumen Klien VS Dokumen Terbaru */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Pemisahan Dokumen Order
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* SECTION 1: Dokumen dari Klien */}
                      <Card className="p-3.5 border border-border bg-card space-y-2.5">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            1. Dokumen dari Klien
                          </span>
                          <Badge status="neutral" className="text-[10px]">Asli / Masuk</Badge>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { key: 'stnk', label: 'STNK Asli' },
                            { key: 'bpkb', label: 'BPKB Asli' },
                            { key: 'ktp', label: 'KTP Pemilik' },
                          ].map((d) => {
                            const doc = selectedOrder.clientDocuments?.[d.key];
                            const docName = doc?.name || `${d.key}.pdf`;
                            return (
                              <div key={d.key} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-[11px] text-foreground font-medium truncate">{d.label}</span>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] gap-1 px-2 shrink-0"
                                  onClick={() => setPreviewDoc({ name: docName, type: d.label })}
                                >
                                  <Eye className="w-3 h-3 text-primary" />
                                  Lihat
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </Card>

                      {/* SECTION 2: Dokumen Terbaru (Hasil Proses Samsat) */}
                      <Card className="p-3.5 border border-border bg-card space-y-2.5">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            2. Dokumen Terbaru (Hasil Samsat)
                          </span>
                          <label className="cursor-pointer">
                            <span className="inline-flex items-center justify-center h-6 px-2 rounded text-[10px] font-medium border border-border bg-primary/10 text-primary hover:bg-primary/20 gap-1">
                              <Upload className="w-3 h-3" />
                              Tambah Dokumen
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setNewSamsatDocs(prev => [...prev, file.name]);
                                  toast.success(`Dokumen hasil Samsat (${file.name}) ditambahkan.`);
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="space-y-1.5">
                          {newSamsatDocs.length > 0 ? (
                            newSamsatDocs.map((docName, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/20 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="text-[11px] text-foreground font-medium truncate">{docName}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[11px] gap-1 px-2"
                                    onClick={() => setPreviewDoc({ name: docName, type: "Dokumen Baru Samsat" })}
                                  >
                                    <Eye className="w-3 h-3 text-primary" />
                                    Lihat
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                    onClick={() => setNewSamsatDocs(prev => prev.filter((_, i) => i !== idx))}
                                  >
                                    ×
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-muted-foreground text-xs border border-dashed rounded">
                              Belum ada dokumen hasil proses Samsat
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              );
            })()}
          </ScrollArea>

          <DialogFooter className="p-4 border-t border-border bg-muted/10 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-2">
            <Button variant="outline" onClick={() => setIsFinalCostDialogOpen(false)} disabled={isSubmittingFinalCost} className="w-full sm:w-auto">
              {currentTab === "Supervisi" && !canManage(6) ? "Tutup" : "Batal"}
            </Button>
            {currentTab === "Supervisi" ? (
              canManage(6) ? (
                <Button 
                  onClick={() => handleSaveFinalCost(true)} 
                  disabled={isSubmittingFinalCost}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSubmittingFinalCost ? "Memproses..." : "Approve Supervisi & Lanjut ke Pengantaran"}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Mode Tinjauan: Approval supervisi hanya dapat dilakukan oleh Supervisor / SVP</span>
                </div>
              )
            ) : (
              <Button 
                onClick={() => handleSaveFinalCost(false)} 
                disabled={isSubmittingFinalCost}
                className="gap-2 w-full sm:w-auto font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                {isSubmittingFinalCost ? "Menyimpan..." : "Simpan Rekonsiliasi"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 7. OPERATIONAL WORKSPACE: PENGANTARAN                     */}
      {/* ======================================================== */}
      <Dialog open={isDeliveryWorkspaceOpen} onOpenChange={setIsDeliveryWorkspaceOpen}>
        <DialogContent className="w-full sm:max-w-2xl lg:max-w-3xl max-h-[90dvh] bg-card text-card-foreground p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <Badge status={7} className="text-xs">
                Stage 7 — Pengantaran Dokumen
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{selectedOrder?.nopol}</span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-semibold text-foreground mt-1">
              Atur Pengantaran Dokumen — {selectedOrder?.orderNo}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Konfirmasi alamat pengembalian berkas dan jadwalkan messenger pengantar
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4 sm:p-5 overflow-y-auto">
            {selectedOrder && (
              <div className="space-y-4 text-xs">
                {/* Context Card */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Konteks Order & Alamat Pengantaran Dokumen
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <p className="text-muted-foreground">Penerima Dokumen</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.customer}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{selectedOrder.nomorHP || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jenis Pengurusan</p>
                      <p className="font-medium text-foreground mt-0.5">{selectedOrder.layanan}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Kendaraan & Nomor Polisi</p>
                      <p className="font-mono text-foreground font-semibold mt-0.5">{selectedOrder.nopol}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Tagihan Final</p>
                      <p className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        Rp {((selectedOrder.finalBiayaJasa || 0) + (selectedOrder.finalPkb || 0) + (selectedOrder.finalSwdkllj || 0) + (selectedOrder.finalDendaSwdkllj || 0) + (selectedOrder.finalMutasiKeluar || 0) + (selectedOrder.finalMutasiMasuk || 0) + (selectedOrder.finalBiayaLainnya || 0)).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      Alamat Pengantaran Dokumen:
                    </p>
                    <div className="pl-5">
                      {renderAddress(
                        selectedOrder.alamatPengantaran,
                        selectedOrder.detailAlamatPengembalian,
                        selectedOrder.domisiliPengembalian
                      )}
                    </div>
                  </div>
                </div>

                {/* Scheduling Form */}
                <Card className="p-4 border border-border bg-card space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-primary" />
                    Penugasan Pengantaran
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground">Tanggal Pengantaran</Label>
                      <Input
                        type="date"
                        value={deliveryData.tanggalPengantaran}
                        onChange={(e) => setDeliveryData({ ...deliveryData, tanggalPengantaran: e.target.value })}
                        className="bg-input-background h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground">Tugaskan Messenger</Label>
                      <Select
                        value={deliveryData.messenger}
                        onValueChange={(val) => setDeliveryData({ ...deliveryData, messenger: val })}
                      >
                        <SelectTrigger className="bg-input-background h-9 text-xs">
                          <SelectValue placeholder="Pilih Messenger" />
                        </SelectTrigger>
                        <SelectContent>
                          {messengers.map((m) => (
                            <SelectItem key={m} value={m} className="text-xs">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground">Catatan Pengantaran (Opsional)</Label>
                    <Input
                      placeholder="Contoh: Serahkan langsung ke pelanggan, minta bukti tanda terima ttd"
                      value={deliveryData.catatanPengantaran}
                      onChange={(e) => setDeliveryData({ ...deliveryData, catatanPengantaran: e.target.value })}
                      className="bg-input-background h-9 text-xs"
                    />
                  </div>
                </Card>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="p-4 border-t border-border bg-muted/10 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeliveryWorkspaceOpen(false)} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button onClick={handleSaveDelivery} className="gap-2 w-full sm:w-auto">
              <Truck className="w-4 h-4" />
              Konfirmasi Selesai & Lanjut ke Diterima
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 8. ARCHIVE CONFIRMATION DIALOG: SIMPAN KE RIWAYAT ORDER */}
      {/* ======================================================== */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="w-full sm:max-w-xl max-h-[90dvh] bg-card text-card-foreground p-4 sm:p-5 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Stage 8 — Penyelesaian Serah Terima Dokumen
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Verifikasi kelengkapan dokumen hasil Samsat dan status finansial sebelum menyimpan order ke riwayat
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (() => {
            const paid = selectedOrder.payment?.dibayar || 0;
            const total = selectedOrder.payment?.totalBiaya || selectedOrder.totalEstimasi || 0;
            const kurang = selectedOrder.payment?.kurang || 0;
            const isUnderpaid = kurang > 0;
            const isRefundPending = selectedOrder.payment?.refundStatus === "PENDING" && (selectedOrder.payment?.overpayment || 0) > 0;
            const overpayment = selectedOrder.payment?.overpayment || 0;
            const isFinanciallySettled = !isUnderpaid && !isRefundPending && selectedOrder.payment?.statusPembayaran === "Lunas";

            // Aggregate AFTER documents from updatedDocuments and rekapDocuments
            const afterDocs: string[] = [
              ...(selectedOrder.updatedDocuments || []),
              ...(selectedOrder.rekapDocuments?.filter((d: any) => d.phase === "AFTER").map((d: any) => d.label || d.name) || []),
            ];

            return (
              <div className="space-y-4 my-2 text-xs">
                {/* 1. Order Summary */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nomor Order:</span>
                    <span className="font-mono text-primary font-semibold">{selectedOrder.orderNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nama Customer:</span>
                    <span className="font-medium text-foreground">{selectedOrder.customer} ({selectedOrder.nomorHP})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nomor Polisi:</span>
                    <span className="font-mono font-medium">{selectedOrder.nopol} ({selectedOrder.jenisKendaraan || "Kendaraan"})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jenis Pengurusan:</span>
                    <span>{selectedOrder.layanan}</span>
                  </div>
                </div>

                {/* 2. Dua Konsep Terpisah: Status Operasional VS Status Finansial (Section 6) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Status Operasional */}
                  <div className="p-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Status Operasional
                      </span>
                      <Badge status="success" className="text-[10px] px-2 py-0.5 font-bold">
                        SELESAI
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Dokumen Telah Diterima Customer</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Proses pengurusan di Samsat dan penyerahan fisik berkas kepada customer telah tuntas.
                    </p>
                  </div>

                  {/* Status Finansial */}
                  <div className={cn(
                    "p-3 rounded-lg border space-y-1.5",
                    isUnderpaid 
                      ? "border-rose-500/30 bg-rose-500/5" 
                      : isRefundPending 
                      ? "border-blue-500/30 bg-blue-500/5" 
                      : "border-emerald-500/25 bg-emerald-500/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Status Finansial
                      </span>
                      {isUnderpaid ? (
                        <Badge status="error" className="text-[10px] px-2 py-0.5 font-bold">
                          JATUH TEMPO
                        </Badge>
                      ) : isRefundPending ? (
                        <Badge status="info" className="text-[10px] px-2 py-0.5 font-bold">
                          REFUND PENDING
                        </Badge>
                      ) : (
                        <Badge status="success" className="text-[10px] px-2 py-0.5 font-bold">
                          LUNAS
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="font-semibold text-foreground text-xs">
                        {isUnderpaid ? "KURANG BAYAR" : isRefundPending ? "LEBIH BAYAR" : "LUNAS"}
                      </span>
                      <span className={cn(
                        "font-mono font-bold text-xs",
                        isUnderpaid ? "text-rose-600 dark:text-rose-400" : isRefundPending ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {isUnderpaid ? `Rp ${kurang.toLocaleString('id-ID')}` : isRefundPending ? `Rp ${overpayment.toLocaleString('id-ID')}` : `Rp 0`}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Terbayar: Rp {paid.toLocaleString('id-ID')} / Total: Rp {total.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Financial Action & Notification Banner */}
                {isUnderpaid && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-semibold">Kewajiban Tagihan Jatuh Tempo: Rp {kurang.toLocaleString('id-ID')}</p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          Status invoice pada menu <strong>Tagihan</strong> beralih menjadi <strong>JATUH TEMPO</strong> saat memasuki tahap ini. Anda dapat mengarsipkan order ini ke riwayat operasional sekarang; tagihan tetap aktif di menu Tagihan dan order <strong>belum masuk ke Rekap Order</strong> sampai lunas.
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white border-none gap-1.5 font-medium"
                        onClick={() => {
                          if (selectedOrder.payment?.invoiceNo) {
                            financeStore.recordPayment(selectedOrder.payment.invoiceNo, kurang, {
                              paymentMethod: selectedOrder.payment.metodePembayaran || "Cash",
                            });
                          } else {
                            verifyPayment(selectedOrder.orderNo, userName);
                          }
                          toast.success(`Pelunasan tagihan Rp ${kurang.toLocaleString('id-ID')} berhasil dicatat!`);
                        }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Catat Pelunasan di Sini
                      </Button>
                    </div>
                  </div>
                )}

                {isRefundPending && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold">Kelebihan Bayar: Rp {overpayment.toLocaleString('id-ID')} (Refund Pending)</p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          Customer memiliki hak kelebihan dana yang harus dikembalikan. Order belum memenuhi syarat masuk ke Rekap Order sampai pengembalian dana diproses via Kas Kantor.
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white border-none gap-1.5 font-medium"
                        onClick={() => {
                          processRefund(selectedOrder.orderNo, userName);
                          toast.success(`Refund kelebihan bayar Rp ${overpayment.toLocaleString('id-ID')} berhasil diproses!`);
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Proses Refund Sekarang
                      </Button>
                    </div>
                  </div>
                )}

                {isFinanciallySettled && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Finansial Lunas & Selesai. Order memenuhi syarat penuh untuk masuk ke <strong>Rekap Order</strong>.</span>
                  </div>
                )}

                {/* 3. Dokumen Hasil Samsat (AFTER documents) */}
                <div className="space-y-2 pt-1 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Dokumen Hasil Samsat (AFTER Docs)
                    </span>
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-border bg-primary/10 text-primary hover:bg-primary/20">
                        <Upload className="w-3 h-3" /> Tambah Berkas
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            try {
                              const uploaded = await documentRepository.uploadDocument(file, {
                                orderNo: selectedOrder.orderNo,
                                documentType: "REKAP_AFTER",
                              });
                              addRekapDocument(selectedOrder.orderNo, {
                                phase: "AFTER",
                                documentType: file.name.toLowerCase().includes("stnk") ? "STNK" : file.name.toLowerCase().includes("bpkb") ? "BPKB" : "SKKP",
                                label: file.name,
                                fileType: file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE",
                                fileUrl: uploaded.fileUrl,
                                uploadedBy: userName,
                              });
                              toast.success(`Dokumen hasil Samsat (${file.name}) ditambahkan.`);
                            } catch (err: any) {
                              toast.error(err.message || "Gagal mengunggah dokumen hasil Samsat.");
                            }
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    {afterDocs.length > 0 ? (
                      afterDocs.map((docName, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/20 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-[11px] text-foreground font-medium truncate">{docName}</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] gap-1 px-2"
                            onClick={() => setPreviewDoc({ name: docName, type: "Dokumen Hasil Samsat" })}
                          >
                            <Eye className="w-3 h-3 text-primary" />
                            Lihat
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted-foreground text-xs border border-dashed rounded bg-muted/10">
                        Belum ada berkas fisik hasil Samsat yang dilampirkan (bisa diunggah melalui tombol Tambah Berkas)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 flex flex-col-reverse sm:flex-row sm:justify-end pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button onClick={handleArchiveOrder} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
              <Check className="w-4 h-4" />
              Selesaikan Alur & Arsipkan Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DOCUMENT PREVIEW MODAL                                   */}
      {/* ======================================================== */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="w-full sm:max-w-xl max-h-[90vh] bg-card text-card-foreground p-4 sm:p-5 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Preview Dokumen — {previewDoc?.type}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground truncate">
              Nama Berkas: <span className="font-mono text-foreground">{previewDoc?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-2 my-2 flex items-center justify-center bg-muted/20 border border-border rounded-lg min-h-[240px]">
            {previewDoc?.fileUrl ? (
              previewDoc.fileType === "image" ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.name}
                  className="max-h-[60vh] max-w-full object-contain rounded"
                />
              ) : (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.name}
                  className="w-full h-[60vh] rounded border border-border"
                />
              )
            ) : (
              <div className="text-center p-6 space-y-2">
                <FileIcon className="w-12 h-12 text-primary/40 mx-auto" />
                <p className="text-xs font-medium text-foreground">{previewDoc?.name}</p>
                <p className="text-[11px] text-muted-foreground">Berkas terdaftar resmi pada sistem operasional</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 sm:justify-between">
            {previewDoc?.fileUrl ? (
              <a
                href={previewDoc.downloadUrl || previewDoc.fileUrl.replace("/preview", "/download")}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-medium border border-border bg-primary/10 text-primary hover:bg-primary/20 transition-colors gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Berkas
              </a>
            ) : <span />}
            <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)} className="w-full sm:w-auto">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
