/**
 * Comprehensive Audit Test Suite for Messenger Workspace
 * Tests all operational mutations, data integrity, action guards, and state transitions
 */

import { orderStore } from "../src/app/data/orderStore";
import { financeStore } from "../src/app/data/financeStore";
import { pricingStore } from "../src/app/data/pricingStore";
import {
  getMessengerTasksForEmployee,
  startMessengerTask,
  updateMessengerTaskStatus,
  updateMessengerComponent,
  updateMessengerComponentPrice,
  completeSamsatProcess,
  completeMessengerPickup,
  completeMessengerDelivery,
  addSamsatComponentToOrder,
  UserContext,
} from "../src/app/data/messengerTaskAdapter";

const messengerUser1: UserContext = {
  userId: "usr-msg-1",
  userName: "Budi Santoso",
  role: "messenger",
  employeeId: "EMP-MSG-001",
};

const messengerUser2: UserContext = {
  userId: "usr-msg-2",
  userName: "Andi Pratama",
  role: "messenger",
  employeeId: "EMP-MSG-002",
};

const financeUser: UserContext = {
  userId: "usr-fin-1",
  userName: "Finance User",
  role: "finance",
};

async function runAuditTests() {
  console.log("=== STARTING MESSENGER WORKSPACE PROGRAMMATIC AUDIT ===\n");

  let passCount = 0;
  let failCount = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${name} - ${details || ""}`);
      failCount++;
    }
  }

  // 1. Task Isolation Test
  const activeOrders = orderStore.getActiveOrders();
  const tasksUser1 = getMessengerTasksForEmployee(activeOrders, messengerUser1.employeeId!);
  const tasksUser2 = getMessengerTasksForEmployee(activeOrders, messengerUser2.employeeId!);

  assert(
    "Task Isolation: Tasks User 1 are strictly assigned to User 1",
    tasksUser1.every((t) => t.assignedMessengerId === messengerUser1.employeeId),
    "Found task belonging to another messenger in User 1 task list"
  );

  assert(
    "Task Isolation: Tasks User 2 are strictly assigned to User 2",
    tasksUser2.every((t) => t.assignedMessengerId === messengerUser2.employeeId),
    "Found task belonging to another messenger in User 2 task list"
  );

  // 2. Ownership Mutation Guard Test
  // User 2 attempts to start User 1's task (ORD-0003 is assigned to User 1)
  const crossMutation = startMessengerTask("ORD-0003", messengerUser2);
  assert(
    "Ownership Guard: Cross-messenger mutation blocked",
    !crossMutation.success,
    `Expected failure, got success: ${crossMutation.error}`
  );

  // 3. Financial Action Guard Test: Messenger cannot review/approve reimbursement
  const crossReview = financeStore.reviewReimbursement("REIMB-001", "Disetujui", {
    role: "messenger",
    userName: "Budi Santoso",
  });
  assert(
    "Financial Guard: Messenger cannot review reimbursement",
    crossReview === false,
    "Messenger was able to review reimbursement!"
  );

  // 4. Financial Action Guard Test: Messenger cannot pay reimbursement
  const crossPay = financeStore.payReimbursement("REIMB-001", {
    role: "messenger",
    userName: "Budi Santoso",
  });
  assert(
    "Financial Guard: Messenger cannot pay reimbursement",
    crossPay === false,
    "Messenger was able to pay reimbursement!"
  );

  // 5. Audit of completeMessengerPickup (TESTING CURRENT BEHAVIOR)
  const pickupRes = completeMessengerPickup(
    "ORD-0003",
    { photoProofUrl: "data:image/png;base64,test", notes: "Berkas lengkap" },
    messengerUser1
  );

  const orderAfterPickup = orderStore.getOrderByNo("ORD-0003");
  const isAdvancedToStage3 = orderAfterPickup?.currentStep === 3;
  const isPickupStatusSelesai = orderAfterPickup?.messengerTaskStatus === "Selesai";

  console.log("\n--- AUDIT FINDING FOR completeMessengerPickup ---");
  console.log(`completeMessengerPickup returned success: ${pickupRes.success}`);
  console.log(`Order ORD-0003 currentStep: ${orderAfterPickup?.currentStep} (Expected 3)`);
  console.log(`Order ORD-0003 currentStageName: ${orderAfterPickup?.currentStageName} (Expected 'Verifikasi Dokumen')`);
  console.log(`Order ORD-0003 messengerTaskStatus: '${orderAfterPickup?.messengerTaskStatus}' (Expected 'Selesai')`);

  assert(
    "Audit Check: completeMessengerPickup advances order to Stage 3",
    isAdvancedToStage3,
    `Current step is ${orderAfterPickup?.currentStep}, did not advance to 3`
  );
  assert(
    "Audit Check: completeMessengerPickup sets messengerTaskStatus to 'Selesai'",
    isPickupStatusSelesai,
    `messengerTaskStatus is '${orderAfterPickup?.messengerTaskStatus}', not 'Selesai'`
  );

  // 6. Edit Harga Aktual SSoT Safety Test
  const order5 = orderStore.getOrderByNo("ORD-0005");
  if (order5) {
    const editPriceRes = updateMessengerComponentPrice(
      "ORD-0005",
      "mk-1",
      45000,
      messengerUser1,
      "Biaya loket naik"
    );
    assert("Edit Harga Aktual: returns success", editPriceRes.success);
    const updatedOrder5 = orderStore.getOrderByNo("ORD-0005");
    assert(
      "Edit Harga Aktual: sets actualOrderPrice on component progress",
      updatedOrder5?.messengerComponentProgress?.["mk-1"]?.actualOrderPrice === 45000
    );
    // Verify pricingStore is NOT mutated
    const masterItems = pricingStore.getMasterPricingItems();
    const masterMk1 = masterItems.find((m) => m.id === "mk-1");
    assert(
      "Edit Harga Aktual: Pricing Store master price remains unchanged",
      masterMk1?.biayaDasarSamsat !== 45000 || masterMk1 === undefined
    );
  }

  // 7. Samsat Process Completion (Kirim Hasil) Test
  const samsatRes = completeSamsatProcess("ORD-0005", messengerUser1, "Semua beres");
  const order5AfterSamsat = orderStore.getOrderByNo("ORD-0005");
  assert(
    "completeSamsatProcess: Advances order to Stage 5 ('Verifikasi Ulang')",
    order5AfterSamsat?.currentStageName === "Verifikasi Ulang" && order5AfterSamsat?.currentStep === 5
  );
  assert(
    "completeSamsatProcess: Sets messengerTaskStatus to 'Selesai'",
    order5AfterSamsat?.messengerTaskStatus === "Selesai"
  );

  // 8. Delivery Task Completion (Stage 7 -> Stage 8)
  const deliveryRes = completeMessengerDelivery(
    "ORD-0008",
    {
      recipientName: "Rina Kusuma",
      relationship: "Pemilik Langsung",
      photoProofUrl: "data:image/png;base64,test-delivery",
      notes: "Diterima langsung oleh pemilik",
      completedAt: new Date().toISOString(),
    },
    messengerUser1
  );
  assert("completeMessengerDelivery: returns success", deliveryRes.success);
  const order8After = orderStore.getOrderByNo("ORD-0008");
  assert(
    "completeMessengerDelivery: Advances order to Stage 8 ('Dokumen Telah Diterima')",
    order8After?.currentStageName === "Dokumen Telah Diterima" && order8After?.currentStep === 8
  );
  assert(
    "completeMessengerDelivery: Sets isReceived to true and receiverName",
    order8After?.isReceived === true && order8After?.receiverName === "Rina Kusuma"
  );
  assert(
    "completeMessengerDelivery: Sets messengerTaskStatus to 'Selesai'",
    order8After?.messengerTaskStatus === "Selesai"
  );

  console.log(`\n=== AUDIT SUITE FINISHED: ${passCount} PASSED, ${failCount} FAILED ===\n`);
}

runAuditTests().catch(console.error);
