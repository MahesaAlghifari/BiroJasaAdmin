import { useState, useMemo } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  Package,
  Clock,
  RefreshCw,
  AlertTriangle,
  Search,
  CheckCircle2,
  FileText,
  Truck,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  MessengerTaskItem,
  getMessengerTasksForEmployee,
  getMessengerStatsForEmployee,
  UserContext,
  startMessengerTask,
} from "../../data/messengerTaskAdapter";
import { useOrderStore } from "../../data/orderStore";
import { MessengerTaskCard } from "./MessengerTaskCard";
import { MessengerTaskDetailModal } from "./MessengerTaskDetailModal";
import { toast } from "sonner";
import { cn } from "../ui/utils";

interface MessengerDashboardViewProps {
  currentUser: UserContext;
  onNavigateToTab?: (tab: string) => void;
}

export function MessengerDashboardView({
  currentUser,
  onNavigateToTab,
}: MessengerDashboardViewProps) {
  const { activeOrders } = useOrderStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<MessengerTaskItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Strict per-employee isolation
  const myTasks = useMemo(() => {
    return getMessengerTasksForEmployee(activeOrders, currentUser.employeeId || "");
  }, [activeOrders, currentUser.employeeId]);

  // Operational KPIs strictly for current messenger
  const stats = useMemo(() => {
    return getMessengerStatsForEmployee(activeOrders, currentUser.employeeId || "");
  }, [activeOrders, currentUser.employeeId]);

  // Attention items: Approaching deadline (< 6h), overdue, or urgent
  const attentionTasks = useMemo(() => {
    return myTasks.filter(
      (t) =>
        t.status !== "Selesai" &&
        (t.deadlineStatus === "APPROACHING" ||
          t.deadlineStatus === "OVERDUE" ||
          t.priority === "URGENT")
    );
  }, [myTasks]);

  // Active Samsat processes
  const samsatTasks = useMemo(() => {
    return myTasks.filter(
      (t) => t.keteranganTugas === "Proses Samsat" && t.status !== "Selesai"
    );
  }, [myTasks]);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return myTasks.filter((t) => {
      const matchSearch =
        searchTerm === "" ||
        t.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nopol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.jenisTugas.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType =
        selectedTypeFilter === "all" || t.keteranganTugas === selectedTypeFilter;

      return matchSearch && matchType;
    });
  }, [myTasks, searchTerm, selectedTypeFilter]);

  const handleOpenDetail = (task: MessengerTaskItem) => {
    setSelectedTaskForDetail(task);
    setIsDetailModalOpen(true);
  };

  const handleStartTask = (task: MessengerTaskItem) => {
    const res = startMessengerTask(task.orderNo, currentUser);
    if (res.success) {
      toast.success(`Tugas ${task.orderNo} berhasil dimulai!`);
    } else {
      toast.error(res.error || "Gagal memulai tugas");
    }
  };

  const todayDateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 w-full">
      {/* Welcome Greeting Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            Selamat datang, {currentUser.userName}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Berikut tugas yang perlu diselesaikan hari ini.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-card border border-border text-foreground shadow-2xs">
            📅 {todayDateStr}
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">
            ID Messenger: <span className="font-mono font-medium text-foreground">{currentUser.employeeId || "-"}</span>
          </p>
        </div>
      </div>

      {/* 4 Operational KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Tugas Hari Ini */}
        <Card className="p-4 border bg-card transition-all hover:border-primary/40 hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Tugas Hari Ini
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {stats.tugasHariIni}
            </span>
            <span className="text-[11px] text-muted-foreground">total tugas</span>
          </div>
        </Card>

        {/* KPI 2: Perlu Diambil */}
        <Card className="p-4 border bg-card transition-all hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Perlu Diambil
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {stats.perluDiambil}
            </span>
            <span className="text-[11px] text-muted-foreground">siap diambil</span>
          </div>
        </Card>

        {/* KPI 3: Sedang Diproses */}
        <Card className="p-4 border bg-card transition-all hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Sedang Diproses
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.sedangDiproses}
            </span>
            <span className="text-[11px] text-muted-foreground">dalam proses</span>
          </div>
        </Card>

        {/* KPI 4: Mendekati Deadline */}
        <Card className={cn(
          "p-4 border bg-card transition-all hover:shadow-xs",
          stats.mendekatiDeadline > 0
            ? "border-rose-300 dark:border-rose-800 bg-rose-50/10"
            : "hover:border-slate-300 dark:hover:border-slate-700"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Mendekati Deadline
            </span>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              stats.mendekatiDeadline > 0 ? "bg-rose-500/15 text-rose-600 animate-pulse" : "bg-slate-500/10 text-slate-600"
            )}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={cn(
              "text-2xl font-bold tracking-tight",
              stats.mendekatiDeadline > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
            )}>
              {stats.mendekatiDeadline}
            </span>
            <span className="text-[11px] text-muted-foreground">&lt; 6 jam tersisa</span>
          </div>
        </Card>
      </div>

      {/* SECTION: Perlu Perhatian (Urgent / Mendekati Deadline) */}
      {attentionTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
            <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
              Perlu Perhatian ({attentionTasks.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionTasks.map((t) => (
              <div
                key={t.orderNo}
                className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">{t.orderNo}</span>
                    <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-300">
                      Mendekati Deadline
                    </Badge>
                    <span className="text-xs font-semibold text-foreground">{t.customer}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t.jenisTugas} • {t.lokasi}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleOpenDetail(t)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-8 px-3"
                >
                  Tindak Lanjuti <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: Proses Samsat Berjalan */}
      {samsatTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                Proses Samsat Berjalan ({samsatTasks.length})
              </h3>
            </div>
            {onNavigateToTab && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateToTab("active-processes")}
                className="text-xs text-primary font-medium h-7"
              >
                Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {samsatTasks.map((t) => (
              <Card key={t.orderNo} className="p-4 border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-foreground">{t.orderNo}</span>
                    <h4 className="text-xs font-semibold text-foreground mt-0.5">
                      {t.customer} ({t.nopol})
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-200">
                    {t.lokasi}
                  </Badge>
                </div>

                {/* Component Chips */}
                {t.componentProgress && t.componentProgress.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.componentProgress.map((comp) => (
                      <span
                        key={comp.componentId}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-medium",
                          comp.status === "COMPLETED" && "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
                          comp.status === "IN_PROGRESS" && "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold",
                          comp.status === "WAITING" && "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
                          comp.status === "NOT_STARTED" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {comp.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    Layanan: <strong className="text-foreground">{t.jenisTugas}</strong>
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleOpenDetail(t)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold h-7 px-3"
                  >
                    Lanjutkan Proses <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: Tugas Hari Ini */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
              Tugas Hari Ini ({filteredTasks.length})
            </h3>
          </div>

          {/* Quick Type Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setSelectedTypeFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  selectedTypeFilter === "all" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Semua
              </button>
              <button
                onClick={() => setSelectedTypeFilter("Jemput Dokumen")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  selectedTypeFilter === "Jemput Dokumen" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Jemput
              </button>
              <button
                onClick={() => setSelectedTypeFilter("Proses Samsat")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  selectedTypeFilter === "Proses Samsat" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Samsat
              </button>
              <button
                onClick={() => setSelectedTypeFilter("Pengantaran Dokumen")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  selectedTypeFilter === "Pengantaran Dokumen" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Antar
              </button>
            </div>

            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari order / customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs w-full"
              />
            </div>
          </div>
        </div>

        {/* Task Cards Grid */}
        {filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTasks.map((task) => (
              <MessengerTaskCard
                key={task.orderNo}
                task={task}
                onViewDetail={handleOpenDetail}
                onStartTask={handleStartTask}
                onContinueTask={handleOpenDetail}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed bg-card/50">
            <p className="text-sm font-semibold text-foreground">Tidak ada tugas ditemukan</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tidak ada tugas yang cocok dengan filter atau pencarian Anda.
            </p>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      <MessengerTaskDetailModal
        task={selectedTaskForDetail}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        currentUser={currentUser}
        onTaskUpdated={() => {
          // Re-fetch / re-sync selected task
          if (selectedTaskForDetail) {
            const updated = myTasks.find((t) => t.orderNo === selectedTaskForDetail.orderNo);
            if (updated) setSelectedTaskForDetail(updated);
          }
        }}
      />
    </div>
  );
}
