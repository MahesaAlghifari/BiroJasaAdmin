import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { EnhancedTableWithDialogs, Column } from "./EnhancedTableWithDialogs";
import { FinanceAddPage } from "./FinanceAddPage";
import { FinanceDetailPage } from "./FinanceDetailPage";
import { toast } from "sonner";
import {
  MUTASI_LD_COLUMNS_CONTRACT,
  MUTASI_AS_COLUMNS_CONTRACT,
  BBN_COLUMNS_CONTRACT,
  PERPANJANGAN_PAJAK_COLUMNS_CONTRACT,
  LAIN_LAIN_COLUMNS_CONTRACT,
  BELUM_KURANG_BAYAR_COLUMNS_CONTRACT,
  PROFIT_TERPENDING_COLUMNS_CONTRACT,
  CASHBACK_TERPENDING_COLUMNS_CONTRACT,
  buildTableColumnsFromContract,
  buildFieldsFromContract,
} from "../data/penjualanContractData";
import { useFinanceStore, PenjualanContractCategory } from "../data/financeStore";

const VALID_CATEGORIES: PenjualanContractCategory[] = [
  "mutasi-ld",
  "mutasi-as",
  "bbn",
  "perpanjangan-pajak",
  "lain-lain",
  "belum-kurang-bayar",
  "profit-terpending",
  "cashback-terpending",
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
  } = useFinanceStore();

  const mutasiLD = getContractData("mutasi-ld");
  const mutasiAS = getContractData("mutasi-as");
  const bbn = getContractData("bbn");
  const perpanjangan = getContractData("perpanjangan-pajak");
  const lainLain = getContractData("lain-lain");
  const belumBayar = getContractData("belum-kurang-bayar");
  const profitPending = getContractData("profit-terpending");
  const cashbackPending = getContractData("cashback-terpending");

  // Build exact column contracts for each dataset
  const mutasiLDColumns = buildTableColumnsFromContract(MUTASI_LD_COLUMNS_CONTRACT);
  const mutasiASColumns = buildTableColumnsFromContract(MUTASI_AS_COLUMNS_CONTRACT);
  const bbnColumns = buildTableColumnsFromContract(BBN_COLUMNS_CONTRACT);
  const perpanjanganColumns = buildTableColumnsFromContract(PERPANJANGAN_PAJAK_COLUMNS_CONTRACT);
  const lainLainColumns = buildTableColumnsFromContract(LAIN_LAIN_COLUMNS_CONTRACT);
  const belumBayarColumns = buildTableColumnsFromContract(BELUM_KURANG_BAYAR_COLUMNS_CONTRACT);
  const profitPendingColumns = buildTableColumnsFromContract(PROFIT_TERPENDING_COLUMNS_CONTRACT);
  const cashbackPendingColumns = buildTableColumnsFromContract(CASHBACK_TERPENDING_COLUMNS_CONTRACT);

  // Active dataset properties for Add/Edit
  const getActiveTabMeta = () => {
    switch (activeTab) {
      case "mutasi-ld":
        return {
          title: "Mutasi LD",
          category: "mutasi-ld" as PenjualanContractCategory,
          columns: mutasiLDColumns,
          fields: buildFieldsFromContract(MUTASI_LD_COLUMNS_CONTRACT),
          data: mutasiLD,
        };
      case "mutasi-as":
        return {
          title: "Mutasi AS",
          category: "mutasi-as" as PenjualanContractCategory,
          columns: mutasiASColumns,
          fields: buildFieldsFromContract(MUTASI_AS_COLUMNS_CONTRACT),
          data: mutasiAS,
        };
      case "bbn":
        return {
          title: "BBN",
          category: "bbn" as PenjualanContractCategory,
          columns: bbnColumns,
          fields: buildFieldsFromContract(BBN_COLUMNS_CONTRACT),
          data: bbn,
        };
      case "perpanjangan-pajak":
        return {
          title: "Perpanjangan Pajak",
          category: "perpanjangan-pajak" as PenjualanContractCategory,
          columns: perpanjanganColumns,
          fields: buildFieldsFromContract(PERPANJANGAN_PAJAK_COLUMNS_CONTRACT),
          data: perpanjangan,
        };
      case "lain-lain":
        return {
          title: "Lain-Lain",
          category: "lain-lain" as PenjualanContractCategory,
          columns: lainLainColumns,
          fields: buildFieldsFromContract(LAIN_LAIN_COLUMNS_CONTRACT),
          data: lainLain,
        };
      case "belum-kurang-bayar":
        return {
          title: "Belum & Kurang Bayar",
          category: "belum-kurang-bayar" as PenjualanContractCategory,
          columns: belumBayarColumns,
          fields: buildFieldsFromContract(BELUM_KURANG_BAYAR_COLUMNS_CONTRACT),
          data: belumBayar,
        };
      case "profit-terpending":
        return {
          title: "Profit Terpending",
          category: "profit-terpending" as PenjualanContractCategory,
          columns: profitPendingColumns,
          fields: buildFieldsFromContract(PROFIT_TERPENDING_COLUMNS_CONTRACT),
          data: profitPending,
        };
      case "cashback-terpending":
        return {
          title: "Cashback Terpending",
          category: "cashback-terpending" as PenjualanContractCategory,
          columns: cashbackPendingColumns,
          fields: buildFieldsFromContract(CASHBACK_TERPENDING_COLUMNS_CONTRACT),
          data: cashbackPending,
        };
      default:
        return {
          title: "Mutasi LD",
          category: "mutasi-ld" as PenjualanContractCategory,
          columns: mutasiLDColumns,
          fields: buildFieldsFromContract(MUTASI_LD_COLUMNS_CONTRACT),
          data: mutasiLD,
        };
    }
  };

  const currentMeta = getActiveTabMeta();

  // Handle Add Submit
  const handleAddSubmit = (rows: any[]) => {
    const success = addContractData(currentMeta.category, rows);
    if (success) {
      setIsAdding(false);
      toast.success(`${rows.length} order kanonis berhasil ditambahkan dan diproyeksikan`);
    } else {
      toast.error("Gagal menambahkan data: Pastikan Nama Customer, Nomor Polisi, dan Jenis Pengurusan terisi dengan benar");
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
            <TabsTrigger
              value="belum-kurang-bayar"
              className="text-xs sm:text-sm font-medium whitespace-nowrap px-3.5 py-1.5"
            >
              Belum & Kurang Bayar
            </TabsTrigger>
            <TabsTrigger
              value="profit-terpending"
              className="text-xs sm:text-sm font-medium whitespace-nowrap px-3.5 py-1.5"
            >
              Profit Terpending
            </TabsTrigger>
            <TabsTrigger
              value="cashback-terpending"
              className="text-xs sm:text-sm font-medium whitespace-nowrap px-3.5 py-1.5"
            >
              Cashback Terpending
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* 1. Mutasi LD */}
        <TabsContent value="mutasi-ld" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <div className="mb-4 shrink-0">
              <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Data mutasi luar daerah</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daftar transaksi pengurusan mutasi keluar dan masuk antar daerah</p>
            </div>
            <EnhancedTableWithDialogs
              columns={mutasiLDColumns}
              data={mutasiLD}
              subTabTitle="Data Penjualan - Mutasi LD"
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Mutasi LD", columns: mutasiLDColumns })}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("mutasi-ld", item.id, updated)}
              onDelete={(item) => deleteContractData("mutasi-ld", item.id)}
              searchPlaceholder="Cari data mutasi luar daerah..."
              editFields={buildFieldsFromContract(MUTASI_LD_COLUMNS_CONTRACT)}
            />
          </Card>
        </TabsContent>

        {/* 2. Mutasi AS */}
        <TabsContent value="mutasi-as" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <div className="mb-4 shrink-0">
              <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Data mutasi antar samsat</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daftar berkas perpindahan administrasi antar kantor samsat</p>
            </div>
            <EnhancedTableWithDialogs
              columns={mutasiASColumns}
              data={mutasiAS}
              subTabTitle="Data Penjualan - Mutasi AS"
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Mutasi AS", columns: mutasiASColumns })}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("mutasi-as", item.id, updated)}
              onDelete={(item) => deleteContractData("mutasi-as", item.id)}
              searchPlaceholder="Cari data mutasi antar samsat..."
              editFields={buildFieldsFromContract(MUTASI_AS_COLUMNS_CONTRACT)}
            />
          </Card>
        </TabsContent>

        {/* 3. BBN */}
        <TabsContent value="bbn" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <div className="mb-4 shrink-0">
              <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Data bea balik nama (BBN)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daftar proses pengurusan balik nama kendaraan bermotor (BBN 1 & BBN 2)</p>
            </div>
            <EnhancedTableWithDialogs
              columns={bbnColumns}
              data={bbn}
              subTabTitle="Data Penjualan - BBN"
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - BBN", columns: bbnColumns })}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("bbn", item.id, updated)}
              onDelete={(item) => deleteContractData("bbn", item.id)}
              searchPlaceholder="Cari data bea balik nama..."
              editFields={buildFieldsFromContract(BBN_COLUMNS_CONTRACT)}
            />
          </Card>
        </TabsContent>

        {/* 4. Perpanjangan Pajak */}
        <TabsContent value="perpanjangan-pajak" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <div className="mb-4 shrink-0">
              <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Data perpanjangan pajak</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daftar berkas pembayaran pajak tahunan dan 5 tahunan STNK</p>
            </div>
            <EnhancedTableWithDialogs
              columns={perpanjanganColumns}
              data={perpanjangan}
              subTabTitle="Data Penjualan - Perpanjangan Pajak"
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Perpanjangan Pajak", columns: perpanjanganColumns })}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("perpanjangan-pajak", item.id, updated)}
              onDelete={(item) => deleteContractData("perpanjangan-pajak", item.id)}
              searchPlaceholder="Cari data perpanjangan pajak..."
              editFields={buildFieldsFromContract(PERPANJANGAN_PAJAK_COLUMNS_CONTRACT)}
            />
          </Card>
        </TabsContent>

        {/* 5. Lain-Lain */}
        <TabsContent value="lain-lain" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <div className="mb-4 shrink-0">
              <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Data layanan lain-lain</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pengurusan duplikat STNK, plat nomor, ganti plat, dan administrasi lainnya</p>
            </div>
            <EnhancedTableWithDialogs
              columns={lainLainColumns}
              data={lainLain}
              subTabTitle="Data Penjualan - Lain-Lain"
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Lain-Lain", columns: lainLainColumns })}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("lain-lain", item.id, updated)}
              onDelete={(item) => deleteContractData("lain-lain", item.id)}
              searchPlaceholder="Cari data layanan lain-lain..."
              editFields={buildFieldsFromContract(LAIN_LAIN_COLUMNS_CONTRACT)}
            />
          </Card>
        </TabsContent>

        {/* 6. Belum & Kurang Bayar */}
        <TabsContent value="belum-kurang-bayar" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <div className="mb-4 shrink-0">
              <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Data belum & kurang bayar</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Monitoring transaksi customer yang masih memiliki kekurangan pembayaran</p>
            </div>
            <EnhancedTableWithDialogs
              columns={belumBayarColumns}
              data={belumBayar}
              subTabTitle="Data Penjualan - Belum & Kurang Bayar"
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Belum & Kurang Bayar", columns: belumBayarColumns })}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("belum-kurang-bayar", item.id, updated)}
              onDelete={(item) => deleteContractData("belum-kurang-bayar", item.id)}
              searchPlaceholder="Cari data belum & kurang bayar..."
              editFields={buildFieldsFromContract(BELUM_KURANG_BAYAR_COLUMNS_CONTRACT)}
            />
          </Card>
        </TabsContent>

        {/* 7. Profit Terpending */}
        <TabsContent value="profit-terpending" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <div className="mb-4 shrink-0">
              <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Data profit terpending</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Transaksi dengan margin profit yang masih tertahan verifikasi atau administrasi</p>
            </div>
            <EnhancedTableWithDialogs
              columns={profitPendingColumns}
              data={profitPending}
              subTabTitle="Data Penjualan - Profit Terpending"
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Profit Terpending", columns: profitPendingColumns })}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("profit-terpending", item.id, updated)}
              onDelete={(item) => deleteContractData("profit-terpending", item.id)}
              searchPlaceholder="Cari data profit terpending..."
              editFields={buildFieldsFromContract(PROFIT_TERPENDING_COLUMNS_CONTRACT)}
            />
          </Card>
        </TabsContent>

        {/* 8. Cashback Terpending */}
        <TabsContent value="cashback-terpending" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
            <div className="mb-4 shrink-0">
              <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Data cashback terpending</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daftar alokasi cashback rekanan atau customer yang menunggu pencairan</p>
            </div>
            <EnhancedTableWithDialogs
              columns={cashbackPendingColumns}
              data={cashbackPending}
              subTabTitle="Data Penjualan - Cashback Terpending"
              onView={(item) => setViewingItem({ item, subTabTitle: "Data Penjualan - Cashback Terpending", columns: cashbackPendingColumns })}
              onAdd={() => setIsAdding(true)}
              onEdit={(item, updated) => updateContractData("cashback-terpending", item.id, updated)}
              onDelete={(item) => deleteContractData("cashback-terpending", item.id)}
              searchPlaceholder="Cari data cashback terpending..."
              editFields={buildFieldsFromContract(CASHBACK_TERPENDING_COLUMNS_CONTRACT)}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
