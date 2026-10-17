import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge, getStatusBadgeClass } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Search, Eye, FileDown, Calendar, DollarSign, FileText, Printer, CheckCircle2, ShieldCheck, User, Receipt, Info, CheckCircle, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { InvoiceDialog } from "./InvoiceDialog";
import { useOrderStore, OperationalOrder } from "../data/orderStore";
import { cn } from "./ui/utils";

export function OrderHistory() {
  const { archivedOrders } = useOrderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriode, setFilterPeriode] = useState("bulan");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPDFDialogOpen, setIsPDFDialogOpen] = useState(false);
  const [activeDocPreview, setActiveDocPreview] = useState<string>("STNK Asli");

  // Derived view for Rekap Order from single source of truth store
  // Enforces 3 strict Rekap criteria:
  // 1. Operational workflow complete (Stage 8 / Archived)
  // 2. Financial settlement complete (kurang === 0, status === "Lunas")
  // 3. No pending refund (refundStatus !== "PENDING")
  const mappedArchivedOrders = useMemo(() => {
    return archivedOrders
      .filter((op: OperationalOrder) => {
        const isOperationalDone = op.currentStageName === "Selesai (Arsip)" || op.currentStep >= 8;
        const kurang = op.payment?.kurang ?? 0;
        const isLunas = op.payment?.statusPembayaran === "Lunas" && kurang === 0;
        const noPendingRefund = op.payment?.refundStatus !== "PENDING" && op.refundStatus !== "PENDING";
        return isOperationalDone && isLunas && noPendingRefund;
      })
      .map((op: OperationalOrder) => {
        const orderDate = op.createdAt ? new Date(op.createdAt) : new Date();
        const totalEstimasiAwal = op.costSnapshot?.totalEstimasi || op.totalEstimasi || 0;
        const totalBiayaFinal = op.finalCost || op.payment?.totalBiaya || totalEstimasiAwal;
        const dibayar = op.payment?.dibayar ?? totalBiayaFinal;
        const kurang = op.payment?.kurang ?? 0;
        const statusPembayaran = op.payment?.statusPembayaran || "Lunas";

        return {
          orderNo: op.orderNo,
          customer: op.customer,
          nomorHP: op.nomorHP || "-",
          layanan: op.layanan,
          nopol: op.nopol,
          samsat: op.wilayahSamsatAsal || "Samsat",
          tanggal: orderDate,
          completedAt: op.completedAt ? new Date(op.completedAt) : orderDate,
          totalEstimasiAwal,
          totalBiayaFinal,
          totalBiaya: totalBiayaFinal,
          dibayar,
          kurang,
          statusPembayaran,
          metodePembayaran: op.payment?.metodePembayaran || "-",
          namaBank: op.payment?.namaBank || "-",
          noRekening: op.payment?.noRekening || "-",
          tanggalBayar: op.payment?.tanggalBayar
            ? new Date(op.payment.tanggalBayar)
            : orderDate,
          settlementCondition: op.settlementCondition || op.payment?.settlementCondition || "BALANCED",
          refundStatus: op.refundStatus || op.payment?.refundStatus || "NONE",
          refundAmount: op.payment?.refundAmount || op.payment?.overpayment || 0,
          jemputDokumen: {
            messenger: op.messenger || "Ahmad Rizki",
            tanggal: op.tanggalJemput ? new Date(op.tanggalJemput) : orderDate,
          },
          prosesSamsat: {
            messenger: op.messenger || "Ahmad Rizki",
            tanggal: orderDate,
          },
          pengantaranKembali: {
            messenger: op.messengerPengantar || op.messenger || "Dedi Cahyadi",
            tanggal: op.tanggalPengantaran ? new Date(op.tanggalPengantaran) : orderDate,
          },
          clientDocuments: op.clientDocuments,
          updatedDocuments: op.updatedDocuments || [],
          rekapDocuments: op.rekapDocuments || [],
          rawOrder: op,
        };
      });
  }, [archivedOrders]);

  // Derived directly from the single source of truth store
  const orders = useMemo(() => {
    return [...mappedArchivedOrders].sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
  }, [mappedArchivedOrders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNo.toLowerCase().includes(term) ||
        order.customer.toLowerCase().includes(term) ||
        order.nopol.toLowerCase().includes(term)
      );
    }

    // Filter by date
    if (filterTanggal) {
      const selectedDate = new Date(filterTanggal);
      filtered = filtered.filter(order => {
        const orderDate = order.tanggal;
        
        if (filterPeriode === "hari") {
          return orderDate.toDateString() === selectedDate.toDateString();
        } else if (filterPeriode === "minggu") {
          const weekStart = new Date(selectedDate);
          weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return orderDate >= weekStart && orderDate <= weekEnd;
        } else if (filterPeriode === "bulan") {
          return orderDate.getMonth() === selectedDate.getMonth() && 
                 orderDate.getFullYear() === selectedDate.getFullYear();
        } else if (filterPeriode === "tahun") {
          return orderDate.getFullYear() === selectedDate.getFullYear();
        }
        return true;
      });
    }

    return filtered;
  }, [orders, searchTerm, filterTanggal, filterPeriode]);

  const getStatusColor = (status: string) => getStatusBadgeClass(status);

  const handleExportCSV = () => {
    toast.success("Data berhasil diekspor ke CSV!");
  };

  const handleExportPDF = () => {
    toast.success("Data berhasil diekspor ke PDF!");
  };

  return (
    <div className="flex-1 flex flex-col min-h-full space-y-4 md:space-y-6 p-4 md:p-6 w-full min-w-0 text-left">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0"
      >
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Rekap Order
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Order yang telah selesai secara operasional dan finansial.</p>
      </motion.div>

      <Card className="p-4 md:p-5 border border-border/80 bg-card shadow-xs flex-1 flex flex-col min-h-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari order, nama customer, atau nomor polisi..."
              className="pl-9 bg-input-background border-border h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={filterPeriode} onValueChange={setFilterPeriode}>
            <SelectTrigger className="w-[140px] bg-input-background border-border h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hari" className="text-xs">Per Hari</SelectItem>
              <SelectItem value="minggu" className="text-xs">Per Minggu</SelectItem>
              <SelectItem value="bulan" className="text-xs">Per Bulan</SelectItem>
              <SelectItem value="tahun" className="text-xs">Per Tahun</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              className="w-[160px] bg-input-background border-border h-9 text-xs"
              value={filterTanggal}
              onChange={(e) => setFilterTanggal(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="border-border text-xs h-9">
              <FileDown className="w-3.5 h-3.5 mr-1.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="border-border text-xs h-9">
              <FileDown className="w-3.5 h-3.5 mr-1.5" />
              PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 shrink-0">
          <Card className="p-3.5 border border-border/80 bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Order Selesai</p>
                <p className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">{filteredOrders.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Operasional & Finansial</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
          </Card>

          <Card className="p-3.5 border border-border/80 bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Biaya Final</p>
                <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
                  Rp {filteredOrders.reduce((sum, o) => sum + o.totalBiayaFinal, 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Akumulasi biaya selesai</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
          </Card>

          <Card className="p-3.5 border border-border/80 bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Estimasi Awal</p>
                <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
                  Rp {filteredOrders.reduce((sum, o) => sum + o.totalEstimasiAwal, 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Basis estimasi awal</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </Card>

          <Card className="p-3.5 border border-border/80 bg-card shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Status Penyelesaian</p>
                <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">
                  100% Lunas
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Bebas piutang / kewajiban</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs bg-card flex-1 flex flex-col min-h-[220px]">
          <Table className={`w-full min-w-[850px] ${filteredOrders.length === 0 ? "h-full" : ""}`}>
            <TableHeader className="bg-muted/40 border-b border-border/80">
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order</TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Customer</TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nomor Polisi</TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jenis Pengurusan</TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Samsat</TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tanggal Selesai</TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Total Final</TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right w-[95px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <TableRow key={order.orderNo} className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10">
                    <TableCell className="px-3 py-2 text-xs font-mono font-semibold text-primary">{order.orderNo}</TableCell>
                    <TableCell className="px-3 py-2 text-xs font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{order.customer}</span>
                        {order.nomorHP && order.nomorHP !== "-" && (
                          <span className="text-[10px] text-muted-foreground font-mono">{order.nomorHP}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-xs font-mono">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-muted/60 border border-border text-[11px] font-mono text-foreground font-medium">
                        {order.nopol}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-xs text-foreground/80">{order.layanan}</TableCell>
                    <TableCell className="px-3 py-2 text-xs text-foreground/80">{order.samsat}</TableCell>
                    <TableCell className="px-3 py-2 text-xs font-mono text-foreground/80">
                      {order.completedAt?.toLocaleDateString('id-ID') || order.tanggal.toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-xs font-mono tabular-nums text-right font-medium text-emerald-600 dark:text-emerald-400">
                      Rp {order.totalBiayaFinal.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-xs text-center">
                      <Badge status="success" className="text-[10px] font-medium">
                        Selesai & Lunas
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-2 py-1.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsViewDialogOpen(true);
                          }}
                          title="Lihat Rekap Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsPDFDialogOpen(true);
                          }}
                          title="Lihat Dokumen PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsInvoiceDialogOpen(true);
                          }}
                          title="Cetak Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="h-full hover:bg-transparent">
                  <TableCell colSpan={9} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-sm">
                    Tidak ada data order
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-auto pt-3 text-sm text-muted-foreground shrink-0">
          Menampilkan {filteredOrders.length} dari {orders.length} order
        </div>
      </Card>

      {/* View Dialog - Rekap Order Detail */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="border-border max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 border-b border-border shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Rekap Detail Order — {selectedOrder?.orderNo}
              </DialogTitle>
              <Badge status="success" className="text-xs">
                Selesai & Lunas
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Rekapitulasi lengkap data operasional, rekonsiliasi finansial, alur timeline, dan arsip dokumen
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* SECTION 1: Ringkasan Order */}
              <Card className="p-4 bg-muted/20 border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  1. Ringkasan Order
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">Nama Customer</span>
                    <span className="font-semibold text-foreground">{selectedOrder.customer}</span>
                    <span className="text-[10px] text-muted-foreground block">{selectedOrder.nomorHP}</span>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">Kendaraan & Nomor Polisi</span>
                    <span className="font-mono font-bold text-primary">{selectedOrder.nopol}</span>
                    <span className="text-[10px] text-muted-foreground block">{selectedOrder.rawOrder?.jenisKendaraan || "Kendaraan"}</span>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">Jenis Pengurusan & Samsat</span>
                    <span className="font-medium text-foreground">{selectedOrder.layanan}</span>
                    <span className="text-[10px] text-muted-foreground block">{selectedOrder.samsat}</span>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">Tanggal Selesai</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {selectedOrder.completedAt?.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">Masuk: {selectedOrder.tanggal?.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </Card>

              {/* SECTION 2: Rekonsiliasi Finansial */}
              <Card className="p-4 bg-muted/20 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    2. Rekonsiliasi Finansial
                  </h4>
                  <Badge status="success" className="text-[10px]">
                    Status: Lunas (Settled)
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">Estimasi Awal</span>
                    <span className="font-mono font-semibold text-foreground">
                      Rp {selectedOrder.totalEstimasiAwal.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">Total Biaya Final</span>
                    <span className="font-mono font-bold text-primary">
                      Rp {selectedOrder.totalBiayaFinal.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">Total Terbayar</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Rp {selectedOrder.dibayar.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">Sisa Kewajiban</span>
                    <span className="font-mono font-bold text-muted-foreground">
                      Rp 0 (Lunas)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-card border border-border flex flex-wrap justify-between items-center gap-2">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground">Metode Pembayaran: </span>
                    <span className="font-medium text-foreground">{selectedOrder.metodePembayaran}</span>
                    {selectedOrder.namaBank && selectedOrder.namaBank !== "-" && (
                      <span className="text-muted-foreground"> ({selectedOrder.namaBank})</span>
                    )}
                  </div>
                  {selectedOrder.tanggalBayar && (
                    <div className="text-muted-foreground">
                      Lunas pada: <span className="text-foreground font-mono">{selectedOrder.tanggalBayar.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>

                {selectedOrder.refundStatus === "PROCESSED" && selectedOrder.refundAmount > 0 && (
                  <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Kelebihan dana sebesar <strong>Rp {selectedOrder.refundAmount.toLocaleString('id-ID')}</strong> telah di-refund ke customer melalui Kas Kantor.</span>
                    </div>
                    <Badge status="neutral" className="text-[10px]">Refund Selesai</Badge>
                  </div>
                )}
              </Card>

              {/* SECTION 3: Timeline Alur Operasional (Stage 1 - Stage 8) */}
              <Card className="p-4 bg-muted/20 border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-primary" />
                  3. Timeline Alur Operasional (Stage 1 — 8)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { step: 1, title: "Verifikasi Order", desc: "Order dibuat & divalidasi", status: "Selesai" },
                    { step: 2, title: "Penjadwalan", desc: `Messenger: ${selectedOrder.jemputDokumen.messenger}`, status: "Selesai" },
                    { step: 3, title: "Cek Dokumen", desc: "Fisik dokumen diverifikasi", status: "Selesai" },
                    { step: 4, title: "Proses Samsat", desc: `${selectedOrder.samsat}`, status: "Selesai" },
                    { step: 5, title: "Biaya Final", desc: "Rekonsiliasi biaya aktual", status: "Selesai" },
                    { step: 6, title: "Supervisi SPV", desc: "Disetujui SPV Operasional", status: "Selesai" },
                    { step: 7, title: "Pengantaran", desc: `Messenger: ${selectedOrder.pengantaranKembali.messenger}`, status: "Selesai" },
                    { step: 8, title: "Serah Terima", desc: "Dokumen diterima customer", status: "Selesai" },
                  ].map((s) => (
                    <div key={s.step} className="p-2 rounded bg-card border border-border flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {s.step}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* SECTION 4: Dokumen Pengurusan (BEFORE vs AFTER) */}
              <Card className="p-4 bg-muted/20 border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  4. Dokumen Pengurusan (BEFORE vs AFTER)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* BEFORE: Dokumen Klien */}
                  <div className="p-3 rounded-lg border border-border bg-card space-y-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                        <User className="w-3.5 h-3.5 text-primary" />
                        Dokumen Masuk (BEFORE)
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                        Asli Klien
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "STNK Asli", fileType: "PDF", fileName: selectedOrder.clientDocuments?.stnk?.name || "STNK_Asli.pdf", state: "Terverifikasi" },
                        { label: "BPKB Asli", fileType: "PDF", fileName: selectedOrder.clientDocuments?.bpkb?.name || "BPKB_Kendaraan.pdf", state: "Terverifikasi" },
                        { label: "KTP Pemilik", fileType: "JPG", fileName: selectedOrder.clientDocuments?.ktp?.name || "KTP_Pemilik.jpg", state: "Terverifikasi" },
                      ].map((doc, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground text-xs truncate">{doc.label}</span>
                                <span className="px-1 py-0.2 rounded bg-muted text-[9px] font-mono text-muted-foreground uppercase">{doc.fileType}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate font-mono block max-w-[130px]">{doc.fileName}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {doc.state}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] gap-1"
                              onClick={() => {
                                setActiveDocPreview(doc.label);
                                setIsPDFDialogOpen(true);
                              }}
                              title={`Preview ${doc.label}`}
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AFTER: Dokumen Hasil Samsat */}
                  <div className="p-3 rounded-lg border border-border bg-card space-y-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Dokumen Hasil (AFTER)
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Hasil Samsat
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "Notice Pajak Baru", fileType: "PDF", fileName: `Notice_Pajak_${selectedOrder.nopol?.replace(/\s+/g, '_') || 'Baru'}.pdf`, state: "Tercetak Resmi" },
                        { label: "STNK Pengesahan Baru", fileType: "PDF", fileName: `STNK_Baru_${selectedOrder.nopol?.replace(/\s+/g, '_') || 'Baru'}.pdf`, state: "Tercetak Resmi" },
                        { label: "Tanda Terima Dokumen", fileType: "PDF", fileName: `TT_${selectedOrder.orderNo}.pdf`, state: "Ditandatangani" },
                      ].map((doc, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground text-xs truncate">{doc.label}</span>
                                <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-[9px] font-mono text-emerald-700 dark:text-emerald-300 uppercase">{doc.fileType}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate font-mono block max-w-[130px]">{doc.fileName}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {doc.state}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                              onClick={() => {
                                setActiveDocPreview(doc.label);
                                setIsPDFDialogOpen(true);
                              }}
                              title={`Preview ${doc.label}`}
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <DialogFooter className="p-3 sm:p-4 border-t border-border shrink-0 bg-muted/20 flex items-center justify-between sm:justify-between">
            <div className="text-[11px] text-muted-foreground">
              Dokumen pengurusan telah lengkap diarsipkan secara digital
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={isPDFDialogOpen} onOpenChange={setIsPDFDialogOpen}>
        <DialogContent className="w-full sm:max-w-4xl max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Arsip Dokumen — {selectedOrder?.orderNo}</DialogTitle>
            <DialogDescription>
              Status dokumen berkas resmi yang telah diverifikasi dalam alur operasional order
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Document List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { name: "STNK Asli", desc: "Surat Tanda Nomor Kendaraan" },
                  { name: "BPKB Asli", desc: "Buku Pemilik Kendaraan Bermotor" },
                  { name: "KTP Pemilik", desc: "Kartu Tanda Penduduk" },
                  { name: "Notice Pajak Baru", desc: "Surat Ketetapan Pajak Daerah" },
                ].map((doc) => {
                  const isSelected = activeDocPreview === doc.name;
                  return (
                    <Card
                      key={doc.name}
                      onClick={() => setActiveDocPreview(doc.name)}
                      className={cn(
                        "p-3.5 border bg-card shadow-2xs cursor-pointer transition-all",
                        isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:border-border/80"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-xs truncate">{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{doc.desc}</p>
                          <span className={cn(
                            "inline-block mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {isSelected ? "Aktif" : "Pilih"}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Active Document Status Panel */}
              <Card className="p-5 border border-border bg-card shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground text-xs">{activeDocPreview} — {selectedOrder.nopol}</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Arsip Terverifikasi
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border border-border text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="font-medium text-foreground text-xs">Arsip Berkas Resmi Terverifikasi</p>
                  <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                    Dokumen fisik asli telah melalui seluruh alur verifikasi Samsat dan diserahterimakan kepada customer secara sah pada Stage 8 ({selectedOrder.completedAt?.toLocaleDateString('id-ID')}).
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Kode Registrasi: ARC-{selectedOrder.orderNo}-{activeDocPreview.replace(/\s+/g, '')}
                  </p>
                </div>
              </Card>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-border shrink-0 flex items-center justify-between sm:justify-between">
            <span className="text-[11px] text-muted-foreground">
              Semua berkas operasional telah tersimpan dalam rekapitulasi permanen
            </span>
            <Button variant="outline" size="sm" onClick={() => setIsPDFDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <InvoiceDialog 
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        order={selectedOrder}
      />
    </div>
  );
}
