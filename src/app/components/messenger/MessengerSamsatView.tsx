import { useState, useMemo } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Play,
  Check,
  Layers,
  MapPin,
  Send,
  Info,
  Calendar,
  DollarSign,
  Edit2,
  FileCheck2,
} from "lucide-react";
import {
  MessengerTaskItem,
  MessengerComponentProgress,
  getMessengerTasksForEmployee,
  UserContext,
  AvailableSamsatComponent,
  addSamsatComponentToOrder,
  updateMessengerComponent,
  updateMessengerComponentPrice,
  completeSamsatProcess,
  SAMSAT_WAITING_REASONS,
  getMasterSamsatComponents,
} from "../../data/messengerTaskAdapter";
import { useOrderStore } from "../../data/orderStore";
import { MessengerWaitingReasonDialog } from "./MessengerWaitingReasonDialog";
import { toast } from "sonner";
import { cn } from "../ui/utils";

interface MessengerSamsatViewProps {
  currentUser: UserContext;
  initialSelectedOrderNo?: string;
}

const PRESET_DURATIONS = [
  { label: "1 Jam", minutes: 60 },
  { label: "2 Jam", minutes: 120 },
  { label: "4 Jam", minutes: 240 },
  { label: "8 Jam", minutes: 480 },
  { label: "12 Jam", minutes: 720 },
  { label: "24 Jam (1 Hari)", minutes: 1440 },
  { label: "2 Hari", minutes: 2880 },
  { label: "3 Hari", minutes: 4320 },
];

export function MessengerSamsatView({
  currentUser,
  initialSelectedOrderNo,
}: MessengerSamsatViewProps) {
  const { activeOrders } = useOrderStore();

  // Add Component Dialog State
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [targetOrderNo, setTargetOrderNo] = useState<string | null>(null);
  const [targetOrderWilayah, setTargetOrderWilayah] = useState<string | undefined>(undefined);
  const [selectedMasterCompId, setSelectedMasterCompId] = useState<string>("");
  const [customCompName, setCustomCompName] = useState("");
  const [customCompNote, setCustomCompNote] = useState("");
  const [addComponentTab, setAddComponentTab] = useState<"mutasi_masuk" | "mutasi_keluar" | "custom">("mutasi_masuk");

  // Edit Price Dialog State
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
  const [editPriceOrderNo, setEditPriceOrderNo] = useState<string | null>(null);
  const [editPriceCompId, setEditPriceCompId] = useState<string | null>(null);
  const [editPriceCompName, setEditPriceCompName] = useState("");
  const [editPriceMasterPrice, setEditPriceMasterPrice] = useState<number>(0);
  const [editPriceActualInput, setEditPriceActualInput] = useState<string>("");
  const [editPriceNote, setEditPriceNote] = useState<string>("");

  // Custom Duration Dialog State
  const [isCustomDurationOpen, setIsCustomDurationOpen] = useState(false);
  const [durationOrderNo, setDurationOrderNo] = useState<string | null>(null);
  const [durationCompId, setDurationCompId] = useState<string | null>(null);
  const [durationCompName, setDurationCompName] = useState("");
  const [customDaysInput, setCustomDaysInput] = useState<string>("2");

  // Waiting Reason Dialog State
  const [isWaitingDialogOpen, setIsWaitingDialogOpen] = useState(false);
  const [waitingOrderNo, setWaitingOrderNo] = useState<string | null>(null);
  const [waitingComponentId, setWaitingComponentId] = useState<string | null>(null);

  // Filter tasks to Samsat tasks assigned to current messenger
  const samsatTasks = useMemo(() => {
    const all = getMessengerTasksForEmployee(activeOrders, currentUser.employeeId || "");
    return all.filter((t) => t.keteranganTugas === "Proses Samsat");
  }, [activeOrders, currentUser.employeeId]);

  // Master components list for the current target order
  const availableMasterComps = useMemo(() => {
    return getMasterSamsatComponents(targetOrderWilayah);
  }, [targetOrderWilayah]);

  const mutasiMasukMaster = useMemo(() => {
    return availableMasterComps.filter(
      (c) => c.category === "Mutasi Masuk" || c.category.toLowerCase().includes("masuk")
    );
  }, [availableMasterComps]);

  const mutasiKeluarMaster = useMemo(() => {
    return availableMasterComps.filter(
      (c) => c.category === "Mutasi Keluar" || c.category.toLowerCase().includes("keluar")
    );
  }, [availableMasterComps]);

  const otherMaster = useMemo(() => {
    return availableMasterComps.filter(
      (c) =>
        c.category !== "Mutasi Masuk" &&
        !c.category.toLowerCase().includes("masuk") &&
        c.category !== "Mutasi Keluar" &&
        !c.category.toLowerCase().includes("keluar")
    );
  }, [availableMasterComps]);

  const handleOpenAddComponent = (orderNo: string, wilayah?: string) => {
    setTargetOrderNo(orderNo);
    setTargetOrderWilayah(wilayah);
    setSelectedMasterCompId("");
    setCustomCompName("");
    setCustomCompNote("");
    setAddComponentTab("mutasi_masuk");
    setIsAddComponentOpen(true);
  };

  const handleAddMasterComponent = () => {
    if (!targetOrderNo || !selectedMasterCompId) {
      toast.error("Pilih komponen master data terlebih dahulu.");
      return;
    }

    const masterItem = availableMasterComps.find((c) => c.id === selectedMasterCompId);
    if (!masterItem) return;

    const res = addSamsatComponentToOrder(
      targetOrderNo,
      {
        name: masterItem.name,
        category: masterItem.category,
        isCustom: false,
      },
      currentUser
    );

    if (res.success) {
      toast.success(`Komponen "${masterItem.name}" berhasil ditambahkan!`);
      setIsAddComponentOpen(false);
    } else {
      toast.error(res.error || "Gagal menambahkan komponen.");
    }
  };

  const handleAddCustomComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrderNo) return;
    if (!customCompName.trim()) {
      toast.error("Nama komponen kustom wajib diisi.");
      return;
    }

    const res = addSamsatComponentToOrder(
      targetOrderNo,
      {
        name: customCompName.trim(),
        category: "Tambahan Lapangan",
        isCustom: true,
        note: customCompNote.trim() || undefined,
      },
      currentUser
    );

    if (res.success) {
      toast.success(
        `Tambahan lapangan "${customCompName.trim()}" berhasil ditambahkan (Rp 0 / Tanpa Tagihan Klien)!`
      );
      setIsAddComponentOpen(false);
    } else {
      toast.error(res.error || "Gagal menambahkan komponen kustom.");
    }
  };

  const handleStatusChange = (
    orderNo: string,
    componentId: string,
    newStatus: "NOT_STARTED" | "IN_PROGRESS" | "WAITING" | "COMPLETED"
  ) => {
    if (newStatus === "WAITING") {
      setWaitingOrderNo(orderNo);
      setWaitingComponentId(componentId);
      setIsWaitingDialogOpen(true);
      return;
    }

    const res = updateMessengerComponent(
      orderNo,
      componentId,
      { status: newStatus },
      currentUser
    );

    if (res.success) {
      toast.success(
        `Status komponen diubah ke ${newStatus === "COMPLETED" ? "Selesai" : "Diproses"}`
      );
    } else {
      toast.error(res.error || "Gagal memperbarui status komponen");
    }
  };

  const handleWaitingReasonSubmit = (reason: string, note: string) => {
    if (!waitingOrderNo || !waitingComponentId) return;

    const res = updateMessengerComponent(
      waitingOrderNo,
      waitingComponentId,
      {
        status: "WAITING",
        waitingReason: reason,
        note: note || undefined,
      },
      currentUser
    );

    if (res.success) {
      toast.info(`Komponen diubah ke status Menunggu: ${reason}`);
      setIsWaitingDialogOpen(false);
      setWaitingOrderNo(null);
      setWaitingComponentId(null);
    } else {
      toast.error(res.error || "Gagal memperbarui status komponen");
    }
  };

  // Duration selection handler: standard or custom
  const handleSelectDurationChange = (
    orderNo: string,
    comp: MessengerComponentProgress,
    val: string
  ) => {
    if (val === "CUSTOM") {
      setDurationOrderNo(orderNo);
      setDurationCompId(comp.componentId);
      setDurationCompName(comp.name);
      setCustomDaysInput(comp.customDurationDays ? String(comp.customDurationDays) : "2");
      setIsCustomDurationOpen(true);
      return;
    }

    const minutes = Number(val);
    const res = updateMessengerComponent(
      orderNo,
      comp.componentId,
      {
        estimatedDurationMinutes: minutes,
        isCustomDuration: false,
        customDurationDays: undefined,
      },
      currentUser
    );

    if (res.success) {
      toast.success("Estimasi durasi berhasil disimpan!");
    } else {
      toast.error(res.error || "Gagal menyimpan estimasi durasi");
    }
  };

  // Save custom duration in days
  const handleSaveCustomDuration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!durationOrderNo || !durationCompId) return;

    const days = parseInt(customDaysInput.replace(/[^0-9]/g, ""), 10);
    if (isNaN(days) || days <= 0 || days > 365) {
      toast.error("Durasi kustom harus berupa angka antara 1 sampai 365 hari!");
      return;
    }

    const minutes = days * 1440;
    const res = updateMessengerComponent(
      durationOrderNo,
      durationCompId,
      {
        estimatedDurationMinutes: minutes,
        isCustomDuration: true,
        customDurationDays: days,
      },
      currentUser
    );

    if (res.success) {
      toast.success(`Durasi kustom ${days} hari berhasil disimpan!`);
      setIsCustomDurationOpen(false);
      setDurationOrderNo(null);
      setDurationCompId(null);
    } else {
      toast.error(res.error || "Gagal menyimpan durasi kustom");
    }
  };

  // Open Edit Price dialog
  const handleOpenEditPrice = (
    orderNo: string,
    comp: MessengerComponentProgress
  ) => {
    const master = comp.masterPrice ?? comp.nominal ?? 0;
    const actual = comp.actualOrderPrice ?? master;

    setEditPriceOrderNo(orderNo);
    setEditPriceCompId(comp.componentId);
    setEditPriceCompName(comp.name);
    setEditPriceMasterPrice(master);
    setEditPriceActualInput(actual > 0 ? actual.toLocaleString("id-ID") : "0");
    setEditPriceNote("");
    setIsEditPriceOpen(true);
  };

  // Save edited price
  const handleSaveEditPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPriceOrderNo || !editPriceCompId) return;

    const cleanPrice = parseInt(editPriceActualInput.replace(/[^0-9]/g, ""), 10);
    if (isNaN(cleanPrice) || cleanPrice < 0) {
      toast.error("Nominal harga aktual tidak valid!");
      return;
    }

    const res = updateMessengerComponentPrice(
      editPriceOrderNo,
      editPriceCompId,
      cleanPrice,
      currentUser,
      editPriceNote.trim() || undefined
    );

    if (res.success) {
      toast.success(
        `Harga aktual untuk "${editPriceCompName}" berhasil diupdate menjadi Rp ${cleanPrice.toLocaleString("id-ID")}!`
      );
      setIsEditPriceOpen(false);
      setEditPriceOrderNo(null);
      setEditPriceCompId(null);
    } else {
      toast.error(res.error || "Gagal mengubah harga aktual");
    }
  };

  const handleKirimHasil = (orderNo: string) => {
    const res = completeSamsatProcess(orderNo, currentUser);
    if (res.success) {
      toast.success(
        `Proses Samsat order ${orderNo} berhasil diselesaikan! Berkas diteruskan ke verifikasi biaya.`
      );
    } else {
      toast.error(res.error || "Gagal menyelesaikan proses Samsat");
    }
  };

  return (
    <div className="w-full space-y-4 max-w-xl mx-auto pb-6 text-left">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent p-4 sm:p-5 rounded-2xl border border-purple-500/20">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          Proses Pengurusan Samsat
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed">
          Pantau dan kelola progres loket Samsat per komponen berdasarkan <strong>Harga Dasar Samsat (SSoT)</strong>. 
          Anda dapat menyesuaikan harga aktual lapangan atau menambah komponen tambahan bila diperlukan.
        </p>
      </div>

      {/* Samsat Orders List */}
      {samsatTasks.length > 0 ? (
        <div className="space-y-4">
          {samsatTasks.map((task) => {
            const comps: MessengerComponentProgress[] =
              task.componentProgress && task.componentProgress.length > 0
                ? task.componentProgress
                : (task.rawOrder.samsatProcesses || []).map((p) => ({
                    componentId: p.id,
                    name: p.name,
                    category: p.category,
                    nominal: p.basePrice || 0,
                    masterPrice: p.basePrice || 0,
                    actualOrderPrice: p.actualCost || p.basePrice || 0,
                    status: p.status === "Selesai" ? "COMPLETED" : "NOT_STARTED",
                  }));

            const completedCount = comps.filter((c) => c.status === "COMPLETED").length;
            const totalCount = comps.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isAllCompleted = totalCount > 0 && completedCount === totalCount;

            // Separate components into Mutasi Masuk, Mutasi Keluar, and Tambahan Lapangan
            const mutasiMasukComps = comps.filter(
              (c) =>
                !c.isCustom &&
                (c.category?.toLowerCase().includes("masuk") || c.category === "Mutasi Masuk")
            );
            const mutasiKeluarComps = comps.filter(
              (c) =>
                !c.isCustom &&
                (c.category?.toLowerCase().includes("keluar") || c.category === "Mutasi Keluar")
            );
            const otherMasterComps = comps.filter(
              (c) =>
                !c.isCustom &&
                !mutasiMasukComps.includes(c) &&
                !mutasiKeluarComps.includes(c)
            );
            const customComps = comps.filter((c) => c.isCustom);

            const renderComponentRow = (comp: MessengerComponentProgress) => {
              const isDone = comp.status === "COMPLETED";
              const isInProg = comp.status === "IN_PROGRESS";
              const isWait = comp.status === "WAITING";

              const master = comp.masterPrice ?? comp.nominal ?? 0;
              const actual = comp.actualOrderPrice ?? master;
              const diff = actual - master;

              return (
                <div
                  key={comp.componentId}
                  className={cn(
                    "p-3.5 sm:p-4 rounded-xl border text-sm space-y-3 transition-all bg-card",
                    isDone && "bg-emerald-50/20 border-emerald-200 dark:border-emerald-900/60",
                    isInProg && "bg-blue-50/20 border-blue-200 dark:border-blue-900/60",
                    isWait && "bg-amber-50/20 border-amber-200 dark:border-amber-900/60"
                  )}
                >
                  {/* Row 1: Name, Badges, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-foreground">
                          {comp.name}
                        </span>
                        {comp.isCustom ? (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200 font-semibold px-2 py-0.5">
                            Tambahan Lapangan
                          </Badge>
                        ) : (
                          comp.category && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              {comp.category}
                            </Badge>
                          )
                        )}
                      </div>
                      {comp.note && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Catatan: {comp.note}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-full shrink-0",
                        isDone && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                        isInProg && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                        isWait && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                        comp.status === "NOT_STARTED" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? "Selesai" : isInProg ? "Diproses" : isWait ? "Menunggu" : "Belum Mulai"}
                    </span>
                  </div>

                  {/* Pricing Breakdown: Harga Dasar vs Aktual + Edit Price Button */}
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
                        <span className="text-muted-foreground">Harga Dasar:</span>
                        <strong className="font-semibold text-foreground">
                          Rp {master.toLocaleString("id-ID")}
                        </strong>
                        <span className="text-muted-foreground mx-1">•</span>
                        <span className="text-muted-foreground">Aktual Lapangan:</span>
                        <strong className={cn(
                          "font-bold",
                          diff > 0 ? "text-amber-600 dark:text-amber-400" : diff < 0 ? "text-emerald-600" : "text-foreground"
                        )}>
                          Rp {actual.toLocaleString("id-ID")}
                        </strong>
                      </div>

                      {/* Explicit Text Difference */}
                      <p className="text-xs font-medium">
                        {diff === 0 ? (
                          <span className="text-muted-foreground">Sesuai Harga Dasar (Selisih Rp 0)</span>
                        ) : diff > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            +Rp {diff.toLocaleString("id-ID")} (Lebih tinggi dari harga dasar)
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            -Rp {Math.abs(diff).toLocaleString("id-ID")} (Lebih hemat dari harga dasar)
                          </span>
                        )}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditPrice(task.orderNo, comp)}
                      className="min-h-[40px] text-xs font-semibold px-3 rounded-lg border-border hover:bg-muted"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
                      Edit Harga
                    </Button>
                  </div>

                  {/* Waiting Reason alert if active */}
                  {isWait && comp.waitingReason && (
                    <div className="p-2.5 rounded-xl bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs sm:text-sm flex items-center justify-between">
                      <span>Kendala: {comp.waitingReason}</span>
                      <button
                        onClick={() => {
                          setWaitingOrderNo(task.orderNo);
                          setWaitingComponentId(comp.componentId);
                          setIsWaitingDialogOpen(true);
                        }}
                        className="text-xs underline font-semibold text-amber-900 dark:text-amber-200 ml-2"
                      >
                        Ubah
                      </button>
                    </div>
                  )}

                  {/* Estimation & Duration Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground font-medium">Durasi:</span>
                      <Select
                        value={
                          comp.isCustomDuration
                            ? "CUSTOM"
                            : comp.estimatedDurationMinutes
                            ? String(comp.estimatedDurationMinutes)
                            : ""
                        }
                        onValueChange={(val) => handleSelectDurationChange(task.orderNo, comp, val)}
                      >
                        <SelectTrigger className="min-h-[40px] text-xs sm:text-sm w-36 rounded-lg">
                          <SelectValue placeholder="Pilih durasi" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRESET_DURATIONS.map((opt) => (
                            <SelectItem key={opt.minutes} value={String(opt.minutes)} className="text-xs sm:text-sm">
                              {opt.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="CUSTOM" className="text-xs sm:text-sm font-semibold text-primary">
                            + Kustom (Hari)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {comp.estimatedCompletedAt && (
                      <span className="text-xs text-muted-foreground">
                        Estimasi Selesai:{" "}
                        <strong className="text-foreground font-semibold">
                          {comp.isCustomDuration
                            ? `${comp.customDurationDays} Hari (${new Date(comp.estimatedCompletedAt).toLocaleDateString("id-ID")})`
                            : new Date(comp.estimatedCompletedAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Action Buttons: Proses, Menunggu, Selesai */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    {comp.status !== "IN_PROGRESS" && !isDone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(task.orderNo, comp.componentId, "IN_PROGRESS")}
                        className="min-h-[44px] text-xs sm:text-sm px-3.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-xl"
                      >
                        <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Proses
                      </Button>
                    )}

                    {!isDone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(task.orderNo, comp.componentId, "WAITING")}
                        className="min-h-[44px] text-xs sm:text-sm px-3.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-xl"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> Menunggu
                      </Button>
                    )}

                    {!isDone && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(task.orderNo, comp.componentId, "COMPLETED")}
                        className="min-h-[44px] text-xs sm:text-sm px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                      >
                        <Check className="w-4 h-4 mr-1.5" /> Selesai
                      </Button>
                    )}

                    {isDone && (
                      <span className="text-xs sm:text-sm text-emerald-600 font-bold flex items-center gap-1.5 py-1">
                        <CheckCircle2 className="w-4 h-4" /> Selesai Dikerjakan
                      </span>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <Card
                key={task.orderNo}
                className={cn(
                  "p-4 sm:p-5 border rounded-2xl bg-card space-y-4 shadow-xs transition-all",
                  isAllCompleted && "border-emerald-300 dark:border-emerald-800 bg-emerald-50/10"
                )}
              >
                {/* Order Top Meta */}
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base sm:text-lg text-foreground tracking-tight">
                        {task.orderNo}
                      </span>
                      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200 font-semibold px-2 py-0.5">
                        {task.jenisTugas}
                      </Badge>
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-foreground mt-1">
                      {task.customer} • <span className="font-mono font-bold">{task.nopol}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span>{task.lokasi} ({task.rawOrder.wilayahSamsatAsal || "Samsat"})</span>
                    </div>
                  </div>

                  {/* Progress KPI */}
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">
                      {completedCount} / {totalCount} Selesai
                    </span>
                    <div className="w-28 sm:w-32 h-2.5 bg-muted rounded-full overflow-hidden mt-1.5 ml-auto">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isAllCompleted ? "bg-emerald-600" : "bg-purple-600"
                        )}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 block font-medium">
                      {progressPercent}% Progres
                    </span>
                  </div>
                </div>

                {/* Selesai Banner & Kirim Hasil CTA if all done */}
                {isAllCompleted && task.status !== "Selesai" && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="block font-semibold">Proses Samsat Selesai</strong>
                        <span className="text-xs text-muted-foreground">
                          Semua komponen sudah selesai. Kirim hasil pengurusan ke kantor.
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleKirimHasil(task.orderNo)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm min-h-[44px] px-4 rounded-xl shrink-0 shadow-xs"
                    >
                      <Send className="w-4 h-4 mr-1.5" /> Kirim Hasil
                    </Button>
                  </div>
                )}

                {/* Header Actions for Component List */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                    Daftar Komponen Pengurusan:
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAddComponent(task.orderNo, task.rawOrder.wilayahSamsatAsal)}
                    className="min-h-[44px] text-xs sm:text-sm font-semibold border-dashed text-primary hover:bg-primary/10 rounded-xl px-4"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Tambah Komponen
                  </Button>
                </div>

                {/* Group A: MUTASI MASUK */}
                {mutasiMasukComps.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      <FileCheck2 className="w-4 h-4" /> A. Mutasi Masuk
                    </div>
                    <div className="space-y-2.5">
                      {mutasiMasukComps.map(renderComponentRow)}
                    </div>
                  </div>
                )}

                {/* Group B: MUTASI KELUAR */}
                {mutasiKeluarComps.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      <FileCheck2 className="w-4 h-4" /> B. Mutasi Keluar
                    </div>
                    <div className="space-y-2.5">
                      {mutasiKeluarComps.map(renderComponentRow)}
                    </div>
                  </div>
                )}

                {/* Group C: Other Standard Components */}
                {otherMasterComps.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/80 uppercase tracking-wider">
                      <Layers className="w-4 h-4" /> Komponen Layanan Lainnya
                    </div>
                    <div className="space-y-2.5">
                      {otherMasterComps.map(renderComponentRow)}
                    </div>
                  </div>
                )}

                {/* Group D: TAMBAHAN LAPANGAN */}
                {customComps.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-dashed border-purple-200 dark:border-purple-900/60">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      <Plus className="w-4 h-4" /> Tambahan Lapangan (Kustom)
                    </div>
                    <div className="space-y-2.5">
                      {customComps.map(renderComponentRow)}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed bg-card/50 rounded-2xl">
          <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
          <h3 className="text-sm sm:text-base font-semibold text-foreground">Tidak Ada Proses Samsat Aktif</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Saat ini tidak ada berkas yang ditugaskan kepada Anda pada tahapan loket Samsat.
          </p>
        </Card>
      )}

      {/* Dialog: Tambah Komponen (Master Mutasi Masuk / Mutasi Keluar / Kustom) */}
      <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
        <DialogContent className="max-w-md w-full p-4 sm:p-5 gap-3.5 text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Tambah Komponen Samsat
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pilih dan tambahkan komponen proses Samsat yang dikerjakan pada order ini.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={addComponentTab} onValueChange={(v) => setAddComponentTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full min-h-[44px]">
              <TabsTrigger value="mutasi_masuk" className="text-xs sm:text-sm">Mutasi Masuk</TabsTrigger>
              <TabsTrigger value="mutasi_keluar" className="text-xs sm:text-sm">Mutasi Keluar</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs sm:text-sm">Kustom</TabsTrigger>
            </TabsList>

            {/* TAB MUTASI MASUK */}
            <TabsContent value="mutasi_masuk" className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Pilih komponen standar Mutasi Masuk berdasarkan Harga Dasar Samsat:
              </p>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Komponen Mutasi Masuk</Label>
                <Select value={selectedMasterCompId} onValueChange={setSelectedMasterCompId}>
                  <SelectTrigger className="w-full min-h-[44px] text-sm">
                    <SelectValue placeholder="-- Pilih Komponen --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {mutasiMasukMaster.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="text-sm">
                        {item.name} — Rp {(item.defaultNominal ?? item.basePrice ?? 0).toLocaleString("id-ID")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddComponentOpen(false)}
                  className="min-h-[44px] text-sm"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAddMasterComponent}
                  className="bg-primary text-primary-foreground font-semibold min-h-[44px] text-sm px-4"
                >
                  Tambahkan ke Order
                </Button>
              </div>
            </TabsContent>

            {/* TAB MUTASI KELUAR */}
            <TabsContent value="mutasi_keluar" className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Pilih komponen standar Mutasi Keluar berdasarkan Harga Dasar Samsat:
              </p>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Komponen Mutasi Keluar</Label>
                <Select value={selectedMasterCompId} onValueChange={setSelectedMasterCompId}>
                  <SelectTrigger className="w-full min-h-[44px] text-sm">
                    <SelectValue placeholder="-- Pilih Komponen --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {mutasiKeluarMaster.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="text-sm">
                        {item.name} — Rp {(item.defaultNominal ?? item.basePrice ?? 0).toLocaleString("id-ID")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddComponentOpen(false)}
                  className="min-h-[44px] text-sm"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAddMasterComponent}
                  className="bg-primary text-primary-foreground font-semibold min-h-[44px] text-sm px-4"
                >
                  Tambahkan ke Order
                </Button>
              </div>
            </TabsContent>

            {/* TAB CUSTOM COMPONENT */}
            <TabsContent value="custom" className="space-y-3 pt-2">
              <form onSubmit={handleAddCustomComponent} className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Tambahan lapangan otomatis bernilai <strong>Rp 0</strong> dan tidak mengubah tagihan invoice klien. Bila ada pengeluaran operasional pribadi, ajukan lewat <strong>Pengajuan Biaya</strong>.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">
                    Nama Tambahan Lapangan <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Contoh: Gesek Rangka Ulang, Cek Berkas Khusus..."
                    value={customCompName}
                    onChange={(e) => setCustomCompName(e.target.value)}
                    className="min-h-[44px] text-base"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Catatan / Alasan (Opsional)</Label>
                  <Textarea
                    placeholder="Keterangan kebutuhan komponen di lapangan..."
                    value={customCompNote}
                    onChange={(e) => setCustomCompNote(e.target.value)}
                    rows={2}
                    className="text-base min-h-[60px] resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddComponentOpen(false)}
                    className="min-h-[44px] text-sm"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold min-h-[44px] text-sm px-4"
                  >
                    Simpan Tambahan
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Harga Aktual Lapangan */}
      <Dialog open={isEditPriceOpen} onOpenChange={setIsEditPriceOpen}>
        <DialogContent className="max-w-md w-full p-4 sm:p-5 gap-3.5 text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Edit Harga Aktual Lapangan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Perbarui nominal harga aktual yang dibayarkan di loket Samsat.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditPrice} className="space-y-3.5 pt-1">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block">
                Komponen
              </span>
              <p className="text-sm sm:text-base font-bold text-foreground">
                {editPriceCompName}
              </p>
              <p className="text-xs text-muted-foreground">
                Harga Dasar Referensi: <strong>Rp {editPriceMasterPrice.toLocaleString("id-ID")}</strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Harga Aktual Lapangan (Rupiah) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  Rp
                </span>
                <Input
                  type="text"
                  value={editPriceActualInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const num = parseInt(raw, 10);
                    setEditPriceActualInput(isNaN(num) ? "" : num.toLocaleString("id-ID"));
                  }}
                  className="pl-11 min-h-[44px] text-base font-semibold"
                  placeholder="350.000"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Catatan Perubahan (Opsional)</Label>
              <Textarea
                placeholder="Contoh: Kenaikan biaya resmi loket Samsat Cibinong per hari ini..."
                value={editPriceNote}
                onChange={(e) => setEditPriceNote(e.target.value)}
                rows={2}
                className="text-base min-h-[60px] resize-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-xs">
              <Info className="w-3.5 h-3.5 inline mr-1" />
              Perubahan harga ini hanya disimpan pada order ini untuk verifikasi operasional dan <strong>TIDAK mengubah master harga dasar maupun invoice customer</strong>.
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditPriceOpen(false)}
                className="min-h-[44px] text-sm"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground font-semibold min-h-[44px] text-sm px-5"
              >
                Simpan Harga
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Atur Durasi Kustom (Hari) */}
      <Dialog open={isCustomDurationOpen} onOpenChange={setIsCustomDurationOpen}>
        <DialogContent className="max-w-xs w-full p-4 sm:p-5 gap-3.5 text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Atur Durasi Kustom
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tentukan estimasi durasi pengerjaan komponen Samsat dalam jumlah hari.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCustomDuration} className="space-y-3.5 pt-1">
            <p className="text-xs text-muted-foreground">
              Masukkan estimasi durasi pengurusan <strong>{durationCompName}</strong> dalam jumlah hari:
            </p>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Jumlah Hari</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={customDaysInput}
                onChange={(e) => setCustomDaysInput(e.target.value)}
                className="min-h-[44px] text-base font-semibold"
                placeholder="2"
                required
              />
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomDurationOpen(false)}
                className="min-h-[44px] text-sm"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground font-semibold min-h-[44px] text-sm px-4"
              >
                Simpan Durasi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Waiting Reason Dialog */}
      <MessengerWaitingReasonDialog
        open={isWaitingDialogOpen}
        onOpenChange={setIsWaitingDialogOpen}
        title="Pilih Kendala Komponen Samsat"
        description="Pilih alasan status menunggu untuk komponen ini:"
        reasons={SAMSAT_WAITING_REASONS}
        onSubmit={handleWaitingReasonSubmit}
      />
    </div>
  );
}
