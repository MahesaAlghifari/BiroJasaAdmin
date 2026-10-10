import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { motion } from "motion/react";
import { formatDateDDMMYYYY } from "../utils/financeFormatters";

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  placeholder?: string;
  options?: string[];
}

interface FinanceAddPageProps {
  title: string;
  description: string;
  subTabName?: string;
  fields: FieldConfig[];
  onBack: () => void;
  onSubmit: (rows: any[]) => void;
}

export function FinanceAddPage({
  title,
  description,
  subTabName,
  fields,
  onBack,
  onSubmit,
}: FinanceAddPageProps) {
  const getEmptyRow = () => {
    const row: any = {};
    fields.forEach((field) => {
      if (field.type === "date") {
        row[field.key] = new Date().toISOString().split("T")[0];
      } else {
        row[field.key] = "";
      }
    });
    return row;
  };

  const [rows, setRows] = useState<any[]>([getEmptyRow()]);

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

  const handleFieldChange = (rowIndex: number, fieldKey: string, value: any) => {
    const updated = [...rows];
    updated[rowIndex][fieldKey] = value;
    setRows(updated);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validate each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      for (const field of fields) {
        const val = row[field.key];
        if (val === undefined || val === null || String(val).trim() === "") {
          toast.error(`Baris ke-${i + 1}: ${field.label} wajib diisi`);
          return;
        }
      }
    }

    // Format any date fields to numeric DD/MM/YYYY (Requirement 9)
    const formattedRows = rows.map((row) => {
      const formatted = { ...row };
      fields.forEach((f) => {
        if (f.type === "date" && formatted[f.key]) {
          formatted[f.key] = formatDateDDMMYYYY(formatted[f.key]);
        }
      });
      return formatted;
    });

    onSubmit(formattedRows);
  };

  const renderFieldInput = (row: any, rowIndex: number, field: FieldConfig) => {
    if (field.type === "select" && field.options) {
      return (
        <Select
          value={row[field.key] || ""}
          onValueChange={(val) => handleFieldChange(rowIndex, field.key, val)}
        >
          <SelectTrigger className="w-full bg-background border-border text-xs sm:text-sm">
            <SelectValue placeholder={field.placeholder || `Pilih ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option} className="text-xs sm:text-sm">
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
        className="w-full bg-background border-border text-xs sm:text-sm"
        value={row[field.key] || ""}
        onChange={(e) => handleFieldChange(rowIndex, field.key, e.target.value)}
      />
    );
  };

  const currentTabName = subTabName || title.replace(/^Tambah\s+/i, "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-5"
    >
      {/* Breadcrumb (Requirement 3 & 15) */}
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5" aria-label="Breadcrumb">
        <span className="hover:text-foreground cursor-pointer" onClick={onBack}>Finance</span>
        <span>/</span>
        <span className="hover:text-foreground cursor-pointer" onClick={onBack}>{currentTabName}</span>
        <span>/</span>
        <span className="text-foreground font-medium">Tambah transaksi</span>
      </nav>

      {/* Top Bar with Kembali Button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-1.5 border-border hover:bg-secondary/50 text-xs h-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </Button>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="border-border text-xs h-8"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 text-xs h-8"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Simpan data ({rows.length})</span>
          </Button>
        </div>
      </div>

      {/* Dynamic Form Rows */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {rows.map((row, rowIndex) => (
          <Card
            key={rowIndex}
            className="p-4 border border-border bg-card shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {rowIndex + 1}
                </span>
                <h4 className="text-xs font-medium text-foreground">
                  Data transaksi #{rowIndex + 1}
                </h4>
              </div>

              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRow(rowIndex)}
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Hapus baris
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs font-medium text-foreground/80">
                    {field.label}
                  </Label>
                  {renderFieldInput(row, rowIndex, field)}
                </div>
              ))}
            </div>
          </Card>
        ))}

        {/* Add Row Button */}
        <div className="flex justify-start pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="border-dashed border-primary/40 text-primary hover:bg-primary/5 text-xs h-8 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah baris data</span>
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
