// scratch/verify_hardening_e2e.ts
import { financeStore } from '../src/app/data/financeStore';
import { orderStore } from '../src/app/data/orderStore';
import { auditLog } from '../src/app/utils/auditLog';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

console.log("=== HARDENING & EDGE CASE TEST SUITE ===");

// TEST 1: Double-submit guard on completeInvoice
console.log("\n--- TEST 1: Double-submit guard on completeInvoice ---");
const inv1 = financeStore.addInvoice({
  orderNo: "ORD-HARDEN-001",
  customer: "Budi Test",
  nopol: "B 1234 TEST",
  jenisLayanan: "Perpanjangan STNK Tahunan",
  totalTagihan: 500000,
  terbayar: 500000,
  billingStatus: "ACTIVE",
  status: "Lunas",
  settlementCondition: "BALANCED"
});

const initialAuditCount = auditLog.getLogs().length;

// First complete call
const res1 = financeStore.completeInvoice(inv1.id, "Budi Admin");
assert(res1 === true, "First completeInvoice succeeds");

const auditCountAfterFirst = auditLog.getLogs().length;
assert(auditCountAfterFirst === initialAuditCount + 1, "Audit log added exactly once after first completion");

// Second complete call (Double click / double submit simulation)
const res2 = financeStore.completeInvoice(inv1.id, "Budi Admin");
assert(res2 === true, "Second completeInvoice returns early without error");

const auditCountAfterSecond = auditLog.getLogs().length;
assert(auditCountAfterSecond === auditCountAfterFirst, "Audit log was NOT duplicated on second completeInvoice call");

// TEST 2: Double-submit guard on processRefund
console.log("\n--- TEST 2: Double-submit guard on processRefund ---");
const invRefund = financeStore.addInvoice({
  orderNo: "ORD-REFUND-001",
  customer: "Citra Test",
  nopol: "B 5678 REF",
  jenisLayanan: "Balik Nama",
  totalTagihan: 1000000,
  terbayar: 1200000,
  overpayment: 200000,
  billingStatus: "ACTIVE",
  status: "Lunas",
  settlementCondition: "OVERPAID",
  refundStatus: "PENDING"
});

const initialKasEntries = financeStore.kasKantor.length;

// First refund call
const refundRes1 = financeStore.processRefund(invRefund.id, "Finance User");
assert(refundRes1 === true, "First processRefund succeeds");

const kasEntriesAfterFirst = financeStore.kasKantor.length;
assert(kasEntriesAfterFirst === initialKasEntries + 1, "Kas entry for refund added exactly once");

// Verify refund status is now PROCESSED
const invAfterFirst = financeStore.invoices.find(i => i.id === invRefund.id);
assert(invAfterFirst?.refundStatus === "PROCESSED", "Invoice refundStatus is PROCESSED");

// Second refund call (Double click / double submit simulation)
const refundRes2 = financeStore.processRefund(invRefund.id, "Finance User");
assert(refundRes2 === false, "Second processRefund rejected / prevented by guard");

const kasEntriesAfterSecond = financeStore.kasKantor.length;
assert(kasEntriesAfterSecond === kasEntriesAfterFirst, "Kas entries NOT duplicated on double submit");

// TEST 3: Fake phone number removal
console.log("\n--- TEST 3: Fake phone number fallback removal ---");
const invNoPhone = financeStore.addInvoice({
  orderNo: "ORD-NO-PHONE",
  customer: "Anonymous Customer",
  nopol: "B 9999 NOP",
  totalTagihan: 300000,
  terbayar: 0,
  // Note: phone intentionally omitted
});

assert(invNoPhone.phone === undefined, "Invoice without phone has phone === undefined (NO fake 081234567890 fallback)");

// TEST 4: Initial invoices phone check
console.log("\n--- TEST 4: Sample data phone check ---");
const allInvoices = financeStore.invoices;
const fakePhoneInvoices = allInvoices.filter(i => i.phone === "081234567890");
assert(fakePhoneInvoices.length === 0, `No invoices in system contain the dummy phone 081234567890 (Found: ${fakePhoneInvoices.length})`);

// TEST 5: Payment Status Contract check across all invoices
console.log("\n--- TEST 5: Payment Status canonical values ---");
const allowedStatuses = ["Lunas", "Kurang Bayar", "Belum Bayar"];
const invalidStatuses = allInvoices.filter(i => !allowedStatuses.includes(i.status));
assert(invalidStatuses.length === 0, `All invoices follow canonical status contract (Found invalid: ${invalidStatuses.length})`);

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
