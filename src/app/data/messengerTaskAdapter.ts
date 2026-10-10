/**
 * Messenger Task Adapter
 * Single Source of Truth: Derives real operational tasks from OrderStore
 * Enforces strict per-employee data isolation and role-gated mutations
 */

import { orderStore, OperationalOrder, StageName, STAGES } from "./orderStore";
import { pricingStore, resolveSamsatId } from "./pricingStore";
import { auditLog } from "../utils/auditLog";

import {
  MessengerTaskType,
  MessengerTaskStatus,
  MessengerTaskStatusCode,
  MessengerTaskItem,
  MessengerComponentProgress,
  ComponentEvidence,
  ChecklistSebelumBerangkat,
  PickupProof,
  DeliveryHandoverProof,
  MessengerTimelineEvent,
  TaskPriority,
  DeadlineStatus,
  ReimbursementCategory,
  ReimbursementStatus,
  ReimbursementRequest,
  KNOWN_MESSENGERS,
  WAITING_REASONS,
  SAMSAT_WAITING_REASONS,
  SamsatWaitingReason,
  getStatusDisplayLabel,
  formatMobileDeadline,
} from "../../domain/messenger/types";

export type {
  MessengerTaskType,
  MessengerTaskStatus,
  MessengerTaskStatusCode,
  MessengerTaskItem,
  MessengerComponentProgress,
  ComponentEvidence,
  ChecklistSebelumBerangkat,
  PickupProof,
  DeliveryHandoverProof,
  MessengerTimelineEvent,
  TaskPriority,
  DeadlineStatus,
  ReimbursementCategory,
  ReimbursementStatus,
  ReimbursementRequest,
  SamsatWaitingReason,
};

export {
  KNOWN_MESSENGERS,
  WAITING_REASONS,
  SAMSAT_WAITING_REASONS,
  getStatusDisplayLabel,
  formatMobileDeadline,
};

// ==========================================
// Date & Deadline Helpers
// ==========================================

export function calculateDeadlineStatus(deadlineAt?: string): DeadlineStatus {
  if (!deadlineAt) return "SAFE";
  const deadlineTime = new Date(deadlineAt).getTime();
  if (isNaN(deadlineTime)) return "SAFE";
  const now = Date.now();
  const diffHours = (deadlineTime - now) / (1000 * 60 * 60);

  if (diffHours < 0) return "OVERDUE";
  if (diffHours <= 6) return "APPROACHING";
  return "SAFE";
}

export function calculateEstimatedCompletion(startedAt: string, durationMinutes: number): string {
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) {
    return new Date(Date.now() + durationMinutes * 60000).toISOString();
  }
  return new Date(start + durationMinutes * 60000).toISOString();
}

export function mapStageToTaskType(step: number): MessengerTaskType {
  if (step <= 3) return "Jemput Dokumen";
  if (step <= 6) return "Proses Samsat";
  return "Pengantaran Dokumen";
}

export function mapToStatusCode(status: MessengerTaskStatus, step: number): MessengerTaskStatusCode {
  switch (status) {
    case "Selesai":
      return "COMPLETED";
    case "Dalam Proses":
      return "IN_PROGRESS";
    case "Pending":
      return "WAITING";
    case "Belum Diambil":
      return step === 2 ? "READY" : "NOT_STARTED";
    default:
      return "NOT_STARTED";
  }
}

// ==========================================
// Task Derivation from Orders (Single Source of Truth)
// ==========================================

function deriveSingleTaskFromOrder(order: OperationalOrder): MessengerTaskItem {
  const step = order.currentStep;
  const keteranganTugas = mapStageToTaskType(step);

  let messenger: string;
  let defaultStatus: MessengerTaskStatus;
  let lokasi: string;
  let tanggalTerima: string;
  let tanggalSelesai: string = "-";
  let keterangan: string;

  if (step <= 3) {
    messenger = order.messenger?.trim() || order.assignedMessengerName || "Belum Ditugaskan";
    tanggalTerima = order.tanggalJemput || order.createdAt;
    lokasi = order.alamatPenjemputan?.detail
      ? `${order.alamatPenjemputan.detail}, ${order.alamatPenjemputan.kota || order.wilayahSamsatAsal}`
      : (order.alamatPenjemputan?.kota || order.wilayahSamsatAsal || "Alamat Klien");

    if (step === 1) {
      defaultStatus = messenger !== "Belum Ditugaskan" && order.messengerTaskStatus ? order.messengerTaskStatus : "Belum Diambil";
      keterangan = order.catatanPenjadwalan || order.catatanOrder || "Menunggu verifikasi order & penjemputan";
    } else if (step === 2) {
      defaultStatus = (order.isScheduled && messenger !== "Belum Ditugaskan") ? (order.messengerTaskStatus || "Belum Diambil") : "Belum Diambil";
      keterangan = order.catatanPenjadwalan || "Penjadwalan penjemputan berkas dari klien";
    } else {
      defaultStatus = "Dalam Proses";
      keterangan = order.documentNotes || "Dokumen fisik diterima messenger, verifikasi kelengkapan berkas";
    }
  } else if (step <= 6) {
    messenger = order.messenger?.trim() || order.assignedMessengerName || "Belum Ditugaskan";
    tanggalTerima = order.createdAt;
    const samsatName = order.wilayahSamsatAsal || "Jakarta";
    lokasi = samsatName.toLowerCase().includes("samsat") ? samsatName : `Samsat ${samsatName}`;
    defaultStatus = "Dalam Proses";

    if (step === 4) {
      keterangan = order.currentSamsatProcess ? `Proses: ${order.currentSamsatProcess}` : "Berkas dalam pengurusan di loket Samsat";
    } else if (step === 5) {
      keterangan = order.isVerified ? "Penetapan pajak & biaya Samsat diverifikasi" : "Menunggu verifikasi ulang biaya Samsat";
    } else {
      keterangan = order.approvedBySpv ? `Disetujui SPV (${order.spvName || "Supervisor"})` : "Menunggu supervisi & kontrol SPV";
    }
  } else {
    const deliveryMessenger = order.messengerPengantar?.trim() || order.messenger?.trim() || order.assignedMessengerName;
    messenger = deliveryMessenger ? deliveryMessenger : "Belum Ditugaskan";
    tanggalTerima = order.tanggalPengantaran || order.createdAt;
    lokasi = order.alamatPengantaran?.detail
      ? `${order.alamatPengantaran.detail}, ${order.alamatPengantaran.kota || order.wilayahSamsatAsal}`
      : (order.alamatPengantaran?.kota || order.wilayahSamsatAsal || "Alamat Pengantaran Klien");

    if (step === 7) {
      defaultStatus = (order.isDeliveryScheduled && messenger !== "Belum Ditugaskan") ? (order.messengerTaskStatus || "Dalam Proses") : "Belum Diambil";
      keterangan = order.catatanPengantaran || "Dokumen siap/dalam pengantaran ke klien";
    } else {
      defaultStatus = "Selesai";
      tanggalSelesai = order.tanggalDiterima || order.completedAt || order.createdAt;
      keterangan = order.receiverName
        ? `Dokumen telah diserahkan dan diterima oleh ${order.receiverName}`
        : "Dokumen telah diserahkan dan diterima klien";
    }
  }

  const status: MessengerTaskStatus = order.messengerTaskStatus || defaultStatus;
  const statusCode = mapToStatusCode(status, step);
  const deadlineStatus = calculateDeadlineStatus(order.deadlineAt);

  // Convert component progress record to array if available
  const componentProgress: MessengerComponentProgress[] = order.messengerComponentProgress
    ? Object.values(order.messengerComponentProgress)
    : [];

  return {
    id: order.orderNo,
    orderNo: order.orderNo,
    noBerkas: order.orderNo,
    customer: order.customer,
    phone: order.nomorHP || "-",
    nopol: order.nopol || "-",
    jenisTugas: order.layanan,
    keteranganTugas,
    lokasi,
    messenger,
    assignedMessengerId: order.assignedMessengerId,
    status,
    statusCode,
    priority: order.messengerTaskPriority || "NORMAL",
    deadlineAt: order.deadlineAt,
    deadlineStatus,
    startedAt: order.startedAt,
    completedAt: order.completedAt || tanggalSelesai,
    tanggalTerima,
    tanggalSelesai,
    keterangan: order.messengerTaskNotes || keterangan,
    currentStep: step,
    currentStageName: order.currentStageName,
    rawOrder: order,
    checklist: order.checklistSebelumBerangkat,
    pickupProof: order.pickupProof,
    componentProgress,
  };
}

/**
 * Derives all operational tasks (used by Admin/SVP views)
 */
export function deriveMessengerTasksFromOrders(
  activeOrders: Record<StageName, OperationalOrder[]>
): MessengerTaskItem[] {
  const taskItems: MessengerTaskItem[] = [];

  for (const stage of STAGES) {
    const orders = activeOrders[stage] || [];
    for (const order of orders) {
      // Exclude Stage 8 from active tasks view
      if (order.currentStep < 8) {
        taskItems.push(deriveSingleTaskFromOrder(order));
      }
    }
  }

  return taskItems;
}

// ==========================================
// Strict Per-Messenger Isolation Selectors
// ==========================================

/**
 * Returns tasks strictly assigned to the given employeeId.
 * Other messengers' tasks are completely excluded.
 */
export function getMessengerTasksForEmployee(
  activeOrders: Record<StageName, OperationalOrder[]>,
  employeeId: string
): MessengerTaskItem[] {
  if (!employeeId) return [];
  const allTasks = deriveMessengerTasksFromOrders(activeOrders);
  return allTasks.filter(t => t.assignedMessengerId === employeeId);
}

/**
 * Returns task history for the given employeeId (Stage 8 or archived orders).
 */
export function getMessengerTaskHistoryForEmployee(
  activeOrders: Record<StageName, OperationalOrder[]>,
  employeeId: string,
  archivedOrders: OperationalOrder[] = []
): MessengerTaskItem[] {
  if (!employeeId) return [];

  const historyItems: MessengerTaskItem[] = [];

  // Check stage 8 in active orders
  const stage8Orders = activeOrders["Dokumen Telah Diterima"] || [];
  for (const order of stage8Orders) {
    if (order.assignedMessengerId === employeeId) {
      historyItems.push(deriveSingleTaskFromOrder(order));
    }
  }

  // Check archived orders
  for (const order of archivedOrders) {
    if (order.assignedMessengerId === employeeId) {
      historyItems.push(deriveSingleTaskFromOrder(order));
    }
  }

  return historyItems;
}

/**
 * Calculates operational KPIs strictly for the current messenger
 */
export function getMessengerStatsForEmployee(
  activeOrders: Record<StageName, OperationalOrder[]>,
  employeeId: string
) {
  const tasks = getMessengerTasksForEmployee(activeOrders, employeeId);

  let perluDiambil = 0;
  let sedangDiproses = 0;
  let mendekatiDeadline = 0;
  let terlambat = 0;

  for (const t of tasks) {
    // Deadline urgency check
    if (t.deadlineStatus === "APPROACHING") {
      mendekatiDeadline++;
    } else if (t.deadlineStatus === "OVERDUE") {
      terlambat++;
    }

    // Status breakdown
    if (t.status === "Belum Diambil" || t.statusCode === "NOT_STARTED" || t.statusCode === "READY") {
      perluDiambil++;
    } else if (t.status === "Dalam Proses" || t.statusCode === "IN_PROGRESS") {
      // If deadline is not approaching, count in standard in-progress
      if (t.deadlineStatus !== "APPROACHING") {
        sedangDiproses++;
      }
    }
  }

  return {
    tugasHariIni: tasks.length,
    perluDiambil,
    sedangDiproses,
    mendekatiDeadline,
    terlambat,
  };
}

// ==========================================
// Operational Mutation Handlers with Security
// ==========================================

export interface UserContext {
  userId?: string;
  employeeId?: string;
  role: string;
  userName: string;
}

function toAuditRole(role: string): "administrator" | "finance" | "admin" | "messenger" {
  if (role === "administrator" || role === "svp") return "administrator";
  if (role === "finance") return "finance";
  if (role === "messenger") return "messenger";
  return "admin";
}

function checkTaskOwnership(order: OperationalOrder, user: UserContext): { allowed: boolean; error?: string } {
  // Admin and SVP have global operational supervision
  if (user.role === "admin" || user.role === "administrator" || user.role === "svp") {
    return { allowed: true };
  }

  // Messenger must strictly match assignedMessengerId
  if (order.assignedMessengerId && user.employeeId && order.assignedMessengerId === user.employeeId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: `Akses ditolak: Tugas ini ditugaskan kepada messenger lain (${order.assignedMessengerName || order.messenger || "Petugas lain"}). Anda tidak memiliki izin untuk memodifikasi tugas ini.`,
  };
}

/**
 * Start task (Action: Mulai Tugas)
 * Transitions status to IN_PROGRESS and records startedAt timestamp
 */
export function startMessengerTask(orderNo: string, user: UserContext): { success: boolean; error?: string } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  const nowIso = new Date().toISOString();
  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    title: "Mulai Tugas",
    note: `Tugas ${order.layanan} dimulai oleh ${user.userName}`,
    author: user.userName,
    type: "STATUS_CHANGE",
  };

  const existingTimeline = order.messengerTimeline || [];

  const success = orderStore.updateOrder(orderNo, {
    messengerTaskStatus: "Dalam Proses",
    startedAt: order.startedAt || nowIso,
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  return { success, error: success ? undefined : "Gagal memperbarui order di store" };
}

/**
 * Update task status
 * Validates mandatory waiting reason when selecting WAITING / Pending
 */
export function updateMessengerTaskStatus(
  orderNo: string,
  newStatus: MessengerTaskStatusCode | MessengerTaskStatus,
  options: { waitingReason?: string; note?: string },
  user: UserContext
): { success: boolean; error?: string } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  // Validation: WAITING status requires reason
  const isWaiting = newStatus === "WAITING" || newStatus === "Pending";
  if (isWaiting && (!options.waitingReason || !options.waitingReason.trim())) {
    return {
      success: false,
      error: "Alasan menunggu wajib diisi saat memilih status Menunggu (WAITING).",
    };
  }

  // Map to legacy display status for order store
  let mappedDisplayStatus: MessengerTaskStatus;
  switch (newStatus) {
    case "WAITING":
    case "Pending":
      mappedDisplayStatus = "Pending";
      break;
    case "IN_PROGRESS":
    case "Dalam Proses":
      mappedDisplayStatus = "Dalam Proses";
      break;
    case "COMPLETED":
    case "Selesai":
      mappedDisplayStatus = "Selesai";
      break;
    default:
      mappedDisplayStatus = "Belum Diambil";
  }

  const nowIso = new Date().toISOString();
  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    title: `Ubah Status: ${getStatusDisplayLabel(newStatus)}`,
    note: options.waitingReason ? `Alasan: ${options.waitingReason}. Catatan: ${options.note || "-"}` : (options.note || ""),
    author: user.userName,
    type: "STATUS_CHANGE",
  };

  const existingTimeline = order.messengerTimeline || [];

  const success = orderStore.updateOrder(orderNo, {
    messengerTaskStatus: mappedDisplayStatus,
    messengerTaskNotes: options.note || options.waitingReason || order.messengerTaskNotes,
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  return { success, error: success ? undefined : "Gagal memperbarui status tugas di store" };
}

/**
 * Update checklist sebelum berangkat (for Jemput Dokumen)
 */
export function updateMessengerChecklist(
  orderNo: string,
  checklist: ChecklistSebelumBerangkat,
  user: UserContext
): { success: boolean; error?: string } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  const allChecked = checklist.alamatBenar && checklist.nomorTersedia && checklist.dokumenDiketahui && checklist.customerDihubungi;
  const existingTimeline = order.messengerTimeline || [];
  let updatedTimeline = existingTimeline;

  if (allChecked) {
    const timelineEvent: MessengerTimelineEvent = {
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "Checklist Sebelum Berangkat Lengkap",
      note: "Semua 4 poin verifikasi pra-penjemputan telah diverifikasi",
      author: user.userName,
      type: "STATUS_CHANGE",
    };
    updatedTimeline = [timelineEvent, ...existingTimeline];
  }

  const success = orderStore.updateOrder(orderNo, {
    checklistSebelumBerangkat: checklist,
    messengerTimeline: updatedTimeline,
  });

  return { success, error: success ? undefined : "Gagal menyimpan checklist" };
}

/**
 * Update component progress in Samsat
 */
export function updateMessengerComponent(
  orderNo: string,
  componentId: string,
  updates: Partial<MessengerComponentProgress>,
  user: UserContext
): { success: boolean; error?: string } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  // Validate waiting reason on component
  if (updates.status === "WAITING" && (!updates.waitingReason || !updates.waitingReason.trim())) {
    return {
      success: false,
      error: "Alasan menunggu wajib diisi saat mengubah status komponen ke Menunggu.",
    };
  }

  const currentMap = { ...(order.messengerComponentProgress || {}) };
  const existingComp = currentMap[componentId] || {
    componentId,
    name: updates.name || "Komponen Samsat",
    status: "NOT_STARTED",
  };

  const nowIso = new Date().toISOString();
  let estimatedCompletedAt = updates.estimatedCompletedAt || existingComp.estimatedCompletedAt;
  let startedAt = updates.startedAt || existingComp.startedAt;
  let completedAt = updates.completedAt || existingComp.completedAt;

  if (updates.status === "IN_PROGRESS" && !startedAt) {
    startedAt = nowIso;
  }

  if (updates.isCustomDuration && updates.customDurationDays && updates.customDurationDays > 0) {
    const customMinutes = updates.customDurationDays * 1440;
    updates.estimatedDurationMinutes = customMinutes;
    estimatedCompletedAt = calculateEstimatedCompletion(startedAt || nowIso, customMinutes);
  } else if (updates.estimatedDurationMinutes) {
    estimatedCompletedAt = calculateEstimatedCompletion(startedAt || nowIso, updates.estimatedDurationMinutes);
  }

  if (updates.status === "COMPLETED") {
    completedAt = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  currentMap[componentId] = {
    ...existingComp,
    ...updates,
    startedAt,
    completedAt,
    estimatedCompletedAt,
  };

  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    title: `Update Komponen: ${currentMap[componentId].name}`,
    note: `Status: ${currentMap[componentId].status}. ${updates.note || ""}`,
    author: user.userName,
    type: "COMPONENT_UPDATE",
  };

  const existingTimeline = order.messengerTimeline || [];

  const success = orderStore.updateOrder(orderNo, {
    messengerComponentProgress: currentMap,
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  return { success, error: success ? undefined : "Gagal memperbarui progres komponen Samsat" };
}

/**
 * Upload component evidence
 */
export function uploadMessengerEvidence(
  orderNo: string,
  componentId: string,
  evidence: ComponentEvidence,
  user: UserContext
): { success: boolean; error?: string } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  const currentMap = { ...(order.messengerComponentProgress || {}) };
  const existingComp = currentMap[componentId];
  if (!existingComp) {
    return { success: false, error: `Komponen ${componentId} tidak ditemukan` };
  }

  const existingEvidence = existingComp.evidence || [];
  currentMap[componentId] = {
    ...existingComp,
    evidence: [...existingEvidence, evidence],
  };

  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: new Date().toISOString(),
    title: `Upload Bukti: ${existingComp.name}`,
    note: `Bukti ${evidence.fileType} diunggah oleh ${user.userName}`,
    author: user.userName,
    type: "EVIDENCE_UPLOAD",
  };

  const existingTimeline = order.messengerTimeline || [];

  const success = orderStore.updateOrder(orderNo, {
    messengerComponentProgress: currentMap,
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  return { success, error: success ? undefined : "Gagal menyimpan bukti komponen" };
}

/**
 * Complete delivery task (Stage 7 -> Stage 8)
 * Enforces mandatory handover proof
 */
export function completeMessengerDelivery(
  orderNo: string,
  handoverProof: DeliveryHandoverProof,
  user: UserContext
): { success: boolean; error?: string } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  if (!handoverProof.recipientName || !handoverProof.recipientName.trim()) {
    return { success: false, error: "Nama penerima dokumen wajib diisi pada Bukti Serah Terima." };
  }

  if (!handoverProof.relationship || !handoverProof.relationship.trim()) {
    return { success: false, error: "Hubungan penerima dengan customer wajib diisi." };
  }

  const nowIso = new Date().toISOString();
  const dateStr = nowIso.split("T")[0];

  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    title: "Serah Terima Dokumen Selesai",
    note: `Dokumen diserahkan kepada ${handoverProof.recipientName} (${handoverProof.relationship}). Catatan: ${handoverProof.notes || "-"}`,
    author: user.userName,
    type: "DELIVERY",
  };

  const existingTimeline = order.messengerTimeline || [];

  // Advance order from Stage 7 ("Pengantaran") to Stage 8 ("Dokumen Telah Diterima")
  const success = orderStore.advanceOrder(orderNo, "Dokumen Telah Diterima", {
    isReceived: true,
    receiverName: handoverProof.recipientName,
    tanggalDiterima: dateStr,
    completedAt: nowIso,
    deliveryHandover: {
      ...handoverProof,
      completedAt: nowIso,
    },
    messengerTaskStatus: "Selesai",
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  if (success) {
    try {
      auditLog.log({
        userId: user.employeeId || "emp-messenger",
        userName: user.userName,
        userRole: toAuditRole(user.role),
        action: "UPDATE",
        module: "Messenger Workspace",
        details: `Serah terima dokumen order ${orderNo} diselesaikan oleh ${user.userName}. Penerima: ${handoverProof.recipientName}`,
        metadata: { orderNo, recipient: handoverProof.recipientName },
      });
    } catch {
      // safe fallback
    }
  }

  return { success, error: success ? undefined : "Gagal menyelesaikan pengantaran di store" };
}

/**
 * Reassign Task (Strictly gated to ADMIN and SVP)
 * Messengers CANNOT reassign tasks
 */
export function reassignMessengerTask(
  orderNo: string,
  newMessengerId: string,
  newMessengerName: string,
  reassigner: UserContext
): { success: boolean; error?: string } {
  // Gating: Only Admin / SVP can reassign
  if (reassigner.role === "messenger") {
    return {
      success: false,
      error: "Messenger tidak memiliki izin untuk mengalihkan (reassign) tugas. Silakan hubungi Administrator atau Supervisor.",
    };
  }

  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const oldMessenger = order.assignedMessengerName || order.messenger || "Belum Ditugaskan";
  const nowIso = new Date().toISOString();

  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    title: "Pengalihan Tugas (Reassign)",
    note: `Tugas dialihkan dari ${oldMessenger} ke ${newMessengerName} oleh ${reassigner.userName}`,
    author: reassigner.userName,
    type: "ASSIGNMENT",
  };

  const existingTimeline = order.messengerTimeline || [];

  const success = orderStore.updateOrder(orderNo, {
    assignedMessengerId: newMessengerId,
    assignedMessengerName: newMessengerName,
    messenger: newMessengerName,
    messengerPengantar: newMessengerName,
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  if (success) {
    try {
      auditLog.log({
        userId: reassigner.employeeId || "admin",
        userName: reassigner.userName,
        userRole: toAuditRole(reassigner.role),
        action: "UPDATE",
        module: "Messenger Task Assignment",
        details: `Reassign tugas order ${orderNo} dari ${oldMessenger} ke ${newMessengerName}`,
        metadata: { orderNo, from: oldMessenger, to: newMessengerName },
      });
    } catch {
      // safe fallback
    }
  }

  return { success, error: success ? undefined : "Gagal memperbarui pengalihan tugas" };
}

// ==========================================
// Available Samsat Components (SSoT: Harga Dasar Samsat / pricingStore)
// ==========================================

export interface AvailableSamsatComponent {
  id: string;
  name: string;
  category: string;
  basePrice?: number;
  defaultNominal?: number;
}

/**
 * Returns master Samsat components directly from pricingStore (Harga Dasar Samsat)
 * Grouped into Mutasi Masuk, Mutasi Keluar, and Layanan Standar.
 */
export function getMasterSamsatComponents(samsatIdOrWilayah?: string): AvailableSamsatComponent[] {
  const samsatId = resolveSamsatId(samsatIdOrWilayah);
  const masterItems = pricingStore.getMasterPricingItems();
  return masterItems.map((item) => {
    const price = pricingStore.getSamsatPrice(samsatId, item.id);
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      basePrice: price,
      defaultNominal: price,
    };
  });
}

// Backwards-compatible export dynamic proxy from pricingStore
export const AVAILABLE_SAMSAT_COMPONENTS: AvailableSamsatComponent[] = pricingStore
  .getMasterPricingItems()
  .map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    basePrice: pricingStore.getSamsatPrice("samsat-cibinong", item.id),
    defaultNominal: pricingStore.getSamsatPrice("samsat-cibinong", item.id),
  }));

/**
 * Add a Samsat Component to an Order (Master Data or Custom)
 * Rule: Master components take reference price from Harga Dasar Samsat (masterPrice).
 * Custom components DO NOT alter master pricing, finance invoice, or client billing.
 */
export function addSamsatComponentToOrder(
  orderNo: string,
  component: {
    name: string;
    category?: string;
    isCustom?: boolean;
    note?: string;
  },
  user: UserContext
): { success: boolean; error?: string; component?: MessengerComponentProgress } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  const cleanName = component.name.trim();
  if (!cleanName) {
    return { success: false, error: "Nama komponen wajib diisi." };
  }

  const currentMap = { ...(order.messengerComponentProgress || {}) };

  // Duplicate Check (Requirement #43 - Case Insensitive)
  const isDuplicate = Object.values(currentMap).some(
    (c) => c.name.toLowerCase().trim() === cleanName.toLowerCase()
  );
  if (isDuplicate) {
    return {
      success: false,
      error: `Komponen "${cleanName}" sudah ada pada proses Samsat order ini.`,
    };
  }

  const compId = component.isCustom
    ? `cust-${Date.now()}`
    : `comp-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

  const nowIso = new Date().toISOString();
  const samsatId = resolveSamsatId(order.wilayahSamsatAsal);

  let masterPrice = 0;
  let category = component.category || (component.isCustom ? "Custom" : "Samsat");
  let resolvedName = cleanName;

  if (!component.isCustom) {
    const matchedMaster = pricingStore
      .getMasterPricingItems()
      .find((p) => p.name.toLowerCase() === cleanName.toLowerCase() || p.id === cleanName);

    if (matchedMaster) {
      resolvedName = matchedMaster.name;
      category = matchedMaster.category;
      masterPrice = pricingStore.getSamsatPrice(samsatId, matchedMaster.id);
    }
  }

  const actualOrderPrice = masterPrice; // initially equal to masterPrice

  const newComponent: MessengerComponentProgress = {
    componentId: compId,
    name: resolvedName,
    category,
    status: "NOT_STARTED",
    nominal: actualOrderPrice,
    masterPrice,
    actualOrderPrice,
    isCustom: !!component.isCustom,
    createdBy: user.userName,
    createdAt: nowIso,
    note: component.note?.trim(),
  };

  currentMap[compId] = newComponent;

  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    title: component.isCustom ? `Tambah Tambahan Lapangan: ${resolvedName}` : `Tambah Komponen: ${resolvedName}`,
    note: component.note ? `Catatan: ${component.note}` : undefined,
    author: user.userName,
    type: "COMPONENT_UPDATE",
  };

  const existingTimeline = order.messengerTimeline || [];

  const success = orderStore.updateOrder(orderNo, {
    messengerComponentProgress: currentMap,
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  if (success && component.isCustom) {
    try {
      auditLog.log({
        userId: user.employeeId || "emp-messenger",
        userName: user.userName,
        userRole: toAuditRole(user.role),
        action: "CREATE",
        module: "Samsat Component",
        details: `Custom component "${resolvedName}" ditambahkan oleh ${user.userName} pada order ${orderNo}`,
        metadata: { orderNo, componentId: compId, componentName: resolvedName },
      });
    } catch {}
  }

  return { success, error: success ? undefined : "Gagal menambahkan komponen ke order", component: newComponent };
}

/**
 * Update actual component price for a specific order in field (Edit Harga)
 * Only affects this specific order. Does NOT alter pricingStore or other orders.
 */
export function updateMessengerComponentPrice(
  orderNo: string,
  componentId: string,
  newActualPrice: number,
  user: UserContext,
  note?: string
): { success: boolean; error?: string; component?: MessengerComponentProgress } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  if (newActualPrice < 0 || isNaN(newActualPrice)) {
    return { success: false, error: "Harga aktual harus berupa nominal positif atau 0." };
  }

  const currentMap = { ...(order.messengerComponentProgress || {}) };
  const existingComp = currentMap[componentId];
  if (!existingComp) {
    return { success: false, error: `Komponen ${componentId} tidak ditemukan pada order ini.` };
  }

  const masterPrice = existingComp.masterPrice !== undefined ? existingComp.masterPrice : (existingComp.nominal || 0);
  const oldActualPrice = existingComp.actualOrderPrice !== undefined ? existingComp.actualOrderPrice : masterPrice;

  const nowIso = new Date().toISOString();
  const updatedComp: MessengerComponentProgress = {
    ...existingComp,
    masterPrice,
    actualOrderPrice: newActualPrice,
    nominal: newActualPrice,
    note: note ? (existingComp.note ? `${existingComp.note} | ${note}` : note) : existingComp.note,
  };

  currentMap[componentId] = updatedComp;

  const diff = newActualPrice - masterPrice;
  const diffStr = diff > 0
    ? `(+Rp ${diff.toLocaleString("id-ID")})`
    : diff < 0
    ? `(-Rp ${Math.abs(diff).toLocaleString("id-ID")})`
    : `(Sesuai Harga Dasar)`;

  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    title: `Edit Harga Aktual: ${existingComp.name}`,
    note: `Harga aktual diubah dari Rp ${oldActualPrice.toLocaleString("id-ID")} ke Rp ${newActualPrice.toLocaleString("id-ID")} ${diffStr}. ${note ? `Catatan: ${note}` : ""}`,
    author: user.userName,
    type: "COMPONENT_UPDATE",
  };

  const existingTimeline = order.messengerTimeline || [];

  const success = orderStore.updateOrder(orderNo, {
    messengerComponentProgress: currentMap,
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  if (success) {
    try {
      auditLog.log({
        userId: user.employeeId || "emp-messenger",
        userName: user.userName,
        userRole: toAuditRole(user.role),
        action: "UPDATE",
        module: "Samsat Component Price",
        details: `Harga aktual komponen "${existingComp.name}" pada order ${orderNo} diubah menjadi Rp ${newActualPrice.toLocaleString("id-ID")} oleh ${user.userName}`,
        metadata: {
          orderNo,
          componentId,
          componentName: existingComp.name,
          masterPrice,
          oldActualPrice,
          newActualPrice,
        },
      });
    } catch {}
  }

  return { success, error: success ? undefined : "Gagal mengupdate harga komponen", component: updatedComp };
}

/**
 * Complete document pickup (Jemput Dokumen)
 * Allows optional photo proof and notes
 */
export function completeMessengerPickup(
  orderNo: string,
  evidence: { photoProofUrl?: string; notes?: string },
  user: UserContext
): { success: boolean; error?: string } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  const nowIso = new Date().toISOString();
  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    title: "Penjemputan Dokumen Selesai",
    note: evidence.notes ? `Catatan: ${evidence.notes}` : "Dokumen fisik berhasil diambil dari klien",
    author: user.userName,
    type: "STATUS_CHANGE",
  };

  const existingTimeline = order.messengerTimeline || [];

  // Advance order from Stage 2 ("Penjadwalan") to Stage 3 ("Verifikasi Dokumen")
  const success = orderStore.advanceOrder(orderNo, "Verifikasi Dokumen", {
    messengerTaskStatus: "Selesai",
    completedAt: nowIso,
    pickupProof: {
      photoProofUrl: evidence.photoProofUrl,
      notes: evidence.notes,
      completedAt: nowIso,
    },
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  if (success) {
    try {
      auditLog.log({
        userId: user.employeeId || "emp-messenger",
        userName: user.userName,
        userRole: toAuditRole(user.role),
        action: "UPDATE",
        module: "Messenger Workspace",
        details: `Penjemputan berkas fisik order ${orderNo} diselesaikan oleh ${user.userName}`,
        metadata: { orderNo },
      });
    } catch {
      // safe fallback
    }
  }

  return { success, error: success ? undefined : "Gagal memperbarui status penjemputan" };
}

/**
 * Complete Samsat Process (Kirim Hasil)
 * Transitions Samsat stage when all components are completed
 */
export function completeSamsatProcess(
  orderNo: string,
  user: UserContext,
  note?: string
): { success: boolean; error?: string } {
  const order = orderStore.getOrderByNo(orderNo);
  if (!order) {
    return { success: false, error: `Order ${orderNo} tidak ditemukan` };
  }

  const authCheck = checkTaskOwnership(order, user);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  const nowIso = new Date().toISOString();
  const timelineEvent: MessengerTimelineEvent = {
    id: `tl-${Date.now()}`,
    timestamp: nowIso,
    title: "Proses Samsat Selesai (Kirim Hasil)",
    note: note || "Seluruh tahapan komponen pengurusan di loket Samsat telah selesai diproses.",
    author: user.userName,
    type: "STATUS_CHANGE",
  };

  const existingTimeline = order.messengerTimeline || [];

  // Update order status to Selesai and advance to Stage 5 ("Verifikasi Ulang")
  const success = orderStore.advanceOrder(orderNo, "Verifikasi Ulang", {
    messengerTaskStatus: "Selesai",
    completedAt: nowIso,
    messengerTimeline: [timelineEvent, ...existingTimeline],
  });

  if (success) {
    try {
      auditLog.log({
        userId: user.employeeId || "emp-messenger",
        userName: user.userName,
        userRole: toAuditRole(user.role),
        action: "UPDATE",
        module: "Proses Samsat",
        details: `Pengurusan Samsat untuk order ${orderNo} dinyatakan selesai oleh ${user.userName}`,
        metadata: { orderNo },
      });
    } catch {}
  }

  return { success, error: success ? undefined : "Gagal menyelesaikan pengurusan Samsat" };
}

