import { useState } from "react";
import { motion } from "motion/react";
import {
  FileText,
  CheckCircle2,
  Circle,
  Car,
  User,
  MapPin,
  Phone,
  Clock,
  AlertTriangle,
  Save,
  Eye,
  PackageCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge, getStatusBadgeClass } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import { cn } from "./ui/utils";
import { MutasiCostField } from "./MutasiCostFields";
import {
  hargaDasarMutasiKeluar,
  hargaDasarMutasiMasuk,
} from "../data/pricingReference";

interface Document {
  id: string;
  name: string;
  checked: boolean;
}

interface MessengerTask {
  id: string;
  orderNo: string;
  nopol: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  layanan: string;
  status: "jemput-dokumen" | "proses-samsat" | "ambil-dokumen" | "antar-dokumen";
  tanggalTugas: string;
  documents: Document[];
  mutasiKeluar?: any;
  mutasiMasuk?: any;
}

// Mock data - minimal 2 per tab
const mockTasks: MessengerTask[] = [
  // Jemput Dokumen - 2 tasks
  {
    id: "1",
    orderNo: "ORD-2024-001",
    nopol: "B 1234 ABC",
    customerName: "John Doe",
    customerPhone: "08123456789",
    customerAddress: "Jl. Sudirman No. 123, Jakarta Selatan",
    layanan: "Mutasi Luar Daerah",
    status: "jemput-dokumen",
    tanggalTugas: "2024-11-03",
    documents: [
      { id: "1", name: "KTP Asli + Fotokopi 2 Rangkap", checked: false },
      { id: "2", name: "STNK Asli + Fotokopi 2 Rangkap", checked: false },
      { id: "3", name: "BPKB Asli / Surat Ket. Leasing + Fotokopi 2 Rangkap", checked: false },
      { id: "4", name: "Cek Fisik Kendaraan", checked: false },
    ],
  },
  {
    id: "2",
    orderNo: "ORD-2024-005",
    nopol: "B 5678 XYZ",
    customerName: "Sarah Johnson",
    customerPhone: "08198765432",
    customerAddress: "Jl. MH Thamrin No. 88, Jakarta Pusat",
    layanan: "Balik Nama",
    status: "jemput-dokumen",
    tanggalTugas: "2024-11-03",
    documents: [
      { id: "1", name: "KTP Asli + Fotokopi 2 Rangkap", checked: false },
      { id: "2", name: "STNK Asli + Fotokopi 2 Rangkap", checked: false },
      { id: "3", name: "BPKB Asli / Surat Ket. Leasing + Fotokopi 2 Rangkap", checked: false },
      { id: "4", name: "Cek Fisik Kendaraan", checked: false },
    ],
  },
  // Proses Samsat - 2 tasks
  {
    id: "3",
    orderNo: "ORD-2024-002",
    nopol: "D 5678 DEF",
    customerName: "Jane Smith",
    customerPhone: "08234567890",
    customerAddress: "Jl. Thamrin No. 456, Jakarta Pusat",
    layanan: "Mutasi Masuk",
    status: "proses-samsat",
    tanggalTugas: "2024-11-03",
    documents: [
      { id: "1", name: "KTP Asli + Fotokopi 2 Rangkap", checked: true },
      { id: "2", name: "STNK Asli + Fotokopi 2 Rangkap", checked: true },
      { id: "3", name: "BPKB Asli / Surat Ket. Leasing + Fotokopi 2 Rangkap", checked: true },
      { id: "4", name: "Cek Fisik Kendaraan", checked: true },
    ],
    mutasiKeluar: {},
    mutasiMasuk: {},
  },
  {
    id: "4",
    orderNo: "ORD-2024-006",
    nopol: "D 9876 QWE",
    customerName: "Michael Chen",
    customerPhone: "08567891234",
    customerAddress: "Jl. Rasuna Said No. 99, Jakarta Selatan",
    layanan: "Mutasi Keluar",
    status: "proses-samsat",
    tanggalTugas: "2024-11-03",
    documents: [
      { id: "1", name: "KTP Asli + Fotokopi 2 Rangkap", checked: true },
      { id: "2", name: "STNK Asli + Fotokopi 2 Rangkap", checked: true },
      { id: "3", name: "BPKB Asli / Surat Ket. Leasing + Fotokopi 2 Rangkap", checked: true },
      { id: "4", name: "Cek Fisik Kendaraan", checked: true },
    ],
    mutasiKeluar: {},
    mutasiMasuk: {},
  },
  // Ambil Dokumen - 2 tasks
  {
    id: "5",
    orderNo: "ORD-2024-003",
    nopol: "F 9012 GHI",
    customerName: "Bob Wilson",
    customerPhone: "08345678901",
    customerAddress: "Jl. Gatot Subroto No. 789, Bekasi",
    layanan: "Perpanjangan 5 Tahun",
    status: "ambil-dokumen",
    tanggalTugas: "2024-11-03",
    documents: [
      { id: "1", name: "STNK Baru", checked: false },
      { id: "2", name: "BPKB (jika ada perubahan)", checked: false },
      { id: "3", name: "Plat Nomor Baru", checked: false },
      { id: "4", name: "Stiker Pajak", checked: false },
    ],
  },
  {
    id: "6",
    orderNo: "ORD-2024-007",
    nopol: "F 4321 RTY",
    customerName: "Linda Wong",
    customerPhone: "08456123789",
    customerAddress: "Jl. Ahmad Yani No. 555, Bekasi",
    layanan: "Perpanjangan 1 Tahun",
    status: "ambil-dokumen",
    tanggalTugas: "2024-11-03",
    documents: [
      { id: "1", name: "STNK Baru", checked: false },
      { id: "2", name: "BPKB (jika ada perubahan)", checked: false },
      { id: "3", name: "Plat Nomor Baru", checked: false },
      { id: "4", name: "Stiker Pajak", checked: false },
    ],
  },
  // Antar Dokumen - 2 tasks
  {
    id: "7",
    orderNo: "ORD-2024-004",
    nopol: "A 3456 JKL",
    customerName: "Alice Brown",
    customerPhone: "08456789012",
    customerAddress: "Jl. Asia Afrika No. 321, Bandung",
    layanan: "Perpanjangan 1 Tahun",
    status: "antar-dokumen",
    tanggalTugas: "2024-11-03",
    documents: [
      { id: "1", name: "STNK Baru", checked: false },
      { id: "2", name: "BPKB (jika ada perubahan)", checked: false },
      { id: "3", name: "Plat Nomor Baru", checked: false },
      { id: "4", name: "Bukti Pembayaran", checked: false },
    ],
  },
  {
    id: "8",
    orderNo: "ORD-2024-008",
    nopol: "A 7890 POI",
    customerName: "David Martinez",
    customerPhone: "08567234890",
    customerAddress: "Jl. Braga No. 777, Bandung",
    layanan: "Balik Nama",
    status: "antar-dokumen",
    tanggalTugas: "2024-11-03",
    documents: [
      { id: "1", name: "STNK Baru", checked: false },
      { id: "2", name: "BPKB (jika ada perubahan)", checked: false },
      { id: "3", name: "Plat Nomor Baru", checked: false },
      { id: "4", name: "Bukti Pembayaran", checked: false },
    ],
  },
];

export function MessengerDocuments() {
  const [tasks, setTasks] = useState<MessengerTask[]>(mockTasks);
  const [selectedTask, setSelectedTask] = useState<MessengerTask | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("jemput-dokumen");

  // Mutasi states
  const [mutasiKeluarData, setMutasiKeluarData] = useState<any>({
    mutasiKeluarLegalisir: "",
    mutasiKeluarHadir: "",
    mutasiKeluarLegalisirCf: "",
    mutasiKeluarCf: "",
    mutasiKeluarBantuanHadir: "",
    mutasiKeluarCekBlokir: "",
    mutasiKeluarLokPembukuan: "",
    mutasiKeluarLokTu: "",
    mutasiKeluarLokTuNopil: "",
    mutasiKeluarLoksus: "",
    mutasiKeluarCetakSkp: "",
    mutasiKeluarCetakFiskal: "",
    mutasiKeluarLokArsip: "",
    mutasiKeluarCekProgresif: "",
    mutasiKeluarMatiinNopil: "",
    mutasiKeluarDaftarMutmasNormal: "",
    mutasiKeluarDaftarMutmasKilat: "",
  });

  const [mutasiMasukData, setMutasiMasukData] = useState<any>({
    mutasiMasukLegalisir: "",
    mutasiMasukMutmas: "",
    mutasiMasukBy: "",
    mutasiMasukPendaftaran: "",
    mutasiMasukReqGanjilGenap: "",
    mutasiMasukAcak: "",
    mutasiMasukLokTu: "",
    mutasiMasukLokPembukuan: "",
    mutasiMasukDaftarBpkb: "",
    mutasiMasukPenulisanBpkb: "",
    mutasiMasukCetakNotice: "",
    mutasiMasukCetakStnk: "",
    mutasiMasukCetakPlat: "",
  });

  const handleViewDetail = (task: MessengerTask) => {
    setSelectedTask(task);
    setIsDetailOpen(true);

    // Load mutasi data if exists
    if (task.mutasiKeluar) {
      setMutasiKeluarData(task.mutasiKeluar);
    }
    if (task.mutasiMasuk) {
      setMutasiMasukData(task.mutasiMasuk);
    }
  };

  const handleCheckDocument = (docId: string) => {
    if (!selectedTask) return;

    const updatedDocuments = selectedTask.documents.map((doc) =>
      doc.id === docId ? { ...doc, checked: !doc.checked } : doc
    );

    const updatedTask = { ...selectedTask, documents: updatedDocuments };
    setSelectedTask(updatedTask);

    // Update tasks state
    setTasks(tasks.map((t) => (t.id === selectedTask.id ? updatedTask : t)));
  };

  const handleSaveTask = () => {
    if (!selectedTask) return;

    // Save mutasi data to task
    const updatedTask = {
      ...selectedTask,
      mutasiKeluar: mutasiKeluarData,
      mutasiMasuk: mutasiMasukData,
    };

    setTasks(tasks.map((t) => (t.id === selectedTask.id ? updatedTask : t)));
    setSelectedTask(updatedTask);

    toast.success("Data berhasil disimpan!");
  };

  const handleCompleteTask = () => {
    if (!selectedTask) return;

    // Check if all documents are checked
    const allChecked = selectedTask.documents.every((doc) => doc.checked);
    
    if (!allChecked) {
      toast.error("Harap checklist semua dokumen terlebih dahulu!");
      return;
    }

    // Move task to next status
    const statusFlow: Record<string, string> = {
      "jemput-dokumen": "proses-samsat",
      "proses-samsat": "ambil-dokumen",
      "ambil-dokumen": "antar-dokumen",
      "antar-dokumen": "selesai",
    };

    const nextStatus = statusFlow[selectedTask.status];

    if (nextStatus === "selesai") {
      // Remove task from list
      setTasks(tasks.filter((t) => t.id !== selectedTask.id));
      setIsDetailOpen(false);
      toast.success("Task berhasil diselesaikan!");
    } else {
      // Update task status
      const updatedTask = {
        ...selectedTask,
        status: nextStatus as any,
        mutasiKeluar: mutasiKeluarData,
        mutasiMasuk: mutasiMasukData,
      };

      setTasks(tasks.map((t) => (t.id === selectedTask.id ? updatedTask : t)));
      setIsDetailOpen(false);
      toast.success(`Task dipindahkan ke ${getStatusLabel(nextStatus)}`);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      "jemput-dokumen": "Jemput Dokumen",
      "proses-samsat": "Proses Samsat",
      "ambil-dokumen": "Ambil Dokumen",
      "antar-dokumen": "Antar Dokumen",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => getStatusBadgeClass(status);

  const filterTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const getTaskStats = () => {
    return {
      "jemput-dokumen": filterTasksByStatus("jemput-dokumen").length,
      "proses-samsat": filterTasksByStatus("proses-samsat").length,
      "ambil-dokumen": filterTasksByStatus("ambil-dokumen").length,
      "antar-dokumen": filterTasksByStatus("antar-dokumen").length,
    };
  };

  const stats = getTaskStats();

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-3.5 sm:p-5 border border-border/80 bg-card shadow-xs hover:border-border transition-all">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Jemput Dokumen</p>
                <p className="text-xl md:text-2xl font-bold font-mono tabular-nums">{stats["jemput-dokumen"]}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-3.5 sm:p-5 border border-border/80 bg-card shadow-xs hover:border-border transition-all">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Proses Samsat</p>
                <p className="text-xl md:text-2xl font-bold font-mono tabular-nums">{stats["proses-samsat"]}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-3.5 sm:p-5 border border-border/80 bg-card shadow-xs hover:border-border transition-all">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <PackageCheck className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Ambil Dokumen</p>
                <p className="text-xl md:text-2xl font-bold font-mono tabular-nums">{stats["ambil-dokumen"]}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-3.5 sm:p-5 border border-border/80 bg-card shadow-xs hover:border-border transition-all">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Antar Dokumen</p>
                <p className="text-xl md:text-2xl font-bold font-mono tabular-nums">{stats["antar-dokumen"]}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Tasks Tabs */}
      <Card className="border border-border/80 bg-card shadow-xs overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border bg-muted/30 px-2 md:px-6">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="jemput-dokumen"
                className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 dark:data-[state=active]:bg-blue-500/10 dark:data-[state=active]:border-blue-600 data-[state=active]:shadow-none after:hidden text-xs md:text-sm whitespace-nowrap"
              >
                <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Jemput Dokumen</span>
                <span className="sm:hidden">Jemput</span>
                <Badge status="jemput-dokumen" className="ml-1 md:ml-2">
                  {stats["jemput-dokumen"]}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="proses-samsat"
                className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-600 dark:data-[state=active]:bg-amber-500/10 dark:data-[state=active]:border-amber-600 data-[state=active]:shadow-none after:hidden text-xs md:text-sm whitespace-nowrap"
              >
                <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Proses Samsat</span>
                <span className="sm:hidden">Proses</span>
                <Badge status="proses-samsat" className="ml-1 md:ml-2">
                  {stats["proses-samsat"]}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="ambil-dokumen"
                className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 dark:data-[state=active]:bg-purple-500/10 dark:data-[state=active]:border-purple-600 data-[state=active]:shadow-none after:hidden text-xs md:text-sm whitespace-nowrap"
              >
                <PackageCheck className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Ambil Dokumen</span>
                <span className="sm:hidden">Ambil</span>
                <Badge status="ambil-dokumen" className="ml-1 md:ml-2">
                  {stats["ambil-dokumen"]}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="antar-dokumen"
                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 dark:data-[state=active]:bg-emerald-500/10 dark:data-[state=active]:border-emerald-600 data-[state=active]:shadow-none after:hidden text-xs md:text-sm whitespace-nowrap"
              >
                <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Antar Dokumen</span>
                <span className="sm:hidden">Antar</span>
                <Badge status="antar-dokumen" className="ml-1 md:ml-2">
                  {stats["antar-dokumen"]}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-3 md:p-6">
            <TabsContent value="jemput-dokumen" className="mt-0">
              <TaskList
                tasks={filterTasksByStatus("jemput-dokumen")}
                onViewDetail={handleViewDetail}
              />
            </TabsContent>
            <TabsContent value="proses-samsat" className="mt-0">
              <TaskList
                tasks={filterTasksByStatus("proses-samsat")}
                onViewDetail={handleViewDetail}
              />
            </TabsContent>
            <TabsContent value="ambil-dokumen" className="mt-0">
              <TaskList
                tasks={filterTasksByStatus("ambil-dokumen")}
                onViewDetail={handleViewDetail}
              />
            </TabsContent>
            <TabsContent value="antar-dokumen" className="mt-0">
              <TaskList
                tasks={filterTasksByStatus("antar-dokumen")}
                onViewDetail={handleViewDetail}
              />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-full sm:max-w-4xl max-h-[90dvh] flex flex-col overflow-hidden p-4 sm:p-6">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p>{selectedTask.orderNo}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTask.layanan}
                    </p>
                  </div>
                  <Badge status={selectedTask.status} className="ml-auto">
                    {getStatusLabel(selectedTask.status)}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Detail tugas messenger untuk pesanan ini
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="h-[60vh] pr-2 md:pr-4">
                <div className="space-y-4 md:space-y-6">
                  {/* Customer Info */}
                  <div className="rounded-lg border border-border/80 bg-card p-3 md:p-4 space-y-3 shadow-2xs">
                    <h3 className="text-xs md:text-sm mb-3">Informasi Customer</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                      <div className="flex items-center gap-2 md:gap-3">
                        <User className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Nama</p>
                          <p className="text-xs md:text-sm">{selectedTask.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <Phone className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Telepon</p>
                          <p className="text-xs md:text-sm">{selectedTask.customerPhone}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 md:gap-3 md:col-span-2">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Alamat</p>
                          <p className="text-xs md:text-sm">{selectedTask.customerAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <Car className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Nopol</p>
                          <p className="text-xs md:text-sm">{selectedTask.nopol}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Tanggal</p>
                          <p className="text-xs md:text-sm">{selectedTask.tanggalTugas}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents Checklist */}
                  <div className="rounded-lg border border-border/80 bg-card p-3 md:p-4 shadow-2xs">
                    <h3 className="text-xs md:text-sm mb-3">
                      {selectedTask.status === "jemput-dokumen"
                        ? "Dokumen yang Harus Dijemput"
                        : selectedTask.status === "ambil-dokumen" ||
                          selectedTask.status === "antar-dokumen"
                        ? "Dokumen yang Diserahkan"
                        : "Checklist Dokumen"}
                    </h3>
                    <div className="space-y-2">
                      {selectedTask.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                        >
                          <Checkbox
                            id={`doc-${doc.id}`}
                            checked={doc.checked}
                            onCheckedChange={() => handleCheckDocument(doc.id)}
                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <Label
                            htmlFor={`doc-${doc.id}`}
                            className={cn(
                              "flex-1 cursor-pointer text-xs md:text-sm",
                              doc.checked && "line-through text-muted-foreground"
                            )}
                          >
                            {doc.name}
                          </Label>
                          {doc.checked && (
                            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-emerald-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mutasi Cost Fields (only for proses-samsat) */}
                  {selectedTask.status === "proses-samsat" && (
                    <>
                      {/* Mutasi Keluar */}
                      <div className="rounded-lg border border-border/80 bg-card p-3 md:p-4 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 md:mb-4">
                          <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-rose-600 dark:text-rose-400" />
                          <h3 className="text-xs md:text-sm font-semibold">Biaya Mutasi Keluar</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:gap-3">
                          {Object.keys(hargaDasarMutasiKeluar).map((key) => (
                            <MutasiCostField
                              key={key}
                              name={key}
                              label={key
                                .replace("mutasiKeluar", "")
                                .replace(/([A-Z])/g, " $1")
                                .trim()}
                              value={mutasiKeluarData[key]}
                              onChange={(value) =>
                                setMutasiKeluarData({ ...mutasiKeluarData, [key]: value })
                              }
                              hargaDasar={
                                hargaDasarMutasiKeluar[
                                  key as keyof typeof hargaDasarMutasiKeluar
                                ]
                              }
                            />
                          ))}
                        </div>
                      </div>

                      {/* Mutasi Masuk */}
                      <div className="rounded-lg border border-border/80 bg-card p-3 md:p-4 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 md:mb-4">
                          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="text-xs md:text-sm font-semibold">Biaya Mutasi Masuk</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:gap-3">
                          {Object.keys(hargaDasarMutasiMasuk).map((key) => (
                            <MutasiCostField
                              key={key}
                              name={key}
                              label={key
                                .replace("mutasiMasuk", "")
                                .replace(/([A-Z])/g, " $1")
                                .trim()}
                              value={mutasiMasukData[key]}
                              onChange={(value) =>
                                setMutasiMasukData({ ...mutasiMasukData, [key]: value })
                              }
                              hargaDasar={
                                hargaDasarMutasiMasuk[
                                  key as keyof typeof hargaDasarMutasiMasuk
                                ]
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="border-t pt-3 md:pt-4 flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="w-full sm:w-auto text-xs md:text-sm">
                  Batal
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveTask}
                  className="gap-2 w-full sm:w-auto text-xs md:text-sm"
                >
                  <Save className="w-3 h-3 md:w-4 md:h-4" />
                  Simpan
                </Button>
                <Button
                  onClick={handleCompleteTask}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto text-xs md:text-sm"
                >
                  <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                  Selesaikan Task
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskList({
  tasks,
  onViewDetail,
}: {
  tasks: MessengerTask[];
  onViewDetail: (task: MessengerTask) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-secondary/50 mx-auto mb-4 flex items-center justify-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Tidak ada tugas</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:gap-4">
      {tasks.map((task, index) => (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border border-border/80 bg-card shadow-xs hover:border-border transition-all p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-4">
              <div className="flex-1 w-full space-y-2 md:space-y-3">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-foreground truncate">{task.orderNo}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">{task.layanan}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                  <div className="flex items-center gap-1 md:gap-2 min-w-0">
                    <Car className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                    <span className="font-mono tabular-nums truncate">{task.nopol}</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 min-w-0">
                    <User className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{task.customerName}</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 min-w-0 col-span-2 sm:col-span-1">
                    <Phone className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                    <span className="font-mono tabular-nums truncate">{task.customerPhone}</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 min-w-0 col-span-2 sm:col-span-1">
                    <Clock className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{task.tanggalTugas}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1">
                    {task.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={cn(
                          "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                          doc.checked ? "bg-emerald-500" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] md:text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                    {task.documents.filter((d) => d.checked).length}/
                    {task.documents.length} selesai
                  </span>
                </div>
              </div>

              <Button
                onClick={() => onViewDetail(task)}
                size="sm"
                variant="outline"
                className="gap-1 md:gap-2 shrink-0 w-full sm:w-auto text-xs"
              >
                <Eye className="w-3 h-3 md:w-4 md:h-4" />
                Detail
              </Button>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
