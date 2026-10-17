import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { 
  Plus, 
  Download, 
  Search, 
  Edit, 
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { TablePagination } from "./ui/TablePagination";

interface EnhancedTableProps {
  columns: { key: string; label: string; }[];
  data: any[];
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  onExport?: (format: 'csv' | 'pdf') => void;
  searchPlaceholder?: string;
  itemsPerPageOptions?: number[];
}

export function EnhancedTable({
  columns,
  data,
  onAdd,
  onEdit,
  onDelete,
  onExport,
  searchPlaceholder = "Cari data...",
  itemsPerPageOptions = [10, 25, 50, 100]
}: EnhancedTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageOptions[0]);
  const [showFilter, setShowFilter] = useState(false);

  // Filter data based on search
  const filteredData = data.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const formatValue = (value: any, key: string) => {
    if (value === null || value === undefined || value === "") return "-";
    
    // Format currency
    if (typeof value === "number" && (key.toLowerCase().includes("uang") || key.toLowerCase().includes("biaya") || key.toLowerCase().includes("profit") || key.toLowerCase().includes("cashback"))) {
      const formatted = value.toLocaleString("id-ID");
      if (value < 0) {
        return <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400 font-medium">-Rp {Math.abs(value).toLocaleString("id-ID")}</span>;
      } else if (key.toLowerCase().includes("profit") || key.toLowerCase().includes("masuk")) {
        return <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">Rp {formatted}</span>;
      } else if (key.toLowerCase().includes("keluar") || key.toLowerCase().includes("biaya")) {
        return <span className="font-mono tabular-nums text-rose-500 dark:text-rose-400 font-medium">Rp {formatted}</span>;
      }
      return <span className="font-mono tabular-nums text-foreground font-medium">Rp {formatted}</span>;
    }
    
    // Format status and jabatan badges (exclude non-badge fields: jenis layanan, wilayah, dll)
    const lowerKey = key.toLowerCase();
    const isExcluded = lowerKey.includes("layanan") || lowerKey.includes("wilayah") || lowerKey.includes("kantor");
    
    if (!isExcluded && (lowerKey.includes("status") || lowerKey.includes("jabatan"))) {
      return <Badge status={value}>{value}</Badge>;
    }
    
    return value;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-10 bg-input-background border-border h-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
            className="border-border"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          {onAdd && (
            <Button onClick={onAdd} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          )}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-border">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('pdf')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>



      {/* Table */}
      <div className="rounded-xl border border-border/80 overflow-hidden shadow-xs bg-card flex-1 flex flex-col min-h-[220px]">
        <Table className={`w-full min-w-[550px] ${paginatedData.length === 0 ? "h-full" : ""}`}>
          <TableHeader className="bg-muted/40 border-b border-border/80">
            <TableRow>
              {columns.map(col => (
                <TableHead key={col.key} className="h-9 px-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</TableHead>
              ))}
              {(onEdit || onDelete) && <TableHead className="text-right h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow className="h-full hover:bg-transparent">
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-12 text-xs h-full min-h-[200px] align-middle">
                  Tidak ada data ditemukan
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, idx) => (
                <TableRow
                  key={item.id ?? idx}
                  className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10"
                >
                  {columns.map(col => (
                    <TableCell key={col.key} className="px-3.5 py-2 text-xs">
                      {formatValue(item[col.key], col.key)}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell className="text-right px-3 py-1.5">
                      <div className="flex gap-1 justify-end">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(item)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(item)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Standardized Table Pagination */}
      <div className="mt-auto pt-1 shrink-0">
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newSize) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={itemsPerPageOptions}
        />
      </div>
    </div>
  );
}
