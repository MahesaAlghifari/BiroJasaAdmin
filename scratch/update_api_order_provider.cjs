const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "src", "data", "api", "apiOrderProvider.ts");
let content = fs.readFileSync(filePath, "utf8");

const oldMethod = `  public verifyPayment(orderNo: string, verifierName: string = "Admin", confirmedAmount?: number, notes?: string): boolean {`;
const newMethod = `  public verifyPayment(orderNo: string, verifierName: string = "Admin", confirmedAmount?: number, notes?: string, proofPayload?: any): boolean {`;

content = content.replace(oldMethod, newMethod);

const oldFetch = `    fetch(\`\${this.baseUrl}/orders/\${encodeURIComponent(orderNo)}/verify-payment\`, {\n      method: "POST",\n      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },\n      body: JSON.stringify({ verifierName, confirmedAmount: paid, notes }),\n    })`;
const oldFetchCRLF = `    fetch(\`\${this.baseUrl}/orders/\${encodeURIComponent(orderNo)}/verify-payment\`, {\r\n      method: "POST",\r\n      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },\r\n      body: JSON.stringify({ verifierName, confirmedAmount: paid, notes }),\r\n    })`;

const newFetch = `    const effectiveProof = proofPayload || targetOrder.payment?.buktiPembayaran;
    const existingRecords = targetOrder.payment?.paymentRecords || [];
    const newRecord: any = {
      id: \`pay-verif-\${Date.now()}\`,
      nominal: paid,
      tanggal: nowStr,
      metodePembayaran: targetOrder.payment?.metodePembayaran || "Transfer Bank",
      namaBank: targetOrder.payment?.namaBank,
      namaRekening: targetOrder.payment?.namaRekening,
      noRekening: targetOrder.payment?.noRekening,
      buktiPembayaran: effectiveProof,
      statusVerifikasi: "TERVERIFIKASI",
      verifiedAt: nowStr,
      verifiedBy: verifierName,
      catatan: notes,
    };
    updatedPayment.buktiPembayaran = effectiveProof;
    updatedPayment.paymentRecords = [...existingRecords, newRecord];

    fetch(\`\${this.baseUrl}/orders/\${encodeURIComponent(orderNo)}/verify-payment\`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      body: JSON.stringify({ verifierName, confirmedAmount: paid, notes, buktiPembayaran: effectiveProof }),
    })`;

if (content.includes(oldFetch)) {
  content = content.replace(oldFetch, newFetch);
} else if (content.includes(oldFetchCRLF)) {
  content = content.replace(oldFetchCRLF, newFetch);
} else {
  console.warn("oldFetch not found, trying regex");
  content = content.replace(
    /fetch\(`\${this\.baseUrl}\/orders\/\${encodeURIComponent\(orderNo\)}\/verify-payment`[\s\S]*?body: JSON\.stringify\(\{ verifierName, confirmedAmount: paid, notes \}\),\s*\}\)/,
    newFetch
  );
}

fs.writeFileSync(filePath, content, "utf8");
console.log("apiOrderProvider.ts updated!");
