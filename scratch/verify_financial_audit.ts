/**
 * Targeted Financial Audit Verification Script
 * Covers Points 1, 2, 3, 4 of user request
 */

import { orderStore, OperationalOrder } from "../src/app/data/orderStore";
import { financeStore } from "../src/app/data/financeStore";

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, details?: any) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    if (details) console.error("    Details:", details);
    failed++;
  }
}

async function runAudit() {
  console.log("=======================================================");
  console.log("TARGETED FINANCIAL AUDIT: VERIFYING POINTS 1 TO 4");
  console.log("=======================================================\n");

  // =========================================================================
  // POINT 1: BAYAR DI AWAL MUST NOT FINALIZE PROFIT BEFORE STAGE 5
  // =========================================================================
  console.log("--- POINT 1: Bayar di Awal Profit Finalization Audit ---");

  // Create order with Bayar di Awal = 1.000.000 (Estimated)
  const orderP1 = orderStore.addOrder({
    customer: "Audit Point 1 Customer",
    nomorHP: "08111111001",
    layanan: "Pajak Tahunan",
    nopol: "B 1001 AUD",
    biayaJasa: 150000,
    pkb: 700000,
    swdkllj: 150000,
    dendaSwdkllj: 0,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Transfer BCA",
      statusPembayaran: "Belum Bayar",
      totalBiaya: 1000000,
      dibayar: 0,
      kurang: 1000000,
      isPaymentVerified: false,
    },
  });

  // Verify payment at Stage 1
  orderStore.verifyPayment(orderP1.orderNo, "Loket Admin");

  const verifiedOrderP1 = orderStore.getOrderByNo(orderP1.orderNo);
  const invP1 = financeStore.getInvoices().find(i => i.orderNo === orderP1.orderNo);

  // Before Stage 5 checks:
  assert("Order P1 finalCost is not finalized before Stage 5", verifiedOrderP1?.finalCost === undefined);
  assert("Order P1 settlementCondition is PENDING_FINALIZATION", verifiedOrderP1?.settlementCondition === "PENDING_FINALIZATION");
  assert("Invoice P1 settlementCondition is PENDING_FINALIZATION", invP1?.settlementCondition === "PENDING_FINALIZATION");
  assert("Invoice P1 profitStatus remains PENDING (NOT finalized)", invP1?.profitStatus === "PENDING");

  const profitListBeforeStage5 = financeStore.getProfitList();
  const inProfitBeforeStage5 = profitListBeforeStage5.some(p => p.invoice === invP1?.invoice || p.nopol === invP1?.nopol);
  assert("Finance does NOT permanently finalize profit in profitData before Stage 5", !inProfitBeforeStage5);

  const pendingProfits = financeStore.getProfitPendingList();
  const inPendingList = pendingProfits.some(p => p.invoice === invP1?.invoice || p.nopol === invP1?.nopol);
  assert("Invoice P1 correctly appears in getProfitPendingList() before Stage 5", inPendingList);

  // Now reach Stage 5: Final Cost established at 800,000 (biayaSamsat: 650000, profit: 150000)
  orderStore.syncFinalCostToFinance(orderP1.orderNo, 800000, 650000, 150000);

  const updatedOrderP1 = orderStore.getOrderByNo(orderP1.orderNo);
  const updatedInvP1 = financeStore.getInvoices().find(i => i.orderNo === orderP1.orderNo);

  assert("After Stage 5: paid is 1,000,000", updatedOrderP1?.payment.dibayar === 1000000);
  assert("After Stage 5: finalCost is 800,000", updatedOrderP1?.finalCost === 800000);
  assert("After Stage 5: overpayment is 200,000", updatedOrderP1?.payment.overpayment === 200000);
  assert("After Stage 5: outstanding is 0", updatedOrderP1?.payment.kurang === 0);
  assert("After Stage 5: refundStatus is PENDING", updatedOrderP1?.payment.refundStatus === "PENDING");
  assert("After Stage 5: settlementCondition is OVERPAID", updatedOrderP1?.settlementCondition === "OVERPAID");

  const profitListAfterStage5 = financeStore.getProfitList();
  const profitEntryP1 = profitListAfterStage5.find(p => p.invoice === updatedInvP1?.invoice || p.nopol === updatedInvP1?.nopol);
  assert("Profit entry now created in profitData after Stage 5", profitEntryP1 !== undefined);
  assert("Profit entry uangMasuk strictly equals finalCost (800,000), NOT 1,000,000", profitEntryP1?.uangMasuk === 800000);
  assert("Profit does not incorrectly include the 200,000 overpayment", profitEntryP1?.profit === 150000);

  // Now process refund: 200,000
  const kasBeforeRefund = financeStore.getKasKantorList();
  const lastTotalBefore = kasBeforeRefund.length > 0 ? kasBeforeRefund[kasBeforeRefund.length - 1].total : 0;

  const refundOk = orderStore.processRefund(orderP1.orderNo, "Finance Lead");
  assert("processRefund executed successfully", refundOk);

  const kasAfterRefund = financeStore.getKasKantorList();
  const lastKas = kasAfterRefund[kasAfterRefund.length - 1];
  assert("Kas Kantor logged Kredit for refund", lastKas.status === "Kredit" && lastKas.kredit === 200000);
  assert("Kas Kantor balance decreased by 200,000", lastKas.total === lastTotalBefore - 200000);

  const finalOrderP1 = orderStore.getOrderByNo(orderP1.orderNo);
  assert("After refund: refundStatus is PROCESSED", finalOrderP1?.payment.refundStatus === "PROCESSED");
  assert("After refund: settlementCondition is SETTLED", finalOrderP1?.payment.settlementCondition === "SETTLED");

  // =========================================================================
  // POINT 2: VERIFY PAYMENT STATUS CONTRACT ("Kurang Bayar" vs "Kurang")
  // =========================================================================
  console.log("\n--- POINT 2: Payment Status Contract Audit ---");

  // Create order underpaid
  const orderP2 = orderStore.addOrder({
    customer: "Audit Point 2 Customer",
    nomorHP: "08111111002",
    layanan: "Perpanjangan 5 Tahun",
    nopol: "B 1002 AUD",
    biayaJasa: 100000,
    pkb: 500000,
    swdkllj: 143000,
    dendaSwdkllj: 0,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Cash",
      statusPembayaran: "Belum Bayar",
      totalBiaya: 743000,
      dibayar: 500000,
      kurang: 243000,
      isPaymentVerified: false,
    },
  });

  // Stage 5 underpayment
  orderStore.syncFinalCostToFinance(orderP2.orderNo, 1000000, 800000, 200000);
  const updatedOrderP2 = orderStore.getOrderByNo(orderP2.orderNo);
  const invP2 = financeStore.getInvoices().find(i => i.orderNo === orderP2.orderNo);

  assert("Order P2 statusPembayaran is stored as 'Kurang Bayar'", updatedOrderP2?.payment.statusPembayaran === "Kurang Bayar");
  assert("Finance invoice P2 status is stored as 'Kurang Bayar'", invP2?.status === "Kurang Bayar");
  assert("Neither order nor invoice stores raw 'Kurang'", 
    (updatedOrderP2?.payment.statusPembayaran as string) !== "Kurang" && 
    (invP2?.status as string) !== "Kurang"
  );

  // =========================================================================
  // POINT 3: VERIFY STAGE 8 + ARCHIVE + TAGIHAN
  // =========================================================================
  console.log("\n--- POINT 3: Stage 8 + Archive + Tagihan Audit ---");

  // Setup: Final Cost = 1,150,000; Paid = 1,000,000; Outstanding = 150,000
  const orderP3 = orderStore.addOrder({
    customer: "Audit Point 3 Customer",
    nomorHP: "08111111003",
    layanan: "Mutasi Keluar",
    nopol: "B 1003 AUD",
    biayaJasa: 200000,
    pkb: 600000,
    swdkllj: 200000,
    dendaSwdkllj: 0,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Transfer",
      statusPembayaran: "Belum Bayar",
      totalBiaya: 1000000,
      dibayar: 1000000,
      kurang: 0,
      isPaymentVerified: true,
    },
  });

  // Stage 5: Final Cost = 1,150,000 -> Outstanding = 150,000
  orderStore.syncFinalCostToFinance(orderP3.orderNo, 1150000, 950000, 200000);

  const orderP3Stage5 = orderStore.getOrderByNo(orderP3.orderNo);
  const invP3 = financeStore.getInvoices().find(i => i.orderNo === orderP3.orderNo);

  assert("At Stage 5: settlementCondition = UNDERPAID", orderP3Stage5?.settlementCondition === "UNDERPAID");
  assert("At Stage 5: outstanding = 150,000", orderP3Stage5?.payment.kurang === 150000);
  assert("At Stage 5: collectionStatus = BELUM_JATUH_TEMPO", invP3?.collectionStatus === "BELUM_JATUH_TEMPO");

  // Advance Stage 6, 7, 8
  orderStore.advanceOrder(orderP3.orderNo, "Supervisi", {});
  orderStore.advanceOrder(orderP3.orderNo, "Pengantaran", {});
  orderStore.advanceOrder(orderP3.orderNo, "Dokumen Telah Diterima", {});

  const invP3Stage8 = financeStore.getInvoices().find(i => i.orderNo === orderP3.orderNo);
  assert("At Stage 8: collectionStatus = JATUH_TEMPO", invP3Stage8?.collectionStatus === "JATUH_TEMPO");

  // Archive order
  orderStore.archiveOrder(orderP3.orderNo);

  const archivedP3 = orderStore.getArchivedOrders().find(o => o.orderNo === orderP3.orderNo);
  const invP3Archived = financeStore.getInvoices().find(i => i.orderNo === orderP3.orderNo);
  const allInvoicesCountBefore = financeStore.getInvoices().filter(i => i.orderNo === orderP3.orderNo).length;

  assert("Order is archived", archivedP3 !== undefined);
  assert("archiveOrder MUST NOT set paymentStatus to Lunas", archivedP3?.payment.statusPembayaran === "Kurang Bayar");
  assert("archiveOrder MUST NOT set outstanding to 0", archivedP3?.payment.kurang === 150000);
  assert("archiveOrder MUST NOT delete the invoice", invP3Archived !== undefined);
  assert("archiveOrder MUST NOT create duplicate invoice", allInvoicesCountBefore === 1);
  assert("Invoice outstanding remains 150,000", invP3Archived?.sisa === 150000);
  assert("Invoice payment status is Kurang Bayar", invP3Archived?.status === "Kurang Bayar");
  assert("Invoice collection status is JATUH_TEMPO", invP3Archived?.collectionStatus === "JATUH_TEMPO");

  const activeTagihanList = financeStore.getTagihanList();
  const inActiveTagihan = activeTagihanList.some(t => t.orderNo === orderP3.orderNo);
  assert("Tagihan: still visible/actionable in active Tagihan list", inActiveTagihan);

  // Now record customer's 150,000 payment
  financeStore.recordPayment(invP3Archived!.invoice, 150000, { paymentMethod: "Transfer BCA" });

  const invP3Settled = financeStore.getInvoices().find(i => i.orderNo === orderP3.orderNo);
  const archivedP3Settled = orderStore.getArchivedOrders().find(o => o.orderNo === orderP3.orderNo);
  const activeTagihanAfterPayment = financeStore.getTagihanList().some(t => t.orderNo === orderP3.orderNo);

  assert("After payment: paid = finalCost (1,150,000)", invP3Settled?.terbayar === 1150000);
  assert("After payment: outstanding = 0", invP3Settled?.sisa === 0 && archivedP3Settled?.payment.kurang === 0);
  assert("After payment: paymentStatus = Lunas", invP3Settled?.status === "Lunas" && archivedP3Settled?.payment.statusPembayaran === "Lunas");
  assert("After payment: Tagihan active item disappears", !activeTagihanAfterPayment);
  assert("After payment: Finance record remains in invoices", invP3Settled !== undefined);

  // =========================================================================
  // POINT 4: REKAP ELIGIBILITY AUDIT
  // =========================================================================
  console.log("\n--- POINT 4: Rekap Eligibility Audit ---");

  // Helper function mimicking OrderHistory.tsx mappedArchivedOrders filter
  function isRekapEligible(op: OperationalOrder): boolean {
    const isOperationalDone = op.currentStageName === "Selesai (Arsip)" || op.currentStep >= 8;
    const kurang = op.payment?.kurang ?? 0;
    const isLunas = op.payment?.statusPembayaran === "Lunas" && kurang === 0;
    const noPendingRefund = op.payment?.refundStatus !== "PENDING" && op.refundStatus !== "PENDING";
    return isOperationalDone && isLunas && noPendingRefund;
  }

  // 1. Stage 8 + Kurang Bayar
  const order4A: OperationalOrder = {
    orderNo: "ORD-TEST-4A",
    customer: "Test 4A",
    nomorHP: "081234",
    layanan: "Pajak",
    nopol: "B 4001 A",
    currentStep: 8,
    currentStageName: "Dokumen Telah Diterima",
    createdAt: new Date().toISOString(),
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Cash",
      statusPembayaran: "Kurang Bayar",
      totalBiaya: 1000000,
      dibayar: 800000,
      kurang: 200000,
      refundStatus: "NONE",
      settlementCondition: "UNDERPAID",
    },
  };
  assert("Stage 8 + Kurang Bayar -> NOT Rekap", !isRekapEligible(order4A));

  // 2. Stage 8 + Refund Pending
  const order4B: OperationalOrder = {
    orderNo: "ORD-TEST-4B",
    customer: "Test 4B",
    nomorHP: "081234",
    layanan: "Pajak",
    nopol: "B 4002 B",
    currentStep: 8,
    currentStageName: "Dokumen Telah Diterima",
    createdAt: new Date().toISOString(),
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Cash",
      statusPembayaran: "Lunas",
      totalBiaya: 800000,
      dibayar: 1000000,
      kurang: 0,
      overpayment: 200000,
      refundStatus: "PENDING",
      settlementCondition: "OVERPAID",
    },
  };
  assert("Stage 8 + Refund Pending -> NOT Rekap", !isRekapEligible(order4B));

  // 3. Stage 8 + Lunas + no pending refund
  const order4C: OperationalOrder = {
    orderNo: "ORD-TEST-4C",
    customer: "Test 4C",
    nomorHP: "081234",
    layanan: "Pajak",
    nopol: "B 4003 C",
    currentStep: 8,
    currentStageName: "Dokumen Telah Diterima",
    createdAt: new Date().toISOString(),
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Cash",
      statusPembayaran: "Lunas",
      totalBiaya: 1000000,
      dibayar: 1000000,
      kurang: 0,
      overpayment: 0,
      refundStatus: "NONE",
      settlementCondition: "BALANCED",
    },
  };
  assert("Stage 8 + Lunas + no pending refund -> Rekap", isRekapEligible(order4C));

  // 4. Stage 8 + Refund Processed
  const order4D: OperationalOrder = {
    orderNo: "ORD-TEST-4D",
    customer: "Test 4D",
    nomorHP: "081234",
    layanan: "Pajak",
    nopol: "B 4004 D",
    currentStep: 8,
    currentStageName: "Dokumen Telah Diterima",
    createdAt: new Date().toISOString(),
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Cash",
      statusPembayaran: "Lunas",
      totalBiaya: 800000,
      dibayar: 1000000,
      kurang: 0,
      overpayment: 200000,
      refundStatus: "PROCESSED",
      settlementCondition: "SETTLED",
    },
  };
  assert("Stage 8 + Refund Processed -> Rekap", isRekapEligible(order4D));

  console.log("\n=======================================================");
  console.log(`TOTAL AUDIT CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error("Audit execution error:", err);
  process.exit(1);
});
