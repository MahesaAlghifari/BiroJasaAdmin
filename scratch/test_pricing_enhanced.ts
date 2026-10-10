import { pricingStore } from "../src/app/data/pricingStore";
import { orderStore } from "../src/app/data/orderStore";
import { financeStore } from "../src/app/data/financeStore";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ ${msg}`);
}

console.log("==================================================");
console.log("RUNNING ENHANCED MASTER PRICING & ESTIMATION TESTS (A-N)");
console.log("==================================================");

const testService = "Perpanjangan 1 Tahun";
const testSamsat = "Jakarta Timur";

// Baseline initial config
const initialConfig = pricingStore.getServiceFeeConfig(testService, testSamsat);
assert(!!initialConfig, "Initial config exists");

// --- TEST A: Jasa Lengkap enabled -> in estimate ---
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  jasaLengkap: { nominal: 250000, enabled: true },
});
const costA = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Datang Langsung",
  tipeJasa: "Lengkap",
  pkb: 1000000,
});
assert(costA.biayaJasa === 250000, "Test A: Jasa Lengkap enabled -> Rp 250.000 in estimate");
assert(costA.breakdown.some(b => b.category === "Jasa" && b.amount === 250000), "Test A: Jasa item present in breakdown");

// --- TEST B: Jasa Lengkap disabled -> NOT in estimate ---
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  jasaLengkap: { nominal: 250000, enabled: false },
});
const costB = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Datang Langsung",
  tipeJasa: "Lengkap",
  pkb: 1000000,
});
assert(costB.biayaJasa === 0, "Test B: Jasa Lengkap disabled -> Rp 0 in estimate");
assert(!costB.breakdown.some(b => b.category === "Jasa"), "Test B: No Jasa item in breakdown");

// Restore Jasa Lengkap
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  jasaLengkap: { nominal: 250000, enabled: true },
});

// --- TEST C: Antar Jemput enabled -> in estimate ---
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  biayaAntarJemput: 50000,
  antarJemputEnabled: true,
});
const costC = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Antar Jemput",
  pkb: 1000000,
});
assert(costC.biayaAntarJemput === 50000, "Test C: Antar Jemput enabled -> Rp 50.000 in estimate");
assert(costC.breakdown.some(b => b.itemId === "fee-antar-jemput" && b.amount === 50000), "Test C: Courier item in breakdown");

// --- TEST D: Antar Jemput disabled -> NOT in estimate ---
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  biayaAntarJemput: 50000,
  antarJemputEnabled: false,
});
const costD = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Antar Jemput",
  pkb: 1000000,
});
assert(costD.biayaAntarJemput === 0, "Test D: Antar Jemput disabled -> Rp 0 in estimate");
assert(!costD.breakdown.some(b => b.itemId === "fee-antar-jemput"), "Test D: Courier item excluded from breakdown");

// Restore Antar Jemput
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  biayaAntarJemput: 50000,
  antarJemputEnabled: true,
});

// --- TEST E & F: Komponen Samsat enabled & disabled ---
const compService = "Mutasi Antar Samsat";
const testCompId = "mutasi-cf"; // Cek Fisik in Mutasi
pricingStore.toggleComponent(compService, testSamsat, testCompId, true);
const costE = pricingStore.calculateOrderCost({
  serviceName: compService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Datang Langsung",
  pkb: 0,
});
const compItemE = costE.breakdown.find(b => b.itemId === testCompId);
assert(!!compItemE && compItemE.amount > 0, "Test E: Komponen Samsat enabled -> in estimate breakdown");

pricingStore.toggleComponent(compService, testSamsat, testCompId, false);
const costF = pricingStore.calculateOrderCost({
  serviceName: compService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Datang Langsung",
  pkb: 0,
});
const compItemF = costF.breakdown.find(b => b.itemId === testCompId);
assert(!compItemF, "Test F: Komponen Samsat disabled -> NOT in estimate breakdown");

// Restore component
pricingStore.toggleComponent(compService, testSamsat, testCompId, true);

// --- TEST G & H: SWDKLLJ enabled & disabled ---
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  swdkllj: { nominal: 143000, enabled: true },
});
const costG = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Datang Langsung",
  pkb: 1000000,
  swdkllj: 143000,
});
assert(costG.swdkllj === 143000, "Test G: SWDKLLJ enabled -> Rp 143.000 in estimate");
assert(costG.breakdown.some(b => b.itemId === "pajak-swdkllj"), "Test G: SWDKLLJ item in breakdown");

pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  swdkllj: { nominal: 143000, enabled: false },
});
const costH = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Datang Langsung",
  pkb: 1000000,
  swdkllj: 143000,
});
assert(costH.swdkllj === 0, "Test H: SWDKLLJ disabled -> Rp 0 in estimate");
assert(!costH.breakdown.some(b => b.itemId === "pajak-swdkllj"), "Test H: SWDKLLJ item NOT in breakdown");

// Restore SWDKLLJ
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  swdkllj: { nominal: 143000, enabled: true },
});

// --- TEST I & J: Biaya Lainnya dynamic list enabled & disabled ---
const addedOther = pricingStore.addBiayaLainnya(testService, testSamsat, {
  label: "Biaya Materai & Arsip",
  nominal: 25000,
  enabled: true,
});
assert(!!addedOther && addedOther.nominal === 25000, "Biaya Lainnya successfully added");

const costI = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Datang Langsung",
  pkb: 1000000,
});
const otherItemI = costI.breakdown.find(b => b.itemId === addedOther.id);
assert(!!otherItemI && otherItemI.amount === 25000, "Test I: Biaya Lainnya enabled -> in estimate breakdown");

pricingStore.updateBiayaLainnya(testService, testSamsat, addedOther.id, { enabled: false });
const costJ = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Datang Langsung",
  pkb: 1000000,
});
const otherItemJ = costJ.breakdown.find(b => b.itemId === addedOther.id);
assert(!otherItemJ, "Test J: Biaya Lainnya disabled -> NOT in estimate breakdown");

// --- TEST K: Disable then Re-enable preserves nominal ---
pricingStore.updateBiayaLainnya(testService, testSamsat, addedOther.id, { enabled: true });
const cfgK = pricingStore.getServiceFeeConfig(testService, testSamsat);
const itemK = cfgK?.biayaLainnya?.find(b => b.id === addedOther.id);
assert(itemK?.nominal === 25000 && itemK?.enabled === true, "Test K: Nominal is preserved upon re-enabling");

// Cleanup test Biaya Lainnya
pricingStore.deleteBiayaLainnya(testService, testSamsat, addedOther.id);

// --- TEST L: Existing Order Snapshot remains immutable when Master Pricing changes ---
const initialSnapshot = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Antar Jemput",
  tipeJasa: "Lengkap",
  pkb: 1500000,
  swdkllj: 143000,
});
const initialTotal = initialSnapshot.totalEstimasi;
const initialJasa = initialSnapshot.biayaJasa;

const orderL = orderStore.addOrder({
  customer: "Klien Uji Snapshot L",
  namaPemilik: "Pemilik L",
  nomorHP: "081234567890",
  layanan: testService,
  metodeLayanan: "Antar Jemput",
  nopol: "B 1000 SNP",
  wilayahSamsatAsal: testSamsat,
  pkb: 1500000,
  swdkllj: 143000,
  biayaJasa: initialSnapshot.biayaJasa,
  totalEstimasi: initialTotal,
  costBreakdown: initialSnapshot.breakdown,
  costSnapshot: initialSnapshot,
});

assert(orderL.costSnapshot?.totalEstimasi === initialTotal, "Order L created with initial snapshot total");

// Now CHANGE Master Pricing drastically
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  jasaLengkap: { nominal: 999999, enabled: true },
  biayaAntarJemput: 150000,
});

// Verify Order L snapshot is NOT mutated!
const retrievedOrderL = orderStore.getOrderByNo(orderL.orderNo);
assert(retrievedOrderL?.costSnapshot?.totalEstimasi === initialTotal, "Test L: Order snapshot total remains immutable!");
assert(retrievedOrderL?.costSnapshot?.biayaJasa === initialJasa, "Test L: Order snapshot biayaJasa remains immutable!");

// --- TEST M: New Order uses the latest pricing configuration ---
const newSnapshotM = pricingStore.calculateOrderCost({
  serviceName: testService,
  wilayahSamsat: testSamsat,
  metodeLayanan: "Antar Jemput",
  tipeJasa: "Lengkap",
  pkb: 1500000,
  swdkllj: 143000,
});
assert(newSnapshotM.biayaJasa === 999999, "Test M: New snapshot reflects updated master service fee (999999)");
assert(newSnapshotM.biayaAntarJemput === 150000, "Test M: New snapshot reflects updated courier fee (150000)");

const orderM = orderStore.addOrder({
  customer: "Klien Uji Baru M",
  namaPemilik: "Pemilik M",
  nomorHP: "081234567891",
  layanan: testService,
  metodeLayanan: "Antar Jemput",
  nopol: "B 2000 NEW",
  wilayahSamsatAsal: testSamsat,
  pkb: 1500000,
  swdkllj: 143000,
  biayaJasa: newSnapshotM.biayaJasa,
  totalEstimasi: newSnapshotM.totalEstimasi,
  costBreakdown: newSnapshotM.breakdown,
  costSnapshot: newSnapshotM,
});
assert(orderM.costSnapshot?.biayaJasa === 999999, "Test M: New order snapshot records updated 999999");
assert(orderM.totalEstimasi === newSnapshotM.totalEstimasi, "Test M: New order totalEstimasi matches updated pricing");

// Restore test service fee
pricingStore.updateServiceFeeConfig(testService, testSamsat, {
  jasaLengkap: { nominal: 250000, enabled: true },
  biayaAntarJemput: 50000,
});

// --- TEST N: Finance Invoice uses snapshot order, does NOT read master pricing live ---
// Create invoice for Order L using order snapshot
const invoiceL = financeStore.addInvoice({
  orderNo: orderL.orderNo,
  totalTagihan: orderL.costSnapshot?.totalEstimasi || orderL.totalEstimasi,
  customer: orderL.customer,
  nopol: orderL.nopol,
  jenisLayanan: orderL.layanan,
});
assert(invoiceL.totalTagihan === initialTotal, "Test N: Invoice generated strictly matches order snapshot total, NOT master pricing live!");

console.log("==================================================");
console.log("ALL TESTS A THROUGH N PASSED WITH ZERO REGRESSIONS!");
console.log("==================================================");
