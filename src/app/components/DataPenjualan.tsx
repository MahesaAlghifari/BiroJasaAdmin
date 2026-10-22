import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { EnhancedTableWithDialogs, Column } from "./EnhancedTableWithDialogs";
import { FinanceAddPage } from "./FinanceAddPage";
import { FinanceDetailPage } from "./FinanceDetailPage";
import { InvoiceA5Dialog } from "./InvoiceA5Dialog";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  MUTASI_LD_COLUMNS_CONTRACT,
  MUTASI_AS_COLUMNS_CONTRACT,
  BBN_COLUMNS_CONTRACT,
  PERPANJANGAN_PAJAK_COLUMNS_CONTRACT,
  LAIN_LAIN_COLUMNS_CONTRACT,
  buildTableColumnsFromContract,
  buildFieldsFromContract,
} from "../data/penjualanContractData";
import { useFinanceStore, financeStore, PenjualanContractCategory } from "../data/financeStore";
import { orderStore } from "../data/orderStore";

const VALID_CATEGORIES: PenjualanContractCategory[] = [
  "mutasi-ld",
  "mutasi-as",
  "bbn",
  "perpanjangan-pajak",
  "lain-lain",
];

export function DataPenjualan() {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Authoritative URL-driven active tab
  const activeTab: PenjualanContractCategory = (category && VALID_CATEGORIES.includes(category as PenjualanContractCategory))
    ? (category as PenjualanContractCategory)
    : "mutasi-ld";

  useEffect(() => {
    if (category && !VALID_CATEGORIES.includes(category as PenjualanContractCategory)) {
      navigate("/finance/data-penjualan/mutasi-ld", { replace: true });
    }
  }, [category, navigate]);

  const handleTabChange = (val: string) => {
    if (val === activeTab) {
      return;
    }
    const targetPath = `/finance/data-penjualan/${val}`;
    if (location.pathname === targetPath || (typeof window !== "undefined" && window.location.pathname === targetPath)) {
      return;
    }
    navigate(targetPath);
  };

  const [isAdding, setIsAdding] = useState(false);
  const [printingItem, setPrintingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<{
    item: any;
    subTabTitle: string;
    columns?: Column[];
  } | null>(null);

  // Central Single Source of Truth
  const {
    getContractData,
    updateContractData,
    addContractData,
    deleteContractData,
    cancelSalesOrder,
  } = useFinanceStore();

  const [cancelTargetItem, setCancelTargetItem] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchFreshData = async () => {
      try {
        setIsLoadingData(true);
        await Promise.allSettled([
          orderStore.initFromApi(),
          financeStore.initFromApi(),
        ]);
      } catch (err) {
        console.error("Failed to load Data Penjualan:", err);
      } finally {
        if (active) setIsLoadingData(false);
      }
    };
    fetchFreshData();
    return () => {
      active = false;
    };
  }, []);

  const handleInitiateCancel = (item: any) => {
    setCancelTargetItem(item);
    setCancelReason("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetItem) return;
    if (!cancelReason.trim()) {
      toast.error("Alasan pembatalan transaksi wajib diisi.");
      return;
    }
    try {
      setIsSubmittingCancel(true);
      let orderNo: string | null =
        cancelTargetItem.orderNo ||
        cancelTargetItem["Nomor Order"] ||
        cancelTargetItem["No Order"] ||
        cancelTargetItem.order_no ||
        (typeof cancelTargetItem.id === "string" && cancelTargetItem.id.startsWith("ord:")
          ? cancelTargetItem.id.slice(4)
          : (typeof cancelTargetItem.id === "string" && cancelTargetItem.id.toUpperCase().startsWith("ORD-")
            ? cancelTargetItem.id
            : null));

      if (!orderNo) {
        const invNo = cancelTargetItem["No Invoice"] || cancelTargetItem.noInvoice || cancelTargetItem.invoiceNo || cancelTargetItem.invoice;
        if (invNo) {
          const matchingInv = financeStore.getInvoices().find((i: any) => i.invoiceNo === invNo || i.invoice === invNo);
          if (matchingInv?.orderNo) {
            orderNo = matchingInv.orderNo;
          }
        }
      }

      if (orderNo) {
        const cleanNo = orderNo.trim().toUpperCase();
        await orderStore.cancelOrder(cleanNo, cancelReason.trim());
        await cancelSalesOrder(cleanNo, cancelReason.trim());
        toast.success(`Transaksi order ${cleanNo} berhasil dibatalkan secara resmi.`);
        setCancelTargetItem(null);
        setCancelReason("");
      } else {
        deleteContractData(currentMeta.category, cancelTargetItem.id);
        toast.success("Data baris transaksi berhasil dihapus.");
        setCancelTargetItem(null);
        setCancelReason("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal membatalkan transaksi.");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const mutasiLD = getContractData("mutasi-ld");
  const mutasiAS = getContractData("mutasi-as");
  const bbn = getContractData("bbn");
  const perpanjangan = getContractData("perpanjangan-pajak");
  const lainLain = getContractData("lain-lain");

  // Build exact column contracts for each dataset
  const mutasiLDColumns = buildTableColumnsFromContract(MUTASI_LD_COLUMNS_CONTRACT);
  const mutasiASColumns = buildTableColumnsFromContract(MUTASI_AS_COLUMNS_CONTRACT);
  const bbnColumns = buildTableColumnsFromContract(BBN_COLUMNS_CONTRACT);
  const perpanjanganColumns = buildTableColumnsFromContract(PERPANJANGAN_PAJAK_COLUMNS_CONTRACT);
  const lainLainColumns = buildTableColumnsFromContract(LAIN_LAIN_COLUMNS_CONTRACT);

  // Active dataset properties for Add/Edit
  const getActiveTabMeta = () => {
    switch (activeTab) {
      case "mutasi-ld":
        return {
          title: "Mutasi LD",
          category: "mutasi-ld" as PenjualanContractCategory,
          columns: mutasiLDColumns,
          fields: buildFieldsFromContract(MUTASI_LD_COLUMNS_CONTRACT, "mutasi-ld"),
          data: mutasiLD,
        };
      case "mutasi-as":
        return {
          title: "Mutasi AS",
          category: "mutasi-as" as PenjualanContractCategory,
          columns: mutasiASColumns,
          fields: buildFieldsFromContract(MUTASI_AS_COLUMNS_CONTRACT, "mutasi-as"),
          data: mutasiAS,
        };
      case "bbn":
        return {
          title: "BBN",
          category: "bbn" as PenjualanContractCategory,
          columns: bbnColumns,
          fields: buildFieldsFromContract(BBN_COLUMNS_CONTRACT, "bbn"),
          data: bbn,
        };
      case "perpanjangan-pajak":
        return {
          title: "Perpanjangan Pajak",
          category: "perpanjangan-pajak" as PenjualanContractCategory,
          columns: perpanjanganColumns,
          fields: buildFieldsFromContract(PERPANJANGAN_PAJAK_COLUMNS_CONTRACT, "perpanjangan-pajak"),
          data: perpanjangan,
        };
      case "lain-lain":
        return {
          title: "Lain-Lain",
          category: "lain-lain" as PenjualanContractCategory,
          columns: lainLainColumns,
          fields: buildFieldsFromContract(LAIN_LAIN_COLUMNS_CONTRACT, "lain-lain"),
          data: lainLain,
        };
      default:
        return {
          title: "Mutasi LD",
          category: "mutasi-ld" as PenjualanContractCategory,
          columns: mutasiLDColumns,
          fields: buildFieldsFromContract(MUTASI_LD_COLUMNS_CONTRACT, "mutasi-ld"),
          data: mutasiLD,
        };
    }
  };

  const currentMeta = getActiveTabMeta();

  // Handle Add Submit
  const handleAddSubmit = (rows: any[]) => {
    try {
      const success = addContractData(currentMeta.category, rows);
      if (success) {
        setIsAdding(false);
        toast.success(`${rows.length} order kanonis berhasil ditambahkan dan disimpan`);
      } else {
        toast.error("Gagal menambahkan data: Pastikan Nama Customer, Nomor Polisi, dan Nomor HP (min. 9 digit) terisi lengkap");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat menyimpan data order");
    }
  };

  // Detail View Full Screen
  if (viewingItem) {
    return (
      <FinanceDetailPage
        subTabTitle={viewingItem.subTabTitle}
        item={viewingItem.item}
        columns={viewingItem.columns}
        onBack={() => setViewingItem(null)}
      />
    );
  }

  // Add Page Full Screen
  if (isAdding) {
    return (
      <FinanceAddPage
        title={`Tambah data ${currentMeta.title}`}
        description={`Masukkan satu atau lebih data transaksi untuk kategori ${currentMeta.title}`}
        subTabName={currentMeta.category}
        category={currentMeta.category}
        fields={currentMeta.fields}
        onBack={() => setIsAdding(false)}
        onSubmit={handleAddSubmit}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Modern Tab Navigation (Requirement 12: clean labels, no cluttering icons) */}
        <ScrollArea className="w-full shrink-0">
          <TabsList className="bg-muted/40 p-1 inline-flex w-max min-w-full gap-1 border border-border rounded-lg">
            <TabsTrigger
              value="mutasi-ld"
              className="text-xs sm:text-sm font-medium whitespace-nowrap px-3.5 py-1.5"
            >
              Mutasi LD
            </TabsTrigger>
            <TabsTrigger
              value="mutasi-as"
              className="text-xs sm:text-sm font-medium whitespace-nowrap px-3.5 py-1.5"
            >
              Mutasi AS
            </TabsTrigger>
            <TabsTrigger
              value="bbn"
              className="text-xs sm:text-sm font-medium whitespace-nowrap px-3.5 py-1.5"
            >
              BBN
            </TabsTrigger>
            <TabsTrigger
              value="perpanjangan-pajak"
              className="text-xs sm:text-sm font-medium whitespace-nowrap px-3.5 py-1.5"
            >
              Perpanjangan Pajak
            </TabsTrigger>
            <TabsTrigger
              value="lain-lain"
              className="text-xs sm:text-sm font-medium whitespace-nowrap px-3.5 py-1.5"
            >
              Lain-Lain
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* 1. Mutasi LD */}
        <TabsContent value="mutasi-ld" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            {isLoadingData && mutasiLD.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2 flex-1">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs font-medium">Memuat data penjualan Mutasi LD...</span>
              </div>
            ) : (
              <EnhancedTableWithDialogs
                columns={mutasiLDColumns}
                data={mutasiLD}
                subTabTitle="Data Penjualan - Mutasi LD"
                bypassInternalDeleteDialog={true}
                onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Mutasi LD", columns: mutasiLDColumns })}
                onPrint={(item) => setPrintingItem(item)}
                onAdd={() => setIsAdding(true)}
                onEdit={(item, updated) => updateContractData("mutasi-ld", item.id, updated)}
                onDelete={handleInitiateCancel}
                searchPlaceholder="Cari data mutasi luar daerah..."
                editFields={buildFieldsFromContract(MUTASI_LD_COLUMNS_CONTRACT, "mutasi-ld")}
              />
            )}
          </Card>
        </TabsContent>

        {/* 2. Mutasi AS */}
        <TabsContent value="mutasi-as" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <EnhancedTableWithDialogs
              columns={mutasiASColumns}
              data={mutasiAS}
              subTabTitle="Data Penjualan - Mutasi AS"
              bypassInternalDeleteDialog={true}
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Mutasi AS", columns: mutasiASColumns })}
              onPrint={(item) => setPrintingItem(item)}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("mutasi-as", item.id, updated)}
              onDelete={handleInitiateCancel}
              searchPlaceholder="Cari data mutasi antar samsat..."
              editFields={buildFieldsFromContract(MUTASI_AS_COLUMNS_CONTRACT, "mutasi-as")}
            />
          </Card>
        </TabsContent>

        {/* 3. BBN */}
        <TabsContent value="bbn" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <EnhancedTableWithDialogs
              columns={bbnColumns}
              data={bbn}
              subTabTitle="Data Penjualan - BBN"
              bypassInternalDeleteDialog={true}
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - BBN", columns: bbnColumns })}
              onPrint={(item) => setPrintingItem(item)}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("bbn", item.id, updated)}
              onDelete={handleInitiateCancel}
              searchPlaceholder="Cari data bea balik nama..."
              editFields={buildFieldsFromContract(BBN_COLUMNS_CONTRACT, "bbn")}
            />
          </Card>
        </TabsContent>

        {/* 4. Perpanjangan Pajak */}
        <TabsContent value="perpanjangan-pajak" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <EnhancedTableWithDialogs
              columns={perpanjanganColumns}
              data={perpanjangan}
              subTabTitle="Data Penjualan - Perpanjangan Pajak"
              bypassInternalDeleteDialog={true}
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Perpanjangan Pajak", columns: perpanjanganColumns })}
              onPrint={(item) => setPrintingItem(item)}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("perpanjangan-pajak", item.id, updated)}
              onDelete={handleInitiateCancel}
              searchPlaceholder="Cari data perpanjangan pajak..."
              editFields={buildFieldsFromContract(PERPANJANGAN_PAJAK_COLUMNS_CONTRACT, "perpanjangan-pajak")}
            />
          </Card>
        </TabsContent>

        {/* 5. Lain-Lain */}
        <TabsContent value="lain-lain" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <EnhancedTableWithDialogs
              columns={lainLainColumns}
              data={lainLain}
              subTabTitle="Data Penjualan - Lain-Lain"
              bypassInternalDeleteDialog={true}
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Lain-Lain", columns: lainLainColumns })}
              onPrint={(item) => setPrintingItem(item)}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("lain-lain", item.id, updated)}
              onDelete={handleInitiateCancel}
              searchPlaceholder="Cari data layanan lain-lain..."
              editFields={buildFieldsFromContract(LAIN_LAIN_COLUMNS_CONTRACT, "lain-lain")}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice A5 Print Dialog */}
      <InvoiceA5Dialog
        open={!!printingItem}
        onOpenChange={(open) => {
          if (!open) setPrintingItem(null);
        }}
        data={printingItem}
      />

      {/* Cancellation Confirmation Dialog (Soft Delete / Pembatalan Resmi) */}
      <AlertDialog
        open={!!cancelTargetItem}
        onOpenChange={(open) => {
          if (!open && !isSubmittingCancel) {
            setCancelTargetItem(null);
            setCancelReason("");
          }
        }}
      >
        <AlertDialogContent className="border-border sm:max-w-md bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Batalkan Transaksi / Order Resmi
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Pembatalan akan menandai order kanonis sebagai <strong>DIBATALKAN</strong> dan membatalkan invoice terkait sehingga tidak lagi menjadi piutang aktif. Berkas dokumen dan riwayat pembayaran yang telah terjadi tetap tersimpan untuk audit pembukuan.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {cancelTargetItem && (
            <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2 text-xs my-2">
              <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                <span className="text-muted-foreground">Nomor Order:</span>
                <span className="font-mono font-semibold text-foreground">
                  {cancelTargetItem.orderNo || cancelTargetItem["Nomor Order"] || (cancelTargetItem.id?.startsWith("ord:") ? cancelTargetItem.id.slice(4) : "-")}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium text-foreground">{cancelTargetItem["Nama Customer"] || cancelTargetItem.customer}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                <span className="text-muted-foreground">Nomor Polisi:</span>
                <span className="font-mono font-medium text-foreground">{cancelTargetItem["Plat No"] || cancelTargetItem.nopol}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Layanan:</span>
                <span className="font-medium text-foreground">{cancelTargetItem["Jenis Pengurusan"] || cancelTargetItem.layanan}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
              <span>Alasan Pembatalan <span className="text-destructive">*</span></span>
              {!cancelReason.trim() && (
                <span className="text-[10px] text-destructive font-normal">Wajib diisi sebelum konfirmasi</span>
              )}
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Contoh: Permintaan pembatalan customer, berkas ditolak Samsat, dll."
              rows={3}
              className={cn(
                "w-full p-2.5 rounded-md border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 resize-none",
                !cancelReason.trim()
                  ? "border-destructive/60 bg-destructive/5 focus:ring-destructive"
                  : "border-border bg-background focus:ring-rose-500"
              )}
            />
          </div>

          <AlertDialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmittingCancel}
              onClick={() => {
                setCancelTargetItem(null);
                setCancelReason("");
              }}
              className="h-8 text-xs font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isSubmittingCancel || !cancelReason.trim()}
              onClick={handleConfirmCancel}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingCancel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Memproses Pembatalan...
                </>
              ) : (
                "Ya, Batalkan Transaksi"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
