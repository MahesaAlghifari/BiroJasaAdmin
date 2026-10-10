import React from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ArrowLeft, Edit, FileText } from "lucide-react";
import { 
  formatDateDDMMYYYY, 
  formatRupiah, 
  PlateNumberBadge, 
  PlainTextStatus,
  formatCustomerName,
  formatBerkasName,
  toSentenceCase
} from "../utils/financeFormatters";

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
    if (lower === "status" || lower === "statusbpkb" || lower === "statusprofit" || lower === "statuscashback") {
      return <PlainTextStatus status={String(value)} />;
    }

    // Customer
    if (lower === "customer") {
      return <span className="text-foreground font-medium">{formatCustomerName(String(value))}</span>;
    }

    // Nama berkas
    if (lower === "namaberkas" || lower === "namasesuaibpkb") {
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
      {/* Breadcrumb (Requirement 3) */}
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

      {/* Detail Content Card */}
      <Card className="p-5 border border-border bg-card shadow-xs">
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
