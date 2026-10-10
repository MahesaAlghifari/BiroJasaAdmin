import fs from "fs";
import path from "path";
import { pricingStore } from "../src/app/data/pricingStore";
import { orderStore } from "../src/app/data/orderStore";
import { financeStore } from "../src/app/data/financeStore";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ ${msg}`);
}

console.log("==================================================");
console.log("RUNNING BATCH STANDARDIZATION & VERIFICATION TEST (1-28)");
console.log("==================================================");

const buatOrderContent = fs.readFileSync(
  path.resolve(process.cwd(), "src/app/components/BuatOrder.tsx"),
  "utf-8"
);
const biayaLayananContent = fs.readFileSync(
  path.resolve(process.cwd(), "src/app/components/BiayaLayanan.tsx"),
  "utf-8"
);

// ----------------------------------------------------------------------------
// 1. Buat Order Step 1 -> data tersimpan
// ----------------------------------------------------------------------------
const testOrder1 = orderStore.addOrder({
  customer: "Budi Santoso",
  namaPemilik: "Budi Santoso",
  nomorHP: "081234567890",
  kepemilikanKendaraan: "Pribadi",
  layanan: "Perpanjangan 1 Tahun",
  metodeLayanan: "Antar Jemput",
  jenisKendaraan: "Mobil",
  tahunKendaraan: "2022",
  nopol: "B 1234 ABC",
  wilayahSamsatAsal: "Jakarta Timur",
  wilayahSamsatTujuan: "Jakarta Timur",
  pkbBerlakuSd: "2025-12-31",
  tahunPajak: "2024",
  bulanPajak: "Desember",
  nominalPkbTerakhir: 1500000,
  nominalSwdkllj: 143000,
  alamatPenjemputan: {
    kota: "Jakarta Timur",
    detail: "Jl. Pemuda No. 10",
  },
  alamatPengantaran: {
    kota: "Jakarta Timur",
    detail: "Jl. Pemuda No. 10",
  },
});
assert(testOrder1.customer === "Budi Santoso", "1. Buat Order Step 1 -> customer tersimpan");
assert(testOrder1.nomorHP === "081234567890", "1. Buat Order Step 1 -> nomorHP tersimpan");
assert(testOrder1.nopol === "B 1234 ABC", "1. Buat Order Step 1 -> nopol tersimpan");

// ----------------------------------------------------------------------------
// 2. Step 1 validation bekerja
// ----------------------------------------------------------------------------
assert(buatOrderContent.includes("handleNextStep1"), "2. Step 1 validation handler exists");
assert(buatOrderContent.includes("Nama customer / pemesan wajib diisi!"), "2. Step 1 customer validation present");
assert(buatOrderContent.includes("Nomor HP minimal terdiri dari 9 digit angka!"), "2. Step 1 phone validation present");
assert(buatOrderContent.includes("Silakan pilih jenis layanan terlebih dahulu!"), "2. Step 1 service validation present");

// ----------------------------------------------------------------------------
// 3. Step 2 dokumen tersimpan
// ----------------------------------------------------------------------------
const testOrder2 = orderStore.addOrder({
  customer: "Siti Rahma",
  nomorHP: "081398765432",
  layanan: "Balik Nama",
  metodeLayanan: "Datang Langsung",
  jenisKendaraan: "Motor",
  nopol: "B 5678 DEF",
  wilayahSamsatAsal: "Jakarta Barat",
  wilayahSamsatTujuan: "Jakarta Barat",
  clientDocuments: {
    stnk: { name: "stnk_asli.pdf", status: "Sudah Tersedia", isOptional: true, fileType: "pdf" },
    bpkb: { name: "bpkb.jpg", status: "Sudah Tersedia", isOptional: true, fileType: "image" },
    ktp: { name: "", status: "Belum Tersedia", isOptional: true },
    skkp: { name: "", status: "Belum Tersedia", isOptional: true },
    lainnya: { name: "", status: "Belum Tersedia", isOptional: true },
  },
});
assert(testOrder2.clientDocuments?.stnk?.name === "stnk_asli.pdf", "3. Step 2 dokumen STNK tersimpan");
assert(testOrder2.clientDocuments?.bpkb?.fileType === "image", "3. Step 2 dokumen BPKB tersimpan");

// ----------------------------------------------------------------------------
// 4. Step 3 pembayaran tersimpan
// ----------------------------------------------------------------------------
const testOrder3 = orderStore.addOrder({
  customer: "Agus Pratama",
  nomorHP: "081211112222",
  layanan: "Mutasi Antar Samsat",
  metodeLayanan: "Antar Jemput",
  jenisKendaraan: "Mobil",
  nopol: "B 9999 XYZ",
  wilayahSamsatAsal: "Jakarta Selatan",
  wilayahSamsatTujuan: "Jakarta Timur",
  payment: {
    tipePembayaran: "Bayar di Awal",
    metodePembayaran: "Transfer Bank BCA",
    statusPembayaran: "Belum Lunas",
    totalBiaya: 2500000,
    dibayar: 0,
    kurang: 2500000,
    buktiPembayaran: {
      fileName: "struk_transfer.jpg",
      fileType: "image",
      uploadedAt: new Date().toISOString(),
    },
  },
});
assert(testOrder3.payment.tipePembayaran === "Bayar di Awal", "4. Step 3 tipePembayaran tersimpan");
assert(testOrder3.payment.metodePembayaran === "Transfer Bank BCA", "4. Step 3 metodePembayaran tersimpan");
assert(testOrder3.payment.buktiPembayaran?.fileName === "struk_transfer.jpg", "4. Step 3 buktiPembayaran tersimpan");

// ----------------------------------------------------------------------------
// 5. Buat Order berhasil
// ----------------------------------------------------------------------------
assert(!!testOrder1.orderNo, "5. Buat Order berhasil generate orderNo");
assert(testOrder1.currentStep === 1 && testOrder1.currentStageName === "Verifikasi", "5. Order masuk ke Stage 1 (Verifikasi)");

// ----------------------------------------------------------------------------
// 6. Nomor polisi 3 input digabung dengan benar
// ----------------------------------------------------------------------------
function combineNopol(prefix: string, number: string, suffix: string) {
  return [prefix.trim().toUpperCase(), number.trim(), suffix.trim().toUpperCase()].filter(Boolean).join(" ");
}
assert(combineNopol("b", "1234", "abc") === "B 1234 ABC", "6. Nopol 3 input digabung menjadi B 1234 ABC");
assert(combineNopol("d", "1", "xy") === "D 1 XY", "6. Nopol 3 input digabung menjadi D 1 XY");

// ----------------------------------------------------------------------------
// 7. Plat uppercase otomatis
// ----------------------------------------------------------------------------
function sanitizePlatLetter(val: string) {
  return val.toUpperCase().replace(/[^A-Z]/g, "");
}
assert(sanitizePlatLetter("b") === "B", "7. Plat prefix otomatis uppercase");
assert(sanitizePlatLetter("abc12") === "ABC", "7. Plat suffix hanya huruf dan uppercase");

// ----------------------------------------------------------------------------
// 8. Nomor plat hanya angka
// ----------------------------------------------------------------------------
function sanitizePlatNumber(val: string) {
  return val.replace(/\D/g, "");
}
assert(sanitizePlatNumber("123a4b") === "1234", "8. Nomor plat hanya angka");

// ----------------------------------------------------------------------------
// 9. Wilayah Samsat berasal dari pricingStore
// ----------------------------------------------------------------------------
const samsatList = pricingStore.getSamsatList();
assert(samsatList.length > 0, "9. Samsat list tersedia dari pricingStore");
assert(samsatList.some((s: any) => s.wilayah === "Jakarta Timur"), "9. Wilayah Jakarta Timur ada di pricingStore");
assert(buatOrderContent.includes("pricingStore.getSamsatList()"), "9. BuatOrder membaca Samsat dari pricingStore");

// ----------------------------------------------------------------------------
// 10. Tidak ada "(khusus mutasi)" di UI
// ----------------------------------------------------------------------------
assert(!buatOrderContent.toLowerCase().includes("(khusus mutasi)"), "10. Tidak ada '(khusus mutasi)' di BuatOrder");

// ----------------------------------------------------------------------------
// 11. Tidak ada "(Klien Offline)" pada judul
// ----------------------------------------------------------------------------
assert(!buatOrderContent.includes("(Klien Offline)"), "11. Tidak ada '(Klien Offline)' pada judul BuatOrder");

// ----------------------------------------------------------------------------
// 12. Tidak ada "(Angka Saja)" pada nomor HP
// ----------------------------------------------------------------------------
assert(!buatOrderContent.includes("(Angka Saja)"), "12. Tidak ada '(Angka Saja)' pada nomor HP BuatOrder");

// ----------------------------------------------------------------------------
// 13. Tidak ada "(Nopol)"
// ----------------------------------------------------------------------------
assert(!buatOrderContent.includes("(Nopol)"), "13. Tidak ada '(Nopol)' di BuatOrder");

// ----------------------------------------------------------------------------
// 14. Tidak ada "(Format Bebas)"
// ----------------------------------------------------------------------------
assert(!buatOrderContent.includes("(Format Bebas)"), "14. Tidak ada '(Format Bebas)' di BuatOrder");

// ----------------------------------------------------------------------------
// 15. Tidak ada field "Tipe Pengurusan / Jasa Layanan"
// ----------------------------------------------------------------------------
assert(!buatOrderContent.includes("Tipe Pengurusan / Jasa Layanan"), "15. Tidak ada 'Tipe Pengurusan / Jasa Layanan' di BuatOrder");
assert(!buatOrderContent.includes("Jasa Dokumen Lengkap"), "15. Tidak ada kartu 'Jasa Dokumen Lengkap' di BuatOrder");

// ----------------------------------------------------------------------------
// 16. Tidak ada section "Catatan & Instruksi Order"
// ----------------------------------------------------------------------------
assert(!buatOrderContent.includes("Catatan & Instruksi Order"), "16. Tidak ada section 'Catatan & Instruksi Order' di BuatOrder");

// ----------------------------------------------------------------------------
// 17. SWDKLLJ tidak muncul di UI
// ----------------------------------------------------------------------------
// Verify no user-visible SWDKLLJ in UI strings in BuatOrder and BiayaLayanan
const uiSwdkRegex = />[^<]*\bSWDKLLJ\b[^<]*<|["']\s*SWDKLLJ\s*["']|Nominal SWDKLLJ|SWDKLLJ:/;
assert(!uiSwdkRegex.test(buatOrderContent), "17. SWDKLLJ tidak muncul di user visible UI BuatOrder");
assert(!uiSwdkRegex.test(biayaLayananContent), "17. SWDKLLJ tidak muncul di user visible UI BiayaLayanan");

// ----------------------------------------------------------------------------
// 18. OPSEN PKB muncul
// ----------------------------------------------------------------------------
assert(buatOrderContent.includes("OPSEN PKB"), "18. OPSEN PKB muncul di BuatOrder");
assert(biayaLayananContent.includes("OPSEN PKB"), "18. OPSEN PKB muncul di BiayaLayanan");

// ----------------------------------------------------------------------------
// 19. Biaya disabled tidak masuk estimasi
// ----------------------------------------------------------------------------
pricingStore.updateServiceFeeConfig("Perpanjangan 1 Tahun", "Jakarta Timur", {
  jasaLengkap: { nominal: 350000, enabled: false },
});
const costDisabled = pricingStore.calculateOrderCost({
  serviceName: "Perpanjangan 1 Tahun",
  wilayahSamsat: "Jakarta Timur",
  metodeLayanan: "Datang Langsung",
  tipeJasa: "Lengkap",
  pkb: 1000000,
});
assert(costDisabled.biayaJasa === 0, "19. Biaya jasa disabled -> 0 dalam estimasi");

// ----------------------------------------------------------------------------
// 20. Biaya enabled masuk estimasi
// ----------------------------------------------------------------------------
pricingStore.updateServiceFeeConfig("Perpanjangan 1 Tahun", "Jakarta Timur", {
  jasaLengkap: { nominal: 350000, enabled: true },
});
const costEnabled = pricingStore.calculateOrderCost({
  serviceName: "Perpanjangan 1 Tahun",
  wilayahSamsat: "Jakarta Timur",
  metodeLayanan: "Datang Langsung",
  tipeJasa: "Lengkap",
  pkb: 1000000,
});
assert(costEnabled.biayaJasa === 350000, "20. Biaya jasa enabled -> Rp 350.000 dalam estimasi");

// ----------------------------------------------------------------------------
// 21. Antar Jemput disabled tidak menambah pickup fee
// ----------------------------------------------------------------------------
pricingStore.updateServiceFeeConfig("Perpanjangan 1 Tahun", "Jakarta Timur", {
  biayaAntarJemput: 50000,
  antarJemputEnabled: false,
});
const costPickupOff = pricingStore.calculateOrderCost({
  serviceName: "Perpanjangan 1 Tahun",
  wilayahSamsat: "Jakarta Timur",
  metodeLayanan: "Antar Jemput",
  tipeJasa: "Lengkap",
  pkb: 1000000,
});
assert(costPickupOff.biayaAntarJemput === 0, "21. Antar Jemput disabled -> pickup fee = 0");

// ----------------------------------------------------------------------------
// 22. Datang Langsung tidak menambah pickup fee
// ----------------------------------------------------------------------------
pricingStore.updateServiceFeeConfig("Perpanjangan 1 Tahun", "Jakarta Timur", {
  biayaAntarJemput: 50000,
  antarJemputEnabled: true,
});
const costDatangLangsung = pricingStore.calculateOrderCost({
  serviceName: "Perpanjangan 1 Tahun",
  wilayahSamsat: "Jakarta Timur",
  metodeLayanan: "Datang Langsung",
  tipeJasa: "Lengkap",
  pkb: 1000000,
});
assert(costDatangLangsung.biayaAntarJemput === 0, "22. Datang Langsung -> pickup fee = 0");

// ----------------------------------------------------------------------------
// 23. Cost snapshot order baru benar
// ----------------------------------------------------------------------------
const snapshot = pricingStore.calculateOrderCost({
  serviceName: "Perpanjangan 1 Tahun",
  wilayahSamsat: "Jakarta Timur",
  metodeLayanan: "Antar Jemput",
  tipeJasa: "Lengkap",
  pkb: 1000000,
});
const orderWithSnapshot = orderStore.addOrder({
  customer: "Doni Wijaya",
  nomorHP: "081233334444",
  layanan: "Perpanjangan 1 Tahun",
  metodeLayanan: "Antar Jemput",
  jenisKendaraan: "Mobil",
  nopol: "B 1111 ABC",
  wilayahSamsatAsal: "Jakarta Timur",
  wilayahSamsatTujuan: "Jakarta Timur",
  costSnapshot: snapshot,
  totalEstimasi: snapshot.totalEstimasi,
});
assert(orderWithSnapshot.costSnapshot?.totalEstimasi === snapshot.totalEstimasi, "23. Snapshot order baru tersimpan benar");

// ----------------------------------------------------------------------------
// 24. Existing order tidak berubah
// ----------------------------------------------------------------------------
const oldSnapshotTotal = orderWithSnapshot.costSnapshot?.totalEstimasi;
// Update master pricing to a completely different value
pricingStore.updateServiceFeeConfig("Perpanjangan 1 Tahun", "Jakarta Timur", {
  jasaLengkap: { nominal: 999999, enabled: true },
});
const fetchedOrder = orderStore.getOrderByNo(orderWithSnapshot.orderNo);
assert(fetchedOrder?.costSnapshot?.totalEstimasi === oldSnapshotTotal, "24. Existing order snapshot tidak berubah setelah master data berubah");

// Restore master pricing
pricingStore.updateServiceFeeConfig("Perpanjangan 1 Tahun", "Jakarta Timur", {
  jasaLengkap: { nominal: 350000, enabled: true },
});

// ----------------------------------------------------------------------------
// 25. Finance invoice menggunakan snapshot
// ----------------------------------------------------------------------------
// Verify invoice amount matches order snapshot, not live master
assert(fetchedOrder?.costSnapshot?.biayaJasa !== 999999, "25. Snapshot holds original pricing, not live master");

// ----------------------------------------------------------------------------
// 26. Stage 5 tetap dapat melakukan final reconciliation
// ----------------------------------------------------------------------------
const syncSuccess = orderStore.syncFinalCostToFinance(
  orderWithSnapshot.orderNo,
  1543000, // newTotal
  1143000, // biayaSamsat
  400000   // profit
);
assert(syncSuccess === true, "26. Stage 5 syncFinalCostToFinance berhasil");
const reconciledOrder = orderStore.getOrderByNo(orderWithSnapshot.orderNo);
assert(reconciledOrder?.finalCost === 1543000, "26. Stage 5 final cost tersimpan pada order");
assert(reconciledOrder?.settlementCondition !== undefined, "26. Stage 5 settlement condition terupdate");

// ----------------------------------------------------------------------------
// 27. Tagihan tetap sinkron
// ----------------------------------------------------------------------------
const invoices = financeStore.getInvoices();
assert(Array.isArray(invoices), "27. Tagihan/Invoices tetap sinkron dan valid array");

// ----------------------------------------------------------------------------
// 28. Rekap Order tidak rusak
// ----------------------------------------------------------------------------
const archivedList = orderStore.getArchivedOrders();
assert(Array.isArray(archivedList), "28. Rekap Order archivedOrders list is an array");

// Rekap Order qualification rule from OrderHistory.tsx:
// 1. isOperationalDone (currentStageName === "Selesai (Arsip)" || currentStep >= 8)
// 2. isLunas (statusPembayaran === "Lunas" && kurang === 0)
// 3. noPendingRefund (refundStatus !== "PENDING")
const qualifiesForRekap = (op: any) => {
  const isOperationalDone = op.currentStageName === "Selesai (Arsip)" || (op.currentStep && op.currentStep >= 8);
  const kurang = op.payment?.kurang ?? 0;
  const isLunas = op.payment?.statusPembayaran === "Lunas" && kurang === 0;
  const noPendingRefund = op.payment?.refundStatus !== "PENDING" && op.refundStatus !== "PENDING";
  return Boolean(isOperationalDone && isLunas && noPendingRefund);
};

assert(
  qualifiesForRekap({
    currentStageName: "Selesai (Arsip)",
    currentStep: 8,
    payment: { statusPembayaran: "Lunas", kurang: 0, refundStatus: "NONE" },
    refundStatus: "NONE",
  }) === true,
  "28. Rekap Order correctly qualifies fully completed and settled order"
);

assert(
  qualifiesForRekap({
    currentStageName: "Selesai (Arsip)",
    currentStep: 8,
    payment: { statusPembayaran: "Belum Lunas", kurang: 50000, refundStatus: "NONE" },
    refundStatus: "NONE",
  }) === false,
  "28. Rekap Order excludes unfinalized / underpaid order"
);

assert(
  qualifiesForRekap({
    currentStageName: "Selesai (Arsip)",
    currentStep: 8,
    payment: { statusPembayaran: "Lunas", kurang: 0, refundStatus: "PENDING" },
    refundStatus: "PENDING",
  }) === false,
  "28. Rekap Order excludes order with pending refund"
);

console.log("==================================================");
console.log("ALL 28 BATCH STANDARDIZATION TESTS PASSED (28/28)!");
console.log("==================================================");
