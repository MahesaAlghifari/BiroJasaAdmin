import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card } from "./ui/card";
import { Badge, getStatusBadgeClass } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Bell, AlertCircle, Calendar, User, Phone, CreditCard, Clock, MapPin } from "lucide-react";

export interface NotificationItem {
  id: number | string;
  type: "tagihan" | "reminder" | "update";
  title: string;
  customer: string;
  nopol: string;
  layanan: string;
  totalTagihan: number;
  terbayar: number;
  sisa: number;
  jatuhTempo: string;
  telepon: string;
  alamat: string;
  priority: "high" | "medium" | "low";
  daysOverdue?: number;
  orderNo?: string;
  isRead?: boolean;
}

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NotificationItem[];
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string | number) => void;
}

export function NotificationDialog({
  open,
  onOpenChange,
  notifications,
  onMarkAllAsRead,
}: NotificationDialogProps) {
  const getPriorityColor = (priority: string) => getStatusBadgeClass(priority);

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Urgent";
      case "medium":
        return "Penting";
      case "low":
        return "Normal";
      default:
        return "Info";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl lg:max-w-4xl max-h-[90dvh] p-4 sm:p-6 overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0 pb-2 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Bell className="w-4 h-4 text-primary" />
              Notifikasi & Reminder Tagihan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground sr-only">
              Daftar notifikasi aktivitas dan pengingat tagihan operasional
            </DialogDescription>
          </div>
          {onMarkAllAsRead && notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground mr-6"
              onClick={onMarkAllAsRead}
            >
              Tandai Semua Dibaca
            </Button>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[75dvh] pr-1 sm:pr-4">
          <div className="space-y-3.5">
            {notifications.length === 0 ? (
              <Card className="p-6 text-center border border-border/80 bg-card">
                <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Tidak ada notifikasi baru</p>
              </Card>
            ) : (
              notifications.map((notif) => (
                <Card 
                  key={notif.id} 
                  className={`p-4 border border-border/80 bg-card shadow-xs border-l-4 ${
                    notif.priority === "high" 
                      ? "border-l-rose-500" 
                      : notif.priority === "medium" 
                      ? "border-l-amber-500" 
                      : "border-l-primary"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        notif.priority === "high" 
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                          : notif.priority === "medium" 
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-semibold text-foreground">{notif.title}</h4>
                          <Badge status={notif.priority}>
                            {getPriorityLabel(notif.priority)}
                          </Badge>
                        </div>
                        {notif.daysOverdue && notif.daysOverdue > 0 && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                            Telah jatuh tempo {notif.daysOverdue} hari yang lalu
                          </p>
                        )}
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Customer:</span>
                        <span className="font-medium text-foreground">{notif.customer}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Telepon:</span>
                        <span className="font-mono tabular-nums text-foreground">{notif.telepon}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Alamat:</span>
                        <span className="text-foreground/80">{notif.alamat}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Nopol:</span>
                        <span className="font-mono text-primary font-medium">{notif.nopol}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Layanan:</span>
                        <span className="text-foreground">{notif.layanan}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Jatuh Tempo:</span>
                        <span className={
                          notif.daysOverdue && notif.daysOverdue > 0 
                            ? "text-rose-600 dark:text-rose-400 font-medium" 
                            : "text-foreground font-medium"
                        }>
                          {notif.jatuhTempo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Payment Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30">
                      <p className="text-[11px] text-muted-foreground mb-0.5">Total Tagihan</p>
                      <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                        Rp {notif.totalTagihan.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
                      <p className="text-[11px] text-muted-foreground mb-0.5">Terbayar</p>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                        Rp {notif.terbayar.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30">
                      <p className="text-[11px] text-muted-foreground mb-0.5">Sisa Tagihan</p>
                      <p className="text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                        Rp {notif.sisa.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-border text-xs h-8 sm:h-7 w-full sm:w-auto"
                      onClick={() => {
                        navigator.clipboard.writeText(notif.telepon);
                      }}
                    >
                      <Phone className="w-3 h-3 mr-1" />
                      Copy No. HP
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs text-xs h-8 sm:h-7 w-full sm:w-auto"
                      onClick={() => {
                        const message = `Halo ${notif.customer}, kami ingin mengingatkan bahwa tagihan untuk ${notif.layanan} (${notif.nopol}) sebesar Rp ${notif.sisa.toLocaleString("id-ID")} telah jatuh tempo pada ${notif.jatuhTempo}. Mohon segera melakukan pembayaran. Terima kasih.`;
                        window.open(`https://wa.me/${notif.telepon.replace(/^0/, '62')}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                    >
                      <CreditCard className="w-3 h-3 mr-1" />
                      Hubungi via WhatsApp
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
