import test from "node:test";
import assert from "node:assert";
import { MockOrderProvider } from "../src/data/mock/mockOrderProvider";
import { OperationalOrder, STAGES } from "../src/domain/order/types";

test("MockOrderProvider - Loads initial fixtures correctly across all stages", () => {
  const provider = new MockOrderProvider();
  const activeOrders = provider.getActiveOrders();

  // All 8 stages should exist as keys
  for (const stage of STAGES) {
    assert.ok(Array.isArray(activeOrders[stage]), `Stage '${stage}' should be an array`);
  }

  const allOrders = provider.getAllFlat();
  assert.ok(allOrders.length >= 8, "Initial fixtures should contain orders across the stages");

  // Verify ORD-0001 to ORD-0008 exist in initial fixtures
  const order1 = provider.getOrderByNo("ORD-0001");
  assert.ok(order1, "ORD-0001 should exist in initial fixtures");
  assert.strictEqual(order1?.customer, "PT. Maju Jaya Abadi");

  const order5 = provider.getOrderByNo("ORD-0005");
  assert.ok(order5, "ORD-0005 should exist in initial fixtures");
  assert.strictEqual(order5?.currentStageName, "Proses Samsat");
});

test("MockOrderProvider - Preserves isolation: mutating one order does not alter others", () => {
  const provider = new MockOrderProvider();
  const order1 = provider.getOrderByNo("ORD-0001");
  const order2 = provider.getOrderByNo("ORD-0002");

  assert.ok(order1 && order2, "Orders should exist");
  const initialCustomer2 = order2.customer;

  provider.updateOrder("ORD-0001", {
    customer: "Budi Changed Name",
    catatanOrder: "Special memo for ORD-0001",
  });

  const refreshedOrder1 = provider.getOrderByNo("ORD-0001");
  const refreshedOrder2 = provider.getOrderByNo("ORD-0002");

  assert.strictEqual(refreshedOrder1?.customer, "Budi Changed Name");
  assert.strictEqual(refreshedOrder1?.catatanOrder, "Special memo for ORD-0001");
  assert.strictEqual(refreshedOrder2?.customer, initialCustomer2, "ORD-0002 should remain untouched");
  assert.notStrictEqual(refreshedOrder2?.catatanOrder, "Special memo for ORD-0001");
});

test("MockOrderProvider - addOrder safely places order into target stage", () => {
  const provider = new MockOrderProvider();
  const newOrderNo = `NEW-${Date.now()}`;

  const newOrder: OperationalOrder = {
    orderNo: newOrderNo,
    customer: "Dewi Lestari",
    nomorHP: "0877777777",
    layanan: "Mutasi Antar Samsat",
    currentStep: 1,
    currentStageName: "Verifikasi",
    createdAt: new Date().toISOString(),
    namaPemilik: "Dewi",
    kepemilikanKendaraan: "Milik Sendiri",
    nopol: "B 1234 DW",
    wilayahSamsatAsal: "Jakarta Timur",
    wilayahSamsatTujuan: "Jakarta Barat",
    nominalPkbTerakhir: 400000,
    nominalSwdkllj: 143000,
    biayaJasa: 75000,
    pkb: 400000,
    swdkllj: 143000,
    dendaSwdkllj: 0,
    totalEstimasi: 618000,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Transfer BCA",
      statusPembayaran: "Lunas",
      totalBiaya: 618000,
      dibayar: 618000,
      kurang: 0,
    },
    orderSource: "Online / WhatsApp",
    createdBy: "Admin Loket",
    clientDocuments: {},
    samsatProcesses: [],
  };

  provider.addOrder(newOrder);

  const found = provider.getOrderByNo(newOrderNo);
  assert.ok(found, "Newly added order should be found");
  assert.strictEqual(found?.orderNo, newOrderNo);

  const verifikasiList = provider.getOrdersByStage("Verifikasi");
  assert.ok(verifikasiList.some((o) => o.orderNo === newOrderNo), "Should be in Verifikasi list");
});

test("MockOrderProvider - rollbackOrder moves order back to previous stage", () => {
  const provider = new MockOrderProvider();
  const order4 = provider.getOrderByNo("ORD-0004");
  assert.ok(order4, "ORD-0004 should exist");
  assert.strictEqual(order4?.currentStageName, "Verifikasi Dokumen");

  // Rollback ORD-0004 from Stage 3 (Verifikasi Dokumen) to Stage 2 (Penjadwalan)
  const rollbackSuccess = provider.rollbackOrder("ORD-0004", "Penjadwalan", {
    currentStep: 2,
    catatanOrder: "Dokumen kurang lengkap, dijadwalkan ulang",
  });

  assert.strictEqual(rollbackSuccess, true, "Rollback should return true");
  const rolledBackOrder = provider.getOrderByNo("ORD-0004");
  assert.strictEqual(rolledBackOrder?.currentStageName, "Penjadwalan");
  assert.strictEqual(rolledBackOrder?.currentStep, 2);
  assert.strictEqual(rolledBackOrder?.catatanOrder, "Dokumen kurang lengkap, dijadwalkan ulang");

  // Verify absence from Stage 3
  const stage3List = provider.getOrdersByStage("Verifikasi Dokumen");
  assert.strictEqual(stage3List.some((o) => o.orderNo === "ORD-0004"), false);

  // Verify presence in Stage 2
  const stage2List = provider.getOrdersByStage("Penjadwalan");
  assert.strictEqual(stage2List.some((o) => o.orderNo === "ORD-0004"), true);
});

test("MockOrderProvider - Non-existent order mutations return false without throwing", () => {
  const provider = new MockOrderProvider();

  assert.strictEqual(provider.updateOrder("GHOST-ORDER", { customer: "Ghost" }), false);
  assert.strictEqual(provider.advanceOrder("GHOST-ORDER", "Proses Samsat", {}), false);
  assert.strictEqual(provider.rollbackOrder("GHOST-ORDER", "Verifikasi", {}), false);
  assert.strictEqual(provider.archiveOrder("GHOST-ORDER"), false);
  assert.strictEqual(provider.getOrderByNo("GHOST-ORDER"), undefined);
});
