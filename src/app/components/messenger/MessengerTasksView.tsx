import { useState, useMemo } from "react";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import {
  MessengerTaskItem,
  getMessengerTasksForEmployee,
  UserContext,
  startMessengerTask,
} from "../../data/messengerTaskAdapter";
import { useOrderStore } from "../../data/orderStore";
import { MessengerTaskCard } from "./MessengerTaskCard";
import { MessengerMobileTaskDetail } from "./MessengerMobileTaskDetail";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import { AlertCircle, RotateCw } from "lucide-react";

interface MessengerTasksViewProps {
  currentUser: UserContext;
  onNavigateToTab?: (tab: string, orderNo?: string) => void;
}

type FilterChip = "ALL" | "Jemput Dokumen" | "Proses Samsat" | "Pengantaran Dokumen";

export function MessengerTasksView({
  currentUser,
  onNavigateToTab,
}: MessengerTasksViewProps) {
  const { activeOrders, isLoading, error, refresh } = useOrderStore();
  const [selectedChip, setSelectedChip] = useState<FilterChip>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<MessengerTaskItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Authoritative task isolation & available unassigned tasks
  const myTasks = useMemo(() => {
    return getMessengerTasksForEmployee(activeOrders, currentUser);
  }, [activeOrders, currentUser]);

  // Active / pending tasks count for today's greeting
  const pendingTasksCount = useMemo(() => {
    return myTasks.filter((t) => t.status !== "Selesai" && t.statusCode !== "COMPLETED").length;
  }, [myTasks]);

  // Counts for each chip
  const counts = useMemo(() => {
    return {
      all: myTasks.length,
      jemput: myTasks.filter((t) => t.keteranganTugas === "Jemput Dokumen" || t.keteranganTugas === "Jemput Hasil Samsat").length,
      samsat: myTasks.filter((t) => t.keteranganTugas === "Proses Samsat").length,
      antar: myTasks.filter((t) => t.keteranganTugas === "Pengantaran Dokumen").length,
    };
  }, [myTasks]);

  // Filtered task items
  const filteredTasks = useMemo(() => {
    return myTasks.filter((t) => {
      const matchChip =
        selectedChip === "ALL" ||
        (selectedChip === "Jemput Dokumen"
          ? t.keteranganTugas === "Jemput Dokumen" || t.keteranganTugas === "Jemput Hasil Samsat"
          : t.keteranganTugas === selectedChip);

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        t.orderNo.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.nopol.toLowerCase().includes(q) ||
        t.lokasi.toLowerCase().includes(q);

      return matchChip && matchQuery;
    });
  }, [myTasks, selectedChip, searchQuery]);

  const handleOpenDetail = (task: MessengerTaskItem) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleStartTask = (task: MessengerTaskItem) => {
    const res = startMessengerTask(task.orderNo, currentUser);
    if (res.success) {
      toast.success(`Tugas ${task.orderNo} berhasil dimulai!`);
    } else {
      toast.error(res.error || "Gagal memulai tugas");
    }
  };

  const handleContinueTask = (task: MessengerTaskItem) => {
    if (task.keteranganTugas === "Proses Samsat" && onNavigateToTab) {
      onNavigateToTab("samsat", task.orderNo);
    } else {
      setSelectedTask(task);
      setIsDetailOpen(true);
    }
  };

  return (
    <div className="w-full space-y-4 max-w-xl mx-auto pb-6">
      {/* Top Greeting Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 rounded-2xl border border-primary/15 text-left">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Selamat datang, {currentUser.userName}
          </h2>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {isLoading && myTasks.length === 0 ? (
            <span>Memuat data tugas operasional...</span>
          ) : pendingTasksCount > 0 ? (
            <span>
              <strong className="text-foreground font-semibold">{pendingTasksCount} tugas</strong> perlu Anda selesaikan hari ini.
            </span>
          ) : error && myTasks.length === 0 ? (
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              Gagal memuat tugas. Silakan coba lagi.
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Semua tugas Anda hari ini sudah selesai! Luar biasa!
            </span>
          )}
        </p>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedChip("ALL")}
          className={cn(
            "px-4 py-2 min-h-[44px] rounded-full font-semibold transition-all shrink-0 text-sm",
            selectedChip === "ALL"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          Semua ({counts.all})
        </button>

        <button
          onClick={() => setSelectedChip("Jemput Dokumen")}
          className={cn(
            "px-4 py-2 min-h-[44px] rounded-full font-semibold transition-all shrink-0 text-sm",
            selectedChip === "Jemput Dokumen"
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          Jemput ({counts.jemput})
        </button>

        <button
          onClick={() => setSelectedChip("Proses Samsat")}
          className={cn(
            "px-4 py-2 min-h-[44px] rounded-full font-semibold transition-all shrink-0 text-sm",
            selectedChip === "Proses Samsat"
              ? "bg-purple-600 text-white shadow-2xs"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          Samsat ({counts.samsat})
        </button>

        <button
          onClick={() => setSelectedChip("Pengantaran Dokumen")}
          className={cn(
            "px-4 py-2 min-h-[44px] rounded-full font-semibold transition-all shrink-0 text-sm",
            selectedChip === "Pengantaran Dokumen"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          Antar ({counts.antar})
        </button>
      </div>

      {/* Search Input for Mobile Quick Filter */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nopol, customer, nomor order..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 h-12 text-base bg-card rounded-xl border-border"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        )}
      </div>

      {/* Task Cards List */}
      {isLoading && myTasks.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-card/50 rounded-2xl">
          <Clock className="w-10 h-10 text-primary mx-auto mb-2 animate-spin opacity-70" />
          <h3 className="text-sm font-semibold text-foreground">Memuat Tugas Operasional...</h3>
          <p className="text-xs text-muted-foreground mt-1">Mengambil data tugas operasional dari server backend.</p>
        </Card>
      ) : error && myTasks.length === 0 ? (
        <Card className="p-8 text-center border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20 rounded-2xl">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-foreground">Gagal Memuat Tugas Operasional</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{error}</p>
          <Button onClick={() => refresh()} variant="outline" size="sm" className="mt-4 gap-2">
            <RotateCw className="w-4 h-4" /> Coba Lagi
          </Button>
        </Card>
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <MessengerTaskCard
              key={`${task.orderNo}-${task.keteranganTugas}`}
              task={task}
              onViewDetail={handleOpenDetail}
              onStartTask={handleStartTask}
              onContinueTask={handleContinueTask}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed bg-card/50 rounded-2xl">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
          <h3 className="text-sm font-semibold text-foreground">Tidak Ada Tugas</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery
              ? `Tidak ditemukan tugas dengan kata kunci "${searchQuery}".`
              : "Belum ada tugas operasional pada filter yang dipilih."}
          </p>
        </Card>
      )}

      {/* Task Detail Modal */}
      <MessengerMobileTaskDetail
        task={selectedTask}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        currentUser={currentUser}
        onTaskUpdated={() => {
          if (selectedTask) {
            const updated = myTasks.find((t) => t.orderNo === selectedTask.orderNo);
            if (updated) setSelectedTask(updated);
          }
        }}
        onNavigateToSamsat={(orderNo) => {
          if (onNavigateToTab) onNavigateToTab("samsat", orderNo);
        }}
      />
    </div>
  );
}
