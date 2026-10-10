import test from "node:test";
import assert from "node:assert";
import { orderStore } from "../src/app/data/orderStore";

test("Order Workflow - Complete Stage 1 to Stage 8 lifecycle", () => {
  // 1. BUAT ORDER: Stage 1 (Verifikasi)
  const createdOrder = orderStore.addOrder({
    customer: "Workflow Hero",
    namaPemilik: "Workflow Hero",
    nomorHP: "081234567890",
    nopol: "B 7777 WFL",
    layanan: "Mutasi Antar Samsat",
    wilayahSamsatAsal: "Jakarta Timur",
    wilayahSamsatTujuan: "Jakarta Barat",
    nominalPkbTerakhir: 300000,
    payment: {
      tipePembayaran: "Bayar di Akhir",
      metodePembayaran: "Cash",
      statusPembayaran: "Belum Bayar",
      totalBiaya: 493000,
      dibayar: 0,
      kurang: 493000,
    },
  });

  const orderNo = createdOrder.orderNo;
  assert.ok(orderNo, "Order number should be generated");
  assert.strictEqual(createdOrder.currentStageName, "Verifikasi");
  assert.strictEqual(createdOrder.currentStep, 1);

  // STAGE 1 -> STAGE 2: Penjadwalan
  const s1Result = orderStore.advanceOrder(orderNo, "Penjadwalan", {
    currentStep: 2,
    tanggalPenjadwalan: "2026-10-05",
    waktuPenjadwalan: "09:00",
    messenger: "Ahmad Rizki",
  });
  assert.strictEqual(s1Result, true, "Advance to Stage 2 should succeed");
  let currentOrder = orderStore.getOrderByNo(orderNo);
  assert.strictEqual(currentOrder?.currentStageName, "Penjadwalan");
  assert.strictEqual(currentOrder?.currentStep, 2);
  assert.strictEqual(currentOrder?.messenger, "Ahmad Rizki");

  // STAGE 2 -> STAGE 3: Verifikasi Dokumen
  const s2Result = orderStore.advanceOrder(orderNo, "Verifikasi Dokumen", {
    currentStep: 3,
    statusVerifikasiDokumen: "Lengkap",
    catatanOrder: "Semua dokumen fisik telah diterima dari messenger",
  });
  assert.strictEqual(s2Result, true, "Advance to Stage 3 should succeed");
  currentOrder = orderStore.getOrderByNo(orderNo);
  assert.strictEqual(currentOrder?.currentStageName, "Verifikasi Dokumen");
  assert.strictEqual(currentOrder?.currentStep, 3);

  // STAGE 3 -> STAGE 4: Proses Samsat
  const s3Result = orderStore.advanceOrder(orderNo, "Proses Samsat", {
    currentStep: 4,
  });
  assert.strictEqual(s3Result, true, "Advance to Stage 4 should succeed");
  currentOrder = orderStore.getOrderByNo(orderNo);
  assert.strictEqual(currentOrder?.currentStageName, "Proses Samsat");
  assert.strictEqual(currentOrder?.currentStep, 4);

  // STAGE 4 -> STAGE 5: Verifikasi Ulang
  const s4Result = orderStore.advanceOrder(orderNo, "Verifikasi Ulang", {
    currentStep: 5,
  });
  assert.strictEqual(s4Result, true, "Advance to Stage 5 should succeed");
  currentOrder = orderStore.getOrderByNo(orderNo);
  assert.strictEqual(currentOrder?.currentStageName, "Verifikasi Ulang");
  assert.strictEqual(currentOrder?.currentStep, 5);

  // STAGE 5 -> STAGE 6: Supervisi
  const s5Result = orderStore.advanceOrder(orderNo, "Supervisi", {
    currentStep: 6,
    verifiedBy: "Supervisor Operasional",
  });
  assert.strictEqual(s5Result, true, "Advance to Stage 6 should succeed");
  currentOrder = orderStore.getOrderByNo(orderNo);
  assert.strictEqual(currentOrder?.currentStageName, "Supervisi");
  assert.strictEqual(currentOrder?.currentStep, 6);

  // STAGE 6 -> STAGE 7: Pengantaran
  const s6Result = orderStore.advanceOrder(orderNo, "Pengantaran", {
    currentStep: 7,
    messengerPengantar: "Budi Santoso",
  });
  assert.strictEqual(s6Result, true, "Advance to Stage 7 should succeed");
  currentOrder = orderStore.getOrderByNo(orderNo);
  assert.strictEqual(currentOrder?.currentStageName, "Pengantaran");
  assert.strictEqual(currentOrder?.currentStep, 7);
  assert.strictEqual(currentOrder?.messengerPengantar, "Budi Santoso");

  // STAGE 7 -> STAGE 8: Dokumen Telah Diterima
  const s7Result = orderStore.advanceOrder(orderNo, "Dokumen Telah Diterima", {
    currentStep: 8,
    penerimaDokumen: "Workflow Hero Sendiri",
    catatanOrder: "Dokumen telah diserahkan dan tanda terima ditandatangani",
  });
  assert.strictEqual(s7Result, true, "Advance to Stage 8 should succeed");
  currentOrder = orderStore.getOrderByNo(orderNo);
  assert.strictEqual(currentOrder?.currentStageName, "Dokumen Telah Diterima");
  assert.strictEqual(currentOrder?.currentStep, 8);

  // Data Integrity Verification: customer, nopol, and base details remain intact
  assert.strictEqual(currentOrder?.customer, "Workflow Hero");
  assert.strictEqual(currentOrder?.nopol, "B 7777 WFL");
  assert.strictEqual(currentOrder?.layanan, "Mutasi Antar Samsat");

  // STAGE 8 -> ARCHIVE (Riwayat Order)
  const archiveResult = orderStore.archiveOrder(orderNo);
  assert.strictEqual(archiveResult, true, "Archiving order should succeed");

  const archivedOrder = orderStore.getOrderByNo(orderNo);
  assert.ok(archivedOrder, "Order should be retrievable from archives");

  // Verify it is in archivedOrders collection
  const archivedOrders = orderStore.getArchivedOrders();
  assert.ok(archivedOrders.some((o) => o.orderNo === orderNo), "Should be in archivedOrders list");
});

test("Order Workflow - Advance non-existent order returns false", () => {
  const result = orderStore.advanceOrder("ORD-NON-EXISTENT", "Penjadwalan", { currentStep: 2 });
  assert.strictEqual(result, false, "Advance on non-existent order should return false");
});
