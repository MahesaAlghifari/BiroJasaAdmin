/**
 * Deterministic Test Suite for Phase: Final Cost Reconciliation, Tagihan & Rekap Order
 * Admin SUN89 — Biro Jasa Management System
 */

import { orderStore } from "../src/app/data/orderStore";
import { financeStore } from "../src/app/data/financeStore";
import { pricingStore } from "../src/app/data/pricingStore";
import { OperationalOrder } from "../src/domain/order/types";

let passed = 0;
let failed = 0;

function assert(desc: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${desc} ${detail ? `(${detail})` : ""}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("PHASE VERIFICATION: FINAL COST RECONCILIATION & REKAP ORDER");
  console.log("=======================================================\n");

  // -------------------------------------------------------------
  // TEST 1: Bayar di Awal = Estimasi = Biaya Final (BALANCED)
  // -------------------------------------------------------------
  console.log("--- TEST 1: Bayar di Awal = Estimasi = Biaya Final (BALANCED) ---");
  const order1 = orderStore.addOrder({
    customer: "Test Customer Balanced",
    nomorHP: "08123456001",
    layanan: "Pajak Tahunan",
    nopol: "B 1001 BAL",
    biayaJasa: 100000,
    pkb: 900000,
    swdkllj: 143000,
    dendaSwdkllj: 0,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Transfer BCA",
      statusPembayaran: "Lunas",
      totalBiaya: 1143000,
      dibayar: 1143000,
      kurang: 0,
      isPaymentVerified: true,
    },
  });

  assert("Order 1 created with PENDING_FINALIZATION", order1.settlementCondition === "PENDING_FINALIZATION");
  assert("Order 1 invoice created with AFTER_DOCUMENT_RECEIVED", () => {
    const inv = financeStore.getInvoices().find(i => i.orderNo === order1.orderNo);
    return inv !== undefined && inv.dueTrigger === "AFTER_DOCUMENT_RECEIVED";
  });

  // Stage 5 Final Cost equals initial paid amount
  orderStore.syncFinalCostToFinance(order1.orderNo, 1143000, 1043000, 100000);
  const updated1 = orderStore.getOrderByNo(order1.orderNo);
  assert("Order 1 settlementCondition is BALANCED", updated1?.settlementCondition === "BALANCED");
  assert("Order 1 refundStatus is NONE", updated1?.refundStatus === "NONE");
  assert("Order 1 kurang is 0", updated1?.payment.kurang === 0);
  assert("Order 1 status is Lunas", updated1?.payment.statusPembayaran === "Lunas");

  const inv1 = financeStore.getInvoices().find(i => i.orderNo === order1.orderNo);
  assert("Invoice 1 sisa is 0", inv1?.sisa === 0);
  assert("Invoice 1 status is Lunas", inv1?.status === "Lunas");
  assert("Invoice 1 settlementCondition is BALANCED", inv1?.settlementCondition === "BALANCED");

  // Advance order 1 to Stage 8 and archive
  orderStore.advanceOrder(order1.orderNo, "Dokumen Telah Diterima", {});
  orderStore.archiveOrder(order1.orderNo);

  const archived1 = orderStore.getArchivedOrders().find(o => o.orderNo === order1.orderNo);
  assert("Order 1 archived successfully", archived1 !== undefined);
  assert("Order 1 qualifies for Rekap (kurang === 0 && no pending refund)", 
    archived1 !== undefined && archived1.payment.kurang === 0 && archived1.payment.refundStatus !== "PENDING"
  );

  // -------------------------------------------------------------
  // TEST 2: Bayar di Awal < Biaya Final (UNDERPAID / Kurang Bayar)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Bayar di Awal < Biaya Final (UNDERPAID) ---");
  const order2 = orderStore.addOrder({
    customer: "Test Customer Underpaid",
    nomorHP: "08123456002",
    layanan: "Mutasi Luar Daerah",
    nopol: "B 2002 UND",
    biayaJasa: 150000,
    pkb: 1000000,
    swdkllj: 143000,
    dendaSwdkllj: 0,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Transfer Mandiri",
      statusPembayaran: "Lunas",
      totalBiaya: 1293000,
      dibayar: 1293000,
      kurang: 0,
      isPaymentVerified: true,
    },
  });

  // Stage 5 adds extra mutasi cost -> Final Cost becomes 1.593.000 (extra 300.000)
  orderStore.syncFinalCostToFinance(order2.orderNo, 1593000, 1443000, 150000);
  const updated2 = orderStore.getOrderByNo(order2.orderNo);

  assert("Order 2 settlementCondition is UNDERPAID", updated2?.settlementCondition === "UNDERPAID");
  assert("Order 2 kurang is 300,000", updated2?.payment.kurang === 300000);
  assert("Order 2 status is Kurang Bayar", updated2?.payment.statusPembayaran === "Kurang Bayar");
  assert("Order 2 overpayment is 0", updated2?.payment.overpayment === 0);

  const inv2 = financeStore.getInvoices().find(i => i.orderNo === order2.orderNo);
  assert("Invoice 2 sisa is 300,000", inv2?.sisa === 300000);
  assert("Invoice 2 status is Kurang Bayar", inv2?.status === "Kurang Bayar");
  assert("Invoice 2 collectionStatus is BELUM_JATUH_TEMPO in Stages 1-7", inv2?.collectionStatus === "BELUM_JATUH_TEMPO");

  // Workflow MUST NOT be blocked: Advance through Stages 6, 7, 8
  const adv6 = orderStore.advanceOrder(order2.orderNo, "Supervisi", {});
  assert("Order 2 advances to Stage 6 (Supervisi)", adv6);
  const adv7 = orderStore.advanceOrder(order2.orderNo, "Pengantaran", {});
  assert("Order 2 advances to Stage 7 (Pengantaran)", adv7);
  const adv8 = orderStore.advanceOrder(order2.orderNo, "Dokumen Telah Diterima", {});
  assert("Order 2 advances to Stage 8 (Dokumen Telah Diterima)", adv8);

  // When reaching Stage 8, collectionStatus transitions to JATUH_TEMPO
  const inv2Stage8 = financeStore.getInvoices().find(i => i.orderNo === order2.orderNo);
  assert("Invoice 2 collectionStatus transitions to JATUH_TEMPO at Stage 8", inv2Stage8?.collectionStatus === "JATUH_TEMPO");

  // Archive order 2 while still underpaid
  orderStore.archiveOrder(order2.orderNo);
  const archived2 = orderStore.getArchivedOrders().find(o => o.orderNo === order2.orderNo);
  assert("Order 2 archived preserving kurang > 0", archived2 !== undefined && archived2.payment.kurang === 300000);
  assert("Invoice 2 remains active in Tagihan with sisa 300,000", inv2Stage8?.sisa === 300000 && inv2Stage8?.status === "Kurang Bayar");
  assert("Order 2 NOT eligible for Rekap Order while underpaid", archived2 !== undefined && archived2.payment.kurang > 0);

  // Now customer settles remaining 300,000
  financeStore.recordPayment(inv2Stage8!.invoice, 300000, { paymentMethod: "Cash" });
  assert("Invoice 2 becomes Lunas after payment", inv2Stage8?.status === "Lunas" && inv2Stage8?.sisa === 0);
  
  const archived2Settled = orderStore.getArchivedOrders().find(o => o.orderNo === order2.orderNo);
  assert("Order 2 synced from finance: kurang is 0", archived2Settled?.payment.kurang === 0);
  assert("Order 2 synced from finance: status is Lunas", archived2Settled?.payment.statusPembayaran === "Lunas");
  assert("Order 2 NOW qualifies for Rekap Order after settlement", 
    archived2Settled !== undefined && archived2Settled.payment.kurang === 0 && archived2Settled.payment.statusPembayaran === "Lunas"
  );

  // -------------------------------------------------------------
  // TEST 3: Bayar di Awal > Biaya Final (OVERPAID / Refund Flow)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Bayar di Awal > Biaya Final (OVERPAID) ---");
  const order3 = orderStore.addOrder({
    customer: "Test Customer Overpaid",
    nomorHP: "08123456003",
    layanan: "BBN 1",
    nopol: "B 3003 OVR",
    biayaJasa: 200000,
    pkb: 1500000,
    swdkllj: 143000,
    dendaSwdkllj: 0,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Transfer BCA",
      statusPembayaran: "Lunas",
      totalBiaya: 1843000,
      dibayar: 1843000,
      kurang: 0,
      isPaymentVerified: true,
    },
  });

  // Stage 5 actual PKB was lower -> Final Cost is 1.643.000 (overpayment 200.000)
  orderStore.syncFinalCostToFinance(order3.orderNo, 1643000, 1443000, 200000);
  const updated3 = orderStore.getOrderByNo(order3.orderNo);

  assert("Order 3 settlementCondition is OVERPAID", updated3?.settlementCondition === "OVERPAID");
  assert("Order 3 overpayment is 200,000", updated3?.payment.overpayment === 200000);
  assert("Order 3 refundStatus is PENDING", updated3?.payment.refundStatus === "PENDING");
  assert("Order 3 kurang is 0 (NEVER negative)", updated3?.payment.kurang === 0);

  const inv3 = financeStore.getInvoices().find(i => i.orderNo === order3.orderNo);
  assert("Invoice 3 sisa is 0 (NEVER negative)", inv3?.sisa === 0);
  assert("Invoice 3 overpayment recorded as 200,000", inv3?.overpayment === 200000);
  assert("Invoice 3 refundStatus is PENDING", inv3?.refundStatus === "PENDING");

  // Advance to Stage 8 & Archive
  orderStore.advanceOrder(order3.orderNo, "Dokumen Telah Diterima", {});
  orderStore.archiveOrder(order3.orderNo);

  const archived3 = orderStore.getArchivedOrders().find(o => o.orderNo === order3.orderNo);
  assert("Order 3 NOT eligible for Rekap while refundStatus is PENDING", 
    archived3 !== undefined && archived3.payment.refundStatus === "PENDING"
  );

  // Process refund of 200.000
  const kasBeforeRefund = financeStore.getKasKantorList();
  const lastTotalBefore = kasBeforeRefund.length > 0 ? kasBeforeRefund[kasBeforeRefund.length - 1].total : 0;

  const refundOk = orderStore.processRefund(order3.orderNo, "Finance Lead");
  assert("orderStore.processRefund executed successfully", refundOk);

  const kasAfterRefund = financeStore.getKasKantorList();
  const lastKasEntry = kasAfterRefund[kasAfterRefund.length - 1];
  assert("Kas Kantor logged Kredit for refund", lastKasEntry.status === "Kredit" && lastKasEntry.kredit === 200000);
  assert("Kas Kantor total decreased by 200,000", lastKasEntry.total === lastTotalBefore - 200000);

  const archived3Refunded = orderStore.getArchivedOrders().find(o => o.orderNo === order3.orderNo);
  assert("Order 3 refundStatus is PROCESSED", archived3Refunded?.payment.refundStatus === "PROCESSED");
  assert("Order 3 settlementCondition is SETTLED", archived3Refunded?.payment.settlementCondition === "SETTLED");
  assert("Order 3 NOW qualifies for Rekap Order after refund processed", 
    archived3Refunded !== undefined && 
    archived3Refunded.payment.kurang === 0 && 
    archived3Refunded.payment.refundStatus !== "PENDING"
  );

  // -------------------------------------------------------------
  // TEST 4: Bayar di Akhir Workflow
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Bayar di Akhir Workflow ---");
  const order4 = orderStore.addOrder({
    customer: "Test Customer Pay at End",
    nomorHP: "08123456004",
    layanan: "Perpanjangan 5 Tahun",
    nopol: "B 4004 END",
    biayaJasa: 100000,
    pkb: 500000,
    swdkllj: 143000,
    dendaSwdkllj: 0,
    payment: {
      tipePembayaran: "Bayar di Akhir",
      metodePembayaran: "Cash",
      statusPembayaran: "Belum Lunas",
      totalBiaya: 743000,
      dibayar: 0,
      kurang: 743000,
      isPaymentVerified: false,
    },
  });

  assert("Order 4 initial dibayar is 0", order4.payment.dibayar === 0);
  assert("Order 4 initial kurang is 743,000", order4.payment.kurang === 743000);
  
  const inv4 = financeStore.getInvoices().find(i => i.orderNo === order4.orderNo);
  assert("Invoice 4 collectionStatus is BELUM_JATUH_TEMPO initially", inv4?.collectionStatus === "BELUM_JATUH_TEMPO");

  // Advance through stages to Stage 8
  orderStore.advanceOrder(order4.orderNo, "Dokumen Telah Diterima", {});
  const inv4Stage8 = financeStore.getInvoices().find(i => i.orderNo === order4.orderNo);
  assert("Invoice 4 collectionStatus switches to JATUH_TEMPO at Stage 8", inv4Stage8?.collectionStatus === "JATUH_TEMPO");

  // -------------------------------------------------------------
  // TEST 5: Rekap Document Handling (BEFORE vs AFTER)
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Rekap Document Handling (BEFORE vs AFTER) ---");
  const docBeforeOk = orderStore.addRekapDocument(order1.orderNo, {
    phase: "BEFORE",
    documentType: "STNK",
    label: "STNK_Asli_Input.pdf",
    fileType: "PDF",
    fileUrl: "https://example.com/stnk_asli.pdf",
    uploadedBy: "Customer",
  });
  const docAfterOk = orderStore.addRekapDocument(order1.orderNo, {
    phase: "AFTER",
    documentType: "STNK",
    label: "STNK_Baru_2025.pdf",
    fileType: "PDF",
    fileUrl: "https://example.com/stnk_baru.pdf",
    uploadedBy: "Admin Samsat",
  });

  assert("addRekapDocument BEFORE added", docBeforeOk);
  assert("addRekapDocument AFTER added", docAfterOk);

  const ord1Docs = orderStore.getArchivedOrders().find(o => o.orderNo === order1.orderNo)?.rekapDocuments || [];
  const beforeDocs = ord1Docs.filter(d => d.phase === "BEFORE");
  const afterDocs = ord1Docs.filter(d => d.phase === "AFTER");
  assert("BEFORE document correctly categorized", beforeDocs.length >= 1 && beforeDocs[0].label === "STNK_Asli_Input.pdf");
  assert("AFTER document correctly categorized", afterDocs.length >= 1 && afterDocs[0].label === "STNK_Baru_2025.pdf");

  console.log("\n=======================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
