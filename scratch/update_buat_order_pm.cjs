const fs = require('fs');
let code = fs.readFileSync('src/app/components/BuatOrder.tsx', 'utf8');

// 1. Add import
if (!code.includes('usePaymentMethods')) {
  code = code.replace(
    'import { orderStore,',
    'import { usePaymentMethods } from "../data/paymentMethodStore";\r\nimport { orderStore,'
  );
}

// 2. Call hook inside component
if (!code.includes('const { activeMethods } = usePaymentMethods();')) {
  code = code.replace(
    'useEstimationStore(); // Reactive subscription to estimationStore template parameters & components',
    'useEstimationStore(); // Reactive subscription to estimationStore template parameters & components\r\n  const { activeMethods } = usePaymentMethods();'
  );
}

// 3. Update order submission in addOrderAsync
const targetSubmit = `      const createdOrder = await orderStore.addOrderAsync({
        customer: formData.customer.trim(),
        namaPemilik: formData.namaPemilik.trim() || formData.customer.trim(),
        nomorHP: formData.nomorHP.trim(),`;

const replSubmit = `      const selectedPm = activeMethods.find((m) => m.nama_metode === paymentMethodResolved);
      const isBayarAwal = formData.tipePembayaran === "Bayar di Awal";
      const nominalAwal = isBayarAwal ? (parseFloat(formData.nominalDibayarAwal.replace(/[^0-9]/g, "")) || 0) : 0;
      const nowIso = new Date().toISOString();

      const createdOrder = await orderStore.addOrderAsync({
        customer: formData.customer.trim(),
        namaPemilik: formData.namaPemilik.trim() || formData.customer.trim(),
        nomorHP: formData.nomorHP.trim(),
        tanggalMasukBerkas: formData.metodeLayanan === "Datang Langsung" ? nowIso : undefined,`;

code = code.replace(targetSubmit, replSubmit);

// 4. Update payment object in addOrderAsync
const targetPayment = `        payment: {
          tipePembayaran: formData.tipePembayaran,
          metodePembayaran: paymentMethodResolved,
          statusPembayaran: formData.tipePembayaran === "Bayar di Awal"
            ? ((parseFloat(formData.nominalDibayarAwal.replace(/[^0-9]/g, "")) || 0) >= cost.total ? "Lunas" : (parseFloat(formData.nominalDibayarAwal.replace(/[^0-9]/g, "")) || 0) > 0 ? "Kurang Bayar" : "Belum Bayar")
            : "Belum Lunas",
          totalBiaya: cost.total,
          dibayar: formData.tipePembayaran === "Bayar di Awal"
            ? (parseFloat(formData.nominalDibayarAwal.replace(/[^0-9]/g, "")) || 0)
            : 0,
          kurang: formData.tipePembayaran === "Bayar di Awal"
            ? Math.max(0, cost.total - (parseFloat(formData.nominalDibayarAwal.replace(/[^0-9]/g, "")) || 0))
            : cost.total,
          overpayment: formData.tipePembayaran === "Bayar di Awal"
            ? Math.max(0, (parseFloat(formData.nominalDibayarAwal.replace(/[^0-9]/g, "")) || 0) - cost.total)
            : 0,
          nominalDibayarAwal: formData.tipePembayaran === "Bayar di Awal"
            ? (parseFloat(formData.nominalDibayarAwal.replace(/[^0-9]/g, "")) || 0)
            : undefined,
          buktiPembayaran: buktiBayarPayload,
          isPaymentVerified: false,
        },`;

const replPayment = `        payment: {
          tipePembayaran: formData.tipePembayaran,
          metodePembayaran: paymentMethodResolved,
          namaBank: selectedPm?.bank || (paymentMethodResolved.includes("BCA") ? "BCA" : paymentMethodResolved.includes("BRI") ? "BRI" : paymentMethodResolved.includes("Mandiri") ? "Mandiri" : "Tunai"),
          namaRekening: selectedPm?.nama_rekening || "",
          noRekening: selectedPm?.nomor_rekening || "",
          tanggalBayar: isBayarAwal && nominalAwal > 0 ? nowIso : undefined,
          statusPembayaran: isBayarAwal
            ? (nominalAwal >= cost.total ? "Lunas" : nominalAwal > 0 ? "Kurang Bayar" : "Belum Bayar")
            : "Belum Lunas",
          totalBiaya: cost.total,
          dibayar: nominalAwal,
          kurang: isBayarAwal ? Math.max(0, cost.total - nominalAwal) : cost.total,
          overpayment: isBayarAwal ? Math.max(0, nominalAwal - cost.total) : 0,
          nominalDibayarAwal: isBayarAwal ? nominalAwal : undefined,
          buktiPembayaran: buktiBayarPayload,
          isPaymentVerified: false,
        },`;

code = code.replace(targetPayment, replPayment);

// 5. Update JSX Select for payment method
const targetSelect = `                          <SelectContent>
                            <SelectItem value="Transfer Bank BCA" className="text-xs">Transfer Bank BCA</SelectItem>
                            <SelectItem value="Transfer Bank Mandiri" className="text-xs">Transfer Bank Mandiri</SelectItem>
                            <SelectItem value="QRIS" className="text-xs">QRIS Biro Jasa SUN89</SelectItem>
                            <SelectItem value="Cash" className="text-xs">Cash (Tunai di Loket)</SelectItem>
                          </SelectContent>`;

const replSelect = `                          <SelectContent>
                            {activeMethods && activeMethods.length > 0 ? (
                              activeMethods.map((m) => (
                                <SelectItem key={m.id} value={m.nama_metode} className="text-xs">
                                  {m.nama_metode} {m.bank && m.bank !== "Tunai" && m.nomor_rekening ? \`(\${m.bank} - \${m.nomor_rekening})\` : ""}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Transfer Bank BCA" className="text-xs">Transfer Bank BCA</SelectItem>
                                <SelectItem value="Transfer Bank Mandiri" className="text-xs">Transfer Bank Mandiri</SelectItem>
                                <SelectItem value="Transfer Bank BRI" className="text-xs">Transfer Bank BRI</SelectItem>
                                <SelectItem value="Cash" className="text-xs">Cash (Tunai di Loket)</SelectItem>
                              </>
                            )}
                          </SelectContent>`;

code = code.replace(targetSelect, replSelect);

fs.writeFileSync('src/app/components/BuatOrder.tsx', code, 'utf8');
console.log('Successfully updated BuatOrder.tsx!');
