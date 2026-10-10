import test from "node:test";
import assert from "node:assert";
import { orderStore } from "../src/app/data/orderStore";

test("OrderStore Compatibility - All required public API methods exist and have valid signatures", () => {
  const requiredMethods = [
    "getActiveOrders",
    "getArchivedOrders",
    "getAllOrders",
    "addOrder",
    "advanceOrder",
    "updateOrder",
    "verifyPayment",
    "archiveOrder",
    "getOrderByNo",
    "getOrdersByStage",
    "syncFinalCostToFinance",
    "processRefund",
    "addRekapDocument",
    "subscribe",
  ];

  for (const method of requiredMethods) {
    assert.strictEqual(
      typeof (orderStore as unknown as Record<string, unknown>)[method],
      "function",
      `orderStore.${method} must be an exported function`
    );
  }
});

test("Document Workflow - addRekapDocument successfully attaches BEFORE & AFTER evidence", () => {
  const newOrder = orderStore.addOrder({
    customer: "Document Workflow Client",
    namaPemilik: "Document Workflow Client",
    nomorHP: "0812555555",
    nopol: "B 5555 DOC",
    layanan: "Perpanjangan 5 Tahun",
    totalEstimasi: 700000,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Cash",
      statusPembayaran: "Lunas",
      totalBiaya: 700000,
      dibayar: 700000,
      kurang: 0,
      isPaymentVerified: true,
    },
  });

  const orderNo = newOrder.orderNo;

  // 1. Attach BEFORE document (e.g. STNK Lama)
  const addBeforeDoc = orderStore.addRekapDocument(orderNo, {
    phase: "BEFORE",
    documentType: "STNK",
    label: "STNK Fisik Lama",
    fileType: "IMAGE",
    fileUrl: "https://example.com/stnk-lama.jpg",
    uploadedBy: "Messenger Ahmad",
  });
  assert.strictEqual(addBeforeDoc, true, "addRekapDocument BEFORE should succeed");

  // 2. Attach AFTER document (e.g. STNK Baru dari Samsat)
  const addAfterDoc = orderStore.addRekapDocument(orderNo, {
    phase: "AFTER",
    documentType: "STNK",
    label: "STNK Baru Selesai Cetak",
    fileType: "PDF",
    fileUrl: "https://example.com/stnk-baru.pdf",
    uploadedBy: "Admin Samsat",
  });
  assert.strictEqual(addAfterDoc, true, "addRekapDocument AFTER should succeed");

  // Verify documents are attached to the order
  const updatedOrder = orderStore.getOrderByNo(orderNo);
  assert.ok(updatedOrder?.rekapDocuments);
  assert.strictEqual(updatedOrder?.rekapDocuments?.length, 2);

  const beforeDoc = updatedOrder?.rekapDocuments?.find((d) => d.phase === "BEFORE");
  assert.ok(beforeDoc);
  assert.strictEqual(beforeDoc?.label, "STNK Fisik Lama");
  assert.strictEqual(beforeDoc?.uploadedBy, "Messenger Ahmad");

  const afterDoc = updatedOrder?.rekapDocuments?.find((d) => d.phase === "AFTER");
  assert.ok(afterDoc);
  assert.strictEqual(afterDoc?.label, "STNK Baru Selesai Cetak");
});

test("Data Integrity - Partial updates preserve unmentioned fields", () => {
  const newOrder = orderStore.addOrder({
    customer: "Integrity Preservation Client",
    namaPemilik: "Integrity Preservation Client",
    nomorHP: "0812111111",
    nopol: "B 1111 ITG",
    layanan: "Mutasi Antar Samsat",
    nominalPkbTerakhir: 450000,
    wilayahSamsatAsal: "Jakarta Timur",
    totalEstimasi: 650000,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Transfer BCA",
      statusPembayaran: "Lunas",
      totalBiaya: 650000,
      dibayar: 650000,
      kurang: 0,
    },
  });

  const orderNo = newOrder.orderNo;

  // Partial update touching only catatanOrder
  orderStore.updateOrder(orderNo, {
    catatanOrder: "Updated memo only",
  });

  const updated = orderStore.getOrderByNo(orderNo);
  assert.strictEqual(updated?.catatanOrder, "Updated memo only");
  // Ensure other fields are preserved
  assert.strictEqual(updated?.customer, "Integrity Preservation Client");
  assert.strictEqual(updated?.nopol, "B 1111 ITG");
  assert.strictEqual(updated?.wilayahSamsatAsal, "Jakarta Timur");
  assert.strictEqual(updated?.nominalPkbTerakhir, 450000);
  assert.strictEqual(updated?.payment.totalBiaya, 650000);
  assert.strictEqual(updated?.payment.statusPembayaran, "Lunas");
});
