import { calculateEstimation } from "../src/domain/estimation/estimationEngine";
import {
  DEFAULT_R4_BBN_TEMPLATE,
  DEFAULT_R4_MUTASI_AS_TEMPLATE,
  DEFAULT_R2_MUTASI_AS_TEMPLATE,
  DEFAULT_R2_MUTASI_LD_TEMPLATE,
} from "../src/domain/estimation/defaultTemplates";

console.log("=== TEST 5 (BBN Mobil DKI) ===");
const r5 = calculateEstimation({
  pkbDasar: 9041000,
  tanggalJatuhTempo: "2026-09-02",
  tanggalEstimasi: "2026-09-21",
  programSamsat: "NORMAL",
  freeBbn: true,
  wilayahAsal: "DKI Jakarta",
  wilayahTujuan: "DKI Jakarta",
}, DEFAULT_R4_BBN_TEMPLATE);
console.log("Total:", r5.totalEstimasi, "Expected: 12412000");
r5.items.forEach(i => console.log(`  [${i.id}] (${i.category}): ${i.amount} (incTotal: ${i.includesInTotal})`));

console.log("\n=== TEST 6 (BBN Mobil Jabar) ===");
const r6 = calculateEstimation({
  pkbDasar: 2875000,
  tanggalJatuhTempo: "2023-12-06",
  tanggalEstimasi: "2026-09-21",
  programSamsat: "NORMAL",
  freeBbn: true,
  wilayahAsal: "Bogor",
  wilayahTujuan: "Bogor",
  manualValues: { jasa: 500000 },
}, DEFAULT_R4_BBN_TEMPLATE);
console.log("Total:", r6.totalEstimasi, "Expected: 18241000");
r6.items.forEach(i => console.log(`  [${i.id}] (${i.category}): ${i.amount} (incTotal: ${i.includesInTotal})`));

console.log("\n=== TEST 7 (Mutasi AS Mobil) ===");
const r7 = calculateEstimation({
  pkbDasar: 0,
  tanggalJatuhTempo: "2026-09-10",
  tanggalEstimasi: "2026-09-21",
  programSamsat: "NORMAL",
  freeBbn: true,
}, DEFAULT_R4_MUTASI_AS_TEMPLATE);
console.log("Total:", r7.totalEstimasi, "Expected: 3255000");
r7.items.forEach(i => console.log(`  [${i.id}] (${i.category}): ${i.amount} (incTotal: ${i.includesInTotal})`));

console.log("\n=== TEST 8 (Mutasi AS Motor) ===");
const r8 = calculateEstimation({
  pkbDasar: 400000,
  tanggalJatuhTempo: "2026-09-14",
  tanggalEstimasi: "2026-09-21",
  programSamsat: "NORMAL",
  freeBbn: true,
}, DEFAULT_R2_MUTASI_AS_TEMPLATE);
console.log("Total:", r8.totalEstimasi, "Expected: 3323000");
r8.items.forEach(i => console.log(`  [${i.id}] (${i.category}): ${i.amount} (incTotal: ${i.includesInTotal})`));

console.log("\n=== TEST 9 (Mutasi LD Motor) ===");
const r9 = calculateEstimation({
  pkbDasar: 201000,
  tanggalJatuhTempo: "2026-07-24",
  tanggalEstimasi: "2026-09-21",
  programSamsat: "NORMAL",
  freeBbn: true,
}, DEFAULT_R2_MUTASI_LD_TEMPLATE);
console.log("Total:", r9.totalEstimasi, "Expected: 4125000");
r9.items.forEach(i => console.log(`  [${i.id}] (${i.category}): ${i.amount} (incTotal: ${i.includesInTotal})`));
