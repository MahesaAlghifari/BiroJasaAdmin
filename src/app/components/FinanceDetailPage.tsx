import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ArrowLeft, Edit, ExternalLink, ShieldCheck, Clock, FileText, Info, Eye, Download, User, CheckCircle2, CreditCard, AlertCircle } from "lucide-react";
import { 
  formatDateDDMMYYYY, 
  formatRupiah, 
  PlateNumberBadge, 
  PlainTextStatus,
  formatCustomerName,
  formatBerkasName,
  toSentenceCase
} from "../utils/financeFormatters";
import { orderRepository } from "../../data/repositories/orderRepository";
import { deriveStatusPengerjaan, deriveStatusPembayaran } from "../data/penjualanContractData";
import { financeStore } from "../data/financeStore";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { downloadDataUrl } from "../utils/documentSvgGenerator";
import { toast } from "sonner";
import { cn } from "./ui/utils";

interface FieldDef {
  key: string;
  label: string;
}

interface FinanceDetailPageProps {
  subTabTitle: string;
  item: any;
  columns?: FieldDef[];
  onBack: () => void;
  onEdit?: () => void;
}

export function FinanceDetailPage({
  subTabTitle,
  item,
  columns,
  onBack,
  onEdit
}: FinanceDetailPageProps) {
  const navigate = useNavigate();
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    title: string;
    rawUrl?: string;
    fileType?: string;
    documentId?: string;
  } | null>(null);

  if (!item) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Data transaksi tidak ditemukan</p>
        <Button variant="outline" size="sm" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Kembali
        </Button>
      </div>
    );
  }

  // Phase 9.2: Canonical order resolution
  const orderNo = item.orderNo || (typeof item.id === "string" && item.id.startsWith("ord:") ? item.id.slice(4) : null);
  const canonicalOrder = orderNo ? orderRepository.getByOrderNo(orderNo) : null;
  const isProjectedOrder = !!canonicalOrder;

  // Determine list of fields to display
  const fields = columns && columns.length > 0 
    ? columns 
    : Object.keys(item)
        .filter(k => k !== "id")
        .map(k => ({ key: k, label: toSentenceCase(k) }));

  const formatDetailValue = (key: string, value: any) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground">-</span>;
    }

    const lower = key.toLowerCase();

    // Plate number
    if (lower === "nopol" || lower.includes("plat")) {
      return <PlateNumberBadge plate={String(value)} />;
    }

    // Dates
    if (lower.includes("tanggal") || lower.includes("tgl") || lower.includes("tempo")) {
      return <span className="font-mono text-foreground">{formatDateDDMMYYYY(String(value))}</span>;
    }

    // Status
    if (lower === "status" || lower.includes("status pengerjaan") || lower.includes("status pembayaran") || lower === "statusbpkb" || lower === "statusprofit" || lower === "statuscashback") {
      return <PlainTextStatus status={String(value)} />;
    }

    // Customer
    if (lower === "customer" || lower.includes("nama customer")) {
      return <span className="text-foreground font-medium">{formatCustomerName(String(value))}</span>;
    }

    // Nama berkas / Nama pemilik
    if (lower === "namaberkas" || lower === "namasesuaibpkb" || lower === "nama") {
      return <span className="text-foreground">{formatBerkasName(String(value))}</span>;
    }

    // Currency values
    if (typeof value === "number") {
      const isMonetary = 
        lower.includes("uang") || 
        lower.includes("biaya") || 
        lower.includes("profit") || 
        lower.includes("cashback") || 
        lower.includes("nominal") || 
        lower.includes("total") || 
        lower.includes("debit") || 
        lower.includes("kredit") || 
        lower.includes("tagihan") ||
        lower.includes("terbayar") ||
        lower.includes("sisa") ||
        lower.includes("kekurangan") ||
        lower === "in" ||
        lower === "out";

      if (isMonetary) {
        if (value < 0) {
          return <span className="font-mono tabular-nums text-rose-600 font-semibold">{formatRupiah(value)}</span>;
        } else if (lower.includes("profit") || lower.includes("masuk") || lower === "in" || lower === "debit") {
          return <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{formatRupiah(value)}</span>;
        } else if (lower.includes("keluar") || lower === "out" || lower === "kredit" || lower.includes("biaya")) {
          return <span className="font-mono tabular-nums text-rose-500 font-semibold">{formatRupiah(value)}</span>;
        }
        return <span className="font-mono tabular-nums font-semibold text-foreground">{formatRupiah(value)}</span>;
      }
    }

    return <span className="text-foreground">{String(value)}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5" aria-label="Breadcrumb">
        <span className="hover:text-foreground cursor-pointer" onClick={onBack}>Finance</span>
        <span>/</span>
        <span className="hover:text-foreground cursor-pointer" onClick={onBack}>{subTabTitle}</span>
        <span>/</span>
        <span className="text-foreground font-medium">Detail transaksi</span>
      </nav>

      {/* Header and Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Detail transaksi</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Rincian lengkap data transaksi {subTabTitle.toLowerCase()}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-8 text-xs border-border gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </Button>

          {onEdit && (
            <Button
              size="sm"
              onClick={onEdit}
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Ubah data</span>
            </Button>
          )}
        </div>
      </div>

      {/* Phase 9.2: Canonical Order Banner vs Legacy Fixture Badge */}
      {isProjectedOrder && canonicalOrder ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary text-primary-foreground">
                {canonicalOrder.orderNo}
              </span>
              <span className="text-xs font-semibold text-foreground">
                Order Operasional Kanonis
              </span>
              <span className="text-xs text-muted-foreground">
                • Tahap {canonicalOrder.currentStep}: {canonicalOrder.currentStageName || "Verifikasi"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Terintegrasi langsung dengan Order Tracking, Dokumen Kendaraan, dan Billing Keuangan.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/order/tracking")}
            className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5 font-medium shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Lacak di Order Tracking</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Data Historis Fixture / Mock:</strong> Baris ini merupakan arsip simulasi statis dan tidak terhubung ke order kanonis aktif.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-semibold uppercase tracking-wider shrink-0">
            Legacy Fixture
          </span>
        </div>
      )}

      {/* Rich Canonical Order Information Sections if available */}
      {isProjectedOrder && canonicalOrder && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer & Vehicle Info */}
          <Card className="p-4 border border-border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pelanggan & Kendaraan</h4>
              <PlateNumberBadge plate={canonicalOrder.nopol} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Nama Customer</p>
                <p className="font-medium text-foreground">{canonicalOrder.customer}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nomor Telepon / HP</p>
                <p className="font-mono text-foreground">{canonicalOrder.nomorHP || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nama Sesuai BPKB</p>
                <p className="text-foreground">{canonicalOrder.namaPemilik || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jenis & Tahun Kendaraan</p>
                <p className="text-foreground">{canonicalOrder.jenisKendaraan} ({canonicalOrder.tahunKendaraan || "-"})</p>
              </div>
              <div>
                <p className="text-muted-foreground">Samsat Asal</p>
                <p className="text-foreground">{canonicalOrder.wilayahSamsatAsal || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Samsat Tujuan</p>
                <p className="text-foreground">{canonicalOrder.wilayahSamsatTujuan || "-"}</p>
              </div>
            </div>
          </Card>

          {/* Service & Process Lifecycle Info */}
          <Card className="p-4 border border-border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tahapan & Pengerjaan</h4>
              <PlainTextStatus status={deriveStatusPengerjaan(canonicalOrder)} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Jenis Pengurusan</p>
                <p className="font-medium text-foreground">{canonicalOrder.layanan}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status Pengerjaan</p>
                <p className="font-medium text-foreground">{deriveStatusPengerjaan(canonicalOrder)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tahap Operasional</p>
                <p className="text-foreground">Tahap {canonicalOrder.currentStep} ({canonicalOrder.currentStageName || "Proses"})</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status BPKB</p>
                <p className="text-foreground">{canonicalOrder.clientDocuments?.BPKB?.status || canonicalOrder.clientDocuments?.bpkb?.status || "Ada"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Catatan Order</p>
                <p className="text-foreground text-[11px] leading-relaxed italic">{canonicalOrder.catatanOrder || "Tidak ada catatan."}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION RIWAYAT DAN BUKTI PEMBAYARAN */}
      <Card className="p-5 border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Riwayat dan Bukti Pembayaran
              </h3>
              <p className="text-xs text-muted-foreground">
                Catatan mutasi pembayaran terkonfirmasi, nominal, rekening tujuan, dan berkas bukti transfer.
              </p>
            </div>
          </div>
          {/* Payment Status Summary Badge */}
          {(() => {
            const total = canonicalOrder?.payment?.totalBiaya ?? item.totalBiaya ?? item.nominal ?? item.biayaJasa ?? 0;
            const paid = canonicalOrder?.payment?.dibayar ?? canonicalOrder?.payment?.sudahBayar ?? item.sudahBayar ?? (item.statusPembayaran === "LUNAS" ? total : 0);
            const remaining = canonicalOrder?.payment?.kurang ?? canonicalOrder?.payment?.sisaPembayaran ?? Math.max(0, total - paid);
            const isLunas = (total > 0 && remaining <= 0) || item.statusPembayaran === "LUNAS";
            const isPartial = paid > 0 && remaining > 0;

            return (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 self-start sm:self-center",
                  isLunas 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : isPartial
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                )}
              >
                {isLunas ? "LUNAS" : isPartial ? "KURANG BAYAR" : "BELUM BAYAR"}
              </Badge>
            );
          })()}
        </div>

        {/* Ringkasan Finansial: Total Tagihan, Terbayar, Sisa */}
        {(() => {
          const total = canonicalOrder?.payment?.totalBiaya ?? item.totalBiaya ?? item.nominal ?? item.biayaJasa ?? 0;
          const paid = canonicalOrder?.payment?.dibayar ?? canonicalOrder?.payment?.sudahBayar ?? item.sudahBayar ?? (item.statusPembayaran === "LUNAS" ? total : 0);
          const remaining = canonicalOrder?.payment?.kurang ?? canonicalOrder?.payment?.sisaPembayaran ?? Math.max(0, total - paid);

          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-muted/20 border border-border/60 rounded-lg">
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground font-medium">Total Tagihan</span>
                <p className="text-sm font-mono font-bold text-foreground">
                  {formatRupiah(total)}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground font-medium">Total Terbayar</span>
                <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(paid)}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground font-medium">Sisa Tagihan</span>
                <p className={cn(
                  "text-sm font-mono font-bold",
                  remaining > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {formatRupiah(remaining)}
                </p>
              </div>
            </div>
          );
        })()}

        {/* List of Payment Records */}
        <div className="space-y-3 pt-1">
          {(() => {
            const rawRecords: any[] = canonicalOrder?.payment?.paymentRecords && canonicalOrder.payment.paymentRecords.length > 0
              ? canonicalOrder.payment.paymentRecords
              : (canonicalOrder?.payment && ((canonicalOrder.payment.dibayar || 0) > 0 || canonicalOrder.payment.buktiPembayaran?.attached))
              ? [{
                  id: "initial-payment",
                  nominal: canonicalOrder.payment.dibayar || 0,
                  tanggal: canonicalOrder.payment.tanggalBayar || canonicalOrder.createdAt || new Date().toISOString(),
                  metodePembayaran: canonicalOrder.payment.metodePembayaran || "Transfer Bank",
                  namaBank: canonicalOrder.payment.namaBank,
                  namaRekening: canonicalOrder.payment.namaRekening,
                  noRekening: canonicalOrder.payment.noRekening,
                  buktiPembayaran: canonicalOrder.payment.buktiPembayaran,
                  statusVerifikasi: canonicalOrder.payment.isPaymentVerified 
                    ? "TERVERIFIKASI" 
                    : (canonicalOrder.payment.buktiPembayaran?.attached ? "MENUNGGU_VERIFIKASI" : "MENUNGGU_BUKTI"),
                  verifiedBy: canonicalOrder.payment.paymentVerifiedBy,
                  verifiedAt: canonicalOrder.payment.paymentVerifiedAt,
                  uploadedBy: canonicalOrder.customer,
                }]
              : (item && ((item.sudahBayar && item.sudahBayar > 0) || item.buktiPembayaran))
              ? [{
                  id: "item-payment",
                  nominal: item.sudahBayar || item.nominal || 0,
                  tanggal: item.tanggalBayar || item.tanggal || new Date().toISOString(),
                  metodePembayaran: item.metodePembayaran || item.metode || "Transfer Bank",
                  namaBank: item.bank,
                  namaRekening: item.namaRekening,
                  noRekening: item.noRekening,
                  buktiPembayaran: item.buktiPembayaran ? {
                    attached: true,
                    fileName: typeof item.buktiPembayaran === "string" ? item.buktiPembayaran : "Bukti Pembayaran",
                    fileUrl: typeof item.buktiPembayaran === "string" && (item.buktiPembayaran.startsWith("data:") || item.buktiPembayaran.startsWith("http") || item.buktiPembayaran.startsWith("/")) ? item.buktiPembayaran : undefined,
                  } : undefined,
                  statusVerifikasi: item.statusPembayaran === "LUNAS" ? "TERVERIFIKASI" : "MENUNGGU_VERIFIKASI",
                  uploadedBy: item.customer || item.namaCustomer || "-",
                }]
              : [];

            if (rawRecords.length === 0) {
              return (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border space-y-1">
                  <CreditCard className="w-6 h-6 mx-auto text-muted-foreground/60 mb-1" />
                  <p className="font-medium text-foreground">Belum ada transaksi pembayaran</p>
                  <p className="text-[11px] text-muted-foreground">
                    Transaksi ini belum memiliki catatan pembayaran atau mutasi kas masuk.
                  </p>
                </div>
              );
            }

            return rawRecords.map((record: any, idx: number) => {
              const nominal = record.nominal || 0;
              const proofUrl = record.buktiPembayaran?.fileUrl || record.buktiPembayaran?.previewUrl || record.buktiFileUrl || (typeof record.buktiPembayaran === "string" && (record.buktiPembayaran.startsWith("http") || record.buktiPembayaran.startsWith("/") || record.buktiPembayaran.startsWith("data:")) ? record.buktiPembayaran : undefined);
              const hasProof = Boolean(proofUrl || record.buktiPembayaran?.documentId || record.documentId || (record.buktiPembayaran?.attached && record.buktiPembayaran?.fileName));
              const proofName = record.buktiPembayaran?.fileName || record.buktiFileName || (typeof record.buktiPembayaran === "string" ? record.buktiPembayaran : `Bukti Pembayaran #${idx + 1}`);
              const proofType = (record.buktiPembayaran?.fileType || record.buktiFileType || (proofName.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE")).toUpperCase();
              const isVerified = record.statusVerifikasi === "TERVERIFIKASI";
              const isPending = record.statusVerifikasi === "MENUNGGU_VERIFIKASI";
              const isRejected = record.statusVerifikasi === "DITOLAK";

              return (
                <div 
                  key={record.id || idx}
                  className="p-3.5 rounded-lg border border-border bg-card space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                            {formatRupiah(nominal)}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-medium text-foreground">
                            {record.metodePembayaran || "Transfer Bank"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {record.tanggal ? formatDateDDMMYYYY(record.tanggal) : "-"}
                        </p>
                      </div>
                    </div>

                    {/* Status Verifikasi Badge */}
                    <div>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Terverifikasi
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          Menunggu Verifikasi
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Ditolak
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Bukti Belum Tersedia
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Baris: Rekening & Pencatat */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[11px]">Rekening Tujuan: </span>
                      <span className="font-medium text-foreground">
                        {record.namaBank ? `${record.namaBank} - ${record.noRekening || ""} (${record.namaRekening || ""})` : (record.rekeningTujuan || "-")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px]">Pengunggah / Pencatat: </span>
                      <span className="font-medium text-foreground">
                        {record.uploadedBy || record.recordedBy || "-"}
                      </span>
                    </div>
                    {record.verifiedBy && (
                      <div className="col-span-1 sm:col-span-2 text-[11px] text-muted-foreground">
                        Diverifikasi oleh: <strong className="text-foreground">{record.verifiedBy}</strong>
                        {record.verifiedAt && <> pada {formatDateDDMMYYYY(record.verifiedAt)}</>}
                      </div>
                    )}
                  </div>

                  {/* Berkas Bukti Pembayaran */}
                  <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs font-semibold",
                        hasProof ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      )}>
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground truncate">{proofName}</span>
                          {hasProof && (
                            <span className="px-1 py-0.2 rounded bg-muted text-[9px] font-mono text-muted-foreground uppercase">
                              {proofType}
                            </span>
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] truncate font-mono block",
                          hasProof ? "text-muted-foreground" : "text-amber-500 italic"
                        )}>
                          {hasProof ? (record.buktiPembayaran?.fileName || "File terlampir") : "Bukti pembayaran belum tersedia"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasProof && proofUrl ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs gap-1 border-border"
                            onClick={() => {
                              setPreviewDoc({
                                name: proofName,
                                title: `Bukti Pembayaran — ${formatRupiah(nominal)}`,
                                rawUrl: proofUrl,
                                fileType: proofType,
                                documentId: record.buktiPembayaran?.documentId || record.documentId,
                              });
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              if (proofUrl.startsWith("data:")) {
                                downloadDataUrl(proofUrl, `${proofName.replace(/\s+/g, '_')}.${proofType.toLowerCase()}`);
                                toast.success(`Mengunduh ${proofName}`);
                              } else {
                                const a = document.createElement("a");
                                a.href = proofUrl;
                                a.download = proofName.replace(/\s+/g, '_');
                                a.target = "_blank";
                                a.rel = "noreferrer";
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }
                            }}
                            title="Unduh Bukti Pembayaran"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                          Bukti belum diunggah
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </Card>

      {/* SECTION DOKUMEN TERLAMPIR (BEFORE & AFTER) */}
      <Card className="p-5 border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Dokumen Terlampir Transaksi
              </h3>
              <p className="text-xs text-muted-foreground">
                Arsip berkas digital pendukung order, dikelompokkan menjadi Dokumen Masuk (BEFORE) dan Dokumen Hasil (AFTER).
              </p>
            </div>
          </div>
          {isProjectedOrder && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 self-start sm:self-center">
              Order {canonicalOrder?.orderNo}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kelompok Dokumen Masuk (BEFORE) */}
          <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                <User className="w-3.5 h-3.5 text-primary" />
                Dokumen Masuk (BEFORE)
              </span>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                Asli Pelanggan
              </span>
            </div>

            <div className="space-y-2">
              {(() => {
                const clientDocs = canonicalOrder?.clientDocuments || {};
                const beforeList = [
                  { key: "stnk", label: "STNK Asli", item: clientDocs.stnk || clientDocs.STNK },
                  { key: "bpkb", label: "BPKB Asli", item: clientDocs.bpkb || clientDocs.BPKB },
                  { key: "ktp", label: "KTP Pemilik", item: clientDocs.ktp || clientDocs.KTP },
                  { key: "skkp", label: "SKKP / Pajak Asal", item: clientDocs.skkp || clientDocs.SKKP },
                  { key: "lainnya", label: "Dokumen Tambahan / Kuasa", item: clientDocs.lainnya || clientDocs.LAINNYA },
                ].filter(d => {
                  if (["stnk", "bpkb", "ktp"].includes(d.key)) return true;
                  return Boolean(d.item?.name || d.item?.fileUrl);
                });

                return beforeList.map((entry, idx) => {
                  const hasDigital = Boolean(entry.item?.fileUrl || (entry.item?.name && !entry.item.name.toLowerCase().includes("belum")));
                  const fileName = hasDigital ? entry.item?.name || entry.label : "Belum tersedia";
                  const fileType = entry.item?.fileType?.toUpperCase() || (entry.item?.name?.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE");

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors",
                        hasDigital
                          ? "border-border bg-card hover:bg-muted/30"
                          : "border-border/60 bg-muted/10"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-semibold",
                          hasDigital ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground text-xs truncate">{entry.label}</span>
                            {hasDigital && (
                              <span className="px-1 py-0.2 rounded bg-muted text-[9px] font-mono text-muted-foreground uppercase">
                                {fileType}
                              </span>
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] truncate font-mono block max-w-[170px]",
                            hasDigital ? "text-muted-foreground" : "text-amber-500 italic"
                          )}>
                            {fileName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasDigital && entry.item?.fileUrl ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1"
                              onClick={() => {
                                setPreviewDoc({
                                  name: entry.item?.name || entry.label,
                                  title: `Dokumen Masuk — ${entry.label}`,
                                  rawUrl: entry.item?.fileUrl,
                                  fileType: entry.item?.fileType,
                                  documentId: entry.item?.documentId,
                                });
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Lihat
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const url = entry.item.fileUrl;
                                if (url.startsWith("data:")) {
                                  downloadDataUrl(url, `${entry.label.replace(/\s+/g, '_')}.${fileType.toLowerCase()}`);
                                  toast.success(`Mengunduh ${entry.label}`);
                                } else {
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `${entry.label.replace(/\s+/g, '_')}`;
                                  a.target = "_blank";
                                  a.rel = "noreferrer";
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }
                              }}
                              title="Unduh Berkas"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                            Belum tersedia
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Kelompok Dokumen Hasil (AFTER) */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Dokumen Hasil (AFTER)
              </span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Hasil Proses / Samsat
              </span>
            </div>

            <div className="space-y-2">
              {(() => {
                const afterDocs = [
                  ...(canonicalOrder?.rekapDocuments?.filter((d: any) => d.phase === "AFTER" || d.category === "Dokumen Hasil") || []),
                  ...(canonicalOrder?.uploadedDocs || []),
                  ...(canonicalOrder?.deliveryHandover?.photoProofUrl ? [{
                    id: "handover-proof",
                    name: canonicalOrder.deliveryHandover.fileName || "Bukti Serah Terima",
                    label: "Bukti Serah Terima",
                    fileUrl: canonicalOrder.deliveryHandover.photoProofUrl,
                    fileType: canonicalOrder.deliveryHandover.fileType || "image",
                    status: "Dokumen Diserahkan",
                  }] : []),
                ];

                if (afterDocs.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border space-y-1">
                      <p className="font-medium text-foreground">Belum tersedia</p>
                      <p className="text-[11px] text-muted-foreground">
                        Belum ada dokumen hasil pengurusan atau bukti serah terima digital yang tersimpan untuk transaksi ini.
                      </p>
                    </div>
                  );
                }

                return afterDocs.map((doc: any, idx: number) => {
                  const docName = doc.name || doc.label || doc.documentType || "Dokumen Hasil";
                  const fileType = doc.fileType?.toUpperCase() || (docName.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE");
                  const docUrl = doc.fileUrl;

                  return (
                    <div
                      key={doc.id || idx}
                      className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground text-xs truncate">{docName}</span>
                            <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-[9px] font-mono text-emerald-700 dark:text-emerald-300 uppercase">
                              {fileType}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate font-mono block max-w-[170px]">
                            {doc.fileName || docName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {docUrl ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                              onClick={() => {
                                setPreviewDoc({
                                  name: docName,
                                  title: `Dokumen Hasil — ${docName}`,
                                  rawUrl: docUrl,
                                  fileType: doc.fileType,
                                  documentId: doc.id?.startsWith("doc-") ? undefined : doc.id,
                                });
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Lihat
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                if (docUrl.startsWith("data:")) {
                                  downloadDataUrl(docUrl, `${docName.replace(/\s+/g, '_')}.${fileType.toLowerCase()}`);
                                  toast.success(`Mengunduh ${docName}`);
                                } else {
                                  const a = document.createElement("a");
                                  a.href = docUrl;
                                  a.download = docName.replace(/\s+/g, '_');
                                  a.target = "_blank";
                                  a.rel = "noreferrer";
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }
                              }}
                              title="Unduh Berkas"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Belum tersedia
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </Card>

      {/* Detail Content Card (Table Fields) */}
      <Card className="p-5 border border-border bg-card shadow-xs">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 pb-2 border-b border-border">
          Rincian Data Tabel ({subTabTitle})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
          {fields.map(f => (
            <div key={f.key} className="space-y-1 pb-3 border-b border-border/40 sm:border-b-0">
              <p className="text-xs text-muted-foreground font-medium">{f.label}</p>
              <div className="text-sm">
                {formatDetailValue(f.key, item[f.key])}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Unified Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || "Preview Dokumen"}
        documentName={previewDoc?.name}
        rawUrl={previewDoc?.rawUrl}
        fileType={previewDoc?.fileType}
        documentId={previewDoc?.documentId}
      />
    </div>
  );
}
