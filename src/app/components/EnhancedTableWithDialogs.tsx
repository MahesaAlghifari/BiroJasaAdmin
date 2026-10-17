import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Filter, 
  X, 
  FileQuestion,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  SlidersHorizontal,
  Download,
  FileText,
  Printer
} from "lucide-react";
import {
  exportToCSV,
  exportToPDF,
  filterDataByExportPeriod,
  ExportPeriodOption,
  ExportColumn,
} from "../utils/financeExport";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { TablePagination } from "./ui/TablePagination";
import { cn } from "./ui/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { 
  formatDateDDMMYYYY, 
  parseDateTimestamp,
  formatRupiah, 
  PlateNumberBadge, 
  PlainTextStatus,
  formatCustomerName,
  formatBerkasName
} from "../utils/financeFormatters";
import { 
  FinanceDateFilter, 
  FinanceDateFilterValue, 
  getWeekRange 
} from "./FinanceDateFilter";

export interface Column {
  key: string;
  label: string;
  filterable?: boolean;
  filterType?: "text" | "select" | "date";
  filterOptions?: string[];
  align?: "left" | "right";
  isPrimaryMobile?: boolean; // True for the 2 primary columns on mobile
  render?: (value: any, item?: any) => React.ReactNode;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
  placeholder?: string;
}

interface EnhancedTableWithDialogsProps {
  columns: Column[];
  data: any[];
  onAdd?: () => void;
  onEdit?: (item: any, updatedData: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  onExport?: (format: 'csv' | 'pdf') => void;
  searchPlaceholder?: string;
  itemsPerPageOptions?: number[];
  editFields?: FieldConfig[];
  hideAddButton?: boolean;
  hideEditButton?: boolean;
  hideDeleteButton?: boolean;
  subTabTitle?: string;
}

type SortDirection = "asc" | "desc" | null;

export function EnhancedTableWithDialogs({
  columns,
  data,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onExport,
  searchPlaceholder = "Cari nama / nopol...",
  itemsPerPageOptions = [10, 25, 50, 100],
  editFields,
  hideAddButton = false,
  hideEditButton = false,
  hideDeleteButton = false,
  subTabTitle
}: EnhancedTableWithDialogsProps) {
  // Search inputs (Requirement 12: separate date and text searches)
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<FinanceDateFilterValue | null>(null);

  // Export modal state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [exportPeriod, setExportPeriod] = useState<ExportPeriodOption>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageOptions[0]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Sorting state (Requirement 10 & 11)
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Desktop Table Settings: Font size & column visibility (Requirements 20-26)
  const [tableFontSize, setTableFontSize] = useState<"1x" | "2x" | "3x">("1x");
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(() => new Set(columns.map(c => c.key)));

  // Synchronize visibleColumnKeys when columns prop updates or when subTabTitle changes
  const prevSubTabRef = React.useRef(subTabTitle);
  React.useEffect(() => {
    if (prevSubTabRef.current !== subTabTitle) {
      prevSubTabRef.current = subTabTitle;
      setVisibleColumnKeys(new Set(columns.map(c => c.key)));
      return;
    }

    setVisibleColumnKeys(prev => {
      const currentKeys = new Set(columns.map(c => c.key));
      if (prev.size === 0) return currentKeys;
      const next = new Set<string>();
      columns.forEach(c => {
        if (prev.has(c.key)) next.add(c.key);
      });
      // If none or only 1 column matched out of many, it's a completely different schema
      if (next.size <= 1 && columns.length > 2) {
        return currentKeys;
      }
      return next.size > 0 ? next : currentKeys;
    });
  }, [subTabTitle, columns]);

  const isAllColumnsVisible = visibleColumnKeys.size === columns.length;
  const isSomeColumnsVisible = visibleColumnKeys.size > 0 && visibleColumnKeys.size < columns.length;
  const selectAllState: boolean | "indeterminate" = isAllColumnsVisible ? true : (isSomeColumnsVisible ? "indeterminate" : false);

  const handleToggleSelectAll = () => {
    if (isAllColumnsVisible) {
      setVisibleColumnKeys(new Set());
    } else {
      setVisibleColumnKeys(new Set(columns.map(c => c.key)));
    }
  };

  const handleToggleColumn = (key: string) => {
    const next = new Set(visibleColumnKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setVisibleColumnKeys(next);
  };

  // Structured filter columns (Requirements 4 & 5: Pengurusan, Rekening, and dropdown categories)
  // Free text search fields (nopol, customer, invoice, etc.) are excluded because they belong in the toolbar search.
  const structuredFilterColumns = useMemo(() => {
    return columns.filter(col => {
      if (!col.filterable) return false;
      const lower = col.key.toLowerCase();
      if (
        lower.includes("nopol") || 
        lower.includes("plat") || 
        lower.includes("customer") || 
        lower.includes("invoice") || 
        lower.includes("nama") ||
        lower.includes("keterangan") ||
        lower.includes("alasan")
      ) {
        return false;
      }
      if (lower.includes("tanggal") || lower.includes("tgl") || lower.includes("tempo")) {
        return false;
      }
      return true;
    });
  }, [columns]);

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Check if date column exists
  const hasDateColumn = useMemo(() => {
    return columns.some(c => {
      const k = c.key.toLowerCase();
      return k.includes("tanggal") || k.includes("tgl") || k.includes("tempo");
    });
  }, [columns]);

  // Identify the 2 primary columns for mobile (Requirement 18 & 26)
  const mobilePrimaryColumns = useMemo(() => {
    const specified = columns.filter(c => c.isPrimaryMobile);
    if (specified.length >= 2) return specified.slice(0, 2);

    // Auto-detect: first date/id column + first name/entity column
    const dateCol = columns.find(c => {
      const k = c.key.toLowerCase();
      return k.includes("tanggal") || k.includes("tgl");
    }) || columns[0];

    const descriptorCol = columns.find(c => {
      const k = c.key.toLowerCase();
      return (
        k !== dateCol.key &&
        (k.includes("customer") ||
         k.includes("nama") ||
         k.includes("keterangan") ||
         k.includes("transaksi") ||
         k.includes("nopol") ||
         k.includes("jenis"))
      );
    }) || columns[1] || columns[0];

    return [dateCol, descriptorCol];
  }, [columns]);

  const mobilePrimaryKeys = useMemo(() => {
    return new Set(mobilePrimaryColumns.map(c => c.key));
  }, [mobilePrimaryColumns]);

  // Handle column sorting toggle
  const handleSortToggle = (colKey: string) => {
    if (sortKey !== colKey) {
      setSortKey(colKey);
      setSortDirection("asc");
    } else {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    }
  };

  // Filter and search data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 1. Text Search (nama, nopol, etc.)
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesQuery = Object.entries(item).some(([k, val]) => {
          if (val === null || val === undefined) return false;
          // Don't match internal ids
          if (k === "id") return false;
          return String(val).toLowerCase().includes(query);
        });
        if (!matchesQuery) return false;
      }

      // 2. Date Filter (Calendar-based: Hari, Minggu, Bulan, Tahun - Requirements 4-10)
      if (dateFilter) {
        const matchesDate = Object.entries(item).some(([k, val]) => {
          const lowerK = k.toLowerCase();
          if (lowerK.includes("tanggal") || lowerK.includes("tgl") || lowerK.includes("tempo")) {
            const ts = parseDateTimestamp(String(val));
            if (!ts) return false;
            const itemDate = new Date(ts);

            if (dateFilter.mode === "hari" && dateFilter.selectedDate) {
              return (
                itemDate.getFullYear() === dateFilter.selectedDate.getFullYear() &&
                itemDate.getMonth() === dateFilter.selectedDate.getMonth() &&
                itemDate.getDate() === dateFilter.selectedDate.getDate()
              );
            }

            if (dateFilter.mode === "minggu" && dateFilter.selectedDate) {
              const { start, end } = getWeekRange(dateFilter.selectedDate);
              return itemDate >= start && itemDate <= end;
            }

            if (dateFilter.mode === "bulan" && dateFilter.selectedMonth !== undefined && dateFilter.selectedYear !== undefined) {
              return (
                itemDate.getFullYear() === dateFilter.selectedYear &&
                itemDate.getMonth() === dateFilter.selectedMonth
              );
            }

            if (dateFilter.mode === "tahun" && dateFilter.selectedYear !== undefined) {
              return itemDate.getFullYear() === dateFilter.selectedYear;
            }
          }
          return false;
        });
        if (!matchesDate) return false;
      }

      // 3. Column Dropdown Filters
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value || value === "all" || value === "Semua") return true;
        const colDef = columns.find(c => c.key === key);
        if (colDef?.filterType === "select") {
          return String(item[key]).toLowerCase() === value.toLowerCase();
        }
        return String(item[key]).toLowerCase().includes(value.toLowerCase());
      });

      return matchesFilters;
    });
  }, [data, searchTerm, dateFilter, filters]);

  // Sorted data (Requirement 10 & 11)
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData;

    const lowerKey = sortKey.toLowerCase();
    const isDate = lowerKey.includes("tanggal") || lowerKey.includes("tgl") || lowerKey.includes("tempo");

    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      // Date sort using numeric timestamp (Requirement 10)
      if (isDate) {
        const timeA = parseDateTimestamp(valA);
        const timeB = parseDateTimestamp(valB);
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      }

      // Numeric sort
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      // Text sort (A -> Z or Z -> A) (Requirement 11)
      const strA = String(valA || "").toLowerCase();
      const strB = String(valB || "").toLowerCase();
      return sortDirection === "asc" 
        ? strA.localeCompare(strB, "id-ID")
        : strB.localeCompare(strA, "id-ID");
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Column Alignment: text left, numbers right, plate and status center (Requirements 5, 19)
  const getColumnAlignment = (col: Column): "left" | "right" | "center" => {
    if (col.align) return col.align;
    const lower = col.key.toLowerCase();

    // Plate: center (Requirement 19)
    if (lower === "nopol" || lower.includes("plat")) {
      return "center";
    }

    // Status: center (Requirement 19)
    if (lower === "status" || lower.includes("status") || lower === "bpkb" || lower === "r4 / r2") {
      return "center";
    }

    // Number / currency: right (Requirement 19)
    if (
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
      lower === "out"
    ) {
      return "right";
    }

    // Text / general: left (Requirement 19)
    return "left";
  };

  // Export columns (excluding action columns)
  const exportColumns = useMemo<ExportColumn[]>(() => {
    return columns
      .filter((c) => {
        const k = c.key.toLowerCase();
        if (k === "aksi" || k === "actions" || k === "aksipelunasan") return false;
        return visibleColumnKeys.has(c.key);
      })
      .map((c) => ({
        key: c.key,
        label: c.label,
        align: getColumnAlignment(c),
      }));
  }, [columns, visibleColumnKeys]);

  // Preview / filtered dataset for export respecting table filters and export period
  const previewExportData = useMemo(() => {
    return filterDataByExportPeriod(filteredData, exportColumns, exportPeriod, {
      start: customStartDate,
      end: customEndDate,
    });
  }, [filteredData, exportColumns, exportPeriod, customStartDate, customEndDate]);

  const getExportPeriodLabel = (): string => {
    switch (exportPeriod) {
      case "all":
        return "Semua Data Aktif";
      case "today":
        return `Hari Ini (${new Date().toLocaleDateString("id-ID")})`;
      case "this_week":
        return "Minggu Ini";
      case "this_month":
        return new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      case "this_year":
        return `Tahun ${new Date().getFullYear()}`;
      case "custom":
        return `${customStartDate || "Awal"} s/d ${customEndDate || "Akhir"}`;
      default:
        return "Semua";
    }
  };

  const handleExecuteExport = () => {
    if (previewExportData.length === 0) {
      toast.error("Tidak ada data yang dapat diekspor untuk periode ini");
      return;
    }

    const title = subTabTitle ? `Laporan Keuangan - ${subTabTitle}` : "Laporan Keuangan SUN89";
    const periodLabel = getExportPeriodLabel();

    try {
      if (exportFormat === "csv") {
        exportToCSV({
          title,
          columns: exportColumns,
          data: previewExportData,
          periodLabel,
        });
        toast.success(`Berhasil mengunduh CSV (${previewExportData.length} baris)`);
      } else {
        exportToPDF({
          title,
          subTitle: "Biro Jasa SUN89 - Laporan Operasional & Keuangan",
          periodLabel,
          columns: exportColumns,
          data: previewExportData,
        });
        toast.success(`Dokumen cetak / PDF (${previewExportData.length} baris) siap dicetak`);
      }

      if (onExport) {
        onExport(exportFormat);
      }

      setIsExportDialogOpen(false);
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Gagal mengekspor data: " + (err?.message || "Terjadi kesalahan"));
    }
  };

  const formatCellValue = (value: any, key: string, item: any, col: Column) => {
    if (col.render) {
      return col.render(value, item);
    }

    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground">-</span>;
    }

    const lowerKey = key.toLowerCase();

    // Plate numbers (Requirement 22)
    if (lowerKey === "nopol" || lowerKey.includes("plat")) {
      return <PlateNumberBadge plate={String(value)} />;
    }

    // Dates in numeric DD/MM/YYYY (Requirement 9 & 15)
    if (lowerKey.includes("tanggal") || lowerKey.includes("tgl") || lowerKey.includes("tempo")) {
      return (
        <span className="finance-table__date font-mono text-xs text-foreground/90 whitespace-nowrap">
          {formatDateDDMMYYYY(String(value))}
        </span>
      );
    }

    // Customer name with sentence case preserving acronyms (Requirement 7)
    if (lowerKey === "customer" || lowerKey === "nama customer") {
      return <span className="text-foreground/90 font-medium">{formatCustomerName(String(value))}</span>;
    }

    // Nama berkas with sentence case preserving acronyms (Requirement 8)
    if (lowerKey === "nama" || lowerKey === "namaberkas" || lowerKey === "namasesuaibpkb") {
      return <span className="text-foreground/90">{formatBerkasName(String(value))}</span>;
    }

    // Status as PLAIN TEXT without pill/badge (Requirement 23)
    if (lowerKey === "status" || lowerKey === "statusbpkb" || lowerKey === "statusprofit" || lowerKey === "statuscashback" || lowerKey === "bpkb") {
      return <PlainTextStatus status={String(value)} />;
    }

    // Currency values
    if (typeof value === "number") {
      const isMonetary = 
        lowerKey.includes("uang") || 
        lowerKey.includes("biaya") || 
        lowerKey.includes("profit") || 
        lowerKey.includes("cashback") || 
        lowerKey.includes("nominal") || 
        lowerKey.includes("total") || 
        lowerKey.includes("debit") || 
        lowerKey.includes("kredit") || 
        lowerKey.includes("tagihan") ||
        lowerKey.includes("terbayar") ||
        lowerKey.includes("sisa") ||
        lowerKey.includes("kekurangan") ||
        lowerKey === "in" ||
        lowerKey === "out";

      if (isMonetary) {
        if (value < 0) {
          return <span className="finance-table__currency font-mono tabular-nums text-rose-600 dark:text-rose-400 font-medium">{formatRupiah(value)}</span>;
        } else if (lowerKey.includes("profit") || lowerKey.includes("masuk") || lowerKey === "in" || lowerKey === "debit") {
          return <span className="finance-table__currency font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{formatRupiah(value)}</span>;
        } else if (lowerKey.includes("keluar") || lowerKey === "out" || lowerKey === "kredit" || lowerKey.includes("biaya")) {
          return <span className="finance-table__currency font-mono tabular-nums text-rose-500 dark:text-rose-400 font-medium">{formatRupiah(value)}</span>;
        }
        return <span className="finance-table__currency font-mono tabular-nums text-foreground font-medium">{formatRupiah(value)}</span>;
      }
    }

    return <span className="text-foreground/90">{String(value)}</span>;
  };

  const handleEditClick = (item: any) => {
    setSelectedItem(item);
    setEditFormData({ ...item });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (editFields) {
      for (const field of editFields) {
        if (!editFormData[field.key] && editFormData[field.key] !== 0) {
          toast.error(`${field.label} wajib diisi`);
          return;
        }
      }
    }

    if (onEdit && selectedItem) {
      onEdit(selectedItem, editFormData);
    }
    setIsEditDialogOpen(false);
    toast.success("Data transaksi berhasil diperbarui");
  };

  const handleDeleteConfirm = () => {
    if (onDelete && selectedItem) {
      onDelete(selectedItem);
    }
    setIsDeleteDialogOpen(false);
    toast.success("Data transaksi berhasil dihapus");
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
    setDateFilter(null);
    setSortKey(null);
    setSortDirection(null);
  };

  const hasActiveFilters = 
    Object.values(filters).some(v => v && v !== "all") || 
    searchTerm !== "" || 
    dateFilter !== null ||
    sortKey !== null;

  return (
    <div className="finance-table-container flex-1 flex flex-col min-h-0 space-y-3.5">
      {/* Table Toolbar (Phase 8.5: Refined Hierarchy — Tambah, Filter, Pengaturan Tabel, Search) */}
      <div className="flex flex-col md:flex-row gap-2.5 justify-between items-stretch md:items-center">
        {/* Left Section: Action Tambah + Filter (with internal date control) + Pengaturan Tabel (with integrated export) */}
        <div className="flex items-center gap-2 flex-wrap">
          {onAdd && !hideAddButton && (
            <Button
              onClick={onAdd}
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </Button>
          )}

          {/* Filter Popover Interaction: Contains Date Picker + Category Dropdowns + Apply/Reset */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Filter data tabel"
                className={cn(
                  "h-8 text-xs border-border gap-1.5 shrink-0",
                  (isFilterOpen || hasActiveFilters) && "border-primary/50 text-primary bg-primary/5"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] p-4 space-y-3.5 bg-popover text-popover-foreground border-border shadow-md"
              onInteractOutside={(e) => {
                const target = e.target as HTMLElement | null;
                if (target?.closest('[data-radix-popper-content-wrapper], [data-radix-portal], [role="dialog"], [role="listbox"], [role="option"]')) {
                  e.preventDefault();
                }
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/70">
                <div>
                  <h4 className="font-semibold text-sm leading-tight text-foreground">Filter</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Filter data transaksi tabel</p>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Tanggal Selection INSIDE Filter Interaction */}
              {hasDateColumn && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/85">Tanggal</Label>
                  <FinanceDateFilter
                    value={dateFilter}
                    onChange={(v) => {
                      setDateFilter(v);
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  />
                </div>
              )}

              {/* Category dropdown filters */}
              {structuredFilterColumns.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-border/70">
                  <Label className="text-xs font-semibold text-foreground/85">Kategori</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {structuredFilterColumns.map((col) => {
                      const options =
                        col.filterOptions ||
                        Array.from(new Set(data.map((d) => d[col.key]).filter(Boolean))).sort();
                      return (
                        <div key={col.key} className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">{col.label}</Label>
                          <Select
                            value={filters[col.key] || "all"}
                            onValueChange={(value) => {
                              setFilters({ ...filters, [col.key]: value });
                              setCurrentPage(1);
                            }}
                          >
                            <SelectTrigger className="bg-background border-border h-8 text-xs font-normal">
                              <SelectValue placeholder={`Semua ${col.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all" className="text-xs">
                                Semua
                              </SelectItem>
                              {options.map((opt: any) => (
                                <SelectItem key={String(opt)} value={String(opt)} className="text-xs">
                                  {String(opt)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer with Reset and Terapkan */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border/70">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearFilters();
                    setIsFilterOpen(false);
                  }}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsFilterOpen(false)}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 shadow-2xs"
                >
                  Terapkan
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Table Settings & Integrated Export (Reachable on desktop & mobile) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Pengaturan tabel"
                className="inline-flex h-8 text-xs border-border gap-1.5 shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Pengaturan tabel</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-80 max-w-[calc(100vw-1.5rem)] p-4 space-y-4 bg-popover text-popover-foreground border-border shadow-md"
            >
              <div>
                <h4 className="font-semibold text-sm leading-tight text-foreground">Pengaturan tabel</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Sesuaikan ukuran font, visibilitas kolom, dan ekspor</p>
              </div>

              {/* Font Size Setting */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/85">Ukuran teks</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["1x", "2x", "3x"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTableFontSize(size)}
                      className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                        tableFontSize === size
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                          : "bg-background hover:bg-muted text-foreground border-border"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full border ${tableFontSize === size ? "bg-primary-foreground border-primary-foreground" : "border-muted-foreground"}`} />
                      <span>{size}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Visibility Setting */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground/85">Kolom yang ditampilkan</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {visibleColumnKeys.size} dari {columns.length} aktif
                  </span>
                </div>

                <div className="border border-border rounded-md p-2 bg-muted/20 space-y-2">
                  {/* Select All Checkbox */}
                  <label className="flex items-center gap-2.5 p-1 rounded hover:bg-muted/50 cursor-pointer text-xs font-semibold select-none border-b border-border/60 pb-1.5">
                    <Checkbox
                      checked={selectAllState}
                      onCheckedChange={handleToggleSelectAll}
                    />
                    <span className="text-foreground">Pilih semua</span>
                  </label>

                  {/* Scrollable list of individual columns */}
                  <ScrollArea className="h-40 pr-1.5">
                    <div className="space-y-1">
                      {columns.map((col) => {
                        const isChecked = visibleColumnKeys.has(col.key);
                        return (
                          <label
                            key={col.key}
                            className="flex items-center gap-2.5 p-1 rounded hover:bg-muted/50 cursor-pointer text-xs select-none"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => handleToggleColumn(col.key)}
                            />
                            <span className={isChecked ? "text-foreground font-medium" : "text-muted-foreground"}>
                              {col.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Integrated Export Action Section */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground/85">Ekspor data</Label>
                  <span className="text-[11px] text-muted-foreground">CSV / PDF</span>
                </div>
                <p className="text-xs text-muted-foreground">Unduh laporan transaksi sesuai filter dan kolom aktif</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExportDialogOpen(true)}
                  className="w-full h-8 text-xs border-border gap-1.5 justify-center hover:bg-primary/5 hover:text-primary hover:border-primary/40 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Buka dialog ekspor</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right Section: Single Main Search Field */}
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder || "Cari berdasarkan nomor polisi, nama customer, invoice..."}
            aria-label={searchPlaceholder || "Cari berdasarkan nomor polisi, nama customer, invoice"}
            className="pl-8 bg-background border-border h-8 text-xs font-normal placeholder:font-normal placeholder:text-muted-foreground/60"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>


      {/* Main Table: Desktop (Full Columns with desktop settings) & Mobile (2 Primary Columns + Actions) */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
        <div className="w-full flex-1 flex flex-col min-h-0">
          <Table className={`finance-table finance-table--font-${tableFontSize === "1x" ? "1" : tableFontSize === "2x" ? "2" : "3"} w-full min-w-[700px] md:min-w-[850px] ${paginatedData.length === 0 ? "h-full" : ""}`}>
            <TableHeader className="finance-table__header bg-muted/40 border-b border-border">
              <TableRow className="hover:bg-transparent">
                {columns.map(col => {
                  const isVisibleDesktop = visibleColumnKeys.has(col.key);
                  const isMobileVisible = mobilePrimaryKeys.has(col.key);

                  if (!isVisibleDesktop && !isMobileVisible) return null;

                  const visibilityClass = isMobileVisible && isVisibleDesktop
                    ? ""
                    : isVisibleDesktop
                      ? "hidden md:table-cell"
                      : "table-cell md:hidden";

                  const align = getColumnAlignment(col);
                  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
                  const isSorted = sortKey === col.key;

                  return (
                    <TableHead 
                      key={col.key} 
                      onClick={() => handleSortToggle(col.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSortToggle(col.key);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-sort={isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                      aria-label={`Urutkan kolom ${col.label}`}
                      className={`h-9 px-3.5 font-semibold text-foreground/80 whitespace-nowrap text-xs select-none cursor-pointer hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${alignClass} ${visibilityClass}`}
                    >
                      <div className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : align === "center" ? "justify-center" : "flex-row"}`}>
                        <span>{col.label}</span>
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-primary shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-primary shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-30 hover:opacity-100 shrink-0" />
                        )}
                      </div>
                    </TableHead>
                  );
                })}

                {/* Actions Column Header (Desktop & Mobile, Requirement 10 & 11) */}
                <TableHead className="h-9 px-2 font-semibold text-foreground/80 text-center whitespace-nowrap text-xs w-[95px]">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="finance-table__body">
              {paginatedData.length === 0 ? (
                <TableRow className="h-full hover:bg-transparent">
                  <TableCell 
                    colSpan={columns.filter(c => visibleColumnKeys.has(c.key) || mobilePrimaryKeys.has(c.key)).length + 1} 
                    className="h-full min-h-[200px] text-center text-muted-foreground py-12 align-middle"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5 h-full">
                      <FileQuestion className="w-8 h-8 text-muted-foreground/60" />
                      <p className="text-sm font-medium text-foreground/80">Tidak ada data transaksi yang ditemukan</p>
                      <p className="text-xs text-muted-foreground">Periksa filter pencarian atau tambahkan transaksi baru</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, idx) => (
                  <TableRow
                    key={item.id || idx}
                    className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10"
                  >
                    {columns.map(col => {
                      const isVisibleDesktop = visibleColumnKeys.has(col.key);
                      const isMobileVisible = mobilePrimaryKeys.has(col.key);

                      if (!isVisibleDesktop && !isMobileVisible) return null;

                      const visibilityClass = isMobileVisible && isVisibleDesktop
                        ? ""
                        : isVisibleDesktop
                          ? "hidden md:table-cell"
                          : "table-cell md:hidden";

                      const align = getColumnAlignment(col);
                      const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

                      return (
                        <TableCell 
                          key={col.key} 
                          className={`px-3.5 py-2 text-xs ${alignClass} ${visibilityClass}`}
                        >
                          {formatCellValue(item[col.key], col.key, item, col)}
                        </TableCell>
                      );
                    })}

                    {/* Actions Cell (Requirements 10 & 11: Direct visible View, Edit, Delete with soft default and distinct hover) */}
                    <TableCell className="px-2 py-1.5 text-center">
                      <div className="finance-table__actions flex items-center justify-center gap-1">
                        {onView && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(item)}
                            aria-label="Lihat detail transaksi"
                            className="finance-action-btn h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onEdit && !hideEditButton && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(item)}
                            aria-label="Ubah transaksi"
                            className="finance-action-btn h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onDelete && !hideDeleteButton && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(item)}
                            aria-label="Hapus transaksi"
                            className="finance-action-btn h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Standardized Table Pagination */}
      <div className="mt-auto pt-1 shrink-0">
        <TablePagination
          currentPage={currentPage}
          totalItems={sortedData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newSize) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={itemsPerPageOptions}
        />
      </div>

      {/* Edit Data Modal (For surgical inline update) */}
      {editFields && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="border-border sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Ubah data transaksi</DialogTitle>
              <DialogDescription className="text-xs">
                Perbarui rincian informasi data transaksi
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {editFields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                  {field.type === "select" && field.options ? (
                    <Select
                      value={editFormData[field.key] || ""}
                      onValueChange={(value) => setEditFormData({ ...editFormData, [field.key]: value })}
                    >
                      <SelectTrigger className="bg-background border-border h-8 text-xs">
                        <SelectValue placeholder={`Pilih ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(opt => (
                          <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type}
                      className="bg-background border-border h-8 text-xs"
                      value={editFormData[field.key] !== undefined ? editFormData[field.key] : ""}
                      onChange={(e) => setEditFormData({ ...editFormData, [field.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="mt-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)} className="text-xs h-8">
                Batal
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs h-8" onClick={handleEditSubmit}>
                Simpan perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">Hapus data transaksi?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-8"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Dialog (Requirement: Export CSV & PDF with period selector & preview) */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <span>Ekspor Data {subTabTitle || "Tabel"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih format berkas dan rentang periode data yang ingin diekspor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Format Selection Cards */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Format Ekspor</Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExportFormat("csv")}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    exportFormat === "csv"
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <FileText className={`w-4 h-4 ${exportFormat === "csv" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-semibold text-foreground">CSV / Excel</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Format spreadsheet UTF-8 BOM, kompatibel dengan MS Excel
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    exportFormat === "pdf"
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Printer className={`w-4 h-4 ${exportFormat === "pdf" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-semibold text-foreground">PDF / Cetak</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Tata letak resmi siap cetak & simpan dokumen PDF
                  </span>
                </button>
              </div>
            </div>

            {/* Period Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Pilihan Periode</Label>
              <Select value={exportPeriod} onValueChange={(val) => setExportPeriod(val as ExportPeriodOption)}>
                <SelectTrigger className="bg-background border-border h-8 text-xs font-normal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Semua Data Aktif (Sesuai Filter)</SelectItem>
                  <SelectItem value="today" className="text-xs">Hari Ini</SelectItem>
                  <SelectItem value="this_week" className="text-xs">Minggu Ini</SelectItem>
                  <SelectItem value="this_month" className="text-xs">Bulan Ini</SelectItem>
                  <SelectItem value="this_year" className="text-xs">Tahun Ini</SelectItem>
                  <SelectItem value="custom" className="text-xs">Rentang Tanggal Kustom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Inputs if custom period */}
            {exportPeriod === "custom" && (
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Dari Tanggal</Label>
                  <Input
                    type="date"
                    className="bg-background border-border h-8 text-xs font-mono"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Sampai Tanggal</Label>
                  <Input
                    type="date"
                    className="bg-background border-border h-8 text-xs font-mono"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Information preview */}
            <div className="rounded-md border border-border bg-muted/30 p-2.5 text-xs space-y-1">
              <div className="flex justify-between items-center text-foreground font-medium">
                <span>Data yang akan diekspor:</span>
                <span className="font-mono text-primary font-bold">{previewExportData.length} baris</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Filter pencarian tabel yang aktif tetap diterapkan pada hasil ekspor.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(false)} className="text-xs h-8">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteExport}
              disabled={previewExportData.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh {exportFormat.toUpperCase()}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
