import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  MapPin,
  Phone,
  Clock,
  AlertTriangle,
  Play,
  CheckCircle2,
  Upload,
  FileText,
  User,
  ExternalLink,
  Camera,
  History,
  Send,
} from "lucide-react";
import {
  MessengerTaskItem,
  MessengerComponentProgress,
  ComponentEvidence,
  DeliveryHandoverProof,
  getStatusDisplayLabel,
  WaitingReason,
} from "../../../domain/messenger/types";
import {
  startMessengerTask,
  updateMessengerTaskStatus,
  updateMessengerComponent,
  uploadMessengerEvidence,
  completeMessengerDelivery,
  calculateEstimatedCompletion,
  UserContext,
} from "../../data/messengerTaskAdapter";
import { MessengerWaitingReasonDialog } from "./MessengerWaitingReasonDialog";
import { toast } from "sonner";
import { cn } from "../ui/utils";

interface MessengerTaskDetailModalProps {
  task: MessengerTaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: UserContext;
  onTaskUpdated: () => void;
}

const DURATION_OPTIONS = [
  { label: "1 Jam", minutes: 60 },
  { label: "2 Jam", minutes: 120 },
  { label: "4 Jam", minutes: 240 },
  { label: "8 Jam", minutes: 480 },
  { label: "12 Jam", minutes: 720 },
  { label: "24 Jam (1 Hari)", minutes: 1440 },
  { label: "2 Hari", minutes: 2880 },
  { label: "3 Hari", minutes: 4320 },
  { label: "5 Hari", minutes: 7200 },
];

export function MessengerTaskDetailModal({
  task,
  open,
  onOpenChange,
  currentUser,
  onTaskUpdated,
}: MessengerTaskDetailModalProps) {
  if (!task) return null;

  const [activeTab, setActiveTab] = useState<string>("operational");
  const [isWaitingDialogOpen, setIsWaitingDialogOpen] = useState(false);
  const [waitingTargetComponentId, setWaitingTargetComponentId] = useState<string | null>(null);

  // Local state for Delivery Handover Form (Stage 7 -> 8)
  const [recipientName, setRecipientName] = useState(task.rawOrder.deliveryHandover?.recipientName || task.customer || "");
  const [relationship, setRelationship] = useState(task.rawOrder.deliveryHandover?.relationship || "Pemilik Langsung");
  const [deliveryNotes, setDeliveryNotes] = useState(task.rawOrder.deliveryHandover?.notes || "");
  const [photoProofName, setPhotoProofName] = useState<string | null>(task.rawOrder.deliveryHandover?.photoProofUrl ? "Foto_Serah_Terima.jpg" : null);

  // Handler: Start task
  const handleStartTask = () => {
    const res = startMessengerTask(task.orderNo, currentUser);
    if (res.success) {
      toast.success(`Tugas ${task.orderNo} berhasil dimulai!`);
      onTaskUpdated();
    } else {
      toast.error(res.error || "Gagal memulai tugas");
    }
  };

  // Handler: Change task status to Waiting
  const handleOpenWaitingDialog = (componentId?: string) => {
    setWaitingTargetComponentId(componentId || null);
    setIsWaitingDialogOpen(true);
  };

  const handleWaitingDialogSubmit = (reason: WaitingReason, note: string) => {
    if (waitingTargetComponentId) {
      // Component-level waiting
      const res = updateMessengerComponent(
        task.orderNo,
        waitingTargetComponentId,
        { status: "WAITING", waitingReason: reason, note },
        currentUser
      );
      if (res.success) {
        toast.success(`Status komponen diubah ke Menunggu (${reason})`);
        onTaskUpdated();
      } else {
        toast.error(res.error || "Gagal memperbarui komponen");
      }
    } else {
      // Task-level waiting
      const res = updateMessengerTaskStatus(
        task.orderNo,
        "WAITING",
        { waitingReason: reason, note },
        currentUser
      );
      if (res.success) {
        toast.success(`Status tugas diubah ke Menunggu (${reason})`);
        onTaskUpdated();
      } else {
        toast.error(res.error || "Gagal mengubah status tugas");
      }
    }
    setIsWaitingDialogOpen(false);
    setWaitingTargetComponentId(null);
  };

  // Handler: Update component status
  const handleUpdateComponentStatus = (componentId: string, status: any) => {
    if (status === "WAITING") {
      handleOpenWaitingDialog(componentId);
      return;
    }

    const updates: Partial<MessengerComponentProgress> = { status };
    if (status === "IN_PROGRESS" && !task.startedAt) {
      updates.startedAt = new Date().toISOString();
    }

    const res = updateMessengerComponent(task.orderNo, componentId, updates, currentUser);
    if (res.success) {
      toast.success("Status komponen diperbarui");
      onTaskUpdated();
    } else {
      toast.error(res.error || "Gagal memperbarui komponen");
    }
  };

  // Handler: Update component duration estimation
  const handleUpdateComponentDuration = (componentId: string, minutes: number) => {
    const res = updateMessengerComponent(
      task.orderNo,
      componentId,
      {
        status: "IN_PROGRESS",
        estimatedDurationMinutes: minutes,
      },
      currentUser
    );
    if (res.success) {
      toast.success(`Estimasi durasi diperbarui (${minutes} menit)`);
      onTaskUpdated();
    } else {
      toast.error(res.error || "Gagal memperbarui estimasi");
    }
  };

  // Handler: Mock evidence upload for component
  const handleSimulateEvidenceUpload = (componentId: string, compName: string) => {
    const evidence: ComponentEvidence = {
      id: `ev-${Date.now()}`,
      fileUrl: `https://mock.storage/evidence_${componentId}_${Date.now()}.jpg`,
      fileType: "IMAGE",
      fileName: `Bukti_${compName.replace(/\s+/g, "_")}.jpg`,
      fileSize: "1.4 MB",
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.userName,
    };

    const res = uploadMessengerEvidence(task.orderNo, componentId, evidence, currentUser);
    if (res.success) {
      toast.success(`Bukti untuk ${compName} berhasil diunggah!`);
      onTaskUpdated();
    } else {
      toast.error(res.error || "Gagal mengunggah bukti");
    }
  };

  // Handler: Submit delivery completion (Stage 7 -> 8)
  const handleCompleteDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      toast.error("Nama penerima dokumen wajib diisi!");
      return;
    }

    const handoverProof: DeliveryHandoverProof = {
      recipientName: recipientName.trim(),
      relationship,
      photoProofUrl: photoProofName ? `https://mock.storage/${photoProofName}` : "https://mock.storage/foto_serah_terima_default.jpg",
      notes: deliveryNotes.trim(),
      completedAt: new Date().toISOString(),
    };

    const res = completeMessengerDelivery(task.orderNo, handoverProof, currentUser);
    if (res.success) {
      toast.success("Serah terima dokumen berhasil diselesaikan! Order berpindah ke Dokumen Telah Diterima.");
      onTaskUpdated();
      onOpenChange(false);
    } else {
      toast.error(res.error || "Gagal menyelesaikan pengantaran");
    }
  };

  const mapsUrl =
    task.rawOrder.alamatPenjemputan?.mapsUrl ||
    task.rawOrder.alamatPengantaran?.mapsUrl ||
    `https://maps.google.com/?q=${encodeURIComponent(task.lokasi)}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="border-b border-border/80 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Detail Tugas: {task.orderNo}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Informasi tugas messenger, data pelanggan, alamat, dan instruksi penugasan
                </DialogDescription>
                <Badge variant="outline" className="text-xs">
                  {task.keteranganTugas}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Status:
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {getStatusDisplayLabel(task.statusCode || task.status)}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-3">
            <TabsList className="grid grid-cols-3 w-full h-9">
              <TabsTrigger value="operational" className="text-xs">
                Alur Operasional
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs">
                Informasi Order
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">
                Riwayat & Log
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OPERATIONAL WORKFLOW */}
            <TabsContent value="operational" className="space-y-4 pt-3">
              {/* === CASE 1: JEMPUT DOKUMEN === */}
              {task.keteranganTugas === "Jemput Dokumen" && (
                <div className="space-y-4">
                  {/* Action Bar for Jemput */}
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${task.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" /> Hubungi Customer
                      </a>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Buka Alamat Maps
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenWaitingDialog()}
                        className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" /> Kendala / Menunggu
                      </Button>

                      {task.status === "Belum Diambil" && (
                        <Button
                          size="sm"
                          onClick={handleStartTask}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5 mr-1 fill-current" /> Mulai Penjemputan
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Dokumen yang Diambil */}
                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Dokumen Fisik yang Diambil
                    </h4>
                    <div className="space-y-1.5 pt-1">
                      {Object.entries(task.rawOrder.clientDocuments || {}).map(([key, doc]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-medium text-foreground uppercase">
                              {key}: {doc.name || "Berkas Fisik"}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {doc.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* === CASE 2: PROSES SAMSAT === */}
              {task.keteranganTugas === "Proses Samsat" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
                    <div>
                      <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                        Lokasi Samsat: {task.lokasi}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Layanan: {task.jenisTugas} ({task.rawOrder.wilayahSamsatAsal})
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenWaitingDialog()}
                      className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1" /> Kendala Samsat
                    </Button>
                  </div>

                  {/* Component Breakdown List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Komponen Pengurusan Samsat
                    </h4>

                    {(task.componentProgress && task.componentProgress.length > 0
                      ? task.componentProgress
                      : (task.rawOrder.samsatProcesses || []).map(p => ({
                          componentId: p.id,
                          name: p.name,
                          category: p.category,
                          nominal: p.actualCost || p.basePrice,
                          status: p.status === "Selesai" ? "COMPLETED" : (p.status === "Sedang Diproses" ? "IN_PROGRESS" : "NOT_STARTED"),
                        } as MessengerComponentProgress))
                    ).map((comp) => {
                      const isCompCompleted = comp.status === "COMPLETED";
                      const isCompInProgress = comp.status === "IN_PROGRESS";
                      const isCompWaiting = comp.status === "WAITING";

                      return (
                        <div
                          key={comp.componentId}
                          className={cn(
                            "p-3.5 rounded-xl border bg-card space-y-3 transition-colors",
                            isCompCompleted && "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10",
                            isCompWaiting && "border-amber-200 dark:border-amber-900/60 bg-amber-50/10"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-foreground">
                                  {comp.name}
                                </span>
                                {comp.category && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {comp.category}
                                  </Badge>
                                )}
                              </div>
                              {comp.nominal !== undefined && comp.nominal > 0 && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Biaya Dasar: Rp {comp.nominal.toLocaleString("id-ID")}
                                </p>
                              )}
                            </div>

                            {/* Status Selector */}
                            <div className="flex items-center gap-2">
                              <Select
                                value={comp.status}
                                onValueChange={(val) => handleUpdateComponentStatus(comp.componentId, val)}
                              >
                                <SelectTrigger className="h-7 text-xs w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NOT_STARTED" className="text-xs">Belum Dikerjakan</SelectItem>
                                  <SelectItem value="IN_PROGRESS" className="text-xs">Sedang Dikerjakan</SelectItem>
                                  <SelectItem value="WAITING" className="text-xs">Menunggu</SelectItem>
                                  <SelectItem value="COMPLETED" className="text-xs">Selesai</SelectItem>
                                  <SelectItem value="NOT_REQUIRED" className="text-xs">Tidak Diperlukan</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Waiting Reason Alert if waiting */}
                          {isCompWaiting && comp.waitingReason && (
                            <div className="p-2 rounded-lg bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
                              <span>Menunggu: {comp.waitingReason}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenWaitingDialog(comp.componentId)}
                                className="h-6 text-[10px] text-amber-900 dark:text-amber-200 underline"
                              >
                                Ubah Alasan
                              </Button>
                            </div>
                          )}

                          {/* Estimation & Duration arithmetic */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Estimasi Durasi:</span>
                              <Select
                                value={comp.estimatedDurationMinutes ? String(comp.estimatedDurationMinutes) : ""}
                                onValueChange={(v) => handleUpdateComponentDuration(comp.componentId, Number(v))}
                              >
                                <SelectTrigger className="h-6 text-[11px] w-28">
                                  <SelectValue placeholder="Pilih durasi" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DURATION_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.minutes} value={String(opt.minutes)} className="text-xs">
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {comp.estimatedCompletedAt && (
                              <div className="sm:text-right text-[11px] text-muted-foreground">
                                Estimasi Selesai:{" "}
                                <span className="font-semibold text-foreground">
                                  {new Date(comp.estimatedCompletedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })},{" "}
                                  {new Date(comp.estimatedCompletedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Evidence list & Upload action */}
                          <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-medium text-muted-foreground">
                                Bukti Foto/PDF:
                              </span>
                              {(comp.evidence && comp.evidence.length > 0) ? (
                                comp.evidence.map((ev) => (
                                  <span
                                    key={ev.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[10px] font-medium text-foreground"
                                  >
                                    <FileText className="w-3 h-3 text-primary" />
                                    {ev.fileName || "Bukti.jpg"}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">
                                  Belum ada bukti diunggah
                                </span>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSimulateEvidenceUpload(comp.componentId, comp.name)}
                              className="h-7 text-xs"
                            >
                              <Upload className="w-3 h-3 mr-1" /> Unggah Bukti
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* === CASE 3: PENGANTARAN DOKUMEN === */}
              {task.keteranganTugas === "Pengantaran Dokumen" && (
                <div className="space-y-4">
                  {/* Delivery Location & Recipient Info */}
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                      Alamat Tujuan Pengantaran
                    </h4>
                    <p className="text-xs text-foreground font-medium">
                      {task.rawOrder.alamatPengantaran?.detail || task.lokasi}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <a
                        href={`tel:${task.phone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Phone className="w-3 h-3" /> Hubungi Customer ({task.phone})
                      </a>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <ExternalLink className="w-3 h-3" /> Buka Google Maps
                      </a>
                    </div>
                  </div>

                  {/* Bukti Serah Terima Form */}
                  <form onSubmit={handleCompleteDelivery} className="p-4 rounded-xl border border-border bg-card space-y-3.5">
                    <div className="border-b border-border pb-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Form Bukti Serah Terima Dokumen (Penyelesaian Tugas)
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Lengkapi form serah terima untuk menyelesaikan pengantaran ke customer (Stage 7 → Stage 8).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Nama Penerima Dokumen <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="Nama lengkap yang menerima berkas..."
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          required
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Hubungan dengan Customer <span className="text-destructive">*</span>
                        </Label>
                        <Select value={relationship} onValueChange={setRelationship}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pemilik Langsung" className="text-xs">Pemilik Langsung</SelectItem>
                            <SelectItem value="Keluarga (Istri/Suami/Anak)" className="text-xs">Keluarga (Istri/Suami/Anak)</SelectItem>
                            <SelectItem value="Karyawan / Staf Kantor" className="text-xs">Karyawan / Staf Kantor</SelectItem>
                            <SelectItem value="Rekan Kerja" className="text-xs">Rekan Kerja</SelectItem>
                            <SelectItem value="Satpam / Security" className="text-xs">Satpam / Security</SelectItem>
                            <SelectItem value="Lainnya" className="text-xs">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Foto Serah Terima Upload Simulation */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Foto Bukti Serah Terima <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhotoProofName(`Foto_Serah_Terima_${task.orderNo}.jpg`);
                            toast.success("Foto serah terima berhasil ditangkap/diunggah!");
                          }}
                          className="h-8 text-xs font-medium"
                        >
                          <Camera className="w-3.5 h-3.5 mr-1" />
                          {photoProofName ? "Ganti Foto Bukti" : "Ambil / Unggah Foto Bukti"}
                        </Button>
                        {photoProofName && (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {photoProofName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Catatan Pengantaran (Opsional)
                      </Label>
                      <Textarea
                        placeholder="Contoh: Dokumen diserahkan di pos sekuriti lantai 1 gedung..."
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </div>

                    <div className="pt-2 border-t border-border flex justify-end">
                      <Button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Selesaikan Pengantaran (Serah Terima)
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: INFORMASI ORDER */}
            <TabsContent value="info" className="space-y-3 pt-3">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Customer:</span>
                    <p className="font-semibold text-foreground mt-0.5">{task.customer}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nomor Telepon:</span>
                    <p className="font-semibold text-foreground mt-0.5">{task.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plat Nomor (Nopol):</span>
                    <p className="font-semibold text-foreground mt-0.5">{task.nopol}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Layanan:</span>
                    <p className="font-semibold text-foreground mt-0.5">{task.jenisTugas}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Wilayah Samsat:</span>
                    <p className="font-semibold text-foreground mt-0.5">{task.rawOrder.wilayahSamsatAsal}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tahapan Saat Ini:</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      Stage {task.currentStep} - {task.currentStageName}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60">
                  <span className="text-xs text-muted-foreground">Alamat Penjemputan:</span>
                  <p className="text-xs font-medium text-foreground mt-0.5">
                    {task.rawOrder.alamatPenjemputan?.detail || "-"}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <span className="text-xs text-muted-foreground">Alamat Pengantaran:</span>
                  <p className="text-xs font-medium text-foreground mt-0.5">
                    {task.rawOrder.alamatPengantaran?.detail || "-"}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: TIMELINE & AUDIT LOG */}
            <TabsContent value="timeline" className="space-y-3 pt-3">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-primary" />
                  Log Operasional Messenger
                </h4>

                {(task.rawOrder.messengerTimeline && task.rawOrder.messengerTimeline.length > 0) ? (
                  <div className="space-y-2.5 pt-1">
                    {task.rawOrder.messengerTimeline.map((item) => (
                      <div key={item.id} className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                          <span className="font-semibold text-foreground">{item.title}</span>
                          <span>{new Date(item.timestamp).toLocaleString("id-ID")}</span>
                        </div>
                        {item.note && (
                          <p className="text-foreground">{item.note}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">Oleh: {item.author}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-3 text-center">
                    Belum ada riwayat tercatat untuk tugas ini.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t border-border/80 pt-3 flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-medium"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiting Reason Dialog */}
      <MessengerWaitingReasonDialog
        open={isWaitingDialogOpen}
        onOpenChange={setIsWaitingDialogOpen}
        onSubmit={handleWaitingDialogSubmit}
        title={waitingTargetComponentId ? "Pilih Alasan Menunggu Komponen" : "Pilih Alasan Menunggu Tugas"}
      />
    </>
  );
}
