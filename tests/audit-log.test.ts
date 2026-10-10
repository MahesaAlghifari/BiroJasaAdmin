import test from "node:test";
import assert from "node:assert";
import { auditLog } from "../src/app/utils/auditLog";
import { orderStore } from "../src/app/data/orderStore";

test("Audit Log - Lifecycle events produce recorded audit trail", () => {
  const initialLogCount = auditLog.getLogs().length;

  // 1. CREATE ORDER event
  const newOrder = orderStore.addOrder({
    customer: "Audit Trail Test",
    namaPemilik: "Audit Trail Test",
    nomorHP: "0812444444",
    nopol: "B 4444 AUD",
    layanan: "Perpanjangan 1 Tahun",
    createdBy: "Admin Loket",
    totalEstimasi: 350000,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Cash",
      statusPembayaran: "Belum Bayar",
      totalBiaya: 350000,
      dibayar: 0,
      kurang: 350000,
    },
  });

  const logsAfterCreate = auditLog.getLogs();
  assert.ok(logsAfterCreate.length > initialLogCount, "Audit log should have new entry on create");
  const createLog = logsAfterCreate.find(
    (l) => l.action === "CREATE" && l.metadata?.orderNo === newOrder.orderNo
  );
  assert.ok(createLog, "Should find CREATE audit entry for the order");
  assert.strictEqual(createLog?.module, "Order");

  // 2. STAGE TRANSITION event
  orderStore.advanceOrder(newOrder.orderNo, "Penjadwalan", {
    currentStep: 2,
    verifiedBy: "Staff Operasional",
  });

  const transitionLog = auditLog.getLogs().find(
    (l) => l.action === "UPDATE" && l.metadata?.orderNo === newOrder.orderNo && l.metadata?.toStage === "Penjadwalan"
  );
  assert.ok(transitionLog, "Should find stage transition audit entry");

  // 3. PAYMENT VERIFICATION event
  orderStore.verifyPayment(newOrder.orderNo, "Admin Keuangan");
  const paymentLog = auditLog.getLogs().find(
    (l) => l.module === "Order Tracking" && l.metadata?.orderNo === newOrder.orderNo && l.details.includes("Verifikasi pembayaran")
  );
  assert.ok(paymentLog, "Should find payment verification audit entry");
});

test("Audit Log - Filtering by module, role, and action works correctly", () => {
  const allLogs = auditLog.getLogs();
  assert.ok(allLogs.length > 0);

  const orderLogs = auditLog.getLogs({ module: "Order" });
  assert.ok(Array.isArray(orderLogs));
  assert.ok(orderLogs.every((l) => l.module.toLowerCase().includes("order")));

  const createLogs = auditLog.getLogs({ action: "CREATE" });
  assert.ok(Array.isArray(createLogs));
  assert.ok(createLogs.every((l) => l.action === "CREATE"));
});
