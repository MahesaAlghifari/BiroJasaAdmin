import { calculateEstimation } from "../src/domain/estimation/estimationEngine";
import { DEFAULT_R2_BBN_TEMPLATE } from "../src/domain/estimation/defaultTemplates";

// Sheet 14 Excel serial 45871 (2025-08-02) to 46286 (2026-09-21):
// 2025-08-02 to 2026-09-21 is 1 Year 1 Month + 19 days -> 1 Year 2 Months!
const res = calculateEstimation({
  pkbDasar: 198000,
  tanggalJatuhTempo: "2025-08-02",
  tanggalEstimasi: "2026-09-21",
  programSamsat: "NORMAL",
  freeBbn: true,
  wilayahAsal: "Bogor",
  wilayahTujuan: "Bogor",
  manualValues: { "biaya-proses": 1250000 },
}, DEFAULT_R2_BBN_TEMPLATE);

console.log("Total:", res.totalEstimasi, "Expected: 2651000");
console.log("Durasi:", res.durasiKeterlambatan, "Tahun:", res.tahunTunggakan, "Bulan:", res.bulanTunggakan, "Kalender:", res.bulanKalender);
res.items.forEach(i => console.log(`  [${i.id}] (${i.category}): ${i.amount}`));
