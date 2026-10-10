import { useState } from "react";
import { useParams } from "react-router";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";
import { DataPenjualan } from "./DataPenjualan";
import { EnhancedTableWithDialogs, Column } from "./EnhancedTableWithDialogs";
import { FinanceAddPage, FieldConfig } from "./FinanceAddPage";
import { FinanceDetailPage } from "./FinanceDetailPage";
import { toast } from "sonner";
import { DATA_PENJUALAN_CATEGORIES } from "../config/routeConfig";
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Receipt,
  FileCheck,
  AlertCircle,
  MessageSquare,
  CheckCircle,
  Phone
} from "lucide-react";
import { formatRupiah, formatCustomerName, PlateNumberBadge } from "../utils/financeFormatters";
import { useFinanceStore, InvoiceBillingRecord } from "../data/financeStore";
import { orderStore } from "../data/orderStore";

interface FinanceContentProps {
  tab: string;
}

export function FinanceContent({ tab }: FinanceContentProps) {
  const [filterPeriod, setFilterPeriod] = useState("monthly");
  
  // State for adding mode (switches from table view to standalone FinanceAddPage)
  const [isAdding, setIsAdding] = useState(false);

  // State for viewing detail mode (switches from table view to standalone FinanceDetailPage)
  const [viewingItem, setViewingItem] = useState<{
    item: any;
    subTabTitle: string;
    columns?: { key: string; label: string }[];
  } | null>(null);

  // Datasets from central Single Source of Truth
  const {
    tagihanList: tagihanData,
    kasKantorList: kasKantorData,
    kasMessengerList: kasMessengerData,
    pengeluaranList: pengeluaranData,
    profitList: profitData,
    belumBayarList: belumBayarData,
    profitPendingList: profitPendingData,
    cashbackPendingList: cashbackPendingData,
    labaRugiData,
    recordPayment,
    resolveInvoice,
    completeInvoice,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addKasKantor,
    updateKasKantor,
    deleteKasKantor,
    addKasMessenger,
    updateKasMessenger,
    deleteKasMessenger,
    addPengeluaran,
    updatePengeluaran,
    deletePengeluaran,
  } = useFinanceStore();

  const { category } = useParams<{ category?: string }>();
  const activeCategoryLabel = category && DATA_PENJUALAN_CATEGORIES[category] ? DATA_PENJUALAN_CATEGORIES[category] : "Mutasi LD";

  // Sub-tab Breadcrumb renderer (Requirements 1, 2, 3: Global header displays title, no duplication in content)
  const renderSubTabHeader = (title: string, _description?: string, subCategory?: string) => (
    <nav className="text-xs text-muted-foreground flex items-center gap-1.5 pb-2" aria-label="Breadcrumb">
      <span>Finance</span>
      <span>/</span>
      {subCategory ? (
        <>
          <span>{title}</span>
          <span>/</span>
          <span className="text-foreground font-medium">{subCategory}</span>
        </>
      ) : (
        <span className="text-foreground font-medium">{title}</span>
      )}
    </nav>
  );

  // If viewing detail, show the detail page (Requirement 18 & 19)
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

  // ==========================================
  // 1. SUB-TAB: PROFIT (VIEW ONLY)
  // ==========================================
  if (tab === "profit") {
    const totalUangMasuk = profitData.reduce((acc, item) => acc + (item.uangMasuk > 0 ? item.uangMasuk : 0), 0);
    const totalBiayaSamsat = profitData.reduce((acc, item) => acc + item.biayaSamsat, 0);
    const totalProfit = profitData.reduce((acc, item) => acc + item.profit, 0);

    const profitColumns: Column[] = [
      { key: "tanggal", label: "Tanggal", filterable: true, filterType: "text" },
      { key: "nopol", label: "Plat nomor", filterable: true, filterType: "text" },
      { key: "customer", label: "Customer", filterable: true, filterType: "text" },
      { key: "namaBerkas", label: "Nama berkas" },
      { 
        key: "pengurusan", 
        label: "Pengurusan", 
        filterable: true, 
        filterType: "select", 
        filterOptions: ["PAJAK TAHUNAN", "PAJAK 5 TAHUNAN", "MUTASI LD", "MUTASI AS", "BALIK NAMA", "BBN 1", "BBN 2"] 
      },
      { key: "uangMasuk", label: "Uang masuk" },
      { key: "biayaSamsat", label: "Biaya samsat" },
      { key: "profit", label: "Profit" },
      { 
        key: "rekening", 
        label: "Rekening", 
        filterable: true, 
        filterType: "select", 
        filterOptions: ["BCA", "Mandiri", "BRI", "BNI", "CIMB", "Cash"] 
      },
      { key: "invoice", label: "Nomor invoice" },
      { key: "tanggalTTB", label: "Tanggal TTB" },
      { key: "ttb", label: "Nomor TTB" },
    ];

    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {renderSubTabHeader("Profit", "Pantau margin keuntungan dan rincian transaksi per berkas")}

        {/* Level 3: Table Card */}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
          <div className="mb-4 shrink-0">
            <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Daftar transaksi profit</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Seluruh rekapitulasi data penjualan dan kalkulasi keuntungan samsat</p>
          </div>
          <EnhancedTableWithDialogs
            columns={profitColumns}
            data={profitData}
            subTabTitle="Profit"
            onView={(item) => setViewingItem({ item, subTabTitle: "Profit", columns: profitColumns })}
            searchPlaceholder="Cari berdasarkan nopol, customer, invoice..."
            hideAddButton={true}
            hideEditButton={true}
            hideDeleteButton={true}
          />
        </Card>

        {/* Level 3: Summary Cards (Requirement 4: MOVED BELOW TABLE) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total uang masuk</p>
                <h3 className="text-xl font-bold text-foreground mt-1 tabular-nums">
                  {formatRupiah(totalUangMasuk)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{profitData.length} transaksi tercatat</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total biaya samsat</p>
                <h3 className="text-xl font-bold text-foreground mt-1 tabular-nums">
                  {formatRupiah(totalBiayaSamsat)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Biaya resmi pengurusan</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total laba kotor (profit)</p>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {formatRupiah(totalProfit)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Margin laba transaksi</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. SUB-TAB: KAS MESSENGER
  // ==========================================
  if (tab === "kas-messenger") {
    const kasMessengerFields: FieldConfig[] = [
      { key: "tanggal", label: "Tanggal", type: "date" },
      { key: "jenis", label: "Jenis transaksi", type: "select", options: ["PETTY CASH", "OPERASIONAL", "BIAYA SAMSAT"] },
      { key: "messenger", label: "Nama messenger", type: "text", placeholder: "Contoh: Ahmad" },
      { key: "keterangan", label: "Keterangan", type: "text", placeholder: "Rincian keperluan kas" },
      { key: "in", label: "Kas masuk (in)", type: "number", placeholder: "0" },
      { key: "out", label: "Kas keluar (out)", type: "number", placeholder: "0" },
      { key: "total", label: "Total saldo berjalan", type: "number", placeholder: "0" },
    ];

    const kasMessengerColumns: Column[] = [
      { key: "tanggal", label: "Tanggal", filterable: true, filterType: "text" },
      { 
        key: "jenis", 
        label: "Jenis kas", 
        filterable: true, 
        filterType: "select", 
        filterOptions: ["PETTY CASH", "OPERASIONAL", "BIAYA SAMSAT"] 
      },
      { key: "messenger", label: "Messenger", filterable: true, filterType: "text" },
      { key: "keterangan", label: "Keterangan" },
      { key: "in", label: "Masuk" },
      { key: "out", label: "Keluar" },
      { key: "total", label: "Saldo akhir" },
    ];

    const totalKasMasuk = kasMessengerData.reduce((acc, item) => acc + item.in, 0);
    const totalKasKeluar = kasMessengerData.reduce((acc, item) => acc + item.out, 0);
    const sisaSaldoMessenger = totalKasMasuk - totalKasKeluar;

    const handleAddSubmit = (rows: any[]) => {
      rows.forEach((row) => {
        addKasMessenger({
          tanggal: row.tanggal || new Date().toLocaleDateString("id-ID"),
          jenis: row.jenis || "OPERASIONAL",
          messenger: row.messenger || "Ahmad",
          keterangan: row.keterangan || "",
          in: parseInt(row.in) || 0,
          out: parseInt(row.out) || 0,
          total: parseInt(row.total) || undefined,
        });
      });
      setIsAdding(false);
      toast.success(`${rows.length} data kas messenger berhasil ditambahkan`);
    };

    if (isAdding) {
      return (
        <FinanceAddPage
          title="Tambah data kas messenger"
          description="Masukkan pencatatan transaksi kas masuk atau pengeluaran operasional messenger"
          fields={kasMessengerFields}
          onBack={() => setIsAdding(false)}
          onSubmit={handleAddSubmit}
        />
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {renderSubTabHeader("Kas Messenger", "Kelola pencatatan kas petty cash dan operasional messenger")}

        {/* Level 3: Table */}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
          <div className="mb-4 shrink-0">
            <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Buku kas harian messenger</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Riwayat lengkap mutasi kas masuk dan keluar kurir/messenger di lapangan</p>
          </div>
          <EnhancedTableWithDialogs
            columns={kasMessengerColumns}
            data={kasMessengerData}
            subTabTitle="Kas Messenger"
            onAdd={() => setIsAdding(true)}
            onView={(item) => setViewingItem({ item, subTabTitle: "Kas messenger", columns: kasMessengerColumns })}
            onEdit={(item, updated) => updateKasMessenger(item.id, updated)}
            onDelete={(item) => deleteKasMessenger(item.id)}
            searchPlaceholder="Cari berdasarkan messenger, keterangan, jenis..."
            editFields={kasMessengerFields}
          />
        </Card>

        {/* Level 3: Summary Cards (Requirement 4: MOVED BELOW TABLE) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total kas masuk</p>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {formatRupiah(totalKasMasuk)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Penerimaan kas & petty cash</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total kas keluar</p>
                <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                  {formatRupiah(totalKasKeluar)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Operasional & biaya samsat</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sisa saldo kas messenger</p>
                <h3 className="text-xl font-bold text-foreground mt-1 tabular-nums">
                  {formatRupiah(sisaSaldoMessenger)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Posisi saldo saat ini</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. SUB-TAB: KAS KANTOR
  // ==========================================
  if (tab === "kas-kantor") {
    const kasKantorFields: FieldConfig[] = [
      { key: "tanggal", label: "Tanggal", type: "date" },
      { key: "status", label: "Tipe arus kas", type: "select", options: ["Debit", "Kredit"] },
      { key: "keterangan", label: "Keterangan", type: "text", placeholder: "Contoh: Pembayaran invoice atau biaya sewa" },
      { key: "debit", label: "Debit (masuk)", type: "number", placeholder: "0" },
      { key: "kredit", label: "Kredit (keluar)", type: "number", placeholder: "0" },
      { key: "total", label: "Saldo akhir", type: "number", placeholder: "0" },
    ];

    const kasKantorColumns: Column[] = [
      { key: "tanggal", label: "Tanggal", filterable: true, filterType: "text" },
      { 
        key: "status", 
        label: "Status", 
        filterable: true, 
        filterType: "select", 
        filterOptions: ["Debit", "Kredit"] 
      },
      { key: "keterangan", label: "Keterangan" },
      { key: "debit", label: "Debit (masuk)" },
      { key: "kredit", label: "Kredit (keluar)" },
      { key: "total", label: "Saldo" },
    ];

    const totalDebit = kasKantorData.reduce((acc, item) => acc + item.debit, 0);
    const totalKredit = kasKantorData.reduce((acc, item) => acc + item.kredit, 0);
    const saldoAkhirKantor = totalDebit - totalKredit;

    const handleAddSubmit = (rows: any[]) => {
      rows.forEach((row) => {
        addKasKantor({
          tanggal: row.tanggal || new Date().toLocaleDateString("id-ID"),
          status: row.status || "Debit",
          keterangan: row.keterangan || "",
          debit: parseInt(row.debit) || 0,
          kredit: parseInt(row.kredit) || 0,
          total: parseInt(row.total) || undefined,
        });
      });
      setIsAdding(false);
      toast.success(`${rows.length} data kas kantor berhasil ditambahkan`);
    };

    if (isAdding) {
      return (
        <FinanceAddPage
          title="Tambah transaksi kas kantor"
          description="Catat arus kas masuk debit ataupun pengeluaran kas kredit kantor"
          fields={kasKantorFields}
          onBack={() => setIsAdding(false)}
          onSubmit={handleAddSubmit}
        />
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {renderSubTabHeader("Kas Kantor", "Kelola transaksi kas kantor")}

        {/* Level 3: Table */}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
          <div className="mb-4 shrink-0">
            <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Buku kas besar kantor</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Jurnal pencatatan mutasi kas bank dan kas tunai perusahaan</p>
          </div>
          <EnhancedTableWithDialogs
            columns={kasKantorColumns}
            data={kasKantorData}
            subTabTitle="Kas Kantor"
            onAdd={() => setIsAdding(true)}
            onView={(item) => setViewingItem({ item, subTabTitle: "Kas kantor", columns: kasKantorColumns })}
            onEdit={(item, updated) => updateKasKantor(item.id, updated)}
            onDelete={(item) => deleteKasKantor(item.id)}
            searchPlaceholder="Cari berdasarkan keterangan transaksi..."
            editFields={kasKantorFields}
          />
        </Card>

        {/* Level 3: Summary Cards (Requirement 4: MOVED BELOW TABLE) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total penerimaan debit</p>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {formatRupiah(totalDebit)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Pemasukan kas utama kantor</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total pengeluaran kredit</p>
                <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                  {formatRupiah(totalKredit)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Biaya sewa, gaji, dan utilitas</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Saldo kas kantor</p>
                <h3 className="text-xl font-bold text-foreground mt-1 tabular-nums">
                  {formatRupiah(saldoAkhirKantor)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Saldo bersih kas operasional</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. SUB-TAB: PENGELUARAN
  // ==========================================
  if (tab === "pengeluaran") {
    const pengeluaranFields: FieldConfig[] = [
      { key: "tanggal", label: "Tanggal pengeluaran", type: "date" },
      { key: "keterangan", label: "Keterangan biaya", type: "text", placeholder: "Contoh: Listrik bulanan, ATK kantor" },
      { key: "nominal", label: "Nominal pengeluaran", type: "number", placeholder: "0" },
    ];

    const pengeluaranColumns: Column[] = [
      { key: "tanggal", label: "Tanggal", filterable: true, filterType: "text" },
      { key: "keterangan", label: "Keterangan pengeluaran", filterable: true, filterType: "text" },
      { key: "nominal", label: "Nominal" },
    ];

    const totalPengeluaranBulanIni = pengeluaranData.reduce((acc, item) => acc + item.nominal, 0);

    const handleAddSubmit = (rows: any[]) => {
      rows.forEach((row) => {
        addPengeluaran({
          tanggal: row.tanggal || new Date().toLocaleDateString("id-ID"),
          keterangan: row.keterangan || "",
          nominal: parseInt(row.nominal) || 0,
        });
      });
      setIsAdding(false);
      toast.success(`${rows.length} data pengeluaran berhasil ditambahkan`);
    };

    if (isAdding) {
      return (
        <FinanceAddPage
          title="Tambah data pengeluaran"
          description="Catat biaya operasional, perlengkapan, atau utilitas kantor"
          fields={pengeluaranFields}
          onBack={() => setIsAdding(false)}
          onSubmit={handleAddSubmit}
        />
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {renderSubTabHeader("Pengeluaran", "Catat dan monitor seluruh pos pengeluaran operasional kantor")}

        {/* Level 3: Table */}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
          <div className="mb-4 shrink-0">
            <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Daftar beban operasional</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Pencatatan rincian biaya tetap dan variabel operasional kantor</p>
          </div>
          <EnhancedTableWithDialogs
            columns={pengeluaranColumns}
            data={pengeluaranData}
            subTabTitle="Pengeluaran"
            onAdd={() => setIsAdding(true)}
            onView={(item) => setViewingItem({ item, subTabTitle: "Pengeluaran", columns: pengeluaranColumns })}
            onEdit={(item, updated) => updatePengeluaran(item.id, updated)}
            onDelete={(item) => deletePengeluaran(item.id)}
            searchPlaceholder="Cari berdasarkan keterangan pengeluaran..."
            editFields={pengeluaranFields}
          />
        </Card>

        {/* Level 3: Summary Cards (Requirement 4: MOVED BELOW TABLE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total pengeluaran operasional</p>
                <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                  {formatRupiah(totalPengeluaranBulanIni)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Akumulasi pengeluaran kantor</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Jumlah transaksi pengeluaran</p>
                <h3 className="text-xl font-bold text-foreground mt-1 tabular-nums">
                  {pengeluaranData.length} transaksi
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Item operasional tercatat</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. SUB-TAB: DATA PENJUALAN
  // ==========================================
  if (tab === "penjualan") {
    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {renderSubTabHeader("Data Penjualan", "Kelola dan pantau data penjualan berkas", activeCategoryLabel)}
        <DataPenjualan />
      </div>
    );
  }

  // ==========================================
  // 6. SUB-TAB: TAGIHAN
  // ==========================================
  if (tab === "tagihan") {
    const tagihanFields: FieldConfig[] = [
      { key: "tanggal", label: "Tanggal tagihan", type: "date" },
      { key: "customer", label: "Customer", type: "text", placeholder: "Nama customer atau badan usaha" },
      { key: "nopol", label: "Plat nomor", type: "text", placeholder: "Contoh: B 1234 ABC" },
      { 
        key: "jenisLayanan", 
        label: "Jenis layanan", 
        type: "select", 
        options: ["Mutasi LD", "Mutasi AS", "BBN 1", "BBN 2", "Pajak Tahunan", "Perpanjangan 5 Tahun", "Balik Nama", "Ganti Plat", "Duplikat STNK"] 
      },
      { key: "totalTagihan", label: "Total tagihan", type: "number", placeholder: "0" },
      { key: "terbayar", label: "Terbayar", type: "number", placeholder: "0" },
      { key: "sisa", label: "Sisa tagihan", type: "number", placeholder: "0" },
      { key: "jatuhTempo", label: "Jatuh tempo", type: "date" },
      { key: "status", label: "Status tagihan", type: "select", options: ["Belum Bayar", "Kurang Bayar", "Lunas"] },
    ];

    const tagihanBelumLunas = tagihanData.filter(d => d.status !== "Lunas");
    const tagihanLunas = tagihanData.filter(d => d.status === "Lunas");

    const totalPiutang = tagihanBelumLunas.reduce((acc, item) => acc + item.sisa, 0);
    const totalTerbayar = tagihanLunas.reduce((acc, item) => acc + item.terbayar, 0);

    const handleAddSubmit = (rows: any[]) => {
      rows.forEach((row) => {
        addInvoice({
          tanggal: row.tanggal || new Date().toLocaleDateString("id-ID"),
          customer: row.customer || "",
          nopol: row.nopol || "",
          jenisLayanan: row.jenisLayanan || "Pajak Tahunan",
          totalTagihan: parseInt(row.totalTagihan) || 0,
          terbayar: parseInt(row.terbayar) || 0,
          jatuhTempo: row.jatuhTempo || new Date().toLocaleDateString("id-ID"),
          status: row.status,
        });
      });
      setIsAdding(false);
      toast.success(`${rows.length} data tagihan berhasil ditambahkan`);
    };

    const handleHubungiWA = (item: InvoiceBillingRecord) => {
      if (!item.phone || item.phone.trim().length < 8) {
        toast.error(`Nomor WhatsApp untuk customer ${item.customer} tidak tersedia`);
        return;
      }
      const cleanPhone = item.phone.replace(/^0/, "62").replace(/[^0-9]/g, "");
      const msg = `Halo ${item.customer}, kami dari Biro Jasa SUN89 menginformasikan tagihan ${item.invoice} (${item.nopol} - ${item.jenisLayanan}) dengan sisa piutang sebesar ${formatRupiah(item.sisa)}. Mohon konfirmasi jadwal pelunasannya. Terima kasih.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
    };

    const handleLunas = (item: InvoiceBillingRecord) => {
      resolveInvoice(item.id);
      toast.success(`Tagihan ${item.invoice} (${item.customer}) telah ditandai LUNAS. Penerimaan kas dicatat ke Kas Kantor.`);
    };

    const handleSelesai = (item: InvoiceBillingRecord) => {
      completeInvoice(item.id, "Admin");
      toast.success(`Tagihan ${item.invoice} (${item.customer}) telah SELESAI dan diarsipkan dari daftar aktif.`);
    };

    if (isAdding) {
      return (
        <FinanceAddPage
          title="Tambah data tagihan"
          description="Masukkan faktur tagihan invoice baru untuk customer atau mitra rekanan"
          fields={tagihanFields}
          onBack={() => setIsAdding(false)}
          onSubmit={handleAddSubmit}
        />
      );
    }

    const tagihanColumns: Column[] = [
      {
        key: "orderNo",
        label: "Order",
        filterable: true,
        filterType: "text" as const,
        render: (_val: any, item: InvoiceBillingRecord) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {item.orderNo || item.invoice || "-"}
          </span>
        ),
      },
      { 
        key: "customer", 
        label: "Customer", 
        filterable: true, 
        filterType: "text" as const,
        render: (value: string, item: InvoiceBillingRecord) => (
          <div className="flex flex-col py-0.5">
            <span className="text-foreground/90 font-medium">{formatCustomerName(value)}</span>
            {item?.phone && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                <Phone className="w-2.5 h-2.5 shrink-0 text-muted-foreground/60" />
                {item.phone}
              </span>
            )}
          </div>
        )
      },
      { 
        key: "nopol", 
        label: "No. Polisi", 
        filterable: true, 
        filterType: "text" as const,
        render: (value: string) => <PlateNumberBadge plate={value || "-"} />
      },
      { 
        key: "totalTagihan", 
        label: "Total Tagihan",
        align: "right" as const,
        render: (val: number) => (
          <span className="font-mono tabular-nums text-xs font-medium text-foreground">
            {formatRupiah(val)}
          </span>
        )
      },
      { 
        key: "terbayar", 
        label: "Terbayar",
        align: "right" as const,
        render: (val: number) => (
          <span className="font-mono tabular-nums text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {formatRupiah(val)}
          </span>
        )
      },
      { 
        key: "sisa", 
        label: "Sisa",
        align: "right" as const,
        render: (val: number) => (
          <span className={`font-mono tabular-nums text-xs font-semibold ${val > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
            {formatRupiah(val)}
          </span>
        )
      },
      { 
        key: "status", 
        label: "Status Pembayaran", 
        filterable: true, 
        filterType: "select" as const, 
        filterOptions: ["Semua", "Lunas", "Kurang Bayar", "Belum Bayar"],
        render: (value: string) => {
          if (value === "Lunas") {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Lunas
              </span>
            );
          }
          if (value === "Kurang Bayar") {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Kurang Bayar
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Belum Bayar
            </span>
          );
        }
      },
      {
        key: "collectionStatus",
        label: "Status Penagihan",
        filterable: true,
        filterType: "select" as const,
        filterOptions: ["Semua", "Jatuh Tempo", "Belum Jatuh Tempo", "Lunas"],
        render: (_val: any, item: InvoiceBillingRecord) => {
          let collState = item.collectionStatus;
          if (item.orderNo) {
            const ord = orderStore.getOrderByNo(item.orderNo);
            if (ord) {
              if (item.status === "Lunas" || (ord.payment?.kurang || 0) === 0) {
                collState = "LUNAS";
              } else if (ord.currentStep >= 8 || ord.currentStageName === "Dokumen Telah Diterima" || ord.currentStageName === "Selesai (Arsip)") {
                collState = "JATUH_TEMPO";
              } else {
                collState = "BELUM_JATUH_TEMPO";
              }
            }
          }
          if (!collState) {
            collState = item.status === "Lunas" || item.sisa === 0 ? "LUNAS" : "JATUH_TEMPO";
          }

          if (collState === "LUNAS") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Lunas
              </span>
            );
          }
          if (collState === "JATUH_TEMPO") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Jatuh Tempo
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Belum Jatuh Tempo
            </span>
          );
        }
      },
      {
        key: "kontak",
        label: "Kontak",
        render: (_val: any, item: InvoiceBillingRecord) => {
          const hasPhone = Boolean(item.phone && item.phone.trim().length >= 8);
          if (!hasPhone) {
            return (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                className="h-6 px-2 text-[11px] gap-1 opacity-50 cursor-not-allowed border-border text-muted-foreground"
                title="Nomor telepon WhatsApp tidak tersedia"
              >
                <Phone className="w-3 h-3 text-muted-foreground/60" />
                <span>Tidak Ada Kontak</span>
              </Button>
            );
          }
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
              onClick={(e) => {
                e.stopPropagation();
                handleHubungiWA(item);
              }}
              title={`Hubungi WA (${item.phone})`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Hubungi WA</span>
            </Button>
          );
        }
      },
      {
        key: "tindakan",
        label: "Tindakan",
        render: (_val: any, item: InvoiceBillingRecord) => {
          const isLunas = item.status === "Lunas" || item.sisa === 0;

          if (isLunas) {
            return (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-500/40 dark:border-emerald-600/40 font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelesai(item);
                }}
                title="Selesaikan & arsipkan tagihan dari daftar aktif"
              >
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span>Selesai</span>
              </Button>
            );
          }

          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/5 border-primary/40 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                handleLunas(item);
              }}
              title="Lunaskan tagihan melalui kas kantor"
            >
              <CheckCircle className="w-3 h-3 text-primary" />
              <span>Lunas</span>
            </Button>
          );
        }
      },
    ];

    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {renderSubTabHeader("Tagihan", "Monitoring status pelunasan dan piutang tagihan berkas")}

        {/* Level 3: Merged Single Table (Requirement 8) */}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
          <div className="mb-4 shrink-0">
            <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Daftar tagihan</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Monitoring status pelunasan, sisa piutang, dan invoice tagihan berkas</p>
          </div>
          <EnhancedTableWithDialogs
            columns={tagihanColumns}
            data={tagihanData}
            subTabTitle="Tagihan"
            onAdd={() => setIsAdding(true)}
            onView={(item) => setViewingItem({ item, subTabTitle: "Tagihan", columns: tagihanColumns })}
            onEdit={(item, updated) => updateInvoice(item.id, updated)}
            hideDeleteButton={true}
            searchPlaceholder="Cari customer, nopol, atau layanan tagihan..."
            editFields={tagihanFields}
          />
        </Card>

        {/* Level 3: Summary Cards (Requirement 8: MOVED BELOW TABLE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total piutang belum lunas</p>
                <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                  {formatRupiah(totalPiutang)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{tagihanBelumLunas.length} tagihan menunggu pelunasan</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total tagihan terbayar lunas</p>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {formatRupiah(totalTerbayar)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{tagihanLunas.length} tagihan telah lunas</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // 7. SUB-TAB: LABA RUGI
  // ==========================================
  if (tab === "laba-rugi") {
    // Total calculation preserving exact business logic
    const totalPemasukan = profitData.reduce((acc, item) => {
      return acc + (item.uangMasuk > 0 ? item.uangMasuk : 0);
    }, 0);
    
    const pengeluaranKantor = pengeluaranData.reduce((acc, item) => acc + item.nominal, 0);
    const pengeluaranMessenger = kasMessengerData.reduce((acc, item) => acc + item.out, 0);
    const pengeluaranKasKantor = kasKantorData.reduce((acc, item) => acc + item.kredit, 0);
    const biayaSamsat = profitData.reduce((acc, item) => acc + (item.biayaSamsat > 0 ? item.biayaSamsat : 0), 0);
    
    const totalPengeluaran = pengeluaranKantor + pengeluaranMessenger + pengeluaranKasKantor + biayaSamsat;
    const labaRugiBersih = totalPemasukan - totalPengeluaran;

    // Prepared data for transaction breakdown table
    const tablePemasukan = profitData
      .filter(item => item.uangMasuk > 0)
      .map(item => ({
        tanggal: item.tanggal,
        kategori: "Pemasukan",
        keterangan: `${item.pengurusan} - ${item.nopol} (${item.customer})`,
        invoice: item.invoice,
        nominal: item.uangMasuk,
        type: "in" as const
      }));
    
    const tablePengeluaranKantor = pengeluaranData.map(item => ({
      tanggal: item.tanggal,
      kategori: "Pengeluaran kantor",
      keterangan: item.keterangan,
      invoice: "-",
      nominal: item.nominal,
      type: "out" as const
    }));
    
    const tablePengeluaranMessenger = kasMessengerData
      .filter(item => item.out > 0)
      .map(item => ({
        tanggal: item.tanggal,
        kategori: `Pengeluaran messenger - ${item.jenis}`,
        keterangan: `${item.keterangan} (${item.messenger})`,
        invoice: "-",
        nominal: item.out,
        type: "out" as const
      }));
    
    const tablePengeluaranKasKantor = kasKantorData
      .filter(item => item.kredit > 0)
      .map(item => ({
        tanggal: item.tanggal,
        kategori: "Pengeluaran kas kantor",
        keterangan: item.keterangan,
        invoice: "-",
        nominal: item.kredit,
        type: "out" as const
      }));

    const tableBiayaSamsat = profitData
      .filter(item => item.biayaSamsat > 0)
      .map(item => ({
        tanggal: item.tanggal,
        kategori: "Biaya samsat",
        keterangan: `${item.pengurusan} - ${item.nopol}`,
        invoice: item.invoice,
        nominal: item.biayaSamsat,
        type: "out" as const
      }));
    
    const combinedData = [
      ...tablePemasukan,
      ...tablePengeluaranKantor,
      ...tablePengeluaranMessenger,
      ...tablePengeluaranKasKantor,
      ...tableBiayaSamsat
    ];

    // Modern Chart Tooltip formatter
    const CustomChartTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-card border border-border p-3 rounded-lg shadow-md text-xs space-y-1.5 min-w-[180px]">
            <p className="font-semibold text-foreground border-b border-border/60 pb-1">Bulan {label}</p>
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-medium text-foreground">
                  {formatRupiah(entry.value)}
                </span>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    const labaRugiColumns = [
      { key: "tanggal", label: "Tanggal", filterable: true, filterType: "text" as const },
      { 
        key: "kategori", 
        label: "Kategori transaksi", 
        filterable: true, 
        filterType: "select" as const, 
        filterOptions: [
          "Pemasukan", 
          "Pengeluaran kantor", 
          "Pengeluaran messenger - OPERASIONAL",
          "Pengeluaran messenger - BIAYA SAMSAT",
          "Pengeluaran messenger - PETTY CASH",
          "Pengeluaran kas kantor",
          "Biaya samsat"
        ] 
      },
      { key: "keterangan", label: "Keterangan", filterable: true, filterType: "text" as const },
      { key: "invoice", label: "Nomor invoice" },
      { 
        key: "nominal", 
        label: "Nominal",
        render: (value: any, row: any) => {
          const isIncome = row.type === "in";
          return (
            <span className={`font-mono tabular-nums font-medium ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
              {isIncome ? "+" : "-"} {formatRupiah(value)}
            </span>
          );
        }
      },
    ];

    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Breadcrumb & Period Selector (Requirements 1, 2, 3: Header is in App.tsx) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <nav className="text-xs text-muted-foreground flex items-center gap-1.5" aria-label="Breadcrumb">
            <span>Finance</span>
            <span>/</span>
            <span className="text-foreground font-medium">Laba Rugi</span>
          </nav>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[130px] bg-background border-border h-8 text-xs font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily" className="text-xs">Harian</SelectItem>
                <SelectItem value="weekly" className="text-xs">Mingguan</SelectItem>
                <SelectItem value="monthly" className="text-xs">Bulanan</SelectItem>
                <SelectItem value="yearly" className="text-xs">Tahunan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Level 3: Modern Chart (Requirement 8) */}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs">
          <div className="mb-4">
            <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Grafik perbandingan pendapatan & pengeluaran</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Visualisasi tren keuangan semester berjalan</p>
          </div>
          
          <div className="h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={labaRugiData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="bulan" 
                  tickLine={false} 
                  axisLine={{ stroke: 'hsl(var(--border))' }} 
                  fontSize={12} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={11} 
                  tickFormatter={(val) => `${val / 1000000} jt`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
                />
                <Bar 
                  dataKey="pendapatan" 
                  name="Pendapatan" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="pengeluaran" 
                  name="Pengeluaran" 
                  fill="#f43f5e" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="laba" 
                  name="Laba bersih" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Level 3: Table - Detail Transaksi Pemasukan & Pengeluaran */}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs flex-1 flex flex-col min-h-0">
          <div className="mb-4 shrink-0">
            <h3 className="text-base md:text-[17px] font-semibold tracking-tight text-foreground">Rincian mutasi transaksi kas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Daftar gabungan pos arus kas masuk dan keluar bisnis</p>
          </div>
          <EnhancedTableWithDialogs
            columns={labaRugiColumns}
            data={combinedData.map((item, idx) => ({ id: idx + 1, ...item }))}
            subTabTitle="Laba Rugi"
            onView={(item) => setViewingItem({ item, subTabTitle: "Laba rugi", columns: labaRugiColumns })}
            searchPlaceholder="Cari tanggal, kategori, invoice, keterangan..."
            hideAddButton={true}
            hideEditButton={true}
            hideDeleteButton={true}
          />
        </Card>

        {/* Level 3: Summary Cards (Requirement 4: MOVED BELOW TABLE) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total pendapatan</p>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                  {formatRupiah(totalPemasukan)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{tablePemasukan.length} transaksi pemasukan</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total pengeluaran</p>
                <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                  {formatRupiah(totalPengeluaran)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Operasional, kas & samsat</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Laba rugi bersih</p>
                <h3 className={`text-xl font-bold mt-1 tabular-nums ${labaRugiBersih >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatRupiah(labaRugiBersih)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{labaRugiBersih >= 0 ? "Surplus profit bersih" : "Defisit operasional"}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${labaRugiBersih >= 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {labaRugiBersih >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>
          </Card>
        </div>

        {/* Level 3: Breakdown Cards (BELOW TABLE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs">
            <h4 className="text-sm font-semibold text-foreground mb-3">Rincian pendapatan</h4>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Penerimaan transaksi customer</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(totalPemasukan)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-medium text-foreground">Total pendapatan kotor</span>
                <span className="font-mono tabular-nums font-bold text-foreground">
                  {formatRupiah(totalPemasukan)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs">
            <h4 className="text-sm font-semibold text-foreground mb-3">Rincian beban & pengeluaran</h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pengeluaran kantor</span>
                <span className="font-mono tabular-nums text-rose-500">{formatRupiah(pengeluaranKantor)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Operasional messenger</span>
                <span className="font-mono tabular-nums text-rose-500">{formatRupiah(pengeluaranMessenger)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pengeluaran kas kantor</span>
                <span className="font-mono tabular-nums text-rose-500">{formatRupiah(pengeluaranKasKantor)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Biaya samsat resmi</span>
                <span className="font-mono tabular-nums text-rose-500">{formatRupiah(biayaSamsat)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/60">
                <span className="font-medium text-foreground">Total beban pengeluaran</span>
                <span className="font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                  {formatRupiah(totalPengeluaran)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // DIRECT FALLBACK SUB-TABS: BELUM BAYAR, PROFIT PENDING, CASHBACK PENDING
  // ==========================================
  if (tab === "belum-bayar") {
    const belumBayarColumns = [
      { key: "tanggal", label: "Tanggal", filterable: true, filterType: "text" as const },
      { key: "nopol", label: "Plat nomor", filterable: true, filterType: "text" as const },
      { key: "customer", label: "Customer", filterable: true, filterType: "text" as const },
      { key: "namaBerkas", label: "Nama berkas" },
      { key: "pengurusan", label: "Pengurusan" },
      { key: "uangMasuk", label: "Uang masuk" },
      { key: "biayaSamsat", label: "Biaya samsat" },
      { key: "profit", label: "Profit" },
      { key: "kekurangan", label: "Kekurangan" },
      { key: "status", label: "Status", filterable: true, filterType: "select" as const, filterOptions: ["Belum Bayar", "Kurang Bayar"] },
      { key: "invoice", label: "Invoice" },
    ];

    return (
      <div className="space-y-6">
        {renderSubTabHeader("Belum & kurang bayar", "Monitoring transaksi customer yang belum lunas")}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs">
          <EnhancedTableWithDialogs
            columns={belumBayarColumns}
            data={belumBayarData}
            subTabTitle="Belum & Kurang Bayar"
            onView={(item) => setViewingItem({ item, subTabTitle: "Belum & kurang bayar", columns: belumBayarColumns })}
            onEdit={(item, updated) => updateInvoice(item.id, updated)}
            onDelete={(item) => deleteInvoice(item.id)}
            searchPlaceholder="Cari customer, nopol..."
            hideAddButton={true}
          />
        </Card>
      </div>
    );
  }

  if (tab === "profit-pending") {
    const profitPendingColumns = [
      { key: "tanggal", label: "Tanggal", filterable: true, filterType: "text" as const },
      { key: "nopol", label: "Plat nomor", filterable: true, filterType: "text" as const },
      { key: "customer", label: "Customer", filterable: true, filterType: "text" as const },
      { key: "namaBerkas", label: "Nama berkas" },
      { key: "pengurusan", label: "Pengurusan" },
      { key: "uangMasuk", label: "Uang masuk" },
      { key: "biayaSamsat", label: "Biaya samsat" },
      { key: "profit", label: "Profit" },
      { key: "status", label: "Status" },
      { key: "invoice", label: "Invoice" },
      { key: "alasan", label: "Alasan pending" },
    ];

    return (
      <div className="space-y-6">
        {renderSubTabHeader("Profit terpending", "Transaksi yang margin keuntungannya belum dapat dicairkan")}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs">
          <EnhancedTableWithDialogs
            columns={profitPendingColumns}
            data={profitPendingData}
            subTabTitle="Profit Terpending"
            onView={(item) => setViewingItem({ item, subTabTitle: "Profit terpending", columns: profitPendingColumns })}
            onEdit={(item, updated) => updateInvoice(item.id, updated)}
            onDelete={(item) => deleteInvoice(item.id)}
            searchPlaceholder="Cari customer, nopol, alasan..."
            hideAddButton={true}
          />
        </Card>
      </div>
    );
  }

  if (tab === "cashback-pending") {
    const cashbackPendingColumns = [
      { key: "tanggal", label: "Tanggal", filterable: true, filterType: "text" as const },
      { key: "nopol", label: "Plat nomor", filterable: true, filterType: "text" as const },
      { key: "customer", label: "Customer", filterable: true, filterType: "text" as const },
      { key: "namaBerkas", label: "Nama berkas" },
      { key: "pengurusan", label: "Pengurusan" },
      { key: "uangMasuk", label: "Uang masuk" },
      { key: "profit", label: "Profit" },
      { key: "jumlahCashback", label: "Jumlah cashback" },
      { key: "cashbackPersen", label: "%" },
      { key: "status", label: "Status" },
      { key: "invoice", label: "Invoice" },
    ];

    return (
      <div className="space-y-6">
        {renderSubTabHeader("Cashback terpending", "Alokasi insentif dan komisi cashback rekanan yang pending")}
        <Card className="p-4 sm:p-5 border border-border bg-card shadow-xs">
          <EnhancedTableWithDialogs
            columns={cashbackPendingColumns}
            data={cashbackPendingData}
            subTabTitle="Cashback Terpending"
            onView={(item) => setViewingItem({ item, subTabTitle: "Cashback terpending", columns: cashbackPendingColumns })}
            onEdit={(item, updated) => updateInvoice(item.id, updated)}
            onDelete={(item) => deleteInvoice(item.id)}
            searchPlaceholder="Cari customer, nopol..."
            hideAddButton={true}
          />
        </Card>
      </div>
    );
  }

  return null;
}
