import React from "react";
import { useNavigate } from "react-router";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ArrowLeft, Edit, ExternalLink, ShieldCheck, Clock, FileText, Info } from "lucide-react";
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
    </div>
  );
}
