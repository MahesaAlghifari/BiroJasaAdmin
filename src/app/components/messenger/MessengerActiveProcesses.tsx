import { useState, useMemo } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Upload,
  Calendar,
  Layers,
  MapPin,
} from "lucide-react";
import {
  MessengerTaskItem,
  getMessengerTasksForEmployee,
  UserContext,
} from "../../data/messengerTaskAdapter";
import { useOrderStore } from "../../data/orderStore";
import { MessengerTaskDetailModal } from "./MessengerTaskDetailModal";
import { cn } from "../ui/utils";

interface MessengerActiveProcessesProps {
  currentUser: UserContext;
}

export function MessengerActiveProcesses({ currentUser }: MessengerActiveProcessesProps) {
  const { activeOrders } = useOrderStore();
  const [selectedTask, setSelectedTask] = useState<MessengerTaskItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const samsatTasks = useMemo(() => {
    const all = getMessengerTasksForEmployee(activeOrders, currentUser);
    return all.filter((t) => t.keteranganTugas === "Proses Samsat" && t.status !== "Selesai");
  }, [activeOrders, currentUser]);

  const handleOpenDetail = (task: MessengerTaskItem) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-5 w-full">
      <div className="border-b border-border/80 pb-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          Proses Samsat Berjalan
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pantau progres tahapan komponen Samsat, estimasi waktu selesai, dan kelengkapan bukti proses.
        </p>
      </div>

      {samsatTasks.length > 0 ? (
        <div className="space-y-4">
          {samsatTasks.map((task) => {
            const comps = task.componentProgress || [];
            const completedCount = comps.filter((c) => c.status === "COMPLETED").length;
            const progressPercent = comps.length > 0 ? Math.round((completedCount / comps.length) * 100) : 0;

            return (
              <Card key={task.orderNo} className="p-4 sm:p-5 border bg-card space-y-4 shadow-2xs">
                {/* Header Info */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{task.orderNo}</span>
                      <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-200">
                        {task.jenisTugas}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200">
                        <MapPin className="w-3 h-3 mr-1" /> {task.lokasi}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mt-1">
                      {task.customer} ({task.nopol})
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-primary">
                      Progres: {completedCount} / {comps.length} Selesai ({progressPercent}%)
                    </span>
                    <div className="w-32 sm:w-40 h-2 bg-muted rounded-full overflow-hidden mt-1.5 ml-auto">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Components Grid */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Rincian Komponen Pengurusan:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {comps.map((comp) => (
                      <div
                        key={comp.componentId}
                        className={cn(
                          "p-3 rounded-lg border text-xs space-y-1.5 transition-colors",
                          comp.status === "COMPLETED" && "bg-emerald-50/20 border-emerald-200 dark:border-emerald-900/60",
                          comp.status === "IN_PROGRESS" && "bg-blue-50/20 border-blue-200 dark:border-blue-900/60 font-medium",
                          comp.status === "WAITING" && "bg-amber-50/20 border-amber-200 dark:border-amber-900/60",
                          comp.status === "NOT_STARTED" && "bg-muted/40 border-border/40 text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate text-foreground">
                            {comp.name}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            comp.status === "COMPLETED" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                            comp.status === "IN_PROGRESS" && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                            comp.status === "WAITING" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                            comp.status === "NOT_STARTED" && "bg-muted text-muted-foreground"
                          )}>
                            {comp.status === "COMPLETED" ? "Selesai" : (comp.status === "IN_PROGRESS" ? "Diproses" : (comp.status === "WAITING" ? "Menunggu" : "Belum"))}
                          </span>
                        </div>

                        {comp.waitingReason && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Kendala: {comp.waitingReason}
                          </p>
                        )}

                        {comp.estimatedCompletedAt && (
                          <p className="text-[10px] text-muted-foreground">
                            Estimasi: {new Date(comp.estimatedCompletedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}

                        {comp.evidence && comp.evidence.length > 0 && (
                          <div className="text-[10px] text-emerald-600 font-medium pt-1">
                            ✓ {comp.evidence.length} Bukti diunggah
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <div className="text-xs text-muted-foreground">
                    {task.deadlineAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Batas Waktu:{" "}
                        <strong className="text-foreground">
                          {new Date(task.deadlineAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })},{" "}
                          {new Date(task.deadlineAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </strong>
                      </span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleOpenDetail(task)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold h-8 px-3.5"
                  >
                    Kelola Komponen & Bukti <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed bg-card/50">
          <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-foreground">Tidak Ada Proses Samsat Aktif</p>
          <p className="text-xs text-muted-foreground mt-1">
            Saat ini Anda tidak memiliki berkas yang sedang berada di tahapan loket Samsat.
          </p>
        </Card>
      )}

      {/* Detail Modal */}
      <MessengerTaskDetailModal
        task={selectedTask}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        currentUser={currentUser}
        onTaskUpdated={() => {
          if (selectedTask) {
            const updated = samsatTasks.find((t) => t.orderNo === selectedTask.orderNo);
            if (updated) setSelectedTask(updated);
          }
        }}
      />
    </div>
  );
}
