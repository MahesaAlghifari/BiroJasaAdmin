import { useState, useMemo } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  History,
  Search,
  CheckCircle2,
  Calendar,
  Eye,
  User,
  MapPin,
} from "lucide-react";
import {
  MessengerTaskItem,
  getMessengerTaskHistoryForEmployee,
  UserContext,
} from "../../data/messengerTaskAdapter";
import { useOrderStore } from "../../data/orderStore";
import { MessengerTaskDetailModal } from "./MessengerTaskDetailModal";

interface MessengerTaskHistoryProps {
  currentUser: UserContext;
}

export function MessengerTaskHistory({ currentUser }: MessengerTaskHistoryProps) {
  const { activeOrders, archivedOrders } = useOrderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<MessengerTaskItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const historyTasks = useMemo(() => {
    return getMessengerTaskHistoryForEmployee(
      activeOrders,
      currentUser.employeeId || "",
      archivedOrders
    );
  }, [activeOrders, archivedOrders, currentUser.employeeId]);

  const filteredHistory = useMemo(() => {
    return historyTasks.filter((t) => {
      return (
        searchTerm === "" ||
        t.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nopol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.jenisTugas.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [historyTasks, searchTerm]);

  return (
    <div className="space-y-5 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Riwayat Tugas Selesai
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daftar tugas yang telah Anda selesaikan beserta bukti serah terima berkas.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nomor order / customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs w-full"
          />
        </div>
      </div>

      {filteredHistory.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredHistory.map((task) => {
            const handover = task.rawOrder.deliveryHandover;
            const completedDate = task.completedAt || task.tanggalSelesai || "-";

            return (
              <Card key={task.orderNo} className="p-4 border bg-card space-y-3 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">{task.orderNo}</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                      Selesai
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {completedDate}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground">{task.customer}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground">
                      {task.nopol}
                    </span>
                    <span>•</span>
                    <span>{task.jenisTugas}</span>
                  </div>
                </div>

                {/* Handover summary if available */}
                {handover && (
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-primary" /> Penerima:
                      </span>
                      <strong className="text-foreground">{handover.recipientName}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Hubungan:</span>
                      <span>{handover.relationship}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    <MapPin className="w-3 h-3 inline mr-1 text-primary" />
                    {task.lokasi}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsDetailOpen(true);
                    }}
                    className="text-xs h-7 px-2.5"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Rekap Detail
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed bg-card/50">
          <History className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-foreground">Belum Ada Riwayat Tugas Selesai</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tugas yang telah Anda selesaikan dan diserahkan ke customer akan tampil di sini.
          </p>
        </Card>
      )}

      {/* Detail Modal */}
      <MessengerTaskDetailModal
        task={selectedTask}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        currentUser={currentUser}
        onTaskUpdated={() => {}}
      />
    </div>
  );
}
