import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  MapPin,
  Phone,
  Clock,
  Play,
  CheckCircle2,
  FileText,
  ExternalLink,
  Camera,
  MessageCircle,
  X,
  ArrowRight,
  Upload,
} from "lucide-react";
import {
  MessengerTaskItem,
  getStatusDisplayLabel,
  formatMobileDeadline,
  DeliveryHandoverProof,
} from "../../../domain/messenger/types";
import {
  startMessengerTask,
  updateMessengerTaskStatus,
  completeMessengerDelivery,
  completeMessengerPickup,
  UserContext,
} from "../../data/messengerTaskAdapter";
import { MessengerWaitingReasonDialog } from "./MessengerWaitingReasonDialog";
import { toast } from "sonner";
import { cn } from "../ui/utils";

interface MessengerMobileTaskDetailProps {
  task: MessengerTaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: UserContext;
  onTaskUpdated: () => void;
  onNavigateToSamsat?: (orderNo: string) => void;
}

export function MessengerMobileTaskDetail({
  task,
  open,
  onOpenChange,
  currentUser,
  onTaskUpdated,
  onNavigateToSamsat,
}: MessengerMobileTaskDetailProps) {
  if (!task) return null;

  const [isWaitingDialogOpen, setIsWaitingDialogOpen] = useState(false);

  // Hidden file input refs for real image picker
  const pickupFileInputRef = useRef<HTMLInputElement>(null);
  const deliveryFileInputRef = useRef<HTMLInputElement>(null);

  // Local state for Jemput Dokumen completion form
  const [pickupNotes, setPickupNotes] = useState(task.pickupProof?.notes || "");
  const [pickupPhotoUrl, setPickupPhotoUrl] = useState(task.pickupProof?.photoProofUrl || "");
  const [isSubmittingPickup, setIsSubmittingPickup] = useState(false);

  // Local state for Delivery Handover Form (Stage 7 -> 8)
  const [recipientName, setRecipientName] = useState(
    task.rawOrder.deliveryHandover?.recipientName || task.customer || ""
  );
  const [relationship, setRelationship] = useState(
    task.rawOrder.deliveryHandover?.relationship || "Pemilik Langsung"
  );
  const [deliveryNotes, setDeliveryNotes] = useState(
    task.rawOrder.deliveryHandover?.notes || ""
  );
  const [deliveryPhotoProof, setDeliveryPhotoProof] = useState<string>(
    task.rawOrder.deliveryHandover?.photoProofUrl || ""
  );
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  const isStartable =
    task.status === "Belum Diambil" ||
    task.statusCode === "NOT_STARTED" ||
    task.statusCode === "READY";
  const isInProgress =
    task.status === "Dalam Proses" || task.statusCode === "IN_PROGRESS";
  const isCompleted =
    task.status === "Selesai" || task.statusCode === "COMPLETED";

  const cleanPhone = task.phone ? task.phone.replace(/[^0-9]/g, "") : "";
  const waNumber = cleanPhone.startsWith("0") ? `62${cleanPhone.slice(1)}` : cleanPhone;
  const mapsUrl =
    task.rawOrder.alamatPenjemputan?.mapsUrl ||
    task.rawOrder.alamatPengantaran?.mapsUrl ||
    `https://maps.google.com/?q=${encodeURIComponent(task.lokasi)}`;

  const handleStartTask = () => {
    const res = startMessengerTask(task.orderNo, currentUser);
    if (res.success) {
      toast.success(`Tugas ${task.orderNo} berhasil dimulai!`);
      onTaskUpdated();
    } else {
      toast.error(res.error || "Gagal memulai tugas");
    }
  };

  const handleWaitingReasonSubmit = (reason: string, note: string) => {
    const res = updateMessengerTaskStatus(
      task.orderNo,
      "WAITING",
      { waitingReason: reason, note },
      currentUser
    );
    if (res.success) {
      toast.info(`Status tugas diubah menjadi Menunggu: ${reason}`);
      setIsWaitingDialogOpen(false);
      onTaskUpdated();
    } else {
      toast.error(res.error || "Gagal mengubah status tugas");
    }
  };

  // Real file handling for pickup photo
  const handlePickupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPickupPhotoUrl(result);
        toast.success(`Foto ${file.name} berhasil dilampirkan!`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Real file handling for delivery handover photo
  const handleDeliveryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setDeliveryPhotoProof(result);
        toast.success(`Foto serah terima ${file.name} berhasil dilampirkan!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompletePickup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPickup(true);

    const res = completeMessengerPickup(
      task.orderNo,
      {
        photoProofUrl: pickupPhotoUrl || undefined,
        notes: pickupNotes.trim() || undefined,
      },
      currentUser
    );

    setIsSubmittingPickup(false);
    if (res.success) {
      toast.success(`Penjemputan dokumen untuk order ${task.orderNo} selesai!`);
      onTaskUpdated();
      onOpenChange(false);
    } else {
      toast.error(res.error || "Gagal menyelesaikan penjemputan");
    }
  };

  const handleCompleteDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      toast.error("Nama penerima wajib diisi!");
      return;
    }

    setIsSubmittingDelivery(true);
    const proof: DeliveryHandoverProof = {
      recipientName: recipientName.trim(),
      relationship,
      photoProofUrl: deliveryPhotoProof || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60",
      notes: deliveryNotes.trim() || undefined,
      completedAt: new Date().toISOString(),
    };

    const res = completeMessengerDelivery(task.orderNo, proof, currentUser);
    setIsSubmittingDelivery(false);

    if (res.success) {
      toast.success(`Pengantaran order ${task.orderNo} berhasil diselesaikan (Stage 8)!`);
      onTaskUpdated();
      onOpenChange(false);
    } else {
      toast.error(res.error || "Gagal menyelesaikan pengantaran");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg w-full max-h-[92vh] overflow-y-auto p-0 gap-0 text-left border-border bg-card">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-card border-b border-border/80 px-4 py-3.5 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle asChild>
                  <span className="font-bold text-lg sm:text-xl text-foreground tracking-tight">
                    {task.orderNo}
                  </span>
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
                  {task.keteranganTugas}
                </Badge>
              </div>
              <DialogDescription asChild>
                <p className="text-sm sm:text-base text-muted-foreground mt-0.5 truncate">
                  {task.customer} • <span className="font-mono text-foreground font-bold">{task.nopol}</span>
                  {task.rawOrder.jenisKendaraan && (
                    <span className="text-xs text-muted-foreground ml-1 font-medium">({task.rawOrder.jenisKendaraan}{task.rawOrder.tahunKendaraan ? ` • ${task.rawOrder.tahunKendaraan}` : ""})</span>
                  )}
                </p>
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 p-0 rounded-full shrink-0"
              aria-label="Tutup Detail"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 sm:p-5 space-y-4 pb-24">
            {/* Status & Deadline Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block">
                  Status Tugas
                </span>
                <span className="text-sm sm:text-base font-bold text-foreground">
                  {getStatusDisplayLabel(task.statusCode || task.status)}
                </span>
                {task.waitingReason && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                    Kendala: {task.waitingReason}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block">
                  Batas Waktu
                </span>
                <span className="text-sm sm:text-base font-semibold text-foreground">
                  {formatMobileDeadline(task.deadlineAt)}
                </span>
              </div>
            </div>

            {/* Quick Contact & Navigation Actions */}
            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm sm:text-base text-foreground block">Alamat Operasional</span>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{task.lokasi}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2.5 border-t border-border/60">
                {task.phone ? (
                  <a
                    href={`tel:${task.phone}`}
                    className="flex flex-col items-center justify-center py-2.5 px-1 min-h-[48px] rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground text-center transition-colors"
                  >
                    <Phone className="w-4 h-4 text-emerald-600 mb-1" />
                    <span className="text-xs font-semibold">Telepon</span>
                  </a>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2.5 px-1 min-h-[48px] rounded-xl border border-border/40 opacity-50 text-center">
                    <Phone className="w-4 h-4 text-muted-foreground mb-1" />
                    <span className="text-xs">Tanpa No</span>
                  </div>
                )}

                {waNumber ? (
                  <a
                    href={`https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(task.customer)},%20saya%20${encodeURIComponent(currentUser.userName)}%20dari%20Biro%20Jasa%20terkait%20order%20${task.orderNo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center py-2.5 px-1 min-h-[48px] rounded-xl border border-border bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-center transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 mb-1" />
                    <span className="text-xs font-semibold">WhatsApp</span>
                  </a>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2.5 px-1 min-h-[48px] rounded-xl border border-border/40 opacity-50 text-center">
                    <MessageCircle className="w-4 h-4 text-muted-foreground mb-1" />
                    <span className="text-xs">WhatsApp</span>
                  </div>
                )}

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center py-2.5 px-1 min-h-[48px] rounded-xl border border-border bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-center transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-blue-600 mb-1" />
                  <span className="text-xs font-semibold">Google Maps</span>
                </a>
              </div>
            </div>

            {/* === WORKFLOW SECTION: JEMPUT DOKUMEN === */}
            {task.keteranganTugas === "Jemput Dokumen" && (
              <div className="space-y-4">
                {/* Physical Documents to Pick Up */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                    Dokumen Fisik yang Perlu Diambil
                  </h4>
                  <div className="space-y-2 pt-1">
                    {Object.entries(task.rawOrder.clientDocuments || {}).length > 0 ? (
                      Object.entries(task.rawOrder.clientDocuments || {}).map(([key, doc]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-semibold text-foreground uppercase text-xs sm:text-sm">
                              {key}: {doc.name || "Berkas Fisik"}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {doc.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        STNK Asli, BPKB Asli, KTP Pemilik Asli.
                      </p>
                    )}
                  </div>
                </div>

                {/* Selesaikan Penjemputan Form (When in progress) */}
                {isInProgress && (
                  <form onSubmit={handleCompletePickup} className="p-4 rounded-xl border border-border bg-card space-y-3.5">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">
                        Konfirmasi Selesai Penjemputan
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Pastikan dokumen fisik telah diterima dari customer secara lengkap.
                      </p>
                    </div>

                    {/* Hidden Real File Input */}
                    <input
                      ref={pickupFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePickupFileChange}
                    />

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">Foto Bukti Penjemputan (Opsional)</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => pickupFileInputRef.current?.click()}
                          className="min-h-[44px] text-sm px-4 rounded-xl"
                        >
                          <Camera className="w-4 h-4 mr-2 text-primary" />
                          {pickupPhotoUrl ? "Ganti Foto" : "Ambil Foto / Unggah"}
                        </Button>
                        {pickupPhotoUrl && (
                          <div className="flex items-center gap-2">
                            <img
                              src={pickupPhotoUrl}
                              alt="Bukti penjemputan"
                              className="w-10 h-10 object-cover rounded-lg border border-border"
                            />
                            <span className="text-xs text-emerald-600 font-semibold">
                              ✓ Foto terlampir
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">Catatan Penjemputan</Label>
                      <Textarea
                        placeholder="Catatan kondisi berkas, titipan tambahan, dll..."
                        value={pickupNotes}
                        onChange={(e) => setPickupNotes(e.target.value)}
                        rows={3}
                        className="text-base min-h-[80px] resize-none rounded-xl"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmittingPickup}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold min-h-[48px] rounded-xl shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {isSubmittingPickup ? "Menyimpan..." : "Selesaikan Jemput Dokumen"}
                    </Button>
                  </form>
                )}

                {/* Bukti Penjemputan Tersimpan (When completed or proof exists) */}
                {task.rawOrder.pickupProof && (
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Bukti Penjemputan Terverifikasi
                      </span>
                      {task.rawOrder.pickupProof.completedAt && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(task.rawOrder.pickupProof.completedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {task.rawOrder.pickupProof.photoProofUrl && (
                      <img
                        src={task.rawOrder.pickupProof.photoProofUrl}
                        alt="Bukti penjemputan"
                        className="w-full max-h-48 object-cover rounded-lg border border-border"
                      />
                    )}
                    {task.rawOrder.pickupProof.notes && (
                      <p className="text-xs text-foreground/80 italic bg-card p-2 rounded-lg border border-border/60">
                        Catatan: "{task.rawOrder.pickupProof.notes}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* === WORKFLOW SECTION: PENGANTARAN DOKUMEN === */}
            {task.keteranganTugas === "Pengantaran Dokumen" && (
              <div className="space-y-4">
                {/* Form Serah Terima Dokumen (Stage 7 -> 8) */}
                {isInProgress && (
                  <form onSubmit={handleCompleteDelivery} className="p-4 rounded-xl border border-border bg-card space-y-3.5">
                    <div className="border-b border-border/60 pb-2.5">
                      <h4 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">
                        Form Bukti Serah Terima Dokumen
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Isi nama penerima dan ambil foto serah terima untuk menyelesaikan order ke Stage 8.
                      </p>
                    </div>

                    {/* Hidden Real File Input */}
                    <input
                      ref={deliveryFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleDeliveryFileChange}
                    />

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground">
                        Nama Penerima <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Nama jelas orang yang menerima dokumen"
                        className="min-h-[44px] text-base rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground">Hubungan dengan Pemilik</Label>
                      <Select value={relationship} onValueChange={setRelationship}>
                        <SelectTrigger className="min-h-[44px] text-base rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pemilik Langsung">Pemilik Langsung</SelectItem>
                          <SelectItem value="Keluarga">Keluarga (Suami/Istri/Anak)</SelectItem>
                          <SelectItem value="Karyawan / Staff">Karyawan / Staff Kantor</SelectItem>
                          <SelectItem value="Satpam / Resepsionis">Satpam / Resepsionis</SelectItem>
                          <SelectItem value="Lainnya">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">Foto Bukti Serah Terima</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => deliveryFileInputRef.current?.click()}
                          className="min-h-[44px] text-sm px-4 rounded-xl"
                        >
                          <Camera className="w-4 h-4 mr-2 text-primary" />
                          {deliveryPhotoProof ? "Ganti Foto" : "Ambil Foto Serah Terima"}
                        </Button>
                        {deliveryPhotoProof && (
                          <div className="flex items-center gap-2">
                            <img
                              src={deliveryPhotoProof}
                              alt="Bukti serah terima"
                              className="w-10 h-10 object-cover rounded-lg border border-border"
                            />
                            <span className="text-xs text-emerald-600 font-semibold">
                              ✓ Foto terlampir
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground">Catatan Pengantaran (Opsional)</Label>
                      <Textarea
                        placeholder="Contoh: Diterima oleh satpam pos depan, dokumen lengkap..."
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        rows={3}
                        className="text-base min-h-[80px] resize-none rounded-xl"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmittingDelivery}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold min-h-[48px] rounded-xl shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {isSubmittingDelivery ? "Menyimpan Serah Terima..." : "Selesaikan Pengantaran (Stage 8)"}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* === WORKFLOW SECTION: PROSES SAMSAT === */}
            {task.keteranganTugas === "Proses Samsat" && (
              <div className="p-4 sm:p-5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 space-y-3 text-center">
                <h4 className="text-sm sm:text-base font-bold text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                  Pengurusan Komponen Samsat
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Kelola progres loket Samsat, estimasi durasi, dan tambah komponen langsung pada tab <strong>Proses Samsat</strong>.
                </p>
                {onNavigateToSamsat && (
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      onNavigateToSamsat(task.orderNo);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold min-h-[44px] px-5 rounded-xl shadow-xs"
                  >
                    Buka Pengurusan Samsat <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-0 z-20 bg-card border-t border-border px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
            <Button
              variant="outline"
              onClick={() => setIsWaitingDialogOpen(true)}
              className="text-sm text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 min-h-[44px] px-4 rounded-xl"
            >
              <Clock className="w-4 h-4 mr-1.5" />
              Kendala
            </Button>

            {isStartable && (
              <Button
                onClick={handleStartTask}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base font-semibold min-h-[44px] px-5 flex-1 rounded-xl shadow-xs"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                Mulai Tugas
              </Button>
            )}

            {isCompleted && (
              <div className="text-sm text-emerald-600 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" /> Tugas Selesai
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Waiting Reason Dialog */}
      <MessengerWaitingReasonDialog
        open={isWaitingDialogOpen}
        onOpenChange={setIsWaitingDialogOpen}
        onSubmit={handleWaitingReasonSubmit}
      />
    </>
  );
}
