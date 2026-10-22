const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "src", "app", "components", "BuatOrder.tsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Remove validation in handleNextStep2
const target1 = `      if (!paymentProof.attached) {\r\n        toast.error("Bukti pembayaran wajib diunggah untuk pembayaran di awal.");\r\n        return;\r\n      }`;
const target1LF = `      if (!paymentProof.attached) {\n        toast.error("Bukti pembayaran wajib diunggah untuk pembayaran di awal.");\n        return;\n      }`;
content = content.replace(target1, "");
content = content.replace(target1LF, "");

// 2. Remove validation in handleSubmitOrder
const target2 = `      if (!paymentProof.attached) {\r\n        toast.error("Bukti pembayaran wajib diunggah untuk pembayaran di awal.");\r\n        return;\r\n      }`;
const target2LF = `      if (!paymentProof.attached) {\n        toast.error("Bukti pembayaran wajib diunggah untuk pembayaran di awal.");\n        return;\n      }`;
content = content.replace(target2, "");
content = content.replace(target2LF, "");

// 3. UI Helper text updates
content = content.replace(
  "Klien melunasi biaya saat order diinput di loket. Lampirkan bukti pembayaran untuk verifikasi di Stage 1.",
  "Klien membayar saat order diinput di loket. Bukti pembayaran bersifat opsional dan dapat dilengkapi saat verifikasi di Stage 1."
);

content = content.replace(
  `Bukti Pembayaran <span className="text-destructive">*</span>`,
  `Bukti Pembayaran <span className="text-muted-foreground font-normal text-xs">(Opsional)</span>`
);

content = content.replace(
  `{paymentProof.attached ? "Terlampir" : "Wajib diunggah"}`,
  `{paymentProof.attached ? "Terlampir" : "Dapat dilengkapi di Verifikasi"}`
);

content = content.replace(
  `"Unggah struk transfer bank atau bukti pembayaran loket (Wajib untuk Bayar di Awal)"`,
  `"Unggah struk transfer bank atau bukti pembayaran loket (Opsional saat input order)"`
);

// 4. Attach paymentRecords to payment object
const oldPaymentPayload = `          buktiPembayaran: buktiBayarPayload,\r\n          isPaymentVerified: false,`;
const oldPaymentPayloadLF = `          buktiPembayaran: buktiBayarPayload,\n          isPaymentVerified: false,`;

const newPaymentPayload = `          buktiPembayaran: buktiBayarPayload,
          isPaymentVerified: false,
          paymentRecords: isBayarAwal && nominalAwal > 0 ? [
            {
              id: \`pay-\${Date.now()}\`,
              nominal: nominalAwal,
              tanggal: nowIso,
              metodePembayaran: paymentMethodResolved,
              namaBank: selectedPm?.bank || (paymentMethodResolved.includes("BCA") ? "BCA" : paymentMethodResolved.includes("BRI") ? "BRI" : paymentMethodResolved.includes("Mandiri") ? "Mandiri" : "Tunai"),
              namaRekening: selectedPm?.nama_rekening,
              noRekening: selectedPm?.nomor_rekening,
              buktiPembayaran: buktiBayarPayload,
              statusVerifikasi: buktiBayarPayload ? "MENUNGGU_VERIFIKASI" : "MENUNGGU_BUKTI",
              uploadedBy: currentUserName,
            }
          ] : [],`;

if (content.includes(oldPaymentPayload)) {
  content = content.replace(oldPaymentPayload, newPaymentPayload);
} else if (content.includes(oldPaymentPayloadLF)) {
  content = content.replace(oldPaymentPayloadLF, newPaymentPayload);
} else {
  console.warn("oldPaymentPayload not found!");
}

fs.writeFileSync(filePath, content, "utf8");
console.log("BuatOrder.tsx updated successfully!");
