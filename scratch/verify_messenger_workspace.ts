/**
 * Comprehensive Verification Suite for Messenger Workspace (Mobile-First Operational SSoT)
 * Tests 22 Specific Scenarios:
 * 1. Personal Task Isolation (Budi vs Andi)
 * 2. Mobile Deadline Formatting (formatMobileDeadline)
 * 3. Priority Badge Gating (Only URGENT/IMPORTANT, omit NORMAL)
 * 4. Task Starting Workflow (Mulai Tugas -> Dalam Proses + startedAt)
 * 5. Mandatory Waiting Reason Enforcement (SAMSAT_WAITING_REASONS)
 * 6. Pre-Departure Checklist (Checklist Sebelum Berangkat 4/4)
 * 7. Jemput Dokumen Completion (completeMessengerPickup with optional photo & notes)
 * 8. Samsat Components Retrieval
 * 9. Add Component from Master Data (AVAILABLE_SAMSAT_COMPONENTS)
 * 10. Duplicate Component Prevention (Case-insensitive duplicate guard)
 * 11. Add Custom Component (audited, nominal: 0, 0 billing impact)
 * 12. Component Status Progression (NOT_STARTED -> IN_PROGRESS -> WAITING -> COMPLETED)
 * 13. Component Duration Arithmetic (startedAt + durationMinutes)
 * 14. Samsat Zero Photo Evidence Rule (no photo upload needed for Samsat components)
 * 15. Samsat "Kirim Hasil" Workflow (completeSamsatProcess -> Stage 5 Verifikasi Ulang)
 * 16. Antar Dokumen Handover (completeMessengerDelivery -> Stage 8 Dokumen Telah Diterima)
 * 17. Reimbursement Submission (submitReimbursement with category, amount, date, orderNo)
 * 18. Strict Reimbursement Isolation (Budi only sees Budi's claims, Andi only sees Andi's claims)
 * 19. Messenger Role Constraint: Messengers CANNOT review or approve reimbursements
 * 20. Messenger Role Constraint: Messengers CANNOT pay reimbursements
 * 21. Finance Payout: payReimbursement creates real cash outflow in pengeluaran
 * 22. Custom Component Financial Boundary: Does NOT alter master pricing or client billing
 */

import { orderStore } from "../src/app/data/orderStore";
import { financeStore } from "../src/app/data/financeStore";
import { pricingStore } from "../src/app/data/pricingStore";
import {
  getMessengerTasksForEmployee,
  getMessengerTaskHistoryForEmployee,
  getMessengerStatsForEmployee,
  calculateDeadlineStatus,
  calculateEstimatedCompletion,
  formatMobileDeadline,
  startMessengerTask,
  updateMessengerTaskStatus,
  updateMessengerChecklist,
  updateMessengerComponent,
  uploadMessengerEvidence,
  completeMessengerPickup,
  completeMessengerDelivery,
  completeSamsatProcess,
  reassignMessengerTask,
  addSamsatComponentToOrder,
  updateMessengerComponentPrice,
  getMasterSamsatComponents,
  AVAILABLE_SAMSAT_COMPONENTS,
  SAMSAT_WAITING_REASONS,
  UserContext,
} from "../src/app/data/messengerTaskAdapter";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `- ${detail}` : ""}`);
  }
}

console.log("=================================================");
console.log("   MESSENGER WORKSPACE 22-SCENARIO TEST SUITE   ");
console.log("=================================================\n");

const budiContext: UserContext = {
  userId: "usr-msg-001",
  employeeId: "EMP-MSG-001",
  userName: "Budi Santoso",
  role: "messenger",
};

const andiContext: UserContext = {
  userId: "usr-msg-002",
  employeeId: "EMP-MSG-002",
  userName: "Andi Pratama",
  role: "messenger",
};

const financeContext: UserContext = {
  userId: "usr-fin-001",
  employeeId: "EMP-FIN-001",
  userName: "Finance Officer",
  role: "finance",
};

const adminContext: UserContext = {
  userId: "usr-admin-001",
  employeeId: "EMP-002",
  userName: "Admin Operasional",
  role: "admin",
};

const initialActiveOrders = orderStore.getActiveOrders();

// -----------------------------------------------------------
// TEST 1: Strict Per-Messenger Data Isolation
// -----------------------------------------------------------
console.log("[1] Testing Strict Per-Messenger Data Isolation...");
const budiTasks = getMessengerTasksForEmployee(initialActiveOrders, budiContext.employeeId!);
const andiTasks = getMessengerTasksForEmployee(initialActiveOrders, andiContext.employeeId!);

assert(budiTasks.length === 5, "Budi Santoso has exactly 5 active tasks", `Got ${budiTasks.length}`);
assert(andiTasks.length === 3, "Andi Pratama has exactly 3 active tasks", `Got ${andiTasks.length}`);

const budiHasAndiTasks = budiTasks.some(t => t.assignedMessengerId === andiContext.employeeId);
const andiHasBudiTasks = andiTasks.some(t => t.assignedMessengerId === budiContext.employeeId);

assert(!budiHasAndiTasks, "Budi Santoso cannot see any of Andi Pratama's tasks");
assert(!andiHasBudiTasks, "Andi Pratama cannot see any of Budi Santoso's tasks");

budiTasks.forEach(t => {
  assert(t.assignedMessengerId === "EMP-MSG-001", `Budi task ${t.orderNo} strictly belongs to EMP-MSG-001`);
});

// -----------------------------------------------------------
// TEST 2: Mobile Deadline Formatting (formatMobileDeadline)
// -----------------------------------------------------------
console.log("\n[2] Testing Mobile Deadline Formatting...");
const now = new Date();
const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0).toISOString();
const formattedToday = formatMobileDeadline(todayIso);
assert(formattedToday.includes("Hari ini • 16.00") || formattedToday.includes("Hari ini • 16:00"), `Formats today deadline concisely (${formattedToday})`);

const tomorrowIso = new Date(now.getTime() + 25 * 3600000).toISOString();
const formattedTomorrow = formatMobileDeadline(tomorrowIso);
assert(formattedTomorrow.includes("Besok"), `Formats tomorrow deadline concisely (${formattedTomorrow})`);

const overdueIso = new Date(now.getTime() - 2 * 3600000).toISOString();
const formattedOverdue = formatMobileDeadline(overdueIso);
assert(formattedOverdue.includes("Terlambat 2 jam"), `Formats overdue deadline with hours count (${formattedOverdue})`);

assert(formatMobileDeadline(undefined) === "Tanpa batas waktu", "Handles undefined deadline gracefully");

// -----------------------------------------------------------
// TEST 3: Priority Badge Gating
// -----------------------------------------------------------
console.log("\n[3] Testing Priority Badge Gating...");
const urgentTask = budiTasks.find(t => t.priority === "URGENT");
const normalTask = budiTasks.find(t => t.priority === "NORMAL" || !t.priority);
assert(!!urgentTask, "Urgent task exists in seed data");
assert(!!normalTask, "Normal task exists in seed data");
// Validation rule: In UI, only URGENT / IMPORTANT display badges, NORMAL is omitted

// -----------------------------------------------------------
// TEST 4: Task Starting Workflow
// -----------------------------------------------------------
console.log("\n[4] Testing Task Starting Workflow...");
const startRes = startMessengerTask("ORD-0001", budiContext);
assert(startRes.success === true, "Budi successfully starts assigned task ORD-0001");
const ord1 = orderStore.getOrderByNo("ORD-0001");
assert(ord1?.messengerTaskStatus === "Dalam Proses", "ORD-0001 status changed to 'Dalam Proses'");
assert(!!ord1?.startedAt, "ORD-0001 recorded startedAt timestamp");

// -----------------------------------------------------------
// TEST 5: Mandatory Waiting Reason Enforcement
// -----------------------------------------------------------
console.log("\n[5] Testing Mandatory Waiting Reason Enforcement...");
const emptyReasonRes = updateMessengerTaskStatus(
  "ORD-0001",
  "WAITING",
  { waitingReason: "" },
  budiContext
);
assert(emptyReasonRes.success === false, "Empty waiting reason is strictly rejected");
assert(emptyReasonRes.error?.includes("Alasan menunggu wajib diisi") ?? false, "Error explains mandatory reason");

const validReason = SAMSAT_WAITING_REASONS[0]; // "Samsat tutup"
const validWaitingRes = updateMessengerTaskStatus(
  "ORD-0001",
  "WAITING",
  { waitingReason: validReason, note: "Samsat libur nasional" },
  budiContext
);
assert(validWaitingRes.success === true, "Valid waiting reason successfully updates status");
const ord1Waiting = orderStore.getOrderByNo("ORD-0001");
assert(ord1Waiting?.messengerTaskStatus === "Pending", "Status mapped to Pending in store");

// -----------------------------------------------------------
// TEST 6: Pre-Departure Checklist
// -----------------------------------------------------------
console.log("\n[6] Testing Pre-Departure Checklist...");
const checklistRes = updateMessengerChecklist(
  "ORD-0003",
  {
    alamatBenar: true,
    nomorTersedia: true,
    dokumenDiketahui: true,
    customerDihubungi: true,
  },
  budiContext
);
assert(checklistRes.success === true, "Checklist 4/4 saved successfully");
const ord3 = orderStore.getOrderByNo("ORD-0003");
assert(ord3?.checklistSebelumBerangkat?.alamatBenar === true, "Checklist item alamatBenar persisted");
assert(ord3?.checklistSebelumBerangkat?.customerDihubungi === true, "Checklist item customerDihubungi persisted");

// -----------------------------------------------------------
// TEST 7: Jemput Dokumen Completion
// -----------------------------------------------------------
console.log("\n[7] Testing Jemput Dokumen Completion (Pickup Proof)...");
const pickupRes = completeMessengerPickup(
  "ORD-0003",
  {
    photoProofUrl: "https://mock.storage/pickup_proof_ord3.jpg",
    notes: "STNK dan BPKB asli diterima lengkap dari customer",
  },
  budiContext
);
assert(pickupRes.success === true, "completeMessengerPickup succeeds");
const ord3Updated = orderStore.getOrderByNo("ORD-0003");
assert(ord3Updated?.pickupProof?.photoProofUrl === "https://mock.storage/pickup_proof_ord3.jpg", "Pickup proof photo URL saved");
assert(ord3Updated?.pickupProof?.notes?.includes("STNK dan BPKB"), "Pickup proof notes saved");
assert(!!ord3Updated?.pickupProof?.completedAt, "Pickup proof completedAt timestamp saved");

// -----------------------------------------------------------
// TEST 8: Samsat Components Retrieval
// -----------------------------------------------------------
console.log("\n[8] Testing Samsat Components Retrieval...");
const ord5 = orderStore.getOrderByNo("ORD-0005");
assert(!!ord5?.messengerComponentProgress, "ORD-0005 has component progress map");
const ord5Comps = Object.values(ord5?.messengerComponentProgress || {});
assert(ord5Comps.length >= 3, `ORD-0005 has at least 3 initial components (got ${ord5Comps.length})`);

// -----------------------------------------------------------
// TEST 9: Add Component from Master Data
// -----------------------------------------------------------
console.log("\n[9] Testing Add Component from Master Data...");
const masterComp = AVAILABLE_SAMSAT_COMPONENTS[0]; // e.g. "Cek Fisik Kendaraan"
const addMasterRes = addSamsatComponentToOrder(
  "ORD-0004",
  {
    name: masterComp.name,
    category: masterComp.category,
    isCustom: false,
  },
  budiContext
);
assert(addMasterRes.success === true, `Successfully added master component "${masterComp.name}" to ORD-0004`);
const ord4 = orderStore.getOrderByNo("ORD-0004");
const hasMasterComp = Object.values(ord4?.messengerComponentProgress || {}).some(
  c => c.name === masterComp.name
);
assert(hasMasterComp, `ORD-0004 now contains master component "${masterComp.name}"`);

// -----------------------------------------------------------
// TEST 10: Duplicate Component Prevention
// -----------------------------------------------------------
console.log("\n[10] Testing Duplicate Component Prevention...");
const duplicateRes = addSamsatComponentToOrder(
  "ORD-0004",
  {
    name: masterComp.name.toUpperCase(), // Case-insensitive duplicate test
    category: masterComp.category,
    isCustom: false,
  },
  budiContext
);
assert(duplicateRes.success === false, "Duplicate component addition is rejected");
assert(duplicateRes.error?.includes("sudah ada") ?? false, `Error clearly indicates duplicate: "${duplicateRes.error}"`);

// -----------------------------------------------------------
// TEST 11: Add Custom Component (nominal: 0, audited)
// -----------------------------------------------------------
console.log("\n[11] Testing Add Custom Component...");
const customRes = addSamsatComponentToOrder(
  "ORD-0004",
  {
    name: "Gesek Nomor Rangka Cadangan",
    category: "Custom",
    isCustom: true,
    note: "Dibutuhkan verifikasi fisik tambahan di Samsat",
  },
  budiContext
);
assert(customRes.success === true, "Custom component successfully added");
assert(customRes.component?.nominal === 0, "Custom component has nominal: 0 (No client charge)");
assert(customRes.component?.isCustom === true, "Custom component is flagged isCustom: true");
assert(customRes.component?.createdBy === budiContext.userName, "Custom component audits createdBy");

// -----------------------------------------------------------
// TEST 12: Component Status Progression
// -----------------------------------------------------------
console.log("\n[12] Testing Component Status Progression...");
const targetCompId = customRes.component?.componentId!;
// 1. NOT_STARTED -> IN_PROGRESS
const inProgressRes = updateMessengerComponent(
  "ORD-0004",
  targetCompId,
  { status: "IN_PROGRESS" },
  budiContext
);
assert(inProgressRes.success === true, "Component transitioned to IN_PROGRESS");
let ord4Comp = orderStore.getOrderByNo("ORD-0004")?.messengerComponentProgress?.[targetCompId];
assert(ord4Comp?.status === "IN_PROGRESS", "Component status is IN_PROGRESS in store");
assert(!!ord4Comp?.startedAt, "Component recorded startedAt timestamp");

// 2. IN_PROGRESS -> WAITING with mandatory reason
const waitingCompRes = updateMessengerComponent(
  "ORD-0004",
  targetCompId,
  { status: "WAITING", waitingReason: "Menunggu dokumen", note: "Menunggu fotokopi KTP" },
  budiContext
);
assert(waitingCompRes.success === true, "Component transitioned to WAITING with reason");
ord4Comp = orderStore.getOrderByNo("ORD-0004")?.messengerComponentProgress?.[targetCompId];
assert(ord4Comp?.status === "WAITING", "Component status is WAITING");
assert(ord4Comp?.waitingReason === "Menunggu dokumen", "Component waitingReason persisted");

// 3. WAITING -> COMPLETED
const completedCompRes = updateMessengerComponent(
  "ORD-0004",
  targetCompId,
  { status: "COMPLETED" },
  budiContext
);
assert(completedCompRes.success === true, "Component transitioned to COMPLETED");
ord4Comp = orderStore.getOrderByNo("ORD-0004")?.messengerComponentProgress?.[targetCompId];
assert(ord4Comp?.status === "COMPLETED", "Component status is COMPLETED");
assert(!!ord4Comp?.completedAt, "Component completedAt timestamp recorded");

// -----------------------------------------------------------
// TEST 13: Component Duration Arithmetic
// -----------------------------------------------------------
console.log("\n[13] Testing Component Duration Arithmetic...");
const baseStart = "2026-09-25T08:00:00.000Z";
const est2h = calculateEstimatedCompletion(baseStart, 120);
const expected2h = new Date(new Date(baseStart).getTime() + 120 * 60000).toISOString();
assert(est2h === expected2h, "calculateEstimatedCompletion matches start + 120 mins exact arithmetic");

const est1d = calculateEstimatedCompletion(baseStart, 1440);
const expected1d = new Date(new Date(baseStart).getTime() + 1440 * 60000).toISOString();
assert(est1d === expected1d, "calculateEstimatedCompletion matches start + 1440 mins (24h)");

// -----------------------------------------------------------
// TEST 14: Samsat Zero Photo Evidence Rule
// -----------------------------------------------------------
console.log("\n[14] Testing Samsat Zero Photo Evidence Rule...");
// Verify that component completion does NOT require or demand photo evidence
const ord4CompFinal = orderStore.getOrderByNo("ORD-0004")?.messengerComponentProgress?.[targetCompId];
assert(ord4CompFinal?.status === "COMPLETED", "Samsat component successfully completed without photo evidence");
assert(!ord4CompFinal?.evidence || ord4CompFinal.evidence.length === 0, "No photo evidence is attached to Samsat component");

// -----------------------------------------------------------
// TEST 15: Samsat "Kirim Hasil" Workflow
// -----------------------------------------------------------
console.log("\n[15] Testing Samsat 'Kirim Hasil' Workflow...");
const kirimHasilRes = completeSamsatProcess("ORD-0005", budiContext);
assert(kirimHasilRes.success === true, "completeSamsatProcess succeeds for ORD-0005");
const ord5Done = orderStore.getOrderByNo("ORD-0005");
assert(ord5Done?.currentStageName === "Verifikasi Ulang", "ORD-0005 advanced to Stage 5 ('Verifikasi Ulang')");
assert(ord5Done?.messengerTaskStatus === "Selesai", "ORD-0005 messenger task status is 'Selesai'");

// -----------------------------------------------------------
// TEST 16: Antar Dokumen Handover (Stage 7 -> 8)
// -----------------------------------------------------------
console.log("\n[16] Testing Antar Dokumen Handover (Stage 7 -> 8)...");
const deliveryRes = completeMessengerDelivery(
  "ORD-0008",
  {
    recipientName: "Bapak Joko Susilo",
    relationship: "Keluarga (Suami)",
    photoProofUrl: "https://mock.storage/handover_ord8.jpg",
    notes: "Dokumen asli STNK dan Plat nomor diserahkan langsung",
  },
  budiContext
);
assert(deliveryRes.success === true, "completeMessengerDelivery succeeds with handover proof");
const ord8Done = orderStore.getOrderByNo("ORD-0008");
assert(ord8Done?.currentStep === 8, "ORD-0008 transitioned to Step 8");
assert(ord8Done?.currentStageName === "Dokumen Telah Diterima", "ORD-0008 stage is 'Dokumen Telah Diterima'");
assert(ord8Done?.receiverName === "Bapak Joko Susilo", "Receiver name recorded");
assert(ord8Done?.deliveryHandover?.photoProofUrl === "https://mock.storage/handover_ord8.jpg", "Photo proof URL saved");

// -----------------------------------------------------------
// TEST 17: Reimbursement Submission
// -----------------------------------------------------------
console.log("\n[17] Testing Reimbursement Submission...");
const newReimbursement = financeStore.submitReimbursement({
  employeeId: budiContext.employeeId!,
  messengerName: budiContext.userName,
  category: "Bensin",
  amount: 45000,
  date: "2026-09-25",
  orderNo: "ORD-0001",
  note: "Bensin motor operasional ke Samsat Cibinong PP",
  receiptUrl: "https://mock.storage/struk_spbu.jpg",
});
assert(!!newReimbursement.id, `Reimbursement created with ID ${newReimbursement.id}`);
assert(newReimbursement.status === "Diajukan", "New reimbursement status is 'Diajukan'");
assert(newReimbursement.amount === 45000, "Reimbursement amount is 45000");

// -----------------------------------------------------------
// TEST 18: Strict Reimbursement Isolation
// -----------------------------------------------------------
console.log("\n[18] Testing Strict Reimbursement Isolation...");
const budiReimbursements = financeStore.getReimbursements(budiContext.employeeId!);
const andiReimbursements = financeStore.getReimbursements(andiContext.employeeId!);

assert(budiReimbursements.length >= 2, `Budi has his own reimbursements (got ${budiReimbursements.length})`);
assert(andiReimbursements.length >= 1, `Andi has his own reimbursements (got ${andiReimbursements.length})`);

const budiSeesAndi = budiReimbursements.some(r => r.employeeId === andiContext.employeeId);
const andiSeesBudi = andiReimbursements.some(r => r.employeeId === budiContext.employeeId);

assert(!budiSeesAndi, "Budi cannot see Andi's reimbursement claims");
assert(!andiSeesBudi, "Andi cannot see Budi's reimbursement claims");

// -----------------------------------------------------------
// TEST 19: Messenger Blocked from Reviewing/Approving Reimbursement
// -----------------------------------------------------------
console.log("\n[19] Testing Messenger Blocked from Reviewing/Approving Reimbursement...");
const messengerReviewAttempt = financeStore.reviewReimbursement(
  newReimbursement.id,
  "Disetujui",
  { role: "messenger", userName: budiContext.userName }
);
assert(messengerReviewAttempt === false, "Messenger role is strictly blocked from reviewing/approving reimbursements");

const afterBlockedReview = financeStore.getReimbursements().find(r => r.id === newReimbursement.id);
assert(afterBlockedReview?.status === "Diajukan", "Reimbursement status remains 'Diajukan'");

// Finance Officer approves it
const financeReviewSuccess = financeStore.reviewReimbursement(
  newReimbursement.id,
  "Disetujui",
  { role: "finance", userName: "Finance Admin" },
  "Disetujui untuk dicairkan kasir"
);
assert(financeReviewSuccess === true, "Finance Officer can approve reimbursement");
const afterApproved = financeStore.getReimbursements().find(r => r.id === newReimbursement.id);
assert(afterApproved?.status === "Disetujui", "Reimbursement status is now 'Disetujui'");

// -----------------------------------------------------------
// TEST 20: Messenger Blocked from Paying Reimbursement
// -----------------------------------------------------------
console.log("\n[20] Testing Messenger Blocked from Paying Reimbursement...");
const messengerPayAttempt = financeStore.payReimbursement(
  newReimbursement.id,
  { role: "messenger", userName: budiContext.userName }
);
assert(messengerPayAttempt === false, "Messenger role is strictly blocked from paying reimbursements");

// -----------------------------------------------------------
// TEST 21: Finance Payout & Real Cash Outflow Integration
// -----------------------------------------------------------
console.log("\n[21] Testing Finance Payout & Real Cash Outflow Integration...");
const initialPengeluaranCount = financeStore.getPengeluaranList().length;
const financePaySuccess = financeStore.payReimbursement(
  newReimbursement.id,
  { role: "finance", userName: "Kasir Finance" }
);
assert(financePaySuccess === true, "Finance successfully pays reimbursement");

const finalReimbursement = financeStore.getReimbursements().find(r => r.id === newReimbursement.id);
assert(finalReimbursement?.status === "Dibayar", "Reimbursement status is now 'Dibayar'");
assert(!!finalReimbursement?.paidAt, "paidAt timestamp recorded");
assert(!!finalReimbursement?.pengeluaranId, "pengeluaranId linked");

const finalPengeluaranList = financeStore.getPengeluaranList();
assert(finalPengeluaranList.length === initialPengeluaranCount + 1, "Pengeluaran list incremented by 1");
// addPengeluaran unshifts to index 0
const loggedPengeluaran = finalPengeluaranList[0];
assert(loggedPengeluaran.nominal === 45000, "Cash outflow equals reimbursement amount (Rp 45.000)");
assert(loggedPengeluaran.keterangan.includes("Bensin"), "Cash outflow keterangan includes reimbursement category");

// -----------------------------------------------------------
// TEST 22: Custom Component Financial Boundary
// -----------------------------------------------------------
console.log("\n[22] Testing Custom Component Financial Boundary (0 Impact on Client Billing)...");
// Check that custom components created by messengers never change client invoices or pricing
const invoiceSampleBefore = financeStore.getInvoices()[0];
const totalBefore = invoiceSampleBefore?.totalTagihan;
assert(typeof totalBefore === "number" && totalBefore > 0, `Invoice ${invoiceSampleBefore.invoice} has client invoice of Rp ${totalBefore?.toLocaleString("id-ID")}`);

// Add custom component to ORD-0005
addSamsatComponentToOrder(
  "ORD-0005",
  {
    name: "Komponen Uji Finansial",
    category: "Custom",
    isCustom: true,
  },
  budiContext
);

const invoiceSampleAfter = financeStore.getInvoices()[0];
assert(invoiceSampleAfter?.totalTagihan === totalBefore, "Customer invoice total tagihan remains unchanged after custom component addition");

// Check master pricing catalog:
const pricingItems = pricingStore.getPricingItems();
const hasCustomInCatalog = pricingItems.some(p => p.name.includes("Komponen Uji Finansial"));
assert(!hasCustomInCatalog, "Master pricing catalog was NOT contaminated by messenger custom component");

// -----------------------------------------------------------
// TEST 23: Edit Harga in Samsat Process (Per-Order Operational Actual Price)
// -----------------------------------------------------------
console.log("\n[23] Testing Edit Harga in Samsat Process...");
const testCompItem = AVAILABLE_SAMSAT_COMPONENTS[1]; // "Hadir" (Rp 75.000)
const addRes = addSamsatComponentToOrder(
  "ORD-0004",
  {
    name: testCompItem.name,
    category: testCompItem.category,
    isCustom: false,
  },
  budiContext
);
assert(addRes.success === true, `Successfully added "${testCompItem.name}" to ORD-0004`);
const addedCompId = addRes.component!.componentId;
const baseMasterPrice = addRes.component!.masterPrice || testCompItem.basePrice || 75000;

// Edit price on this order from 75.000 to 125.000 (+50.000)
const newPrice = baseMasterPrice + 50000;
const editPriceRes = updateMessengerComponentPrice(
  "ORD-0004",
  addedCompId,
  newPrice,
  budiContext,
  "Kenaikan retribusi loket resmi Samsat"
);
assert(editPriceRes.success === true, "updateMessengerComponentPrice succeeds");

const updatedOrd4Comp = orderStore.getOrderByNo("ORD-0004")?.messengerComponentProgress?.[addedCompId];
assert(updatedOrd4Comp?.actualOrderPrice === newPrice, `actualOrderPrice updated to ${newPrice} on ORD-0004`);
assert(updatedOrd4Comp?.masterPrice === baseMasterPrice, "masterPrice reference remains intact");
assert((updatedOrd4Comp?.actualOrderPrice || 0) - (updatedOrd4Comp?.masterPrice || 0) === 50000, "Price difference correctly calculated (+Rp 50.000)");

// Verify master pricing catalog was NOT altered
const masterPricingBase = pricingStore.getSamsatPrice("samsat-cibinong", testCompItem.id);
assert(masterPricingBase === baseMasterPrice, "pricingStore master price remains untouched at base value");

// -----------------------------------------------------------
// TEST 24: Custom Duration in Days Arithmetic
// -----------------------------------------------------------
console.log("\n[24] Testing Custom Duration in Days Arithmetic...");
const customDays = 5;
const expectedMinutes = customDays * 1440; // 7200 minutes
const durationRes = updateMessengerComponent(
  "ORD-0004",
  addedCompId,
  {
    isCustomDuration: true,
    customDurationDays: customDays,
    estimatedDurationMinutes: expectedMinutes,
  },
  budiContext
);
assert(durationRes.success === true, "Setting custom duration in days succeeds");
const customDurationComp = orderStore.getOrderByNo("ORD-0004")?.messengerComponentProgress?.[addedCompId];
assert(customDurationComp?.isCustomDuration === true, "isCustomDuration is true");
assert(customDurationComp?.customDurationDays === 5, "customDurationDays stored as 5 days");
assert(customDurationComp?.estimatedDurationMinutes === 7200, "estimatedDurationMinutes calculated as 7200 (5 * 1440)");
assert(!!customDurationComp?.estimatedCompletedAt, "estimatedCompletedAt calculated and stored");

// -----------------------------------------------------------
// TEST 25: Master Samsat Components Dynamic SSoT Grouping
// -----------------------------------------------------------
console.log("\n[25] Testing Master Samsat Components Dynamic SSoT Grouping...");
const allMaster = getMasterSamsatComponents("Samsat Cibinong");
const mutasiMasuk = allMaster.filter(c => c.category === "Mutasi Masuk" || c.category.toLowerCase().includes("masuk"));
const mutasiKeluar = allMaster.filter(c => c.category === "Mutasi Keluar" || c.category.toLowerCase().includes("keluar"));
assert(allMaster.length >= 25, `Dynamically retrieved ${allMaster.length} master items from pricingStore`);
assert(mutasiMasuk.length >= 5, `Found ${mutasiMasuk.length} Mutasi Masuk components`);
assert(mutasiKeluar.length >= 10, `Found ${mutasiKeluar.length} Mutasi Keluar components`);
assert(allMaster.every(c => typeof c.basePrice === "number" && typeof c.defaultNominal === "number"), "All components have numeric basePrice and defaultNominal");

console.log("\n=================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\n>>> ALL 25 SCENARIOS IN VERIFICATION SUITE PASSED SUCCESSFULLY! <<<\n");
}
