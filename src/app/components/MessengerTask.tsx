import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge, getStatusBadgeClass } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination";
import { TablePagination } from "./ui/TablePagination";
import { Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, Truck, PackageOpen, Edit, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { useOrderStore, orderStore, OperationalOrder, StageName } from "../data/orderStore";
import { deriveMessengerTasksFromOrders, KNOWN_MESSENGERS, MessengerTaskItem } from "../data/messengerTaskAdapter";
import { useKaryawanPengguna } from "../data/karyawanPenggunaAdapter";
import { APP_CONFIG } from "../config/appConfig";

const getStatusColor = (status: string) => getStatusBadgeClass(status);

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Selesai":
      return <CheckCircle className="w-4 h-4" />;
    case "Dalam Proses":
      return <Clock className="w-4 h-4" />;
    case "Belum Diambil":
      return <AlertCircle className="w-4 h-4" />;
    case "Pending":
      return <AlertCircle className="w-4 h-4" />;
    case "Dibatalkan":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Truck className="w-4 h-4" />;
  }
};

export function MessengerTask() {
  // Authoritative Single Source of Truth: OrderStore
  const { activeOrders } = useOrderStore();
  const { karyawan } = useKaryawanPengguna();
  
  // Real derived operational tasks from active orders
  const taskData = useMemo(() => deriveMessengerTasksFromOrders(activeOrders), [activeOrders]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMessenger, setFilterMessenger] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MessengerTaskItem | null>(null);
  const [newTaskData, setNewTaskData] = useState({
    messenger: "",
    customer: "",
    jenisTugas: "",
    lokasi: "",
    keteranganTugas: "Jemput Dokumen",
    tanggalTerima: "",
  });
  const [editTaskData, setEditTaskData] = useState<MessengerTaskItem | null>(null);

  // Available messengers for filtering
  const filterMessengers = useMemo(() => {
    const set = new Set<string>();
    taskData.forEach(t => {
      if (t.messenger) set.add(t.messenger);
    });
    return Array.from(set);
  }, [taskData]);

  // Available messengers for assignment dropdown in dialogs
  const assignableMessengers = useMemo(() => {
    const isApi = APP_CONFIG.dataProvider === "api";
    const active = karyawan
      .filter((k) => k.jabatan === "MESSENGER" && k.status === "Aktif")
      .map((k) => k.nama);
    const baseMessengers = active.length > 0 ? active : (isApi ? [] : [...KNOWN_MESSENGERS]);
    const set = new Set<string>(["Belum Ditugaskan", ...baseMessengers]);
    taskData.forEach(t => {
      if (t.messenger && t.messenger !== "Belum Ditugaskan") {
        set.add(t.messenger);
      }
    });
    return Array.from(set);
  }, [taskData, karyawan]);

  // Filter data
  const getFilteredData = () => {
    return taskData.filter(item => {
      const matchSearch = searchTerm === "" || 
        item.noBerkas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.messenger.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nopol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenisTugas.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === "all" || item.status === filterStatus;
      const matchMessenger = filterMessenger === "all" || item.messenger === filterMessenger;
      
      return matchSearch && matchStatus && matchMessenger;
    });
  };

  // Pagination
  const filteredData = getFilteredData();
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Stats calculation directly derived from real active tasks
  const statusCounts = {
    belumDiambil: taskData.filter(t => t.status === "Belum Diambil").length,
    dalamProses: taskData.filter(t => t.status === "Dalam Proses").length,
    selesai: taskData.filter(t => t.status === "Selesai").length,
    pending: taskData.filter(t => t.status === "Pending").length,
  };

  const handleAddTask = () => {
    if (!newTaskData.customer.trim() || !newTaskData.jenisTugas.trim()) {
      toast.error("Mohon lengkapi nama customer dan jenis layanan!");
      return;
    }

    const assignedMessenger = (newTaskData.messenger && newTaskData.messenger !== "Belum Ditugaskan")
      ? newTaskData.messenger.trim()
      : undefined;
    const taskType = newTaskData.keteranganTugas || "Jemput Dokumen";
    const tanggalTugas = newTaskData.tanggalTerima || new Date().toISOString().split("T")[0];

    // Create real order in OrderStore (authoritative SSoT)
    const newOrder = orderStore.addOrder({
      customer: newTaskData.customer.trim(),
      namaPemilik: newTaskData.customer.trim(),
      nomorHP: "081234567890",
      layanan: newTaskData.jenisTugas.trim(),
      nopol: "B " + (1000 + (taskData.length + 1) * 37) + " SJ",
      wilayahSamsatAsal: newTaskData.lokasi || "Jakarta Timur",
      messenger: assignedMessenger,
      tanggalJemput: tanggalTugas,
      isScheduled: Boolean(assignedMessenger),
      catatanPenjadwalan: `Tugas: ${taskType}`,
      catatanOrder: `Tugas operasional dibuat dari menu Messenger Task untuk ${newTaskData.customer.trim()}`,
      orderSource: "Admin Loket / Messenger Task",
    });

    // Advance to matching operational stage
    if (taskType === "Proses Samsat") {
      orderStore.advanceOrder(newOrder.orderNo, "Proses Samsat", {
        messenger: assignedMessenger,
      });
    } else if (taskType === "Pengantaran Dokumen") {
      orderStore.advanceOrder(newOrder.orderNo, "Pengantaran", {
        messenger: assignedMessenger,
        messengerPengantar: assignedMessenger,
        tanggalPengantaran: tanggalTugas,
        isDeliveryScheduled: Boolean(assignedMessenger),
      });
    } else {
      // "Jemput Dokumen" -> advance to Penjadwalan
      orderStore.advanceOrder(newOrder.orderNo, "Penjadwalan", {
        messenger: assignedMessenger,
        tanggalJemput: tanggalTugas,
        isScheduled: Boolean(assignedMessenger),
      });
    }

    setNewTaskData({
      messenger: "",
      customer: "",
      jenisTugas: "",
      lokasi: "",
      keteranganTugas: "Jemput Dokumen",
      tanggalTerima: "",
    });
    setIsAddDialogOpen(false);
    toast.success(`Tugas operasional ${newOrder.orderNo} berhasil ditambahkan ke sistem!`);
  };

  const handleViewDetail = (task: MessengerTaskItem) => {
    setSelectedTask(task);
    setIsViewDialogOpen(true);
  };

  const handleEditTask = (task: MessengerTaskItem) => {
    setEditTaskData({ ...task });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = () => {
    if (!editTaskData) return;
    if (!editTaskData.customer.trim() || !editTaskData.jenisTugas.trim()) {
      toast.error("Mohon lengkapi nama customer dan jenis layanan!");
      return;
    }

    const orderNo = editTaskData.noBerkas;
    const currentOrder = orderStore.getOrderByNo(orderNo);

    if (currentOrder) {
      const assignedMessenger = (editTaskData.messenger && editTaskData.messenger !== "Belum Ditugaskan")
        ? editTaskData.messenger.trim()
        : undefined;

      const updates: Partial<OperationalOrder> = {
        customer: editTaskData.customer.trim(),
        namaPemilik: editTaskData.customer.trim(),
        layanan: editTaskData.jenisTugas.trim(),
        wilayahSamsatAsal: editTaskData.lokasi,
        messengerTaskStatus: editTaskData.status,
        messengerTaskNotes: editTaskData.keterangan,
      };

      if (editTaskData.keteranganTugas === "Pengantaran Dokumen") {
        updates.messengerPengantar = assignedMessenger;
        if (assignedMessenger) updates.isDeliveryScheduled = true;
        if (editTaskData.tanggalTerima) {
          updates.tanggalPengantaran = editTaskData.tanggalTerima;
        }
        if (editTaskData.keterangan) {
          updates.catatanPengantaran = editTaskData.keterangan;
        }
      } else {
        updates.messenger = assignedMessenger;
        if (assignedMessenger) updates.isScheduled = true;
        if (editTaskData.tanggalTerima) {
          updates.tanggalJemput = editTaskData.tanggalTerima;
        }
        if (editTaskData.keterangan) {
          updates.catatanPenjadwalan = editTaskData.keterangan;
        }
      }

      // Handle stage transitions if status is explicitly marked "Selesai"
      if (editTaskData.status === "Selesai") {
        if (currentOrder.currentStep === 7) {
          // Advance from Stage 7 (Pengantaran) to Stage 8 (Dokumen Telah Diterima)
          orderStore.advanceOrder(orderNo, "Dokumen Telah Diterima", {
            ...updates,
            tanggalDiterima: editTaskData.tanggalSelesai !== "-" ? editTaskData.tanggalSelesai : new Date().toISOString().split("T")[0],
            isReceived: true,
            receiverName: editTaskData.customer,
          });
          setIsEditDialogOpen(false);
          setEditTaskData(null);
          toast.success(`Pengantaran order ${orderNo} selesai & dokumen telah diterima klien!`);
          return;
        } else if (currentOrder.currentStep === 2 || currentOrder.currentStep === 3) {
          // Advance from Jemput Dokumen to Proses Samsat
          orderStore.advanceOrder(orderNo, "Proses Samsat", {
            ...updates,
            currentSamsatProcess: currentOrder.samsatProcesses?.[0]?.name || "Loket Pembukuan Samsat",
          });
          setIsEditDialogOpen(false);
          setEditTaskData(null);
          toast.success(`Penjemputan berkas ${orderNo} selesai, lanjut ke Proses Samsat!`);
          return;
        }
      }

      // Mutate order in OrderStore (authoritative SSoT)
      orderStore.updateOrder(orderNo, updates);
      setIsEditDialogOpen(false);
      setEditTaskData(null);
      toast.success(`Tugas messenger ${orderNo} berhasil diperbarui di sistem!`);
    } else {
      toast.error("Order tidak ditemukan di OrderStore!");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full space-y-4 p-3 sm:p-4 md:p-6 w-full min-w-0 text-left">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0"
      >
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Messenger Task</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Kelola tugas operasional messenger dari OrderStore</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-3.5 border border-border/80 bg-card shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Belum Diambil</p>
                <h3 className="text-2xl font-bold font-mono tabular-nums text-foreground mt-0.5">{statusCounts.belumDiambil}</h3>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-3.5 border border-border/80 bg-card shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Dalam Proses</p>
                <h3 className="text-2xl font-bold font-mono tabular-nums text-foreground mt-0.5">{statusCounts.dalamProses}</h3>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-3.5 border border-border/80 bg-card shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Selesai</p>
                <h3 className="text-2xl font-bold font-mono tabular-nums text-foreground mt-0.5">{statusCounts.selesai}</h3>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-3.5 border border-border/80 bg-card shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pending</p>
                <h3 className="text-2xl font-bold font-mono tabular-nums text-foreground mt-0.5">{statusCounts.pending}</h3>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex flex-col min-h-0"
      >
        <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs flex-1 flex flex-col min-h-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Cari no berkas, customer, messenger, atau nopol..." 
                className="pl-10 bg-input-background border-border"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>
            <Select 
              value={filterMessenger} 
              onValueChange={(value) => {
                setFilterMessenger(value);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full lg:w-[200px] bg-input-background border-border">
                <SelectValue placeholder="Semua Messenger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Messenger</SelectItem>
                {filterMessengers.map((messenger) => (
                  <SelectItem key={messenger} value={messenger}>
                    {messenger}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={filterStatus} 
              onValueChange={(value) => {
                setFilterStatus(value);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full lg:w-[200px] bg-input-background border-border">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Belum Diambil">Belum Diambil</SelectItem>
                <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
                <SelectItem value="Selesai">Selesai</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tugas Baru
            </Button>
          </div>

          {/* Table */}

          {/* Table */}
          <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-2xs flex-1 flex flex-col min-h-[220px]">
            <Table className={`w-full min-w-[750px] ${paginatedData.length === 0 ? "h-full" : ""}`}>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>No Berkas</TableHead>
                  <TableHead>Messenger</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Jenis Layanan</TableHead>
                  <TableHead>Keterangan Tugas</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Tgl Terima</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((task, index) => (
                    <TableRow key={task.id} className="hover:bg-secondary/20 transition-colors">
                      <TableCell className="w-12 text-muted-foreground">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-mono text-blue-500 dark:text-blue-400 font-medium">
                        {task.noBerkas}
                      </TableCell>
                      <TableCell>
                        <span className={task.messenger === "Belum Ditugaskan" ? "text-amber-500 font-medium" : "text-foreground"}>
                          {task.messenger}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{task.customer}</TableCell>
                      <TableCell>{task.jenisTugas}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 font-medium text-xs">
                          <PackageOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          {task.keteranganTugas}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate" title={task.lokasi}>
                        {task.lokasi}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{task.tanggalTerima}</TableCell>
                      <TableCell>
                        <Badge status={task.status}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(task.status)}
                            {task.status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-blue-500/20"
                            onClick={() => handleViewDetail(task)}
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-amber-500/20"
                            onClick={() => handleEditTask(task)}
                            title="Edit Tugas"
                          >
                            <Edit className="w-4 h-4 text-amber-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="h-full hover:bg-transparent">
                    <TableCell colSpan={10} className="text-center text-muted-foreground min-h-[200px] py-12 align-middle text-xs">
                      Tidak ada tugas messenger ditemukan
                    </TableCell>
                  </TableRow>
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
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        </Card>
      </motion.div>

      {/* View Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="shrink-0 pb-2 border-b border-border/80">
            <DialogTitle className="text-base font-semibold text-foreground">Detail Tugas Operasional</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Informasi lengkap tugas messenger terintegrasi OrderStore</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">No Berkas / Order</Label>
                  <p className="font-mono text-primary font-medium text-xs">{selectedTask.noBerkas}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge status={selectedTask.status}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedTask.status)}
                      {selectedTask.status}
                    </span>
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Messenger</Label>
                  <p className="font-medium text-foreground">{selectedTask.messenger}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Customer</Label>
                  <p className="font-medium text-foreground">{selectedTask.customer}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Jenis Layanan</Label>
                  <p className="text-foreground">{selectedTask.jenisTugas}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Keterangan Tugas</Label>
                  <p className="text-foreground font-medium">{selectedTask.keteranganTugas}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nomor Polisi</Label>
                  <p className="font-mono text-foreground">{selectedTask.nopol}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">No. Telepon / WA</Label>
                  <p className="font-mono text-foreground">{selectedTask.phone}</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Lokasi / Alamat</Label>
                <p className="text-foreground">{selectedTask.lokasi}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tanggal Terima</Label>
                  <p className="font-mono text-foreground">{selectedTask.tanggalTerima}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tanggal Selesai</Label>
                  <p className="font-mono text-foreground">{selectedTask.tanggalSelesai}</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Catatan Operasional</Label>
                <p className="text-foreground/90">{selectedTask.keterangan}</p>
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 pt-3 border-t border-border/80 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsViewDialogOpen(false)} className="w-full sm:w-auto h-8 text-xs">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="shrink-0 pb-2 border-b border-border/80">
            <DialogTitle className="text-base font-semibold text-foreground">Edit Tugas Messenger ({editTaskData?.noBerkas})</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Perbarui informasi tugas dan sinkronisasikan ke OrderStore</DialogDescription>
          </DialogHeader>
          {editTaskData && (
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Messenger</Label>
                  <Select 
                    value={editTaskData.messenger} 
                    onValueChange={(value) => setEditTaskData({...editTaskData, messenger: value})}
                  >
                    <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                      <SelectValue placeholder="Pilih messenger" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableMessengers.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer</Label>
                  <Input 
                    value={editTaskData.customer}
                    onChange={(e) => setEditTaskData({...editTaskData, customer: e.target.value})}
                    className="bg-input-background border-border h-9 text-xs"
                    placeholder="Nama customer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Jenis Layanan</Label>
                  <Select value={editTaskData.jenisTugas} onValueChange={(value) => setEditTaskData({...editTaskData, jenisTugas: value})}>
                    <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                      <SelectValue placeholder="Pilih jenis layanan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Perpanjangan 1 Tahun" className="text-xs">Perpanjangan 1 Tahun</SelectItem>
                      <SelectItem value="Perpanjangan 5 Tahun" className="text-xs">Perpanjangan 5 Tahun</SelectItem>
                      <SelectItem value="Balik Nama" className="text-xs">Balik Nama</SelectItem>
                      <SelectItem value="Mutasi Keluar" className="text-xs">Mutasi Keluar</SelectItem>
                      <SelectItem value="Mutasi Masuk" className="text-xs">Mutasi Masuk</SelectItem>
                      <SelectItem value="Mutasi Luar Daerah" className="text-xs">Mutasi Luar Daerah</SelectItem>
                      <SelectItem value="Mutasi Antar Samsat" className="text-xs">Mutasi Antar Samsat</SelectItem>
                      <SelectItem value="Tarik Berkas" className="text-xs">Tarik Berkas</SelectItem>
                      <SelectItem value="Duplikat STNK" className="text-xs">Duplikat STNK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Keterangan Tugas</Label>
                  <Select 
                    value={editTaskData.keteranganTugas} 
                    onValueChange={(value: any) => setEditTaskData({...editTaskData, keteranganTugas: value})}
                  >
                    <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                      <SelectValue placeholder="Pilih keterangan tugas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jemput Dokumen" className="text-xs">Jemput Dokumen</SelectItem>
                      <SelectItem value="Proses Samsat" className="text-xs">Proses Samsat</SelectItem>
                      <SelectItem value="Pengantaran Dokumen" className="text-xs">Pengantaran Dokumen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Lokasi / Samsat</Label>
                  <Select value={editTaskData.lokasi} onValueChange={(value) => setEditTaskData({...editTaskData, lokasi: value})}>
                    <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                      <SelectValue placeholder="Pilih lokasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Samsat Jakarta Timur" className="text-xs">Samsat Jakarta Timur</SelectItem>
                      <SelectItem value="Samsat Jakarta Barat" className="text-xs">Samsat Jakarta Barat</SelectItem>
                      <SelectItem value="Samsat Jakarta Selatan" className="text-xs">Samsat Jakarta Selatan</SelectItem>
                      <SelectItem value="Samsat Jakarta Utara" className="text-xs">Samsat Jakarta Utara</SelectItem>
                      <SelectItem value="Samsat Depok" className="text-xs">Samsat Depok</SelectItem>
                      <SelectItem value="Samsat Bekasi" className="text-xs">Samsat Bekasi</SelectItem>
                      <SelectItem value="Samsat Tangerang" className="text-xs">Samsat Tangerang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select 
                    value={editTaskData.status} 
                    onValueChange={(value: any) => setEditTaskData({...editTaskData, status: value})}
                  >
                    <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Belum Diambil" className="text-xs">Belum Diambil</SelectItem>
                      <SelectItem value="Dalam Proses" className="text-xs">Dalam Proses</SelectItem>
                      <SelectItem value="Selesai" className="text-xs">Selesai</SelectItem>
                      <SelectItem value="Pending" className="text-xs">Pending</SelectItem>
                      <SelectItem value="Dibatalkan" className="text-xs">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tanggal Terima</Label>
                  <Input 
                    type="date"
                    value={editTaskData.tanggalTerima}
                    onChange={(e) => setEditTaskData({...editTaskData, tanggalTerima: e.target.value})}
                    className="bg-input-background border-border h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tanggal Selesai</Label>
                  <Input 
                    type="date"
                    value={editTaskData.tanggalSelesai === "-" ? "" : editTaskData.tanggalSelesai}
                    onChange={(e) => setEditTaskData({...editTaskData, tanggalSelesai: e.target.value || "-"})}
                    className="bg-input-background border-border h-9 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Catatan / Keterangan</Label>
                <Input 
                  value={editTaskData.keterangan}
                  onChange={(e) => setEditTaskData({...editTaskData, keterangan: e.target.value})}
                  className="bg-input-background border-border h-9 text-xs"
                  placeholder="Keterangan tambahan"
                />
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 pt-3 border-t border-border/80 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto h-8 text-xs">
              Batal
            </Button>
            <Button onClick={handleUpdateTask} size="sm" className="w-full sm:w-auto h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="shrink-0 pb-2 border-b border-border/80">
            <DialogTitle className="text-base font-semibold text-foreground">Tambah Tugas Baru</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Buat tugas operasional baru yang terhubung langsung ke OrderStore</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Messenger</Label>
                <Select value={newTaskData.messenger} onValueChange={(value) => setNewTaskData({...newTaskData, messenger: value})}>
                  <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                    <SelectValue placeholder="Pilih messenger (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableMessengers.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Customer *</Label>
                <Input 
                  value={newTaskData.customer}
                  onChange={(e) => setNewTaskData({...newTaskData, customer: e.target.value})}
                  className="bg-input-background border-border h-9 text-xs"
                  placeholder="Nama customer"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Jenis Layanan *</Label>
                <Select value={newTaskData.jenisTugas} onValueChange={(value) => setNewTaskData({...newTaskData, jenisTugas: value})}>
                  <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                    <SelectValue placeholder="Pilih jenis layanan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Perpanjangan 1 Tahun" className="text-xs">Perpanjangan 1 Tahun</SelectItem>
                    <SelectItem value="Perpanjangan 5 Tahun" className="text-xs">Perpanjangan 5 Tahun</SelectItem>
                    <SelectItem value="Balik Nama" className="text-xs">Balik Nama</SelectItem>
                    <SelectItem value="Mutasi Keluar" className="text-xs">Mutasi Keluar</SelectItem>
                    <SelectItem value="Mutasi Masuk" className="text-xs">Mutasi Masuk</SelectItem>
                    <SelectItem value="Mutasi Luar Daerah" className="text-xs">Mutasi Luar Daerah</SelectItem>
                    <SelectItem value="Mutasi Antar Samsat" className="text-xs">Mutasi Antar Samsat</SelectItem>
                    <SelectItem value="Tarik Berkas" className="text-xs">Tarik Berkas</SelectItem>
                    <SelectItem value="Duplikat STNK" className="text-xs">Duplikat STNK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Keterangan Tugas</Label>
                <Select value={newTaskData.keteranganTugas} onValueChange={(value) => setNewTaskData({...newTaskData, keteranganTugas: value})}>
                  <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                    <SelectValue placeholder="Pilih keterangan tugas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jemput Dokumen" className="text-xs">Jemput Dokumen</SelectItem>
                    <SelectItem value="Proses Samsat" className="text-xs">Proses Samsat</SelectItem>
                    <SelectItem value="Pengantaran Dokumen" className="text-xs">Pengantaran Dokumen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Lokasi / Samsat</Label>
                <Select value={newTaskData.lokasi} onValueChange={(value) => setNewTaskData({...newTaskData, lokasi: value})}>
                  <SelectTrigger className="bg-input-background border-border h-9 text-xs">
                    <SelectValue placeholder="Pilih lokasi samsat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Samsat Jakarta Timur" className="text-xs">Samsat Jakarta Timur</SelectItem>
                    <SelectItem value="Samsat Jakarta Barat" className="text-xs">Samsat Jakarta Barat</SelectItem>
                    <SelectItem value="Samsat Jakarta Selatan" className="text-xs">Samsat Jakarta Selatan</SelectItem>
                    <SelectItem value="Samsat Jakarta Utara" className="text-xs">Samsat Jakarta Utara</SelectItem>
                    <SelectItem value="Samsat Depok" className="text-xs">Samsat Depok</SelectItem>
                    <SelectItem value="Samsat Bekasi" className="text-xs">Samsat Bekasi</SelectItem>
                    <SelectItem value="Samsat Tangerang" className="text-xs">Samsat Tangerang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal Terima</Label>
                <Input 
                  type="date"
                  value={newTaskData.tanggalTerima}
                  onChange={(e) => setNewTaskData({...newTaskData, tanggalTerima: e.target.value})}
                  className="bg-input-background border-border h-9 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 pt-3 border-t border-border/80 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto h-8 text-xs">
              Batal
            </Button>
            <Button onClick={handleAddTask} size="sm" className="w-full sm:w-auto h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
              Tambah Tugas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
