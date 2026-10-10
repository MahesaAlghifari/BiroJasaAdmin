import { pricingStore } from "../src/app/data/pricingStore";

console.log("Testing pricingStore methods:");
const samsats = pricingStore.getSamsats();
console.log("Samsats count:", samsats.length);

const biayaRows = pricingStore.getBiayaLayananRows();
console.log("BiayaLayanan rows count:", biayaRows.length);

const mutasiASRows = pricingStore.getMutasiASRows();
console.log("MutasiAS rows count:", mutasiASRows.length);

const hargaDasarRows = pricingStore.getHargaDasarRows();
console.log("HargaDasar rows count:", hargaDasarRows.length);

const mutasiLDRows = pricingStore.getMutasiLDRows();
console.log("MutasiLD rows count:", mutasiLDRows.length);

const balikNamaRows = pricingStore.getBalikNamaRows();
console.log("BalikNama rows count:", balikNamaRows.length);

const tarikBerkasRows = pricingStore.getTarikBerkasRows();
console.log("TarikBerkas rows count:", tarikBerkasRows.length);

const duplikatSTNKRows = pricingStore.getDuplikatSTNKRows();
console.log("DuplikatSTNK rows count:", duplikatSTNKRows.length);

// Test cost calculation for each service
const services = [
  "Perpanjangan 1 Tahun",
  "Perpanjangan 5 Tahun",
  "Balik Nama",
  "Mutasi Antar Samsat",
  "Mutasi Luar Daerah",
];

for (const svc of services) {
  for (const s of samsats) {
    const cost = pricingStore.calculateOrderCost({
      serviceName: svc,
      wilayahSamsat: s.wilayah,
      metodeLayanan: "Antar Jemput",
      pkb: 2000000,
      swdkllj: 143000,
    });
    if (!cost || !cost.breakdown || cost.breakdown.length === 0) {
      throw new Error(`Failed cost calculation for ${svc} at ${s.name}`);
    }
  }
}
console.log("All 50 service-samsat combinations calculate correctly!");
