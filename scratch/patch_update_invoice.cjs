const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'data', 'financeStore.ts');
let content = fs.readFileSync(filePath, 'utf8');

const isCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const oldTarget = `    const newTotal = updates.totalTagihan;
    const currentPaid = record.terbayar;
    const newSisa = Math.max(0, newTotal - currentPaid);
    const newStatus = derivePaymentStatus(newTotal, currentPaid);

    record.totalTagihan = newTotal;
    record.sisa = newSisa;
    record.status = newStatus;`;

const newTarget = `    const newTotal = updates.totalTagihan !== undefined ? updates.totalTagihan : record.totalTagihan;
    const currentPaid = (updates as any).terbayar !== undefined ? (updates as any).terbayar : record.terbayar;
    const newSisa = (updates as any).sisa !== undefined ? (updates as any).sisa : Math.max(0, newTotal - currentPaid);
    const newOverpayment = (updates as any).overpayment !== undefined ? (updates as any).overpayment : Math.max(0, currentPaid - newTotal);
    const newStatus = (updates as any).status || derivePaymentStatus(newTotal, currentPaid);

    record.totalTagihan = newTotal;
    record.terbayar = currentPaid;
    record.dibayar = currentPaid;
    record.sisa = newSisa;
    record.overpayment = newOverpayment;
    record.status = newStatus;`;

if (!content.includes(oldTarget)) {
  console.error("Could not find oldTarget in financeStore.ts");
  process.exit(1);
}
content = content.replace(oldTarget, newTarget);

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully patched updateInvoiceFromOrder in financeStore.ts!");
