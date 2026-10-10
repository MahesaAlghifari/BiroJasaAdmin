import fs from "fs";
import path from "path";

console.log("==================================================");
console.log("VERIFYING UI/UX CORRECTIONS & BUSINESS RULES");
console.log("==================================================");

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

const buatOrderPath = path.resolve("src/app/components/BuatOrder.tsx");
const biayaLayananPath = path.resolve("src/app/components/BiayaLayanan.tsx");
const pricingTypesPath = path.resolve("src/domain/pricing/types.ts");

const buatOrderSrc = fs.readFileSync(buatOrderPath, "utf-8");
const biayaLayananSrc = fs.readFileSync(biayaLayananPath, "utf-8");
const pricingTypesSrc = fs.readFileSync(pricingTypesPath, "utf-8");

// 1. Buat Order layout & width
assert(!buatOrderSrc.includes("max-w-5xl mx-auto"), "BuatOrder does not have max-w-5xl mx-auto restriction");
assert(buatOrderSrc.includes("w-full space-y-5 p-4 sm:p-6 lg:p-8 min-w-0 text-left"), "BuatOrder container has w-full, text-left, and responsive padding");
assert(buatOrderSrc.includes('Card className="p-4 sm:p-5 md:p-6 border-border/80 shadow-xs bg-card"'), "Main card fills width without restrictive width constraint");

// 2. Conditional Samsat Tujuan
assert(buatOrderSrc.includes('formData.layanan.includes("Mutasi") && ('), "Wilayah Samsat Tujuan is strictly conditional on Mutasi");
assert(buatOrderSrc.includes("Wilayah Samsat Tujuan <span className=\"text-destructive\">*</span>"), "Wilayah Samsat Tujuan has clean label without '(Khusus Mutasi)'");
assert(!buatOrderSrc.includes("Wilayah Samsat Tujuan (Khusus Mutasi)"), "No '(Khusus Mutasi)' in Samsat Tujuan label");

// 3. Validation in Step 1 & scroll
assert(buatOrderSrc.includes("step1Errors"), "step1Errors state declared");
assert(buatOrderSrc.includes('toast.error("Lengkapi data yang wajib diisi terlebih dahulu.")'), "Toast for incomplete Step 1 is present");
assert(buatOrderSrc.includes("scrollIntoView"), "Auto-scroll on first invalid field is present");
assert(buatOrderSrc.includes("border-destructive ring-1 ring-destructive/40"), "Inline red border feedback on error fields");

// Field IDs for error anchor
["field-customer", "field-nomorHP", "field-layanan", "field-plateNumber", "field-wilayahSamsatTujuan", "field-jemputDetail"].forEach((id) => {
  assert(buatOrderSrc.includes(`id="${id}"`), `Field element ${id} exists for anchor & focus`);
});

// 4. Confirmation & Dialogs in BuatOrder
assert(buatOrderSrc.includes("Reset Formulir?"), "Reset confirmation AlertDialog title is present");
assert(buatOrderSrc.includes("Reset semua data yang sudah diisi?"), "Reset confirmation description is present");
assert(buatOrderSrc.includes("Order Berhasil Dibuat"), "Success modal Dialog title is present");
assert(buatOrderSrc.includes("Order telah didaftarkan ke sistem dan otomatis masuk ke tahap Verifikasi"), "Success modal description is present");

// 5. OPSEN PKB Standardized Label
assert(buatOrderSrc.includes("Nominal OPSEN PKB (Rp)"), "BuatOrder has standardized label 'Nominal OPSEN PKB (Rp)'");
assert(buatOrderSrc.includes("OPSEN PKB:"), "Cost breakdown in BuatOrder displays 'OPSEN PKB:'");
assert(pricingTypesSrc.includes("opsenPkb?:"), "pricing/types.ts supports opsenPkb");
assert(pricingTypesSrc.includes("swdkllj?:"), "pricing/types.ts preserves swdkllj backward compatibility");

// 6. Biaya Layanan Edit Modal
assert(biayaLayananSrc.includes("Edit Biaya Layanan — {selectedItem?.wilayah || formData.wilayah}"), "Edit dialog header includes Samsat wilayah");
assert(biayaLayananSrc.includes("renderFormFields(true)"), "Edit dialog passes isEdit=true to renderFormFields");
assert(biayaLayananSrc.includes("renderFormFields(false)"), "Add dialog passes isEdit=false to renderFormFields");
assert(biayaLayananSrc.includes("!isEdit && ("), "Wilayah dropdown is hidden when isEdit is true");
assert(biayaLayananSrc.includes("max-h-[88vh] flex flex-col p-0 overflow-hidden"), "Dialog has viewport-safe container with overflow hidden");
assert(biayaLayananSrc.includes("flex-1 overflow-y-auto p-5"), "Dialog body has scrollable middle section");
assert(biayaLayananSrc.includes("Simpan Perubahan"), "Edit dialog footer has 'Simpan Perubahan' button");
assert(biayaLayananSrc.includes("Batal"), "Dialog footer has 'Batal' button");

// 7. Biaya Layanan 7 Sections Order
assert(biayaLayananSrc.includes("1. BIAYA JASA"), "Section 1 is BIAYA JASA");
assert(biayaLayananSrc.includes("2. BIAYA PENGURUSAN KHUSUS"), "Section 2 is BIAYA PENGURUSAN KHUSUS");
assert(!biayaLayananSrc.includes("Biaya Jasa Nembak</Label>"), "Term 'Biaya Jasa Nembak' is replaced in UI label");
assert(biayaLayananSrc.includes("3. BIAYA ANTAR & JEMPUT"), "Section 3 is BIAYA ANTAR & JEMPUT");
assert(biayaLayananSrc.includes("Antar & Jemput") && biayaLayananSrc.includes("Antar Saja") && biayaLayananSrc.includes("Jemput Saja"), "Antar & Jemput has 3 modes");
assert(biayaLayananSrc.includes("4. OPSEN PKB"), "Section 4 is OPSEN PKB");
assert(biayaLayananSrc.includes("5. BIAYA LAINNYA"), "Section 5 is BIAYA LAINNYA");
assert(biayaLayananSrc.includes("6. KOMPONEN SAMSAT — MUTASI MASUK"), "Section 6 is Mutasi Masuk");
assert(biayaLayananSrc.includes("7. KOMPONEN SAMSAT — MUTASI KELUAR"), "Section 7 is Mutasi Keluar");
assert(biayaLayananSrc.includes("Komponen Aktif"), "Active components summary is present");

console.log("==================================================");
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) process.exit(1);
