import { useNavigate } from "react-router";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import {
  Bell,
  CheckCheck,
  Check,
  ArrowRight,
  Phone,
  MessageCircle,
  ExternalLink,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "./ui/utils";
import { NotificationItem } from "../data/notificationAdapter";

interface NotificationPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string | number) => void;
  children: React.ReactNode;
}

export function NotificationPopover({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onMarkAsRead,
  children,
}: NotificationPopoverProps) {
  const navigate = useNavigate();

  const handleItemClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      onMarkAsRead(notif.id);
    }
    // Navigate to related order or invoice if orderNo exists
    if (notif.orderNo) {
      onOpenChange(false);
      navigate("/order/tracking");
    }
  };

  const handleViewAll = () => {
    onOpenChange(false);
    navigate("/notifikasi");
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[380px] sm:w-[420px] max-w-[calc(100vw-1.5rem)] p-0 shadow-lg border border-border/80 bg-card text-card-foreground rounded-xl flex flex-col overflow-hidden max-h-[85vh] sm:max-h-[520px]"
      >
        {/* Header */}
        <div className="p-3.5 px-4 border-b border-border/80 bg-muted/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Notifikasi</h3>
            {unreadCount > 0 ? (
              <Badge status="error" className="px-1.5 py-0 text-[10px] font-mono tabular-nums">
                {unreadCount} Baru
              </Badge>
            ) : (
              <Badge status="success" className="px-1.5 py-0 text-[10px]">
                Semua Terbaca
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              title="Tandai semua notifikasi telah dibaca"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tandai Dibaca
            </Button>
          )}
        </div>

        {/* List of Notifications */}
        <ScrollArea className="flex-1 max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground/50">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">Tidak Ada Notifikasi</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
                Semua tagihan dan pengingat operasional sudah tertangani dengan baik.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notif) => {
                const isUnread = !notif.isRead;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={cn(
                      "p-3 sm:p-3.5 transition-colors cursor-pointer group text-left relative",
                      isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                    )}
                  >
                    {/* Unread Accent Bar */}
                    {isUnread && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                    )}

                    {/* Metadata Row */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <Badge
                        status={
                          notif.priority === "high"
                            ? "error"
                            : notif.priority === "medium"
                            ? "warning"
                            : "info"
                        }
                        className="text-[10px] px-1.5 py-0 leading-tight"
                      >
                        {notif.priority === "high"
                          ? "Urgent"
                          : notif.priority === "medium"
                          ? "Penting"
                          : "Info"}
                      </Badge>

                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-border/80 text-muted-foreground font-normal"
                      >
                        {notif.type === "tagihan" ? "Tagihan" : "Operasional"}
                      </Badge>

                      {notif.daysOverdue && notif.daysOverdue > 0 ? (
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Telat {notif.daysOverdue} hari
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {notif.jatuhTempo}
                        </span>
                      )}
                    </div>

                    {/* Title & Customer */}
                    <p
                      className={cn(
                        "text-xs leading-snug",
                        isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                      )}
                    >
                      {notif.title}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1 truncate">
                      <span className="font-medium text-foreground truncate max-w-[150px]">
                        {notif.customer}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-primary font-medium">{notif.nopol}</span>
                      {notif.layanan && (
                        <>
                          <span>•</span>
                          <span className="truncate">{notif.layanan}</span>
                        </>
                      )}
                    </div>

                    {/* Bottom Row: Sisa Tagihan & Quick Actions */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40">
                      {notif.sisa > 0 ? (
                        <span className="text-[11px] font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                          Sisa: Rp {notif.sisa.toLocaleString("id-ID")}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Order Siap Proses
                        </span>
                      )}

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => onMarkAsRead(notif.id)}
                            title="Tandai telah dibaca"
                          >
                            <Check className="w-3 h-3 mr-0.5" />
                            Dibaca
                          </Button>
                        )}
                        {notif.telepon && notif.telepon !== "-" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground border-border"
                            onClick={() => {
                              const msg = `Halo ${notif.customer}, pengingat mengenai ${notif.title} untuk kendaraan ${notif.nopol}. Sisa: Rp ${notif.sisa.toLocaleString("id-ID")}. Terima kasih.`;
                              window.open(
                                `https://wa.me/${notif.telepon.replace(/^0/, "62")}?text=${encodeURIComponent(msg)}`,
                                "_blank"
                              );
                            }}
                            title="Hubungi WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            WA
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2.5 px-3 border-t border-border/80 bg-muted/20 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAll}
            className="w-full h-8 text-xs font-medium justify-between text-muted-foreground hover:text-foreground bg-card border-border/80 shadow-2xs"
          >
            <span>Lihat Semua Notifikasi ({notifications.length})</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
