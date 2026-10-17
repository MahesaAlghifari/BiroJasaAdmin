import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination";
import { TablePagination } from "./ui/TablePagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Plus, Search, Eye, FileText, Car, Clock, CheckCircle, MapPin, Calendar, User, CreditCard, Package } from "lucide-react";

// Generate completed order data (history)
const generateOrderData = () => {
  const customers = ["PT. Maju Jaya", "John Doe", "Siti Rahayu", "Ahmad Yani", "Budi Santoso", "Dewi Lestari", "Eko Prasetyo", "Rina Susanti", "CV. Berkah", "PT. Sejahtera"];
  const layanan = ["Perpanjangan STNK 1 Tahun", "Perpanjangan STNK 5 Tahun", "Balik Nama", "Mutasi Antar Samsat", "Mutasi Luar Daerah", "Tarik Berkas", "Duplikat STNK"];
  const wilayah = ["Jakarta Timur", "Jakarta Barat", "Jakarta Selatan", "Jakarta Utara", "Depok", "Bekasi", "Tangerang"];
  const messenger = ["Andi", "Budi", "Citra", "Doni", "Eko"];
  
  const orders = [];
  for (let i = 1; i <= 50; i++) {
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomLayanan = layanan[Math.floor(Math.random() * layanan.length)];
    const randomWilayah = wilayah[Math.floor(Math.random() * wilayah.length)];
    const randomMessenger = messenger[Math.floor(Math.random() * messenger.length)];
    const biayaJasa = Math.floor(Math.random() * 500000) + 250000;
    const biayaSamsat = Math.floor(Math.random() * 1000000) + 500000;
    const totalBiaya = biayaJasa + biayaSamsat;
    
    const day = Math.floor(Math.random() * 30) + 1;
    const month = Math.floor(Math.random() * 3) + 9; // Sept, Oct, Nov
    
    const tanggalOrder = `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const tanggalVerifikasi = `2024-${String(month).padStart(2, '0')}-${String(Math.min(day + 1, 30)).padStart(2, '0')}`;
    const tanggalPenjadwalan = `2024-${String(month).padStart(2, '0')}-${String(Math.min(day + 2, 30)).padStart(2, '0')}`;
    const tanggalProsesSamsat = `2024-${String(month).padStart(2, '0')}-${String(Math.min(day + 3, 30)).padStart(2, '0')}`;
    const tanggalPengantaran = `2024-${String(month).padStart(2, '0')}-${String(Math.min(day + 4, 30)).padStart(2, '0')}`;
    const tanggalSelesai = `2024-${String(month).padStart(2, '0')}-${String(Math.min(day + 5, 30)).padStart(2, '0')}`;
    
    orders.push({
      id: i,
      noOrder: `ORD-${String(i).padStart(4, '0')}`,
      invoice: `INV-2024-${String(i).padStart(5, '0')}`,
      customer: randomCustomer,
      nopol: `B${Math.floor(Math.random() * 9999)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      layanan: randomLayanan,
      wilayah: randomWilayah,
      messenger: randomMessenger,
      tanggalOrder,
      tanggalSelesai,
      status: "Selesai",
      biayaJasa,
      biayaSamsat,
      totalBiaya,
      // Timeline history
      timeline: [
        { status: "Order Dibuat", tanggal: tanggalOrder, waktu: "09:30", keterangan: "Order diterima dan dicatat dalam sistem" },
        { status: "Verifikasi", tanggal: tanggalVerifikasi, waktu: "10:15", keterangan: "Dokumen diverifikasi oleh admin" },
        { status: "Penjadwalan", tanggal: tanggalPenjadwalan, waktu: "11:00", keterangan: `Dijadwalkan ke messenger ${randomMessenger}` },
        { status: "Proses Samsat", tanggal: tanggalProsesSamsat, waktu: "14:30", keterangan: "Dalam proses di Samsat " + randomWilayah },
        { status: "Pengantaran", tanggal: tanggalPengantaran, waktu: "16:45", keterangan: "Dokumen dalam perjalanan ke customer" },
        { status: "Selesai", tanggal: tanggalSelesai, waktu: "17:30", keterangan: "Dokumen telah diterima customer" },
      ],
      // Detail lengkap
      namaBerkas: randomCustomer,
      alamat: "Jl. Sudirman No. 123, " + randomWilayah,
      telepon: "08" + Math.floor(Math.random() * 900000000 + 100000000),
      email: randomCustomer.toLowerCase().replace(/[.\s]/g, '') + "@email.com",
      metodePembayaran: ["Transfer BCA", "Transfer Mandiri", "Cash"][Math.floor(Math.random() * 3)],
      catatan: "Pengantaran pada hari kerja jam 9-17",
    });
  }
  return orders;
};

const initialOrderData = generateOrderData();

export function Order() {
  const [orderData] = useState(initialOrderData);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLayanan, setFilterLayanan] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Filter data
  const getFilteredData = () => {
    return orderData.filter(item => {
      const matchSearch = searchTerm === "" || 
        item.noOrder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nopol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLayanan = filterLayanan === "all" || item.layanan === filterLayanan;
      
      return matchSearch && matchLayanan;
    });
  };

  // Pagination
  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Stats calculation
  const totalOrders = orderData.length;
  const totalRevenue = orderData.reduce((sum, order) => sum + order.totalBiaya, 0);

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6 w-full min-w-0 text-left">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-semibold text-foreground tracking-tight">History Order</h1>
        <p className="text-muted-foreground text-sm mt-1">Riwayat pesanan yang telah selesai</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-3.5 sm:p-5 border border-border/80 bg-card shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Order Selesai</p>
                <h3 className="text-xl font-bold font-mono tabular-nums text-foreground">{totalOrders}</h3>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-3.5 sm:p-5 border border-border/80 bg-card shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Pendapatan</p>
                <h3 className="text-xl font-bold font-mono tabular-nums text-foreground">Rp {(totalRevenue / 1000000).toFixed(1)}jt</h3>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-3.5 sm:p-5 border border-border/80 bg-card shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-500/10">
                <Car className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Rata-rata per Order</p>
                <h3 className="text-xl font-bold font-mono tabular-nums text-foreground">Rp {Math.round(totalRevenue / totalOrders / 1000)}rb</h3>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Cari no order, nama customer, atau nomor polisi..." 
                className="pl-10 bg-input-background border-border"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>
            <Select 
              value={filterLayanan} 
              onValueChange={(value) => {
                setFilterLayanan(value);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full lg:w-[250px] bg-input-background border-border">
                <SelectValue placeholder="Semua Jenis Pengurusan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Layanan</SelectItem>
                <SelectItem value="Perpanjangan STNK 1 Tahun">Perpanjangan 1 Tahun</SelectItem>
                <SelectItem value="Perpanjangan STNK 5 Tahun">Perpanjangan 5 Tahun</SelectItem>
                <SelectItem value="Balik Nama">Balik Nama</SelectItem>
                <SelectItem value="Mutasi Antar Samsat">Mutasi Antar Samsat</SelectItem>
                <SelectItem value="Mutasi Luar Daerah">Mutasi Luar Daerah</SelectItem>
                <SelectItem value="Tarik Berkas">Tarik Berkas</SelectItem>
                <SelectItem value="Duplikat STNK">Duplikat STNK</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Bar */}
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Menampilkan {filteredData.length} dari {orderData.length} order selesai
            </p>
          </div>
          
          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>No Order</TableHead>
                  <TableHead>Nama Customer</TableHead>
                  <TableHead>Nomor Polisi</TableHead>
                  <TableHead>Jenis Pengurusan</TableHead>
                  <TableHead>Tgl Order</TableHead>
                  <TableHead>Tgl Selesai</TableHead>
                  <TableHead>Total Biaya</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((order, index) => (
                    <TableRow key={order.id} className="hover:bg-secondary/20 transition-colors">
                      <TableCell className="w-16 font-mono tabular-nums text-muted-foreground">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-mono tabular-nums font-medium text-foreground">{order.noOrder}</TableCell>
                      <TableCell className="font-medium text-foreground">{order.customer}</TableCell>
                      <TableCell className="font-mono tabular-nums">{order.nopol}</TableCell>
                      <TableCell>{order.layanan}</TableCell>
                      <TableCell className="font-mono tabular-nums text-muted-foreground">{order.tanggalOrder}</TableCell>
                      <TableCell className="font-mono tabular-nums text-muted-foreground">{order.tanggalSelesai}</TableCell>
                      <TableCell className="font-mono tabular-nums font-semibold text-foreground">Rp {order.totalBiaya.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 hover:bg-secondary"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Tidak ada data ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Standardized Table Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </Card>
      </motion.div>

      {/* View Order Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-full sm:max-w-4xl max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Detail Order - {selectedOrder?.noOrder}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Rincian data pelanggan, status kendaraan, pembayaran, dan riwayat timeline proses order.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            {selectedOrder && (
              <div className="space-y-4">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Invoice</p>
                        <p className="text-lg font-mono tabular-nums font-medium text-foreground">{selectedOrder.invoice}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Badge status={selectedOrder.status}>
                          {selectedOrder.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Customer Info */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Informasi Customer
                  </h4>
                  <Card className="p-4 border border-border/80 bg-card shadow-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Nama Customer:</span>
                      <span className="font-medium text-foreground">{selectedOrder.customer}</span>
                      <span className="text-muted-foreground">Alamat:</span>
                      <span className="text-foreground">{selectedOrder.alamat}</span>
                      <span className="text-muted-foreground">Nomor Telepon:</span>
                      <span className="font-mono tabular-nums text-foreground">{selectedOrder.telepon}</span>
                      <span className="text-muted-foreground">Email:</span>
                      <span className="text-foreground">{selectedOrder.email}</span>
                    </div>
                  </Card>
                </div>

                {/* Order Details */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Detail Layanan
                  </h4>
                  <Card className="p-4 border border-border/80 bg-card shadow-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Nomor Polisi:</span>
                      <span className="font-mono tabular-nums font-medium text-foreground">{selectedOrder.nopol}</span>
                      <span className="text-muted-foreground">Jenis Pengurusan:</span>
                      <span className="text-foreground">{selectedOrder.layanan}</span>
                      <span className="text-muted-foreground">Wilayah Samsat:</span>
                      <span className="text-foreground">{selectedOrder.wilayah}</span>
                      <span className="text-muted-foreground">Messenger:</span>
                      <span className="text-foreground">{selectedOrder.messenger}</span>
                      <span className="text-muted-foreground">Nama Berkas:</span>
                      <span className="text-foreground">{selectedOrder.namaBerkas}</span>
                    </div>
                  </Card>
                </div>

                {/* Payment Info */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Informasi Pembayaran
                  </h4>
                  <Card className="p-4 border border-border/80 bg-card shadow-xs space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Biaya Jasa:</span>
                      <span className="font-mono tabular-nums font-medium text-foreground">Rp {selectedOrder.biayaJasa.toLocaleString('id-ID')}</span>
                      <span className="text-muted-foreground">Biaya Samsat:</span>
                      <span className="font-mono tabular-nums font-medium text-foreground">Rp {selectedOrder.biayaSamsat.toLocaleString('id-ID')}</span>
                      <span className="text-muted-foreground">Metode Pembayaran:</span>
                      <span className="text-foreground">{selectedOrder.metodePembayaran}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium">Total Biaya:</span>
                      <span className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        Rp {selectedOrder.totalBiaya.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Timeline Proses
                  </h4>
                  <Card className="p-4 border border-border/80 bg-card shadow-xs">
                    <div className="relative space-y-4">
                      {selectedOrder.timeline.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-4 relative">
                          {/* Timeline line */}
                          {idx < selectedOrder.timeline.length - 1 && (
                            <div className="absolute left-[15px] top-8 w-[2px] h-[calc(100%-8px)] bg-border" />
                          )}
                          
                          {/* Timeline dot */}
                          <div className="relative z-10">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-primary" />
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="text-sm font-medium text-foreground">{item.status}</h5>
                                <p className="text-xs text-muted-foreground">{item.keterangan}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-mono tabular-nums text-foreground">{item.tanggal}</p>
                                <p className="text-xs font-mono tabular-nums text-muted-foreground">{item.waktu}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Catatan */}
                {selectedOrder.catatan && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Catatan</h4>
                    <Card className="p-4 border border-border/80 bg-muted/40 shadow-2xs">
                      <p className="text-sm text-muted-foreground">{selectedOrder.catatan}</p>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
